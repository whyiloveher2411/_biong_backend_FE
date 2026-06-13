import type { ImageObjectProps } from 'helpers/image';
import type { StoreScreenshotItem } from './storeScreenshotTypes';

/** Encode path URL (khoảng trắng trong tên file → %20) để <img> load đúng. */
export function encodeExternalImageUrl(url: string): string {
    const raw = String(url || '').trim();
    if (!raw) {
        return '';
    }

    try {
        const parsed = new URL(raw);
        parsed.pathname = parsed.pathname
            .split('/')
            .map((segment) => (segment === '' ? segment : encodeURIComponent(decodeURIComponent(segment))))
            .join('/');
        return parsed.toString();
    } catch {
        return raw.replace(/ /g, '%20');
    }
}

/** Thêm ?t= để tránh browser/CDN cache ảnh cũ sau khi upload lại cùng URL. */
export function encodeExternalImageUrlWithCacheBust(url: string, timestamp?: number): string {
    const encoded = encodeExternalImageUrl(url);
    if (!encoded) {
        return '';
    }

    const t = timestamp ?? Date.now();
    try {
        const parsed = new URL(encoded);
        parsed.searchParams.set('t', String(t));
        return parsed.toString();
    } catch {
        const separator = encoded.includes('?') ? '&' : '?';
        return `${encoded}${separator}t=${t}`;
    }
}

export function imageUrlToImageValue(
    url: string,
    width = 0,
    height = 0,
): ImageObjectProps[] {
    const object = imageUrlToImageObject(url, width, height);
    return object ? [object] : [];
}

/** Giá trị post cho ImageForm single (OnlyOneChoose) — object hoặc '' khi trống. */
export function imageUrlToImagePostValue(
    url: string,
    width = 0,
    height = 0,
): ImageObjectProps | '' {
    return imageUrlToImageObject(url, width, height) || '';
}

export function imageUrlToImageObject(
    url: string,
    width = 0,
    height = 0,
): ImageObjectProps | null {
    const link = String(url || '').trim();
    if (!link) {
        return null;
    }

    return {
        link,
        type_link: /^https?:\/\//i.test(link) ? 'external' : 'local',
        ext: link.split('.').pop()?.split('?')[0] || 'png',
        width,
        height,
    };
}

export function normalizeImageFieldValue(value: JsonFormat): ImageObjectProps | null {
    if (Array.isArray(value)) {
        const first = value[0];
        return first && typeof first === 'object' && 'link' in first
            ? (first as ImageObjectProps)
            : null;
    }

    if (value && typeof value === 'object' && 'link' in (value as object)) {
        const image = value as ImageObjectProps;
        return String(image.link || '').trim() ? image : null;
    }

    return null;
}

export function readImagePostFieldValue(
    postValue: ImageObjectProps | ImageObjectProps[] | '' | null | undefined,
): ImageObjectProps | null {
    if (Array.isArray(postValue)) {
        return postValue[0] || null;
    }

    if (postValue && typeof postValue === 'object' && 'link' in postValue) {
        return String(postValue.link || '').trim() ? postValue : null;
    }

    return null;
}

export function getStoreScreenshotAiFieldName(screenshotId: string): string {
    return `store_screenshot_ai_${screenshotId}`;
}

export function resolveStoreScreenshotAiImageCacheBust(
    item: Pick<StoreScreenshotItem, 'ai_image_version'>,
): number | undefined {
    const version = Number(item.ai_image_version || 0);
    return version > 0 ? version : undefined;
}

/** Gỡ ?t= trước khi lưu server — chỉ dùng cho cache bust phía client. */
export function stripImageUrlCacheBust(url: string): string {
    const raw = String(url || '').trim();
    if (!raw) {
        return '';
    }

    try {
        const parsed = new URL(raw);
        parsed.searchParams.delete('t');
        const query = parsed.searchParams.toString();
        return query ? `${parsed.origin}${parsed.pathname}?${query}` : `${parsed.origin}${parsed.pathname}`;
    } catch {
        return raw
            .replace(/([?&])t=\d+(?=&|$)/, '$1')
            .replace(/[?&]$/, '');
    }
}

export function stripImageObjectCacheBust(image: ImageObjectProps | null): ImageObjectProps | null {
    if (!image?.link) {
        return image;
    }

    return {
        ...image,
        link: stripImageUrlCacheBust(image.link),
    };
}

export function resolveStoreScreenshotAiImageDisplayUrl(
    item: Pick<StoreScreenshotItem, 'ai_image_url' | 'ai_image_version'>,
): string {
    const url = String(item.ai_image_url || '').trim();
    if (!url) {
        return '';
    }

    return encodeExternalImageUrlWithCacheBust(
        url,
        resolveStoreScreenshotAiImageCacheBust(item),
    );
}
