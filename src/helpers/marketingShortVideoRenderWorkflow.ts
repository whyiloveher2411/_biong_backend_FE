import { ajax } from 'hook/useApi';
import { getAdminApiPrefix } from 'helpers/apiHost';
import { convertToURL } from 'helpers/url';
import { parseShortVideoApiMessage } from 'helpers/shortVideoApiMessage';

export type ShortVideoRenderResult = {
    success?: boolean;
    message?: string | { content?: string };
    short_video_id?: number;
    video_url?: string;
    video_s3_key?: string;
    generate_status?: string;
};

export const SHORT_VIDEO_RENDER_API_PATH =
    'plugin/vn4-e-learning/app-mobile/marketing/short-video/render-video';

export function shortVideoRenderApiUrl(): string {
    return convertToURL(getAdminApiPrefix(), SHORT_VIDEO_RENDER_API_PATH);
}

export async function triggerShortVideoRender(options: {
    shortVideoId: number;
}): Promise<ShortVideoRenderResult> {
    const shortVideoId = Number(options.shortVideoId || 0);
    if (!Number.isInteger(shortVideoId) || shortVideoId <= 0) {
        throw new Error('Thiếu short video id');
    }

    const result = (await ajax({
        url: SHORT_VIDEO_RENDER_API_PATH,
        data: { short_video_id: shortVideoId, id: shortVideoId },
    })) as ShortVideoRenderResult;

    if (!result?.success) {
        throw new Error(
            parseShortVideoApiMessage(result?.message, 'Render video thất bại')
        );
    }

    return result;
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
