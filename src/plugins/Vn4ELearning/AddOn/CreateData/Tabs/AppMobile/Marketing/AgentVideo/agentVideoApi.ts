import { getAdminApiPrefix } from 'helpers/apiHost';
import { getLanguage } from 'helpers/i18n';
import { convertToURL } from 'helpers/url';
import { getAccessToken } from 'store/user/user.reducers';
import { DEFAULT_TTS_PLATFORMS } from './agentVideoUi';

export type ApiMessage = { content?: string } | string;

export type HfThemeCatalogItem = {
    key: string;
    label: string;
    description?: string;
};

export type AgentVideoContentResponse = {
    success?: boolean;
    title?: string;
    audio_script?: string;
    audio_script_approved?: boolean;
    audio_script_approved_at?: string;
    audio_file?: string;
    audio_file_duration_sec?: number;
    agent_tts_auto?: boolean;
    agent_tts_platforms?: string[];
    agent_video_status?: string;
    agent_video_url?: string;
    agent_video_rendered_at?: string;
    agent_video_summary?: {
        estimated_duration_sec?: number | null;
        cta_mode?: string;
        marker_count?: number;
    };
    agent_tts_job_id?: number | null;
    agent_tts_status?: string;
    last_error?: string | null;
    tts_pending?: boolean;
    tts_failed?: boolean;
    needs_tts_enqueue?: boolean;
    tts_chain?: string[];
    hf_theme?: string;
    hf_theme_resolved?: string;
    hf_theme_source?: string;
    hf_theme_catalog?: HfThemeCatalogItem[];
    workflow_mode?: string;
    agent_workflow?: {
        ready_for_video?: boolean;
        ready_for_continue?: boolean;
        ready_for_phase_2?: boolean;
        script_approved?: boolean;
        has_script?: boolean;
        has_agent_video?: boolean;
        tts_pending?: boolean;
        tts_failed?: boolean;
        phase?: string;
    };
    marketing_post_id?: number;
    thumbnail?: unknown;
};

export type JsonResponse = {
    success?: boolean;
    message?: ApiMessage;
};

export function parseApiMessage(message: ApiMessage | undefined): string {
    if (typeof message === 'object' && message?.content) {
        return String(message.content);
    }
    if (typeof message === 'string') {
        return message;
    }
    return '';
}

function authHeaders(): Record<string, string> {
    const token = getAccessToken();
    return {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

function shortVideoBody(shortVideoId: number, extra: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        short_video_id: shortVideoId,
        id: shortVideoId,
        ...extra,
    };
}

async function postJson(path: string, body: Record<string, unknown>): Promise<JsonResponse> {
    const token = getAccessToken() ?? '';
    const response = await fetch(
        convertToURL(getAdminApiPrefix(), path),
        {
            method: 'POST',
            credentials: 'include',
            headers: authHeaders(),
            body: JSON.stringify({ ...body, access_token: token }),
        },
    );
    return response.json() as Promise<JsonResponse>;
}

export function normalizePlatforms(platforms: string[] | undefined): string[] {
    if (Array.isArray(platforms) && platforms.length > 0) {
        return platforms;
    }
    return [...DEFAULT_TTS_PLATFORMS];
}

export async function uploadAgentAudioMp3(shortVideoId: number, file: File): Promise<JsonResponse> {
    const formData = new FormData();
    formData.append('short_video_id', String(shortVideoId));
    formData.append('id', String(shortVideoId));
    formData.append('audio', file);
    formData.append('__l', window.btoa(`${getLanguage().code}#${Date.now()}`));

    const headers: Record<string, string> = { Accept: 'application/json' };
    const token = getAccessToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
        convertToURL(
            getAdminApiPrefix(),
            'plugin/vn4-e-learning/app-mobile/marketing/short-video/upload-agent-audio',
        ),
        {
            method: 'POST',
            headers,
            body: formData,
        },
    );

    const result = await response.json() as JsonResponse;
    if (!response.ok && !result?.message) {
        throw new Error(response.statusText || 'Upload thất bại');
    }
    return result;
}

export async function saveAgentHfTheme(
    shortVideoId: number,
    hfTheme: string,
): Promise<JsonResponse & {
    hf_theme?: string;
    hf_theme_resolved?: string;
    hf_theme_source?: string;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-hf-theme',
        shortVideoBody(shortVideoId, { hf_theme: hfTheme }),
    );
}

export async function saveAgentTtsSettings(
    shortVideoId: number,
    enabled?: boolean,
    platforms?: string[],
): Promise<JsonResponse> {
    const body: Record<string, unknown> = shortVideoBody(shortVideoId);
    if (enabled !== undefined) {
        body.agent_tts_auto = enabled ? '1' : '0';
    }
    if (platforms !== undefined) {
        body.agent_tts_platforms = platforms;
    }
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-tts-mode',
        body,
    );
}

export async function saveAdminAudioScript(
    shortVideoId: number,
    audioScript: string,
): Promise<JsonResponse> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-admin-audio-script',
        shortVideoBody(shortVideoId, { audio_script: audioScript }),
    );
}

export async function approveAudioScript(shortVideoId: number): Promise<JsonResponse> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/approve-audio-script',
        shortVideoBody(shortVideoId),
    );
}

export async function regenerateAgentNarrationTts(shortVideoId: number): Promise<JsonResponse> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/regenerate-agent-narration-tts',
        shortVideoBody(shortVideoId),
    );
}

export async function retryAgentNarrationTts(shortVideoId: number): Promise<JsonResponse> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/retry-agent-narration-tts',
        shortVideoBody(shortVideoId),
    );
}

const AGENT_VIDEO_STREAM_API_PATH =
    'plugin/vn4-e-learning/app-mobile/marketing/short-video/stream-agent-video';

export function resolveAgentVideoStreamUrl(shortVideoId: number): string {
    const id = Number(shortVideoId || 0);
    if (!Number.isFinite(id) || id <= 0) {
        return '';
    }

    const url = new URL(convertToURL(getAdminApiPrefix(), AGENT_VIDEO_STREAM_API_PATH));
    url.searchParams.set('short_video_id', String(id));
    url.searchParams.set('id', String(id));

    const token = getAccessToken();
    if (token) {
        url.searchParams.set('access_token', token);
    }

    return url.toString();
}

export function isCrossOriginMediaUrl(mediaUrl: string): boolean {
    const trimmed = String(mediaUrl || '').trim();
    if (!trimmed) {
        return false;
    }
    try {
        const parsed = new URL(trimmed, window.location.origin);
        return parsed.origin !== window.location.origin;
    } catch {
        return false;
    }
}

export function resolveAgentVideoFilmstripFetchUrl(
    videoUrl: string,
    shortVideoId: number,
): string {
    const trimmed = String(videoUrl || '').trim();
    if (!trimmed) {
        return '';
    }
    if (isCrossOriginMediaUrl(trimmed)) {
        return resolveAgentVideoStreamUrl(shortVideoId);
    }
    return trimmed;
}
