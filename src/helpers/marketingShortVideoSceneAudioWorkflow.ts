import { getAccessToken } from 'store/user/user.reducers';
import { getApiHost } from 'helpers/apiHost';
import { convertToURL } from 'helpers/url';

export type ShortVideoSceneAudioBatchResult = {
    success?: boolean;
    message?: string;
    short_video_id?: number;
    lang?: string;
    scenes_generated?: Array<{
        scene_id?: string;
        url?: string;
        tts_provider_used?: string;
    }>;
    scenes_remaining?: string[];
    errors?: string[];
    providers_used?: { saydi?: number; vbee?: number };
};

export function shortVideoSceneAudioBatchApiUrl(): string {
    return convertToURL(
        getApiHost(),
        '/api/admin/plugin/vn4-e-learning/app-mobile/marketing/short-video/tts/generate-audio-batch'
    );
}

export async function triggerShortVideoSceneAudioBatch(options: {
    shortVideoId: number;
    sceneId?: string;
    force?: boolean;
}): Promise<ShortVideoSceneAudioBatchResult> {
    const shortVideoId = Number(options.shortVideoId || 0);
    if (!Number.isInteger(shortVideoId) || shortVideoId <= 0) {
        throw new Error('Thiếu short video id');
    }

    const token = getAccessToken() ?? '';
    const url = new URL(shortVideoSceneAudioBatchApiUrl());
    if (token) {
        url.searchParams.set('access_token', token);
    }

    const body: Record<string, unknown> = {
        short_video_id: shortVideoId,
        id: shortVideoId,
    };
    const sceneId = String(options.sceneId || '').trim();
    if (sceneId) {
        body.scene_id = sceneId;
    }
    if (options.force) {
        body.force = true;
    }

    const res = await fetch(url.toString(), {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
    });

    const json = (await res.json()) as ShortVideoSceneAudioBatchResult;
    if (!json?.success) {
        throw new Error(json?.message || 'Sinh audio scene thất bại');
    }

    return json;
}

export async function openShortVideoSceneAudioWorkflow(options: {
    shortVideoId: number;
}): Promise<ShortVideoSceneAudioBatchResult> {
    const confirmed = window.confirm(
        'Sinh audio cho các scene pending (Saydi, fallback Vbee nếu scene lỗi)? Quá trình có thể mất vài phút.'
    );
    if (!confirmed) {
        throw new Error('Đã hủy sinh audio scene');
    }

    return triggerShortVideoSceneAudioBatch(options);
}
