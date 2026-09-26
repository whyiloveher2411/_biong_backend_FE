import { ajax } from 'hook/useApi';
import { parseShortVideoApiMessage } from 'helpers/shortVideoApiMessage';

const BEAT_VIDEO_PLATFORMS_URL = 'plugin/vn4-e-learning/app-mobile/marketing/short-video/beat-video-platforms';

export type BeatVideoPlatformItem = {
    key: string;
    label: string;
    selected: boolean;
};

export type BeatVideoPlatformsResult = {
    success?: boolean;
    message?: string | { content?: string };
    platforms?: BeatVideoPlatformItem[];
    active?: string[];
    open_browser?: boolean;
};

async function callBeatVideoPlatforms(
    action: 'list' | 'save',
    data: Record<string, unknown> = {},
): Promise<BeatVideoPlatformsResult> {
    const result = (await ajax({
        url: BEAT_VIDEO_PLATFORMS_URL,
        data: { action, ...data },
        loading: false,
    })) as BeatVideoPlatformsResult;

    if (!result?.success) {
        throw new Error(parseShortVideoApiMessage(result?.message, 'Thao tác cài đặt nền tảng thất bại'));
    }

    return result;
}

export async function fetchBeatVideoPlatforms(): Promise<BeatVideoPlatformsResult> {
    return callBeatVideoPlatforms('list');
}

export async function saveBeatVideoPlatforms(
    platforms: string[],
    openBrowser: boolean,
): Promise<BeatVideoPlatformsResult> {
    return callBeatVideoPlatforms('save', { platforms, open_browser: openBrowser ? 1 : 0 });
}
