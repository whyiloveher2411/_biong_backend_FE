import type { ImageObjectProps } from 'helpers/image';
import type { StoreScreenshotItem } from './storeScreenshotTypes';
import type { StoreScreenshotMultilangText } from './storeScreenshotMultilang';

export type EditableItem = Omit<StoreScreenshotItem, 'headline' | 'subtitle'> & {
    headline: StoreScreenshotMultilangText;
    subtitle: StoreScreenshotMultilangText;
    ai_image: ImageObjectProps | null;
};
