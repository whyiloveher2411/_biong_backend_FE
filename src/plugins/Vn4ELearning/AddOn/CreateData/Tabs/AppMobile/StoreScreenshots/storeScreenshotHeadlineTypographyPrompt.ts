import type { StoreScreenshotTemplate } from './storeScreenshotTypes';
import type { StylePresetId } from './storeScreenshotStyleOptions';
import {
    DEFAULT_STYLE_ADVANCED,
    getStylePresetById,
    normalizeStylePresetId,
    resolveStyleAdvancedFields,
    TYPOGRAPHY_OPTIONS,
} from './storeScreenshotStyleOptions';

function getPresetTypographyMood(presetId: StylePresetId): string {
    switch (presetId) {
        case 'playful_gamified':
            return 'warm, energetic — accent words in bright brand tint or soft gold; rounded friendly feel.';
        case 'bold_marketing':
            return 'high-impact — oversized headline, strong contrast, one punchy accent color on a key verb or noun.';
        case 'dark_premium':
            return 'sleek white headline with cool blue/brand accent; subtitle in muted silver-white.';
        case 'minimal_light':
            return 'restrained — dark charcoal headline on light ground, or white on dark with one subtle brand accent only.';
        case 'clean_professional':
        default:
            return 'polished — white headline with brand-color keyword highlight; subtitle in soft tinted white.';
    }
}

export function buildHeadlineTypographyPromptLines(template: StoreScreenshotTemplate): string[] {
    const presetId = normalizeStylePresetId(template.style_preset);
    const preset = getStylePresetById(presetId);
    const advanced = resolveStyleAdvancedFields(template);
    const brandColor = template.brand_color || '#1A73E8';
    const typography = TYPOGRAPHY_OPTIONS.find((option) => option.id === advanced.typography_style)
        ?? TYPOGRAPHY_OPTIONS.find((option) => option.id === DEFAULT_STYLE_ADVANCED.typography_style)
        ?? TYPOGRAPHY_OPTIONS[0];

    return [
        '## Headline & subtitle typography on image (critical — designed, not flat)',
        'Marketing copy on the image must look art-directed — NOT plain single-color text slapped on a gradient.',
        typography.promptLine,
        '',
        '### Headline treatment',
        '- Bold/extra-bold weight; tight line-height; high impact at store thumbnail size.',
        '- Base color: white or near-white with soft drop shadow (subtle, 20–35% opacity) for depth on gradient.',
        `- Accent: highlight 1–2 key words in brand color ${brandColor}, a lighter brand tint, or soft gold (gamified apps).`,
        '- Optional: very subtle vertical gradient on headline text (white → light brand tint) — keep readable.',
        '- Never use ALL CAPS; sentence case per store guidelines.',
        '',
        '### Subtitle treatment',
        '- Clearly secondary: ~60–75% of headline visual weight.',
        '- Color: soft white at 80–90% opacity, OR light brand-tinted white — not identical to headline.',
        '- Weight: medium or semibold — one step lighter than headline.',
        '- May accent a single short phrase in brand color — never multicolor rainbow text.',
        '',
        '### Hierarchy & effects',
        'Headline and subtitle must read as a designed pair — contrast in size, weight, opacity, and/or accent color.',
        'Soft outer glow or drop shadow OK if subtle — text must stay crisp at thumbnail size.',
        'No heavy stroke outlines, 3D bevel, neon glow, or effects that reduce readability.',
        '',
        `### Match template: ${preset.label}`,
        getPresetTypographyMood(presetId),
        '',
        'Wrong: headline and subtitle both flat identical white with no accent, shadow, or hierarchy.',
        'Right: bold white headline with one brand-color keyword + softer tinted subtitle beneath — feels like a premium store creative.',
    ];
}
