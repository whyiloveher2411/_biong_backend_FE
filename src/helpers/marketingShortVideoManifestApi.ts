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

export type SaydiTtsSelectOption = {
    value: string;
    label: string;
    lang_code?: string;
};

export type SaydiTtsCatalogResult = {
    success?: boolean;
    message?: string | { content?: string };
    languages?: SaydiTtsSelectOption[];
    default_lang_code?: string;
    voice_samples?: SaydiTtsSelectOption[];
    default_voice_sample?: string;
};

/** @deprecated Dùng SaydiTtsCatalogResult */
export type SaydiVoiceSampleOption = SaydiTtsSelectOption;

/** @deprecated Dùng SaydiTtsCatalogResult */
export type SaydiVoiceSamplesResult = SaydiTtsCatalogResult;

export async function fetchSaydiTtsCatalog(shortVideoId?: number): Promise<SaydiTtsCatalogResult> {
    const result = (await ajax({
        url: 'plugin/vn4-e-learning/app-mobile/marketing/short-video/tts/get-saydi-tts-catalog',
        data: shortVideoId && shortVideoId > 0 ? { short_video_id: shortVideoId, id: shortVideoId } : {},
        loading: false,
    })) as SaydiTtsCatalogResult;

    if (!result?.success) {
        throw new Error(
            parseShortVideoApiMessage(result?.message, 'Không tải được danh mục TTS Saydi')
        );
    }

    return result;
}

/** @deprecated Dùng fetchSaydiTtsCatalog */
export async function fetchSaydiVoiceSamples(): Promise<SaydiTtsCatalogResult> {
    return fetchSaydiTtsCatalog();
}

export type VbeeTtsSelectOption = {
    value: string;
    label: string;
    voice_code?: string;
};

export type VbeeTtsCatalogResult = {
    success?: boolean;
    message?: string | { content?: string };
    voice_codes?: VbeeTtsSelectOption[];
    default_voice_code?: string;
    default_speed?: number;
};

export type VbeeTtsAccountCredits = {
    remaining_characters: number;
    bonus_characters: number;
    lock_characters: number;
    total_studio_characters: number;
    available_characters: number;
    regular_daily_credits: number;
    package_code: string;
    sync_characters_at: string;
};

export type VbeeTtsAccountResult = {
    success?: boolean;
    message?: string | { content?: string };
    credits?: VbeeTtsAccountCredits;
};

export async function fetchVbeeTtsAccountCredits(): Promise<VbeeTtsAccountResult> {
    const result = (await ajax({
        url: 'plugin/vn4-e-learning/app-mobile/marketing/short-video/tts/get-vbee-tts-account',
        data: {},
        loading: false,
    })) as VbeeTtsAccountResult;

    if (!result?.success) {
        throw new Error(
            parseShortVideoApiMessage(result?.message, 'Không tải được credit Vbee')
        );
    }

    return result;
}

export async function fetchVbeeTtsCatalog(shortVideoId?: number): Promise<VbeeTtsCatalogResult> {
    const result = (await ajax({
        url: 'plugin/vn4-e-learning/app-mobile/marketing/short-video/tts/get-vbee-tts-catalog',
        data: shortVideoId && shortVideoId > 0 ? { short_video_id: shortVideoId, id: shortVideoId } : {},
        loading: false,
    })) as VbeeTtsCatalogResult;

    if (!result?.success) {
        throw new Error(
            parseShortVideoApiMessage(result?.message, 'Không tải được danh mục TTS Vbee')
        );
    }

    return result;
}

export async function generateShortVideoSceneAudioVbee(options: {
    shortVideoId: number;
    sceneId: string;
    voiceCode?: string;
    speed?: number;
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
        url: 'plugin/vn4-e-learning/app-mobile/marketing/short-video/tts/generate-audio-vbee',
        data: {
            short_video_id: shortVideoId,
            id: shortVideoId,
            scene_id: sceneId,
            voice_code: options.voiceCode?.trim() || '',
            speed: options.speed ?? '',
            force: options.force ?? true,
        },
        loading: false,
    })) as { success?: boolean; message?: string | { content?: string } };
    if (!result?.success) {
        throw new Error(parseShortVideoApiMessage(result?.message, 'Render audio Vbee thất bại'));
    }
    return result;
}

export async function generateShortVideoSceneAudioSaydi(options: {
    shortVideoId: number;
    sceneId: string;
    langCode?: string;
    voiceSample?: string;
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
        url: 'plugin/vn4-e-learning/app-mobile/marketing/short-video/tts/generate-audio-saydi',
        data: {
            short_video_id: shortVideoId,
            id: shortVideoId,
            scene_id: sceneId,
            lang_code: options.langCode?.trim() || '',
            voice_sample: options.voiceSample?.trim() || '',
            force: options.force ?? true,
        },
        loading: false,
    })) as { success?: boolean; message?: string | { content?: string } };
    if (!result?.success) {
        throw new Error(parseShortVideoApiMessage(result?.message, 'Render audio Saydi thất bại'));
    }
    return result;
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
