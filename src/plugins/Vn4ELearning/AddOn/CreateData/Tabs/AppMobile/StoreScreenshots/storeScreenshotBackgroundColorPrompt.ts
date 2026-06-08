import type { StoreScreenshotTemplate } from './storeScreenshotTypes';
import { normalizeHexColor } from './storeScreenshotColorUtils';
import {
    BACKGROUND_OPTIONS,
    DEFAULT_STYLE_ADVANCED,
    resolveStyleAdvancedFields,
} from './storeScreenshotStyleOptions';

export function normalizeBackgroundColor(value?: string | null): string {
    return normalizeHexColor(value);
}

export function hasCustomBackgroundColor(value?: string | null): boolean {
    return normalizeBackgroundColor(value) !== '';
}

export function buildBackgroundColorPromptLines(
    screenshotBackgroundColor: string | undefined | null,
    template: StoreScreenshotTemplate,
): string[] {
    const brandColor = normalizeHexColor(template.brand_color, '#1A73E8');
    const imageBg = normalizeBackgroundColor(screenshotBackgroundColor);

    if (!imageBg) {
        return [
            '## Per-screenshot background color',
            'No custom background color for this screenshot — use the global template background style driven by brand color only.',
            `Keep all canvas tones harmonious with brand color ${brandColor}.`,
        ];
    }

    const advanced = resolveStyleAdvancedFields(template);
    const background = BACKGROUND_OPTIONS.find((option) => option.id === advanced.background_mode)
        ?? BACKGROUND_OPTIONS.find((option) => option.id === DEFAULT_STYLE_ADVANCED.background_mode)
        ?? BACKGROUND_OPTIONS[0];

    return [
        '## Per-screenshot background color (CUSTOM — this image)',
        `This screenshot has its own marketing background anchor color: ${imageBg}.`,
        `Brand color for accents and identity: ${brandColor}.`,
        '',
        '### How to combine both colors',
        `The outer marketing canvas (gradient, mesh, or solid) must be dominated by ${imageBg}.`,
        `Derive lighter and darker gradient/mesh stops from ${imageBg} — stay in the same hue family.`,
        `Use ${brandColor} for accents only: headline keyword tint, subtle strokes on floating icons, small motif tints, logo harmony — not as the main fill unless it matches ${imageBg}.`,
        `If ${imageBg} and ${brandColor} are close, vary lightness/saturation for depth while keeping cohesion.`,
        `If they differ strongly, ${imageBg} owns the background; ${brandColor} appears in typography and micro-accents.`,
        '',
        `### Apply template background mode (${background.label}) on top of ${imageBg}`,
        `Interpret "${background.label}" using ${imageBg} as the primary hue instead of default brand-only fill.`,
        'Device mockup and in-app UI stay true to the screenshot — only the marketing backdrop follows this palette.',
        'Floating icons and background motifs (if enabled) must use tints compatible with both colors.',
    ];
}
