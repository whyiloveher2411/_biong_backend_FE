import { getAccessToken } from 'store/user/user.reducers';
import { getApiHost } from 'helpers/apiHost';
import { convertToURL } from 'helpers/url';

export type ShortVideoRenderResult = {
    success?: boolean;
    message?: string;
    short_video_id?: number;
    video_url?: string;
    video_s3_key?: string;
    generate_status?: string;
};

export function shortVideoRenderApiUrl(): string {
    return convertToURL(
        getApiHost(),
        '/api/admin/plugin/vn4-e-learning/app-mobile/marketing/short-video/render-video'
    );
}

export async function triggerShortVideoRender(options: {
    shortVideoId: number;
}): Promise<ShortVideoRenderResult> {
    const shortVideoId = Number(options.shortVideoId || 0);
    if (!Number.isInteger(shortVideoId) || shortVideoId <= 0) {
        throw new Error('Thiếu short video id');
    }

    const token = getAccessToken() ?? '';
    const url = new URL(shortVideoRenderApiUrl());
    if (token) {
        url.searchParams.set('access_token', token);
    }

    const res = await fetch(url.toString(), {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ short_video_id: shortVideoId, id: shortVideoId }),
    });

    const json = (await res.json()) as ShortVideoRenderResult;
    if (!json?.success) {
        throw new Error(json?.message || 'Render video thất bại');
    }

    return json;
}

export async function openShortVideoRenderWorkflow(options: {
    shortVideoId: number;
}): Promise<ShortVideoRenderResult> {
    const confirmed = window.confirm(
        'Render MP4 TikTok 9:16 bằng Remotion? Quá trình có thể mất vài phút.'
    );
    if (!confirmed) {
        throw new Error('Đã hủy render video');
    }

    return triggerShortVideoRender(options);
}
