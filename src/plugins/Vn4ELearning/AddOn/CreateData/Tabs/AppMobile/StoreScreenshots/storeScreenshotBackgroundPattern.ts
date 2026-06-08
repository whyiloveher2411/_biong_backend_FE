import { normalizeHexColor } from './storeScreenshotColorUtils';
import type { StoreScreenshotTemplate } from './storeScreenshotTypes';
import type { BackgroundModeId } from './storeScreenshotStyleOptions';
import {
    BACKGROUND_OPTIONS,
    DEFAULT_STYLE_ADVANCED,
    resolveStyleAdvancedFields,
} from './storeScreenshotStyleOptions';
import { normalizeDecorOptionEnabled } from './storeScreenshotDecorOptions';

export type BackgroundPatternId =
    | 'none'
    | 'geometric_patterns'
    | 'grid_mesh'
    | 'abstract_shapes'
    | 'gradient_background'
    | 'subtle_textures'
    | 'decorative_elements'
    | 'brand_patterns'
    | 'visual_anchors';

export const DEFAULT_BACKGROUND_PATTERN_ID: BackgroundPatternId = 'decorative_elements';

export type BackgroundPatternOption = {
    id: BackgroundPatternId;
    label: string;
    description: string;
    term: string;
};

export const BACKGROUND_PATTERN_OPTIONS: BackgroundPatternOption[] = [
    {
        id: 'none',
        label: 'Không họa tiết',
        term: 'Flat backdrop',
        description: 'Chỉ giữ nền gradient/solid/mesh từ template — không thêm pattern hay texture trang trí.',
    },
    {
        id: 'geometric_patterns',
        label: 'Geometric patterns',
        term: 'Họa tiết hình học',
        description: 'Hình tròn, tam giác, đa giác hoặc khối lặp lại — góc cạnh rõ, cảm giác có cấu trúc.',
    },
    {
        id: 'grid_mesh',
        label: 'Grid lines / mesh',
        term: 'Lưới tọa độ',
        description: 'Lưới caro hoặc mesh mỏng — phù hợp app công nghệ, AI, tài chính; chính xác và hiện đại.',
    },
    {
        id: 'abstract_shapes',
        label: 'Abstract shapes',
        term: 'Hình khối trừu tượng',
        description: 'Blob, đường cong organic mềm mại — tạo chiều sâu nền mà không cứng nhắc.',
    },
    {
        id: 'gradient_background',
        label: 'Gradient background',
        term: 'Nền chuyển màu',
        description: 'Gradient mượt làm chủ đạo, có thể kèm glow hoặc light leak nhẹ ở góc/cạnh.',
    },
    {
        id: 'subtle_textures',
        label: 'Subtle textures',
        term: 'Vân họa tiết mờ',
        description: 'Noise, vân giấy hoặc grain rất nhẹ — nền không đơn điệu nhưng không phân tâm.',
    },
    {
        id: 'decorative_elements',
        label: 'Decorative background elements',
        term: 'Yếu tố trang trí nền',
        description: 'Sao, vòng tròn, blob mềm lấp white space — classic App Store marketing backdrop.',
    },
    {
        id: 'brand_patterns',
        label: 'Brand patterns',
        term: 'Họa tiết thương hiệu',
        description: 'Pattern lấy cảm hứng từ logo hoặc nhận diện app — đồng bộ màu brand.',
    },
    {
        id: 'visual_anchors',
        label: 'Visual anchors',
        term: 'Neo thị giác',
        description: 'Họa tiết dẫn mắt về headline hoặc khung điện thoại — định hình bố cục, không tranh spotlight.',
    },
];

const PATTERN_ID_SET = new Set(BACKGROUND_PATTERN_OPTIONS.map((option) => option.id));

export function getBackgroundPatternOption(id: BackgroundPatternId | string): BackgroundPatternOption {
    const matched = BACKGROUND_PATTERN_OPTIONS.find((option) => option.id === id);
    if (matched) {
        return matched;
    }

    const fallback = BACKGROUND_PATTERN_OPTIONS.find(
        (option) => option.id === DEFAULT_BACKGROUND_PATTERN_ID,
    );
    return fallback ?? BACKGROUND_PATTERN_OPTIONS[0];
}

export function normalizeBackgroundPatternId(
    value?: string | null,
    legacyMotifsEnabled?: boolean | string | number | null,
): BackgroundPatternId {
    const normalized = String(value || '').trim().toLowerCase();
    if (PATTERN_ID_SET.has(normalized as BackgroundPatternId)) {
        return normalized as BackgroundPatternId;
    }

    if (legacyMotifsEnabled !== undefined && legacyMotifsEnabled !== null) {
        return normalizeDecorOptionEnabled(legacyMotifsEnabled, true)
            ? DEFAULT_BACKGROUND_PATTERN_ID
            : 'none';
    }

    return DEFAULT_BACKGROUND_PATTERN_ID;
}

function getBackgroundModePatternGuidance(
    mode: BackgroundModeId,
    brandColor: string,
    screenshotBackgroundColor?: string | null,
): string {
    const anchorColor = normalizeHexColor(screenshotBackgroundColor) || brandColor;
    switch (mode) {
        case 'brand_gradient':
            return `Integrate pattern with vertical gradient anchored on ${anchorColor}; brand accent ${brandColor} on 1–2 motif accents only.`;
        case 'soft_mesh':
            return `Weave pattern into mesh pools on ${anchorColor}; follow color flow between mesh tones.`;
        case 'solid_brand':
            return `Use white or lighter tints of ${anchorColor} at low opacity so pattern reads on flat fill.`;
        case 'light_neutral':
            return 'Use soft gray or brand-tinted pattern at very low opacity on light neutral ground.';
        case 'dark_charcoal':
            return 'Use muted glow shapes, fine grid, or speckles on charcoal — premium subtle depth.';
        default:
            return 'Match pattern color to the chosen background palette.';
    }
}

function getPatternStyleGuidance(patternId: BackgroundPatternId): string[] {
    switch (patternId) {
        case 'none':
            return [
                'Keep the backdrop minimal — only the base gradient, solid, or mesh from the visual style.',
                'Do NOT add geometric scatter, grid, texture grain, glow blobs, or decorative shapes on the background.',
            ];
        case 'geometric_patterns':
            return [
                'Use repeating or scattered geometric shapes: circles, triangles, hexagons, polygons.',
                'Clean edges, 2–3 size tiers, low-to-medium opacity (roughly 15–35%).',
                'Place in corners and side margins — never on the phone screen or over headline text.',
                'Wrong: chaotic rainbow geometry competing with the device.',
            ];
        case 'grid_mesh':
            return [
                'Add coordinate grid, fine mesh, or subtle checker lines — tech/fintech/AI aesthetic.',
                'Lines should be thin, evenly spaced, and faint (roughly 10–25% opacity).',
                'Perspective or isometric grid OK in negative space only — not over device.',
                'Wrong: heavy opaque grid that looks like app UI outside the phone.',
            ];
        case 'abstract_shapes':
            return [
                'Soft organic blobs, curved ribbons, and flowing abstract forms for depth.',
                'Large corner blobs + medium mid-field curves — smooth, no hard corporate grid.',
                'Opacity roughly 20–40%; shapes may bleed off canvas edges.',
            ];
        case 'gradient_background':
            return [
                'Let smooth color transition be the hero backdrop layer — rich gradient or mesh as the pattern itself.',
                'Optional soft glow orbs and light leaks at corners — no busy shape scatter on top.',
                'Derive gradient stops from the per-screenshot/brand anchor colors in the color section.',
            ];
        case 'subtle_textures':
            return [
                'Apply very faint paper grain, fine noise, or dust speckle across the backdrop.',
                'Texture must be almost subliminal at thumbnail size — never gritty or high-contrast.',
                'No large decorative shapes — texture only, uniform or gently vignetted.',
            ];
        case 'decorative_elements':
            return [
                'Classic store-art decoration: soft stars, rings, circles, rounded blobs in empty space.',
                '4–8 elements max — readable silhouettes at thumbnail size, roughly 20–40% opacity.',
                'Fill corners and wings beside the device; motifs stay flat behind everything.',
            ];
        case 'brand_patterns':
            return [
                'Derive motif shapes or rhythm from the app logo / brand identity (not a second logo).',
                'Repeat subtle brand-inspired marks — hexagon nodes, arc segments, icon silhouettes — in brand tints.',
                'Cohesive with logo color; decorative only, never duplicate the full logo large-scale.',
            ];
        case 'visual_anchors':
            return [
                'Use pattern as composition guides: diagonal lines, corner arcs, or soft vignette shapes.',
                'Direct the eye toward headline band and phone cluster — Rule of Thirds friendly.',
                'Anchors are softer and larger than decorative stars; they frame, not distract.',
            ];
        default:
            return [];
    }
}

export function buildBackgroundPatternPromptLines(
    patternId: BackgroundPatternId | string,
    template: StoreScreenshotTemplate,
    screenshotBackgroundColor?: string | null,
): string[] {
    const resolvedId = normalizeBackgroundPatternId(patternId);
    const option = getBackgroundPatternOption(resolvedId);
    const advanced = resolveStyleAdvancedFields(template);
    const brandColor = normalizeHexColor(template.brand_color, '#1A73E8');
    const imageBg = normalizeHexColor(screenshotBackgroundColor);
    const background = BACKGROUND_OPTIONS.find((item) => item.id === advanced.background_mode)
        ?? BACKGROUND_OPTIONS.find((item) => item.id === DEFAULT_STYLE_ADVANCED.background_mode)
        ?? BACKGROUND_OPTIONS[0];

    if (resolvedId === 'none') {
        return [
            '## Background pattern / texture',
            `Selected: ${option.label} (${option.term}).`,
            ...getPatternStyleGuidance('none'),
        ];
    }

    return [
        '## Background pattern / texture (ENABLED)',
        `Selected style: ${option.label} — ${option.term}.`,
        `Design intent: ${option.description}`,
        '',
        'Background patterns sit on the deepest layer — behind device, floating icons, headline, and logo.',
        'These are NOT floating app icons. Do not place patterns on the phone screen glass.',
        '',
        '### Style rules for this pattern',
        ...getPatternStyleGuidance(resolvedId),
        '',
        '### Opacity & contrast (critical)',
        'Keep patterns subtle — roughly 10–40% opacity unless the style explicitly needs slightly stronger grid lines.',
        'Headline and in-app UI must remain the focal points; pattern must not "swallow" the main content.',
        '',
        ...(imageBg
            ? [`Per-screenshot background anchor: ${imageBg} — pattern tints follow ${imageBg}, brand ${brandColor} as accent.`]
            : [`Harmonize pattern tints with brand color ${brandColor}.`]),
        `### Match template background mode: ${background.label}`,
        getBackgroundModePatternGuidance(advanced.background_mode, brandColor, screenshotBackgroundColor),
        '',
        'Z-order: base fill → background pattern/texture → device mockup → floating icons (if any) → text/logo.',
    ];
}
