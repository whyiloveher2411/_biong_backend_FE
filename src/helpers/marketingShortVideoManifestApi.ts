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
    queued_scene_ids?: string[];
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
    manifest: ShortVideoRenderManifest,
    options?: {
        changedSceneIds?: string[];
    }
): Promise<ManifestApiResult> {
    return postManifestApi('save-render-manifest', {
        short_video_id: shortVideoId,
        id: shortVideoId,
        manifest,
        changed_scene_ids: options?.changedSceneIds ?? [],
    });
}

export async function generateShortVideoSceneAudioVieneu(options: {
    shortVideoId: number;
    sceneId: string;
    force?: boolean;
}): Promise<{ success?: boolean; message?: string | { content?: string } }> {
    const shortVideoId = Number(options.shortVideoId || 0);
    const sceneId = String(options.sceneId || '').trim();
    if (!Number.isInteger(shortVideoId) || shortVideoId <= 0) {
        throw new Error('Thiếu short video id');
    }
    if (!sceneId) {
        throw new Error('Thiếu scene id');
    }
    const result = (await ajax({
        url: 'plugin/vn4-e-learning/app-mobile/marketing/short-video/tts/generate-audio-vieneu',
        data: {
            short_video_id: shortVideoId,
            id: shortVideoId,
            scene_id: sceneId,
            force: options.force ?? true,
        },
        loading: false,
    })) as { success?: boolean; message?: string | { content?: string } };
    if (!result?.success) {
        throw new Error(parseShortVideoApiMessage(result?.message, 'Sinh audio scene thất bại'));
    }
    return result;
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
