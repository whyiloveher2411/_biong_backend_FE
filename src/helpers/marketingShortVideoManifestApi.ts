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
