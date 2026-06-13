import {
    COPY_STYLE_PRESETS,
    normalizeCopyStylePresetId,
    type CopyStylePresetId,
} from './storeScreenshotCopyStyleOptions';
import {
    STORE_SCREENSHOT_BULK_LANG,
    STORE_SCREENSHOT_PROMPT_LANG,
    type StoreScreenshotMultilangText,
} from './storeScreenshotMultilang';
import {
    normalizeDecorStringList,
    type DecorSuggestion,
} from './storeScreenshotVisualDecorCatalog';
import { normalizeBackgroundColor } from './storeScreenshotBackgroundColorPrompt';
import { normalizeBackgroundPatternId } from './storeScreenshotBackgroundPattern';
import { isValidHexColor } from './storeScreenshotColorUtils';
import { normalizeFloatingIconsEnabled } from './storeScreenshotDecorOptions';
import type { HeadlineCopyVariant } from './storeScreenshotTypes';

const EXPECTED_VARIANT_COUNT = COPY_STYLE_PRESETS.length;
const ALLOWED_STYLE_IDS = new Set(COPY_STYLE_PRESETS.map((preset) => preset.id));

type HeadlineBulkRow = {
    screenshot: number;
    headline: StoreScreenshotMultilangText;
    subtitle: StoreScreenshotMultilangText;
};

function stripMarkdownJsonFence(raw: string): string {
    let trimmed = String(raw || '').trim();
    trimmed = trimmed.replace(/^AI\s*Response\s*:?\s*/i, '');

    if (trimmed.startsWith('`') && trimmed.endsWith('`') && !trimmed.startsWith('```')) {
        trimmed = trimmed.slice(1, -1).trim();
    }

    if (trimmed.startsWith('```')) {
        return trimmed
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/, '')
            .trim();
    }

    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        const objectMatch = trimmed.match(/\{[\s\S]*\}/);
        if (objectMatch) {
            return objectMatch[0].trim();
        }
    }

    return trimmed;
}

function extractBulkMultilangText(
    value: unknown,
    fieldLabel: string,
    index: number,
): { map: StoreScreenshotMultilangText | null; error: string | null } {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) {
            return { map: null, error: `Phần tử #${index + 1} thiếu ${fieldLabel}.${STORE_SCREENSHOT_PROMPT_LANG}` };
        }

        return {
            map: {
                [STORE_SCREENSHOT_PROMPT_LANG]: trimmed,
            },
            error: null,
        };
    }

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return { map: null, error: `Phần tử #${index + 1} thiếu ${fieldLabel} hợp lệ` };
    }

    const record = value as Record<string, unknown>;
    const en = String(record[STORE_SCREENSHOT_PROMPT_LANG] ?? '').trim();
    const vi = String(record[STORE_SCREENSHOT_BULK_LANG] ?? '').trim();

    if (!en) {
        return {
            map: null,
            error: `Phần tử #${index + 1} thiếu ${fieldLabel}.${STORE_SCREENSHOT_PROMPT_LANG} (bắt buộc — dùng trong prompt ảnh AI)`,
        };
    }

    const map: StoreScreenshotMultilangText = {
        [STORE_SCREENSHOT_PROMPT_LANG]: en,
    };

    if (vi) {
        map[STORE_SCREENSHOT_BULK_LANG] = vi;
    }

    return { map, error: null };
}

function normalizeRow(value: unknown, index: number): { row: HeadlineBulkRow | null; error: string | null } {
    if (!value || typeof value !== 'object') {
        return { row: null, error: `Phần tử #${index + 1} không phải object` };
    }

    const record = value as Record<string, unknown>;
    const screenshot = Number(record.screenshot);

    if (!Number.isInteger(screenshot) || screenshot <= 0) {
        return { row: null, error: `Phần tử #${index + 1} thiếu screenshot hợp lệ` };
    }

    const headlineResult = extractBulkMultilangText(record.headline, 'headline', index);
    if (headlineResult.error || !headlineResult.map) {
        return { row: null, error: headlineResult.error };
    }

    const subtitleResult = extractBulkMultilangText(record.subtitle, 'subtitle', index);
    if (subtitleResult.error || !subtitleResult.map) {
        return { row: null, error: subtitleResult.error };
    }

    return {
        row: {
            screenshot,
            headline: headlineResult.map,
            subtitle: subtitleResult.map,
        },
        error: null,
    };
}

export type HeadlineSingleResult = {
    headline: StoreScreenshotMultilangText;
    subtitle: StoreScreenshotMultilangText;
};

export type ParseHeadlineSingleResponse = {
    result: HeadlineSingleResult | null;
    errors: string[];
};

function normalizeSingleObject(value: unknown): { result: HeadlineSingleResult | null; errors: string[] } {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return { result: null, errors: ['Kết quả phải là JSON object có headline và subtitle'] };
    }

    const record = value as Record<string, unknown>;
    const headlineResult = extractBulkMultilangText(record.headline, 'headline', 0);
    if (headlineResult.error || !headlineResult.map) {
        return { result: null, errors: [headlineResult.error || 'Thiếu headline hợp lệ'] };
    }

    const subtitleResult = extractBulkMultilangText(record.subtitle, 'subtitle', 0);
    if (subtitleResult.error || !subtitleResult.map) {
        return { result: null, errors: [subtitleResult.error || 'Thiếu subtitle hợp lệ'] };
    }

    return {
        result: {
            headline: headlineResult.map,
            subtitle: subtitleResult.map,
        },
        errors: [],
    };
}

export function parseHeadlineSingleResponse(raw: string): ParseHeadlineSingleResponse {
    const cleaned = stripMarkdownJsonFence(raw);
    if (!cleaned) {
        return { result: null, errors: ['Chưa có nội dung JSON'] };
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(cleaned);
    } catch {
        return { result: null, errors: ['JSON không hợp lệ — kiểm tra dấu ngoặc và dấu phẩy'] };
    }

    if (Array.isArray(parsed)) {
        if (parsed.length !== 1) {
            return {
                result: null,
                errors: [`Cần 1 object hoặc array 1 phần tử, hiện có ${parsed.length} phần tử`],
            };
        }
        const bulkResult = normalizeRow(parsed[0], 0);
        if (bulkResult.error || !bulkResult.row) {
            return { result: null, errors: [bulkResult.error || 'JSON không hợp lệ'] };
        }
        return {
            result: {
                headline: bulkResult.row.headline,
                subtitle: bulkResult.row.subtitle,
            },
            errors: [],
        };
    }

    const { result, errors } = normalizeSingleObject(parsed);
    return { result, errors };
}

export type ParseHeadlineVariantsResponse = {
    variants: HeadlineCopyVariant[];
    decor: DecorSuggestion | null;
    errors: string[];
};

function normalizeDecorFromRecord(
    record: Record<string, unknown>,
): { decor: DecorSuggestion | null; errors: string[] } {
    const errors: string[] = [];
    const hasDecorKeys = (
        'background_pattern' in record
        || 'background_color' in record
        || 'floating_icons_enabled' in record
        || 'icons' in record
        || 'background_motifs' in record
    );

    if (!hasDecorKeys) {
        return { decor: null, errors: [] };
    }

    const decor: DecorSuggestion = {
        icons: [],
        background_motifs: [],
    };

    if ('background_pattern' in record) {
        const rawPattern = String(record.background_pattern ?? '').trim();
        if (!rawPattern) {
            errors.push('background_pattern không được rỗng khi có trong JSON');
        } else {
            decor.background_pattern = normalizeBackgroundPatternId(rawPattern);
        }
    }

    if ('background_color' in record) {
        const rawColor = String(record.background_color ?? '').trim();
        if (!rawColor) {
            decor.background_color = '';
        } else if (!isValidHexColor(rawColor)) {
            errors.push('background_color phải là mã hex #RRGGBB (6 chữ số)');
        } else {
            decor.background_color = normalizeBackgroundColor(rawColor);
        }
    }

    if ('floating_icons_enabled' in record) {
        const rawEnabled = record.floating_icons_enabled;
        if (typeof rawEnabled !== 'boolean' && rawEnabled !== 0 && rawEnabled !== 1
            && rawEnabled !== 'true' && rawEnabled !== 'false') {
            errors.push('floating_icons_enabled phải là boolean');
        } else {
            decor.floating_icons_enabled = normalizeFloatingIconsEnabled(rawEnabled);
        }
    }

    if ('icons' in record && record.icons !== null && record.icons !== undefined) {
        if (!Array.isArray(record.icons) && typeof record.icons !== 'string') {
            errors.push('icons phải là mảng string');
        } else {
            decor.icons = normalizeDecorStringList(record.icons, 3);
        }
    }

    if ('background_motifs' in record && record.background_motifs !== null && record.background_motifs !== undefined) {
        if (!Array.isArray(record.background_motifs) && typeof record.background_motifs !== 'string') {
            errors.push('background_motifs phải là mảng string');
        } else {
            decor.background_motifs = normalizeDecorStringList(record.background_motifs, 6);
        }
    }

    if (decor.background_pattern === 'none') {
        decor.background_motifs = [];
    }

    if (decor.floating_icons_enabled === false) {
        decor.icons = [];
    }

    return { decor: errors.length > 0 ? null : decor, errors };
}

function normalizeVariantRow(
    value: unknown,
    index: number,
): { variant: HeadlineCopyVariant | null; error: string | null } {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return { variant: null, error: `Phần tử #${index + 1} không phải object` };
    }

    const record = value as Record<string, unknown>;
    const styleId = normalizeCopyStylePresetId(String(record.copy_style_id ?? ''));
    if (!ALLOWED_STYLE_IDS.has(styleId)) {
        return { variant: null, error: `Phần tử #${index + 1} có copy_style_id không hợp lệ` };
    }

    const headlineResult = extractBulkMultilangText(record.headline, 'headline', index);
    if (headlineResult.error || !headlineResult.map) {
        return { variant: null, error: headlineResult.error };
    }

    const subtitleResult = extractBulkMultilangText(record.subtitle, 'subtitle', index);
    if (subtitleResult.error || !subtitleResult.map) {
        return { variant: null, error: subtitleResult.error };
    }

    return {
        variant: {
            copy_style_id: styleId as CopyStylePresetId,
            headline: headlineResult.map,
            subtitle: subtitleResult.map,
        },
        error: null,
    };
}

export function parseHeadlineVariantsResponse(raw: string): ParseHeadlineVariantsResponse {
    const cleaned = stripMarkdownJsonFence(raw);
    if (!cleaned) {
        return { variants: [], decor: null, errors: ['Chưa có nội dung JSON'] };
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(cleaned);
    } catch {
        return { variants: [], decor: null, errors: ['JSON không hợp lệ — kiểm tra dấu ngoặc và dấu phẩy'] };
    }

    let rows: unknown[] = [];
    let rootRecord: Record<string, unknown> | null = null;

    if (Array.isArray(parsed)) {
        rows = parsed;
    } else if (parsed && typeof parsed === 'object') {
        rootRecord = parsed as Record<string, unknown>;
        if (Array.isArray(rootRecord.variants)) {
            rows = rootRecord.variants;
        } else if (rootRecord.headline && rootRecord.subtitle) {
            return {
                variants: [],
                decor: null,
                errors: [`Cần object có mảng "variants" gồm ${EXPECTED_VARIANT_COUNT} phong cách`],
            };
        }
    }

    const decorResult = rootRecord
        ? normalizeDecorFromRecord(rootRecord)
        : { decor: null, errors: [] as string[] };

    if (rows.length !== EXPECTED_VARIANT_COUNT) {
        return {
            variants: [],
            decor: null,
            errors: [
                ...decorResult.errors,
                `Cần đúng ${EXPECTED_VARIANT_COUNT} phần tử trong variants, hiện có ${rows.length}`,
            ],
        };
    }

    const errors: string[] = [...decorResult.errors];
    const variants: HeadlineCopyVariant[] = [];
    const seenStyles = new Set<CopyStylePresetId>();

    rows.forEach((row, index) => {
        const { variant, error } = normalizeVariantRow(row, index);
        if (error) {
            errors.push(error);
            return;
        }
        if (!variant) {
            return;
        }
        if (seenStyles.has(variant.copy_style_id)) {
            errors.push(`copy_style_id "${variant.copy_style_id}" bị trùng`);
            return;
        }
        seenStyles.add(variant.copy_style_id);
        variants.push(variant);
    });

    COPY_STYLE_PRESETS.forEach((preset) => {
        if (!seenStyles.has(preset.id)) {
            errors.push(`Thiếu copy_style_id: ${preset.id}`);
        }
    });

    if (errors.length > 0) {
        return { variants: [], decor: null, errors };
    }

    const orderMap = new Map(COPY_STYLE_PRESETS.map((preset, idx) => [preset.id, idx]));
    variants.sort((a, b) => (orderMap.get(a.copy_style_id) ?? 0) - (orderMap.get(b.copy_style_id) ?? 0));

    return { variants, decor: decorResult.decor, errors: [] };
}
