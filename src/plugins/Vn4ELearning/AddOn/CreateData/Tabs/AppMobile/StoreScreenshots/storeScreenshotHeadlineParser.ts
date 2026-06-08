import {
    normalizeMultilangText,
    STORE_SCREENSHOT_BULK_LANG,
    STORE_SCREENSHOT_PROMPT_LANG,
    type StoreScreenshotMultilangText,
} from './storeScreenshotMultilang';

export type HeadlineBulkRow = {
    screenshot: number;
    headline: StoreScreenshotMultilangText;
    subtitle: StoreScreenshotMultilangText;
};

export type ParseHeadlineBulkResult = {
    rows: HeadlineBulkRow[];
    errors: string[];
};

function stripMarkdownJsonFence(raw: string): string {
    const trimmed = String(raw || '').trim();
    if (!trimmed.startsWith('```')) {
        return trimmed;
    }

    return trimmed
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();
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

export function parseHeadlineBulkResponse(
    raw: string,
    expectedCount: number,
): ParseHeadlineBulkResult {
    const errors: string[] = [];

    if (expectedCount <= 0) {
        return { rows: [], errors: ['Không có screenshot để áp dụng'] };
    }

    const cleaned = stripMarkdownJsonFence(raw);
    if (!cleaned) {
        return { rows: [], errors: ['Chưa có nội dung JSON'] };
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(cleaned);
    } catch {
        return { rows: [], errors: ['JSON không hợp lệ — kiểm tra dấu ngoặc và dấu phẩy'] };
    }

    if (!Array.isArray(parsed)) {
        return { rows: [], errors: ['Kết quả phải là JSON array'] };
    }

    if (parsed.length !== expectedCount) {
        errors.push(`Cần đúng ${expectedCount} phần tử, hiện có ${parsed.length}`);
    }

    const rows: HeadlineBulkRow[] = [];
    const seenScreenshots = new Set<number>();

    parsed.forEach((item, index) => {
        const { row, error } = normalizeRow(item, index);
        if (error) {
            errors.push(error);
            return;
        }
        if (!row) {
            return;
        }

        if (seenScreenshots.has(row.screenshot)) {
            errors.push(`Screenshot #${row.screenshot} bị trùng`);
            return;
        }

        if (row.screenshot > expectedCount) {
            errors.push(`Screenshot #${row.screenshot} vượt quá số ảnh (${expectedCount})`);
            return;
        }

        seenScreenshots.add(row.screenshot);
        rows.push(row);
    });

    for (let order = 1; order <= expectedCount; order += 1) {
        if (!seenScreenshots.has(order)) {
            errors.push(`Thiếu screenshot #${order}`);
        }
    }

    if (errors.length > 0) {
        return { rows: [], errors };
    }

    rows.sort((a, b) => a.screenshot - b.screenshot);
    return { rows, errors: [] };
}

export function applyHeadlinesToItems<T extends {
    order: number;
    headline: StoreScreenshotMultilangText | string;
    subtitle: StoreScreenshotMultilangText | string;
}>(
    items: T[],
    rows: HeadlineBulkRow[],
): T[] {
    const rowMap = new Map(rows.map((row) => [row.screenshot, row]));

    return items.map((item) => {
        const row = rowMap.get(item.order);
        if (!row) {
            return item;
        }

        const headline = {
            ...normalizeMultilangText(item.headline),
            ...row.headline,
        };
        const subtitle = {
            ...normalizeMultilangText(item.subtitle),
            ...row.subtitle,
        };

        return {
            ...item,
            headline,
            subtitle,
        };
    });
}
