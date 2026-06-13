import type { ImageObjectProps } from 'helpers/image';
import { convertToURL, validURL } from 'helpers/url';
import type { StoreScreenshotItem } from './storeScreenshotTypes';

export const STORE_SCREENSHOT_SOURCE_IMAGE_FIELD = 'store_screenshot_images';

export function sortStoreScreenshots(screenshots: StoreScreenshotItem[]): StoreScreenshotItem[] {
    return [...screenshots].sort((a, b) => a.order - b.order);
}

export function screenshotsToImageValue(screenshots: StoreScreenshotItem[]): ImageObjectProps[] {
    return screenshots.map((shot) => {
        const link = shot.source_url || '';
        return {
            link,
            type_link: /^https?:\/\//i.test(link) ? 'external' : 'local',
            ext: link.split('.').pop()?.split('?')[0] || 'png',
            width: shot.width,
            height: shot.height,
        };
    });
}

export function resolveStoreScreenshotImageLink(image: ImageObjectProps): string {
    const link = String(image.link || '').trim();
    if (!link) {
        return '';
    }
    if (validURL(link)) {
        return link;
    }
    return convertToURL(process.env.REACT_APP_BASE_URL, link);
}

export function normalizeStoreScreenshotShotUrl(url: string): string {
    const raw = String(url || '').trim();
    if (!raw) {
        return '';
    }
    try {
        const parsed = new URL(raw);
        return `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, '').toLowerCase();
    } catch {
        return raw.split('?')[0].replace(/\/+$/, '').toLowerCase();
    }
}

export function buildCaptionPayloadByUrl(
    images: ImageObjectProps[],
    captionsByUrl: Record<string, string>,
): Record<string, string> {
    const payloadByUrl: Record<string, string> = {};
    images.forEach((image) => {
        const sourceUrl = resolveStoreScreenshotImageLink(image);
        const norm = normalizeStoreScreenshotShotUrl(sourceUrl);
        if (norm) {
            payloadByUrl[norm] = captionsByUrl[norm] ?? '';
        }
    });
    return payloadByUrl;
}
