import { ajax } from 'hook/useApi';
import { getAdminApiPrefix } from 'helpers/apiHost';
import { getLanguage } from 'helpers/i18n';
import { convertToURL } from 'helpers/url';
import { getAccessToken } from 'store/user/user.reducers';

const IMAGE_STYLE_BASE_PATH = 'plugin/vn4-e-learning/app-mobile/marketing/short-video/image-style';

/** Phong cách hình ảnh — post type spacedev_app_short_video_style. */
export type ShortVideoImageStyle = {
    id: number;
    title: string;
    description: string;
    /** JSON {type_link, link} của field view=image (hoặc chuỗi rỗng). */
    image: string | Record<string, unknown> | null;
    prompt: string;
    created_at?: string;
    updated_at?: string;
};

export type ShortVideoImageStyleSavePayload = {
    id?: number;
    title: string;
    description?: string;
    /** JSON {type_link, link} hoặc URL — gửi nguyên qua BE. */
    image?: string | Record<string, unknown> | null;
    prompt?: string;
};

type ApiMessageLike = { content?: string } | string | undefined;

/** Lấy message dạng string từ result API (message là string hoặc {content}). */
export function parseShortVideoImageStyleApiMessage(
    source: unknown,
    fallback = 'Yêu cầu thất bại',
): string {
    const record = source && typeof source === 'object' ? (source as Record<string, unknown>) : null;
    const message: ApiMessageLike = record ? (record.message as ApiMessageLike) : undefined;
    if (typeof message === 'string' && message.trim()) {
        return message;
    }
    if (message && typeof message === 'object' && typeof message.content === 'string' && message.content.trim()) {
        return message.content;
    }
    return fallback;
}

export function listShortVideoImageStyles(): Promise<{
    success?: boolean;
    styles?: ShortVideoImageStyle[];
}> {
    return ajax({
        url: `${IMAGE_STYLE_BASE_PATH}/list`,
        method: 'POST',
        loading: false,
        data: {},
    }) as Promise<{ success?: boolean; styles?: ShortVideoImageStyle[] }>;
}

export function saveShortVideoImageStyle(payload: ShortVideoImageStyleSavePayload): Promise<{
    success?: boolean;
    style?: ShortVideoImageStyle;
    style_id?: number;
}> {
    const image = payload.image ?? '';
    return ajax({
        url: `${IMAGE_STYLE_BASE_PATH}/save`,
        method: 'POST',
        loading: false,
        data: {
            id: payload.id ?? 0,
            title: payload.title,
            description: payload.description ?? '',
            image: image && typeof image === 'object' ? JSON.stringify(image) : image,
            prompt: payload.prompt ?? '',
        },
    }) as Promise<{ success?: boolean; style?: ShortVideoImageStyle; style_id?: number }>;
}

export function deleteShortVideoImageStyles(ids: number[]): Promise<{
    success?: boolean;
    deleted?: number;
    deleted_ids?: number[];
}> {
    return ajax({
        url: `${IMAGE_STYLE_BASE_PATH}/delete`,
        method: 'POST',
        loading: false,
        data: { ids },
    }) as Promise<{ success?: boolean; deleted?: number; deleted_ids?: number[] }>;
}

/** Lưu phong cách hình ảnh của short video (1 video thuộc 1 style, 0 = bỏ chọn). */
export function saveShortVideoAgentImageStyle(shortVideoId: number, styleId: number): Promise<{
    success?: boolean;
    short_video_id?: number;
    agent_image_style_id?: number;
}> {
    return ajax({
        url: 'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-image-style',
        method: 'POST',
        loading: false,
        data: { short_video_id: shortVideoId, agent_image_style_id: styleId },
    }) as Promise<{
        success?: boolean;
        short_video_id?: number;
        agent_image_style_id?: number;
    }>;
}

/**
 * Prompt của phong cách hình ảnh video đang dùng — thay [prompt-style] khi copy
 * prompt workflow. Trả null khi chưa chọn style / style đã xóa / lỗi.
 */
export async function fetchShortVideoAgentImageStyle(
    shortVideoId: number,
): Promise<{ styleId: number; prompt: string; title: string } | null> {
    if (shortVideoId <= 0) {
        return null;
    }
    try {
        const result = (await ajax({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/short-video/get-agent-image-style',
            method: 'POST',
            loading: false,
            data: { short_video_id: shortVideoId },
        })) as {
            success?: boolean;
            style_id?: number;
            style?: ShortVideoImageStyle;
            prompt?: string;
        };
        if (!result?.success) {
            return null;
        }
        return {
            styleId: Number(result.style_id || 0),
            prompt: String(result.prompt || ''),
            title: String(result.style?.title || ''),
        };
    } catch {
        return null;
    }
}

/**
 * Upload thumbnail phong cách lên S3/R2 (multipart, giống ảnh resource).
 * styleId > 0 → BE tự cập nhật field image của style sau khi upload.
 */
export async function uploadShortVideoImageStyleImage(
    file: File,
    styleId = 0,
): Promise<{ success?: boolean; url?: string; preview_url?: string; s3_key?: string }> {
    const formData = new FormData();
    formData.append('style_id', String(styleId));
    formData.append('image', file);
    formData.append('__l', window.btoa(`${getLanguage().code}#${Date.now()}`));

    const headers: Record<string, string> = { Accept: 'application/json' };
    const token = getAccessToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
        convertToURL(
            getAdminApiPrefix(),
            'plugin/vn4-e-learning/app-mobile/marketing/short-video/image-style/upload-image',
        ),
        {
            method: 'POST',
            headers,
            body: formData,
        },
    );

    const result = await response.json();
    if (!response.ok && !(result && typeof result === 'object' && result.message)) {
        throw new Error('Upload ảnh phong cách thất bại');
    }
    return result as { success?: boolean; url?: string; preview_url?: string; s3_key?: string };
}

export function shortVideoImageStyleImageUrl(image: ShortVideoImageStyle['image']): string {
    let parsed: unknown = image;
    if (typeof image === 'string') {
        const text = image.trim();
        if (!text) {
            return '';
        }
        try {
            parsed = JSON.parse(text);
        } catch {
            return /^https?:\/\//.test(text) ? text : '';
        }
    }
    if (!parsed || typeof parsed !== 'object') {
        return '';
    }
    const record = parsed as Record<string, unknown>;
    const link = String(record.link || '').trim();
    if (!link) {
        return '';
    }
    return record.type_link === 'local' ? convertToURL(process.env.REACT_APP_BASE_URL, link) : link;
}
