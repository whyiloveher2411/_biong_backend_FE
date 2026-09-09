import { ajax } from 'hook/useApi';
import { getAdminApiPrefix } from 'helpers/apiHost';
import { getLanguage } from 'helpers/i18n';
import { convertToURL } from 'helpers/url';
import { getAccessToken } from 'store/user/user.reducers';

const RESOURCE_BASE_PATH =
    'plugin/vn4-e-learning/app-mobile/marketing/short-video/resource';

export type ShortVideoResource = {
    id: number;
    title: string;
    resource_key: string;
    prompt: string;
    image_url: string;
    image_s3_key: string;
    short_video_id: number;
    created_at?: string;
    updated_at?: string;
};

export type ShortVideoResourceSavePayload = {
    id?: number;
    short_video_id: number;
    resource_key: string;
    title: string;
    prompt: string;
    image?: { url: string; s3_key: string } | null;
};

type ApiMessageLike = { content?: string } | string | undefined;

/** Lấy message dạng string từ result API (message là string hoặc {content}). */
export function parseShortVideoResourceApiMessage(
    source: unknown,
    fallback = 'Yêu cầu thất bại',
): string {
    const record = source && typeof source === 'object' ? source as Record<string, unknown> : null;
    const message: ApiMessageLike = record ? record.message as ApiMessageLike : undefined;

    if (typeof message === 'string' && message.trim()) {
        return message;
    }
    if (message && typeof message === 'object' && typeof message.content === 'string' && message.content.trim()) {
        return message.content;
    }
    return fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

export function listShortVideoResources(shortVideoId: number): Promise<{
    success?: boolean;
    resources?: ShortVideoResource[];
}> {
    return ajax({
        url: `${RESOURCE_BASE_PATH}/list`,
        method: 'POST',
        loading: false,
        data: { short_video_id: shortVideoId },
    }) as Promise<{ success?: boolean; resources?: ShortVideoResource[] }>;
}

export function saveShortVideoResource(
    payload: ShortVideoResourceSavePayload,
): Promise<{
    success?: boolean;
    resource?: ShortVideoResource;
    resource_id?: number;
    duplicate_id?: number;
}> {
    const body: Record<string, unknown> = {
        id: payload.id ?? 0,
        short_video_id: payload.short_video_id,
        resource_key: payload.resource_key,
        title: payload.title,
        prompt: payload.prompt,
    };
    if (payload.image !== undefined) {
        body.image = payload.image;
    }

    return ajax({
        url: `${RESOURCE_BASE_PATH}/save`,
        method: 'POST',
        loading: false,
        data: body,
    }) as Promise<{
        success?: boolean;
        resource?: ShortVideoResource;
        resource_id?: number;
        duplicate_id?: number;
    }>;
}

export function deleteShortVideoResource(resourceId: number): Promise<{
    success?: boolean;
    resource_id?: number;
}> {
    return ajax({
        url: `${RESOURCE_BASE_PATH}/delete`,
        method: 'POST',
        loading: false,
        data: { id: resourceId },
    }) as Promise<{ success?: boolean; resource_id?: number }>;
}

export async function uploadShortVideoResourceImage(
    shortVideoId: number,
    file: File,
): Promise<{ success?: boolean; url?: string; preview_url?: string; s3_key?: string }> {
    const formData = new FormData();
    formData.append('short_video_id', String(shortVideoId));
    formData.append('id', String(shortVideoId));
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
            'plugin/vn4-e-learning/app-mobile/marketing/short-video/resource/upload-image',
        ),
        {
            method: 'POST',
            headers,
            body: formData,
        },
    );

    const result = asRecord(await response.json());
    if (!response.ok && !result?.message) {
        throw new Error('Upload ảnh resource thất bại');
    }
    return result as { success?: boolean; url?: string; preview_url?: string; s3_key?: string };
}
