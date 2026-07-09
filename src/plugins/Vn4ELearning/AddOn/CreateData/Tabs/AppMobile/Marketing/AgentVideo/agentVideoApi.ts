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

export type AgentRenderMode = 'creative' | 'import_html';

export type ImportHtmlBgmSegment = {
    id: string;
    title?: string;
    download_url: string;
    preview_url?: string;
    duration_sec: number;
    provider?: string;
};

export type ImportHtmlMarketingPostImage = {
    url: string;
    caption?: string;
};

export type ImportHtmlVisualCatalogItem = {
    id: string;
    media_type: 'image' | 'video';
    url: string;
    preview_url?: string;
    title?: string;
    provider?: string;
    duration_sec?: number;
    caption?: string;
    search_query?: string;
    source?: string;
};

export type ImportHtmlAssets = {
    bgm_segments?: ImportHtmlBgmSegment[];
    sfx_beat_transition?: boolean;
    sfx_hook?: boolean;
    visual_catalog?: ImportHtmlVisualCatalogItem[];
    updated_at?: string;
};

export type CaptionSyncSummary = {
    exact_ratio?: number | null;
    trusted_ratio?: number | null;
    max_gap_sec?: number | null;
    large_gap_count?: number;
    karaoke_quality?: 'ok' | 'poor' | string | null;
    synced_at?: string | null;
};

export type ImportHtmlComposition = {
    assembled_at?: string;
    assemble_status?: 'none' | 'ok' | 'failed' | string;
    assemble_error?: string;
    render_status?: 'none' | 'ok' | 'failed' | string;
    render_error?: string;
    render_failed_at?: string;
    caption_sync?: CaptionSyncSummary | null;
};

export function isKaraokeSyncPoor(captionSync?: CaptionSyncSummary | null): boolean {
    if (!captionSync) {
        return false;
    }
    if (captionSync.karaoke_quality === 'poor') {
        return true;
    }
    if ((captionSync.large_gap_count ?? 0) > 0) {
        return true;
    }
    if (captionSync.exact_ratio != null && captionSync.exact_ratio < 0.85) {
        return true;
    }
    if (captionSync.max_gap_sec != null && captionSync.max_gap_sec > 3) {
        return true;
    }
    return false;
}

export type ImportHtmlSummary = {
    hf_prompt_type?: string;
    html_length?: number;
    html_updated_at?: string;
    has_html?: boolean;
    whisper_status?: 'none' | 'processing' | 'completed' | 'failed' | string;
    whisper_word_count?: number;
    whisper_transcribed_at?: string;
    whisper_error?: string;
    caption_words_status?: 'none' | 'validated' | 'failed' | string;
    caption_words_count?: number;
    caption_words_saved_at?: string;
    beat_map_ready?: boolean;
    beat_count?: number;
    beat_map_updated_at?: string;
    beats_html_total?: number;
    beats_html_completed?: number;
    beats_html_ready?: boolean;
    import_html_ready?: boolean;
    missing_beat_ids?: string[];
    beats_render_error_count?: number;
    beat_render_error_ids?: string[];
    assets?: ImportHtmlAssets;
    composition?: ImportHtmlComposition;
    bgm_total_sec?: number;
    bgm_covers_video?: boolean;
    html?: string;
    beat_map?: import('./agentVideoBeatMap').BeatMap | null;
    beat_html?: Record<string, import('./agentVideoBeatMap').BeatHtmlEntry>;
    marketing_post_images?: ImportHtmlMarketingPostImage[];
};

export type OmnivoiceVoiceCatalogItem = {
    key: string;
    label: string;
    source?: string;
    preview_url?: string;
};

const OMNIVOICE_VOICE_PREVIEW_API_PATH =
    'plugin/vn4-e-learning/app-mobile/marketing/short-video/preview-omnivoice-voice';

export function resolveOmnivoiceVoicePreviewUrl(
    item: Pick<OmnivoiceVoiceCatalogItem, 'key' | 'preview_url'> | string,
): string {
    const key = typeof item === 'string'
        ? String(item || '').trim()
        : String(item?.key || '').trim();
    const rawPreview = typeof item === 'string'
        ? ''
        : String(item?.preview_url || '').trim();

    let path = rawPreview;
    if (!path && key) {
        path = `${OMNIVOICE_VOICE_PREVIEW_API_PATH}?voice=${encodeURIComponent(key)}`;
    }
    if (!path) {
        return '';
    }

    try {
        const url = path.startsWith('http://') || path.startsWith('https://')
            ? new URL(path)
            : new URL(convertToURL(getAdminApiPrefix(), path));
        const token = getAccessToken();
        if (token && !url.searchParams.get('access_token')) {
            url.searchParams.set('access_token', token);
        }
        return url.toString();
    } catch {
        return '';
    }
}

export type AgentSourceFormatCatalogItem = {
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
    agent_omnivoice_voice?: string;
    omnivoice_voice_catalog?: OmnivoiceVoiceCatalogItem[];
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
        render_mode?: AgentRenderMode;
        import_html_ready?: boolean;
        whisper_status?: string;
    };
    marketing_post_id?: number;
    app_mobile_id?: number;
    app_mobile_title?: string;
    thumbnail?: unknown;
    agent_source_content?: string;
    agent_github_repo?: string;
    agent_source_format?: string;
    agent_source_format_catalog?: AgentSourceFormatCatalogItem[];
    content_plain_text?: string;
    post_eligible?: boolean;
    social_posted?: boolean;
    render_mode?: AgentRenderMode;
    import_html?: ImportHtmlSummary;
    hf_prompt_types_catalog?: string[];
};

export type JsonResponse = {
    success?: boolean;
    message?: ApiMessage;
};

export type SaveAdminAudioScriptResponse = JsonResponse & {
    audio_script_approved?: boolean;
    audio_reset?: boolean;
};

export type ApproveAudioScriptResponse = JsonResponse & {
    tts_queued?: boolean;
    tts_job_id?: string | number;
    tts_enqueue_error?: string;
    audio_reset?: boolean;
    tts_status?: string;
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

export async function savePublishFlags(
    shortVideoId: number,
    flags: { postEligible?: boolean; socialPosted?: boolean },
): Promise<JsonResponse & { post_eligible?: boolean; social_posted?: boolean }> {
    const body: Record<string, unknown> = shortVideoBody(shortVideoId);
    if (flags.postEligible !== undefined) {
        body.post_eligible = flags.postEligible ? '1' : '0';
    }
    if (flags.socialPosted !== undefined) {
        body.social_posted = flags.socialPosted ? '1' : '0';
    }
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-publish-flags',
        body,
    );
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

export async function saveAgentOmnivoiceVoice(
    shortVideoId: number,
    voice: string,
): Promise<JsonResponse & {
    agent_omnivoice_voice?: string;
    omnivoice_voice_catalog?: OmnivoiceVoiceCatalogItem[];
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-omnivoice-voice',
        shortVideoBody(shortVideoId, { agent_omnivoice_voice: voice }),
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
): Promise<SaveAdminAudioScriptResponse> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-admin-audio-script',
        shortVideoBody(shortVideoId, { audio_script: audioScript }),
    ) as Promise<SaveAdminAudioScriptResponse>;
}

export type SaveAgentSourceContentResponse = JsonResponse & {
    agent_source_content?: string;
    agent_github_repo?: string;
    agent_source_format?: string;
    agent_source_format_label?: string;
    content_plain_text?: string;
};

export async function saveAgentSourceContent(
    shortVideoId: number,
    content: string,
    githubRepo?: string,
    sourceFormat?: string,
): Promise<SaveAgentSourceContentResponse> {
    const extra: Record<string, unknown> = {
        agent_source_content: content,
    };
    if (githubRepo !== undefined) {
        extra.agent_github_repo = githubRepo;
    }
    if (sourceFormat !== undefined) {
        extra.agent_source_format = sourceFormat;
    }
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-source-content',
        shortVideoBody(shortVideoId, extra),
    ) as Promise<SaveAgentSourceContentResponse>;
}

export type FetchGithubReadmeResponse = JsonResponse & {
    github_repo?: string;
    agent_github_repo?: string;
    readme?: string;
    source_url?: string;
};

export async function fetchGithubReadme(
    shortVideoId: number,
    githubRepo: string,
): Promise<FetchGithubReadmeResponse> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/fetch-github-readme',
        shortVideoBody(shortVideoId, {
            github_repo: githubRepo,
            agent_github_repo: githubRepo,
        }),
    ) as Promise<FetchGithubReadmeResponse>;
}

export async function approveAudioScript(shortVideoId: number): Promise<ApproveAudioScriptResponse> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/approve-audio-script',
        shortVideoBody(shortVideoId),
    ) as Promise<ApproveAudioScriptResponse>;
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

export async function transcribeAgentAudio(
    shortVideoId: number,
    options?: { force?: boolean },
): Promise<JsonResponse & {
    status?: string;
    word_count?: number;
    import_html?: ImportHtmlSummary;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/transcribe-agent-audio',
        shortVideoBody(shortVideoId, options?.force ? { force: 1 } : {}),
    );
}

export type AgentBgmSearchItem = {
    id?: string | number;
    title?: string;
    download_url?: string;
    preview_url?: string;
    duration_sec?: number;
    provider?: string;
};

export async function searchAgentBgm(query: string, limit = 8): Promise<{
    success?: boolean;
    items?: AgentBgmSearchItem[];
    message?: ApiMessage;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/search-agent-bgm',
        { query, limit },
    );
}

export async function saveAgentImportHtml(
    shortVideoId: number,
    payload: {
        renderMode?: AgentRenderMode;
        hfPromptType?: string;
        html?: string;
        beatMap?: import('./agentVideoBeatMap').BeatMap;
        beatId?: string;
        beatHtml?: string;
        bgmSegments?: ImportHtmlBgmSegment[];
        sfxBeatTransition?: boolean;
        sfxHook?: boolean;
        visualCatalog?: ImportHtmlVisualCatalogItem[];
        visualSearchQueries?: string[];
    },
): Promise<JsonResponse & {
    render_mode?: AgentRenderMode;
    import_html?: ImportHtmlSummary;
}> {
    const body: Record<string, unknown> = shortVideoBody(shortVideoId);
    if (payload.renderMode !== undefined) {
        body.render_mode = payload.renderMode;
    }
    if (payload.hfPromptType !== undefined) {
        body.hf_prompt_type = payload.hfPromptType;
    }
    if (payload.html !== undefined) {
        body.html = payload.html;
    }
    if (payload.beatMap !== undefined) {
        body.beat_map = payload.beatMap;
    }
    if (payload.beatId !== undefined && payload.beatHtml !== undefined) {
        body.beat_id = payload.beatId;
        body.beat_html = payload.beatHtml;
    }
    if (payload.bgmSegments !== undefined) {
        body.bgm_segments = payload.bgmSegments;
    }
    if (payload.sfxBeatTransition !== undefined) {
        body.sfx_beat_transition = payload.sfxBeatTransition;
    }
    if (payload.sfxHook !== undefined) {
        body.sfx_hook = payload.sfxHook;
    }
    if (payload.visualCatalog !== undefined) {
        body.visual_catalog = payload.visualCatalog;
    }
    if (payload.visualSearchQueries !== undefined) {
        body.visual_search_queries = payload.visualSearchQueries;
    }
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-import-html',
        body,
    );
}

export async function fetchImportHtmlContext(shortVideoId: number) {
    const token = getAccessToken() ?? '';
    const response = await fetch(
        convertToURL(
            getAdminApiPrefix(),
            'plugin/vn4-e-learning/app-mobile/marketing/short-video/get-import-html-context',
        ),
        {
            method: 'POST',
            credentials: 'include',
            headers: authHeaders(),
            body: JSON.stringify(shortVideoBody(shortVideoId, { access_token: token })),
        },
    );
    return response.json();
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
