import { ajax } from 'hook/useApi';
import type { ShortVideoRenderManifest } from 'helpers/shortVideoRenderManifest';
import { parseShortVideoApiMessage } from 'helpers/shortVideoApiMessage';

export type ManifestApiResult = {
    success?: boolean;
    message?: string | { content?: string };
    short_video_id?: number;
    manifest?: ShortVideoRenderManifest;
    cached?: boolean;
    rebuilt?: boolean;
    warnings?: string[];
};

async function postManifestApi(
    path: string,
    body: Record<string, unknown>
): Promise<ManifestApiResult> {
    const result = (await ajax({
        url: `plugin/vn4-e-learning/app-mobile/marketing/short-video/${path}`,
        data: body,
        loading: false,
    })) as ManifestApiResult;

    if (!result?.success) {
        throw new Error(
            parseShortVideoApiMessage(result?.message, 'Yêu cầu manifest thất bại')
        );
    }

    return result;
}

export async function buildShortVideoRenderManifest(
    shortVideoId: number
): Promise<ManifestApiResult> {
    return postManifestApi('build-render-manifest', {
        short_video_id: shortVideoId,
        id: shortVideoId,
    });
}

export async function refreshShortVideoRenderManifest(
    shortVideoId: number
): Promise<ManifestApiResult> {
    return postManifestApi('refresh-render-manifest', {
        short_video_id: shortVideoId,
        id: shortVideoId,
    });
}

export async function saveShortVideoRenderManifest(
    shortVideoId: number,
    manifest: ShortVideoRenderManifest
): Promise<ManifestApiResult> {
    return postManifestApi('save-render-manifest', {
        short_video_id: shortVideoId,
        id: shortVideoId,
        manifest,
    });
}

export type ResolveSceneVisualResult = {
    success?: boolean;
    message?: string | { content?: string };
    short_video_id?: number;
    youtube_id?: string;
    playback_url?: string;
    thumbnail_url?: string;
};

export async function resolveShortVideoSceneVisual(options: {
    shortVideoId: number;
    visualRef?: string;
    youtubeId?: string;
}): Promise<ResolveSceneVisualResult> {
    const shortVideoId = Number(options.shortVideoId || 0);
    if (!Number.isInteger(shortVideoId) || shortVideoId <= 0) {
        throw new Error('Thiếu short video id');
    }

    const result = (await ajax({
        url: 'plugin/vn4-e-learning/app-mobile/marketing/short-video/resolve-scene-visual',
        data: {
            short_video_id: shortVideoId,
            id: shortVideoId,
            visual_ref: options.visualRef?.trim() || '',
            youtube_id: options.youtubeId?.trim() || '',
        },
        loading: false,
    })) as ResolveSceneVisualResult;

    if (!result?.success) {
        throw new Error(
            parseShortVideoApiMessage(result?.message, 'Resolve video thất bại')
        );
    }

    return result;
}
