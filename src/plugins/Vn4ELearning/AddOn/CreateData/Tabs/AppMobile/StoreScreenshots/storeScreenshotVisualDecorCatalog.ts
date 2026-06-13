import { BACKGROUND_PATTERN_OPTIONS } from './storeScreenshotBackgroundPattern';
import { normalizeHexColor } from './storeScreenshotColorUtils';

export const DECOR_STRING_LIST_MAX = 8;

export type DecorSuggestion = {
    background_pattern?: string;
    /** Màu nền marketing anchor — hex #RRGGBB, hài hòa ảnh screenshot + brand. */
    background_color?: string;
    floating_icons_enabled?: boolean;
    icons: string[];
    background_motifs: string[];
};

export const BACKGROUND_MOTIF_SHAPE_SUGGESTIONS = [
    'Lục giác (hexagon) — góc hoặc cạnh, opacity thấp',
    'Vòng tròn / ring — bo tròn, có thể rỗng giữa',
    'Blob organic bo góc — hình khối mềm',
    'Tam giác / đa giác nhỏ — geometric scatter',
    'Cung tròn (arc) — dẫn mắt về headline hoặc device',
    'Lưới chấm / dot grid — tech aesthetic',
    'Glow orb — quả cầu sáng mờ ở góc',
    'Đường chéo / ribbon — neo thị giác, framing',
    'Sao 4–5 cánh mềm — classic store decoration',
    'Vân noise / grain rất nhẹ — subtle texture',
] as const;

export const FLOATING_ICON_STYLE_HINTS = [
    'Semi-flat illustration — sáng hơn bản trong app, không photorealistic',
    'Soft-3D marketing render — có chiều sâu nhẹ, không giống nút bấm in-app',
    'Viền trắng hoặc brand 1–2px quanh silhouette',
    'Xoay nhẹ (slight rotation) — accent trang trí, không interactive',
    'Màu bão hòa cao hơn icon trên màn hình — tách khỏi UI thật',
] as const;

export const FLOATING_ICON_EXAMPLES = [
    'Trái tim (heart)',
    'Ngôi sao vàng (star)',
    'Gem / kim cương',
    'Streak / lửa',
    'Gift / hộp quà',
    'Hexagon node (nút lục giác bài học)',
    'XP / badge',
    'Bookmark / cờ',
    'Trend / biểu đồ',
    'Trophy / cup',
] as const;

function dedupeDecorStringItems(items: unknown[], max: number): string[] {
    const result: string[] = [];
    const seen = new Set<string>();

    for (const item of items) {
        const text = String(item ?? '').trim();
        if (!text) {
            continue;
        }
        const key = text.toLowerCase();
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        result.push(text);
        if (result.length >= max) {
            break;
        }
    }

    return result;
}

/** Chuẩn hoá khi lưu — trim từng dòng, bỏ dòng trống. */
export function parseDecorStringListForSave(
    value: string,
    max = DECOR_STRING_LIST_MAX,
): string[] {
    const raw = String(value ?? '');
    if (!raw.trim()) {
        return [];
    }

    const lines = raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    return dedupeDecorStringItems(lines, max);
}

export function normalizeDecorStringList(
    value: unknown,
    max = DECOR_STRING_LIST_MAX,
): string[] {
    if (value === null || value === undefined) {
        return [];
    }

    let items: unknown[] = [];
    if (Array.isArray(value)) {
        items = value;
    } else if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) {
            return [];
        }
        items = trimmed.split(/[\n,]+/);
    } else {
        return [];
    }

    return dedupeDecorStringItems(items, max);
}

export function buildDecorSuggestionPromptLines(brandColor?: string): string[] {
    const patternCatalog = BACKGROUND_PATTERN_OPTIONS.map(
        (option) => `- ${option.id}: ${option.label} — ${option.description}`,
    );
    const resolvedBrand = normalizeHexColor(brandColor, '#1A73E8');

    return [
        '## Visual decor suggestions (root level — ONE set per screenshot, shared across all copy variants)',
        'Besides headline variants, suggest background pattern + floating icons for this screenshot marketing image.',
        'Study the attached screenshot — decor must support the on-screen UI and app category, not random clipart.',
        '',
        '### background_pattern (REQUIRED — pick exactly one id)',
        'Allowed ids:',
        ...patternCatalog,
        '- Use "none" only if the backdrop should stay flat with no decorative shapes.',
        '',
        '### background_color (OPTIONAL — hex string, omit when not needed)',
        '- Format when present: "#RRGGBB" (6 hex digits, include #) — e.g. "#4B0082", "#0F172A".',
        `- Template brand color is ${resolvedBrand} — the template already uses this for default marketing backdrop.`,
        '- ONLY include background_color when the screenshot shows a DISTINCT dominant hue for the outer canvas that is NOT the template brand color.',
        `- NEVER copy ${resolvedBrand} (or any value equal to template brand) as background_color — omit the field instead.`,
        '- If marketing backdrop should follow template brand only, OMIT background_color entirely from JSON.',
        '- Sample dominant colors from screenshot UI (hero, cards, headers) — not random neon unrelated to the app.',
        '- When omitted, CMS leaves per-screenshot background empty and image generation uses template brand only.',
        '',
        '### background_motifs (array of strings, 0–6 items)',
        'Describe specific background motif shapes/placements for the chosen pattern — free text in Vietnamese or English.',
        'Shape inspiration (adapt to this screen):',
        ...BACKGROUND_MOTIF_SHAPE_SUGGESTIONS.map((item) => `- ${item}`),
        '- If background_pattern is "none", return background_motifs: [].',
        '- Motifs sit on the deepest backdrop layer — never on the phone screen.',
        '',
        '### floating_icons_enabled (boolean)',
        '- true: add 2–3 floating marketing icons beside the device (not on screen glass).',
        '- false: floating_icons_enabled false AND icons: [].',
        '',
        '### icons (array of strings, 0–3 items when enabled)',
        'Each string = one icon description INCLUDING visual style (embed style in the text, no separate field).',
        'Icon type inspiration — prefer icons visible in the attached screenshot UI:',
        ...FLOATING_ICON_EXAMPLES.map((item) => `- ${item}`),
        'Style hints to weave into each icon string:',
        ...FLOATING_ICON_STYLE_HINTS.map((item) => `- ${item}`),
        'Example item: "ngôi sao vàng soft-3D, viền trắng mỏng, xoay 15 độ"',
        '- Do NOT duplicate the same icon type twice.',
        '- Do NOT invent icons unrelated to the screenshot.',
        '',
        'Decor is independent from copy_style_id variants — same decor applies whether user picks benefit_centric or any other style.',
    ];
}

export function formatDecorStringListForField(items?: string[] | null): string {
    return (items ?? []).join('\n');
}

export function buildDecorJsonExample(): Pick<
    DecorSuggestion,
    'background_pattern' | 'floating_icons_enabled' | 'icons' | 'background_motifs'
> {
    return {
        background_pattern: 'decorative_elements',
        floating_icons_enabled: true,
        icons: [
            'hexagon node tím semi-flat, viền trắng mỏng',
            'ngôi sao vàng soft-3D, xoay nhẹ',
        ],
        background_motifs: [
            'vòng tròn mờ góc trên trái, opacity 20%',
            'blob organic bo góc cạnh phải',
        ],
    };
}
