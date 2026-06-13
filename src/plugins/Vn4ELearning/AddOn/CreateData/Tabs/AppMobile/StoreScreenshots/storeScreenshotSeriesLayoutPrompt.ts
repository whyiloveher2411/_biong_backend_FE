import {
    getCropTargetSizeById,
    normalizeCropTargetSizeId,
} from './storeScreenshotCropTarget';
import { STORE_SCREENSHOT_LOGO_SIZE_LABEL } from './storeScreenshotLogoPlacement';

export function buildSeriesLayoutLockPromptLines(
    cropTargetSizeId?: string | null,
    appName?: string,
    options: { isLayoutAnchor?: boolean } = {},
): string[] {
    const { isLayoutAnchor = false } = options;
    const option = getCropTargetSizeById(normalizeCropTargetSizeId(cropTargetSizeId));
    const name = String(appName || '').trim() || 'App';

    if (isLayoutAnchor) {
        return [
            '## Series anchor (screenshot #1)',
            `Establish the layout template: device MAXIMUM size (largest possible phone on canvas), logo box (${STORE_SCREENSHOT_LOGO_SIZE_LABEL}), "${name}" size, headline band.`,
            'Screenshots #2+ will copy this geometry from the layout reference — prioritize an aggressively large device here.',
            `Aspect: ${option.label} (${option.ratio}).`,
        ];
    }

    return [
        '## Series lock (match screenshot #1)',
        `Same device frame, logo box (${STORE_SCREENSHOT_LOGO_SIZE_LABEL}), "${name}" size, headline band as the layout reference. Only screen UI + copy may change.`,
        `Aspect: ${option.label} (${option.ratio}).`,
    ];
}
