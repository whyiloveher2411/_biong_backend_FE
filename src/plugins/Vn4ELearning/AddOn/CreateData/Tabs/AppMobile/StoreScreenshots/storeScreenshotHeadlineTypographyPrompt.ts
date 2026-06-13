import type { StoreScreenshotTemplate } from './storeScreenshotTypes';
import {
    DEFAULT_STYLE_ADVANCED,
    getStylePresetById,
    normalizeStylePresetId,
    resolveStyleAdvancedFields,
    TYPOGRAPHY_OPTIONS,
} from './storeScreenshotStyleOptions';

export function buildHeadlineTypographyPromptLines(template: StoreScreenshotTemplate): string[] {
    const presetId = normalizeStylePresetId(template.style_preset);
    const preset = getStylePresetById(presetId);
    const advanced = resolveStyleAdvancedFields(template);
    const brandColor = template.brand_color || '#1A73E8';
    const typography = TYPOGRAPHY_OPTIONS.find((option) => option.id === advanced.typography_style)
        ?? TYPOGRAPHY_OPTIONS.find((option) => option.id === DEFAULT_STYLE_ADVANCED.typography_style)
        ?? TYPOGRAPHY_OPTIONS[0];

    return [
        `Typography (${preset.label}): ${typography.promptLine}`,
        `Headline: bold white + soft shadow; accent 1–2 words in ${brandColor}. Sentence case, no ALL CAPS.`,
        'Subtitle: 60–75% headline weight, softer white/tint — clearly secondary.',
        'Designed pair — not flat identical white blocks. Crisp at thumbnail size.',
    ];
}
