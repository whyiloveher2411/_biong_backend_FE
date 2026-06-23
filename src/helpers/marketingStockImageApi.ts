import { ajax } from 'hook/useApi';
import { parseShortVideoApiMessage } from 'helpers/shortVideoApiMessage';

export type StockMediaProvider = 'pexels';
export type StockMediaType = 'image' | 'video';

export type StockImageSearchItem = {
    id: number;
    url: string;
    preview_url: string;
    width: number;
    height: number;
    photographer: string;
    photographer_url: string;
    provider: StockMediaProvider;
};

export type StockVideoSearchItem = {
    id: number;
    url: string;
    preview_url: string;
    width: number;
    height: number;
    duration: number;
    user: string;
    user_url: string;
    provider: StockMediaProvider;
};

export type StockMediaSearchResult = {
    success?: boolean;
    message?: string | { content?: string };
    provider?: StockMediaProvider;
    media_type?: StockMediaType;
    items?: StockImageSearchItem[] | StockVideoSearchItem[];
    page?: number;
    per_page?: number;
    total_results?: number;
};

/** @deprecated Dùng StockMediaProvider */
export type StockImageProvider = StockMediaProvider;

export async function searchStockMedia(options: {
    mediaType?: StockMediaType;
    provider?: StockMediaProvider;
    query: string;
    page?: number;
    perPage?: number;
}): Promise<StockMediaSearchResult> {
    const mediaType = options.mediaType ?? 'image';
    const fallbackMessage = mediaType === 'video' ? 'Tìm video thất bại' : 'Tìm ảnh thất bại';
    const result = (await ajax({
        url: 'plugin/vn4-e-learning/app-mobile/marketing/stock-images/search-stock-images',
        data: {
            provider: options.provider ?? 'pexels',
            media_type: mediaType,
            query: options.query.trim(),
            page: options.page ?? 1,
            per_page: options.perPage ?? 20,
        },
        loading: false,
    })) as StockMediaSearchResult;

    if (!result?.success) {
        throw new Error(
            parseShortVideoApiMessage(result?.message, fallbackMessage)
        );
    }

    return result;
}

export async function searchStockImages(options: {
    provider?: StockMediaProvider;
    query: string;
    page?: number;
    perPage?: number;
}): Promise<StockMediaSearchResult> {
    return searchStockMedia({ ...options, mediaType: 'image' });
}

export async function searchStockVideos(options: {
    provider?: StockMediaProvider;
    query: string;
    page?: number;
    perPage?: number;
}): Promise<StockMediaSearchResult> {
    return searchStockMedia({ ...options, mediaType: 'video' });
}
