import { ajax } from 'hook/useApi';
import { getAdminApiPrefix } from 'helpers/apiHost';
import { getLanguage } from 'helpers/i18n';
import { convertToURL } from 'helpers/url';
import { getAccessToken } from 'store/user/user.reducers';

const CHANNEL_BASE_PATH = 'plugin/vn4-e-learning/app-mobile/marketing/short-video/channel';

/** Kênh short video — post type spacedev_app_short_video_channel. */
export type ShortVideoChannel = {
    id: number;
    title: string;
    description: string;
    /** JSON {type_link, link} của field view=image (hoặc chuỗi rỗng). */
    image: string | Record<string, unknown> | null;
    keyword: string;
    category: string;
    video_format: string;
    lang: string;
    voice: string;
    hashtags: string;
    cta: string;
    tone: string;
    target_audience: string;
    created_at?: string;
    updated_at?: string;
};

export type ShortVideoChannelSavePayload = {
    id?: number;
    title: string;
    description?: string;
    /** JSON {type_link, link} hoặc URL — gửi nguyên qua BE. */
    image?: string | Record<string, unknown> | null;
    keyword?: string;
    category?: string;
    video_format?: string;
    lang?: string;
    voice?: string;
    hashtags?: string;
    cta?: string;
    tone?: string;
    target_audience?: string;
};

type ApiMessageLike = { content?: string } | string | undefined;

/** Lấy message dạng string từ result API (message là string hoặc {content}). */
export function parseShortVideoChannelApiMessage(
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

export function listShortVideoChannels(): Promise<{
    success?: boolean;
    channels?: ShortVideoChannel[];
}> {
    return ajax({
        url: `${CHANNEL_BASE_PATH}/list`,
        method: 'POST',
        loading: false,
        data: {},
    }) as Promise<{ success?: boolean; channels?: ShortVideoChannel[] }>;
}

export function saveShortVideoChannel(payload: ShortVideoChannelSavePayload): Promise<{
    success?: boolean;
    channel?: ShortVideoChannel;
    channel_id?: number;
}> {
    const image = payload.image ?? '';
    return ajax({
        url: `${CHANNEL_BASE_PATH}/save`,
        method: 'POST',
        loading: false,
        data: {
            id: payload.id ?? 0,
            title: payload.title,
            description: payload.description ?? '',
            image: image && typeof image === 'object' ? JSON.stringify(image) : image,
            keyword: payload.keyword ?? '',
            category: payload.category ?? '',
            video_format: payload.video_format ?? '',
            lang: payload.lang ?? '',
            voice: payload.voice ?? '',
            hashtags: payload.hashtags ?? '',
            cta: payload.cta ?? '',
            tone: payload.tone ?? '',
            target_audience: payload.target_audience ?? '',
        },
    }) as Promise<{ success?: boolean; channel?: ShortVideoChannel; channel_id?: number }>;
}

export function deleteShortVideoChannels(ids: number[]): Promise<{
    success?: boolean;
    deleted?: number;
    deleted_ids?: number[];
}> {
    return ajax({
        url: `${CHANNEL_BASE_PATH}/delete`,
        method: 'POST',
        loading: false,
        data: { ids },
    }) as Promise<{ success?: boolean; deleted?: number; deleted_ids?: number[] }>;
}

/** Lưu kênh của short video (1 video thuộc 1 kênh, 0 = bỏ chọn). */
export function saveShortVideoAgentChannel(shortVideoId: number, channelId: number): Promise<{
    success?: boolean;
    short_video_id?: number;
    agent_channel_id?: number;
}> {
    return ajax({
        url: 'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-channel',
        method: 'POST',
        loading: false,
        data: { short_video_id: shortVideoId, agent_channel_id: channelId },
    }) as Promise<{
        success?: boolean;
        short_video_id?: number;
        agent_channel_id?: number;
    }>;
}

/** Kênh của short video đang dùng. Trả null khi chưa chọn / kênh đã xóa / lỗi. */
export async function fetchShortVideoAgentChannel(
    shortVideoId: number,
): Promise<{ channelId: number; channel: ShortVideoChannel | null } | null> {
    if (shortVideoId <= 0) {
        return null;
    }
    try {
        const result = (await ajax({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/short-video/get-agent-channel',
            method: 'POST',
            loading: false,
            data: { short_video_id: shortVideoId },
        })) as {
            success?: boolean;
            channel_id?: number;
            channel?: ShortVideoChannel;
        };
        if (!result?.success) {
            return null;
        }
        const channel = result.channel && result.channel.id ? result.channel : null;
        return {
            channelId: Number(result.channel_id || 0),
            channel,
        };
    } catch {
        return null;
    }
}

/**
 * Upload ảnh đại diện kênh lên S3/R2 (multipart, giống ảnh resource).
 * channelId > 0 → BE tự cập nhật field image của kênh sau khi upload.
 */
export async function uploadShortVideoChannelImage(
    file: File,
    channelId = 0,
): Promise<{ success?: boolean; url?: string; preview_url?: string; s3_key?: string }> {
    const formData = new FormData();
    formData.append('channel_id', String(channelId));
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
            'plugin/vn4-e-learning/app-mobile/marketing/short-video/channel/upload-image',
        ),
        {
            method: 'POST',
            headers,
            body: formData,
        },
    );

    const result = await response.json();
    if (!response.ok && !(result && typeof result === 'object' && result.message)) {
        throw new Error('Upload ảnh kênh thất bại');
    }
    return result as { success?: boolean; url?: string; preview_url?: string; s3_key?: string };
}

export function shortVideoChannelImageUrl(image: ShortVideoChannel['image']): string {
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
