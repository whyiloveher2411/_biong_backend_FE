import type { StoreScreenshotTemplate } from './storeScreenshotTypes';
import { normalizeHexColor } from './storeScreenshotColorUtils';

export function normalizeBackgroundColor(value?: string | null): string {
    return normalizeHexColor(value);
}

export function hasCustomBackgroundColor(value?: string | null): boolean {
    return normalizeBackgroundColor(value) !== '';
}

/** Gợi ý màu nền từ Gemini — bỏ trống nếu không có hoặc trùng màu brand template. */
export function resolveGeminiMarketingBackgroundColor(
    suggested?: string | null,
    brandColor?: string | null,
): string {
    const normalized = normalizeBackgroundColor(suggested);
    if (!normalized) {
        return '';
    }

    const brand = normalizeHexColor(brandColor);
    if (brand && normalized.toUpperCase() === brand.toUpperCase()) {
        return '';
    }

    return normalized;
}

export function buildBackgroundColorPromptLines(
    screenshotBackgroundColor: string | undefined | null,
    template: StoreScreenshotTemplate,
): string[] {
    const brandColor = normalizeHexColor(template.brand_color, '#1A73E8');
    const imageBg = normalizeBackgroundColor(screenshotBackgroundColor);

    if (!imageBg) {
        return [`Background: template style from brand ${brandColor}.`];
    }

    return [
        `Background anchor: ${imageBg} (dominant canvas). Brand ${brandColor} for accents only.`,
    ];
}
