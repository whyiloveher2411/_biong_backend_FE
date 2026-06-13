import type { ImageObjectProps } from 'helpers/image';
import type { HeadlineCopyVariant, StoreScreenshotItem } from './storeScreenshotTypes';
import type { StoreScreenshotMultilangText } from './storeScreenshotMultilang';

export type EditableItem = Omit<StoreScreenshotItem, 'headline' | 'subtitle'> & {
    headline: StoreScreenshotMultilangText;
    subtitle: StoreScreenshotMultilangText;
    headline_variants: HeadlineCopyVariant[];
    ai_image: ImageObjectProps | null;
    iconsText?: string;
    backgroundMotifsText?: string;
};
