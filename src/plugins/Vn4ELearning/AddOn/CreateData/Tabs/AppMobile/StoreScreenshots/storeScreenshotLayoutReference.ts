import type { StoreScreenshotItem } from './storeScreenshotTypes';

type LayoutReferenceItem = Pick<StoreScreenshotItem, 'id' | 'order' | 'ai_image_url'>;

export type LayoutReference = {
    url: string;
    order: number;
};

export function resolveLayoutReference(
    items: LayoutReferenceItem[],
    currentItem?: Pick<StoreScreenshotItem, 'id' | 'order'> | null,
): LayoutReference | null {
    if (!currentItem || currentItem.order <= 1) {
        return null;
    }

    const anchor = items.find((item) => item.order === 1);
    const url = String(anchor?.ai_image_url || '').trim();
    if (!url) {
        return null;
    }

    return {
        url,
        order: 1,
    };
}
