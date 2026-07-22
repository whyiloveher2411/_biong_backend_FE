import { getAdminApiPrefix } from 'helpers/apiHost';
import { getLanguage } from 'helpers/i18n';
import { convertToURL } from 'helpers/url';
import { getAccessToken } from 'store/user/user.reducers';
import { DEFAULT_TTS_PLATFORMS } from './agentVideoUi';

export type ApiMessage = { content?: string } | string;

export type VisualStyleCatalogItem = {
    key: string;
    label: string;
    description?: string;
};

export type AgentRenderMode = 'creative' | 'import_html';

export type SocialAccountItem = {
    index: number;
    title: string;
    social_type: string;
    url?: string;
    has_cookie?: boolean;
    has_facebook_session?: boolean;
    has_tiktok_session?: boolean;
};

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
    /** URL gốc (GitHub raw) — dùng dedupe khi import README */
    origin_url?: string;
};

export type GithubReadmeMediaItem = {
    id: string;
    media_type: 'image' | 'video';
    resolved_url: string;
    origin_path?: string;
    alt?: string;
    ext?: string;
};

export type ImportHtmlGithubImageShot = {
    id: string;
    description: string;
    visual_catalog_id?: string;
};

export type ImportHtmlAssets = {
    bgm_segments?: ImportHtmlBgmSegment[];
    sfx_beat_transition?: boolean;
    sfx_hook?: boolean;
    visual_catalog?: ImportHtmlVisualCatalogItem[];
    github_image_shots?: ImportHtmlGithubImageShot[];
    readme_media?: GithubReadmeMediaItem[];
    github_default_branch?: string;
    github_top_repos?: {
        period?: string;
        limit?: number | string;
        repos?: Array<{
            full_name?: string;
            cover_image_url?: string;
            cover_visual_catalog_id?: string;
            visual_catalog_ids?: string[];
            status?: string;
            fetch_ok?: boolean;
            error?: string;
            [key: string]: unknown;
        }>;
    };
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

export type WhisperWord = {
    text: string;
    start: number;
    end: number;
};

export type TtsPhoneticDictEntry = {
    id?: number;
    source_term: string;
    phonetic: string;
    phonetic_tokens?: string[];
    /** true → AI ≠ ai khi khớp phiên âm */
    case_sensitive?: boolean;
};

export type CaptionAlignOverride = {
    index: number;
    text: string;
    whisperText?: string;
    matchType?: string;
    start: number;
    end: number;
    useWhisperText?: boolean;
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

export type ImportHtmlGeminiJobBlock = {
    status?: 'none' | 'queued' | 'processing' | 'completed' | 'failed' | string;
    job_ids?: number[];
    queued_at?: string;
    updated_at?: string;
    error?: string;
    progress?: {
        current?: number;
        total?: number;
        beat_id?: string;
        succeeded?: number;
        failed?: string[];
    };
};

export type ThumbnailQaStatus = '' | 'approved' | 'needs_regenerate';

export type ImportHtmlThumbnailIdea = {
    schema_version?: number;
    concept_id?: string;
    concept_label?: string;
    visual_style?: string;
    series_label?: string;
    headline?: string;
    subline?: string;
    curiosity_element?: string;
    subject?: string;
    layout?: string;
    visual_description?: string;
    background?: string;
    background_layers?: string;
    support_visuals_below?: string;
    content_signal?: string;
    color_accent?: string;
    avoid?: string[];
    rationale?: string;
    updated_at?: string;
};

export type ImportHtmlThumbnailBlock = {
    idea?: ImportHtmlThumbnailIdea;
    html?: string;
    updated_at?: string;
    creative_prompt?: string;
    qa_status?: ThumbnailQaStatus;
    qa_note?: string;
    image_url?: string;
    image_s3_key?: string;
    image_generated_at?: string;
    approved?: boolean;
    approved_at?: string;
    gemini_idea?: ImportHtmlGeminiJobBlock;
    gemini_fill?: ImportHtmlGeminiJobBlock;
};

export type ImportHtmlSummary = {
    html_length?: number;
    html_updated_at?: string;
    has_html?: boolean;
    whisper_status?: 'none' | 'processing' | 'completed' | 'failed' | string;
    whisper_word_count?: number;
    whisper_words?: WhisperWord[];
    whisper_transcribed_at?: string;
    whisper_stale?: boolean;
    whisper_error?: string;
    caption_words_status?: 'none' | 'validated' | 'failed' | string;
    caption_words_count?: number;
    caption_words_saved_at?: string;
    caption_align_overrides?: CaptionAlignOverride[];
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
    gemini_fill?: ImportHtmlGeminiJobBlock;
    gemini_division?: {
        status?: 'none' | 'queued' | 'processing' | 'completed' | 'failed' | string;
        job_ids?: number[];
        queued_at?: string;
        updated_at?: string;
        error?: string;
    };
    gemini_refine_visual?: ImportHtmlGeminiJobBlock;
    gemini_refine_html?: ImportHtmlGeminiJobBlock;
    thumbnail?: ImportHtmlThumbnailBlock;
    gemini_thumbnail_idea?: ImportHtmlGeminiJobBlock;
    gemini_thumbnail_fill?: ImportHtmlGeminiJobBlock;
    /** Backend: true khi có job Puppeteer/headless đang chạy (một nguồn sự thật, không map theo pipeline step). */
    headless_browser_active?: boolean;
    beat_qa_counts?: {
        approved?: number;
        needs_html_refill?: number;
        needs_visual_tweak?: number;
        unreviewed?: number;
    };
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

export type OmnivoiceVoiceMode = 'clone' | 'design';

export type OmnivoiceVoiceDesignTokenGroup = {
    id: string;
    label: string;
    tokens: string[];
};

export type SaveOmnivoiceVoicePayload = {
    mode: OmnivoiceVoiceMode;
    voice?: string;
    design?: string;
};

const OMNIVOICE_VOICE_PREVIEW_API_PATH =
    'plugin/vn4-e-learning/app-mobile/marketing/short-video/preview-omnivoice-voice';

function withAccessToken(path: string): string {
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
    return withAccessToken(path);
}

export function resolveOmnivoiceVoiceDesignPreviewUrl(design: string): string {
    const trimmed = String(design || '').trim();
    if (!trimmed) {
        return '';
    }
    const path = `${OMNIVOICE_VOICE_PREVIEW_API_PATH}?mode=design&voice_design=${encodeURIComponent(trimmed)}`;
    return withAccessToken(path);
}

export type AgentSourceFormatCatalogItem = {
    key: string;
    label: string;
    description?: string;
};

export type AvatarPipAnchor =
    | 'top_left'
    | 'top_right'
    | 'bottom_left'
    | 'bottom_right'
    | 'center';

export type AgentVideoContentResponse = {
    success?: boolean;
    title?: string;
    audio_script?: string;
    audio_script_updated_at?: string;
    audio_script_generated_at?: string;
    audio_script_approved?: boolean;
    audio_script_approved_at?: string;
    audio_script_tts_reading?: string;
    audio_script_tts_reading_updated_at?: string;
    audio_file?: string;
    audio_file_duration_sec?: number;
    agent_tts_auto?: boolean;
    agent_auto_fill_beat_html?: boolean;
    agent_gemini_open_browser?: boolean;
    agent_github_screenshot_homepage?: boolean;
    agent_introduce_app?: boolean;
    agent_avatar_id?: number;
    agent_show_avatar?: boolean;
    agent_avatar_anchor?: AvatarPipAnchor;
    agent_show_karaoke?: boolean;
    agent_avatar?: {
        show?: boolean;
        avatar_id?: number;
        title?: string;
        master_url?: string;
        anchor?: AvatarPipAnchor;
    };
    agent_tts_platforms?: string[];
    agent_omnivoice_voice?: string;
    agent_omnivoice_voice_mode?: OmnivoiceVoiceMode;
    agent_omnivoice_voice_design?: string;
    agent_omnivoice_speed?: number;
    omnivoice_voice_catalog?: OmnivoiceVoiceCatalogItem[];
    omnivoice_voice_design_tokens?: OmnivoiceVoiceDesignTokenGroup[];
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
    tts_providers?: {
        chatgpt_web?: boolean;
        omnivoice?: boolean;
        omnivoice_local?: boolean;
        omnivoice_kaggle?: boolean;
        vieneu?: boolean;
        saydi?: boolean;
        vbee?: boolean;
    };
    visual_style?: string;
    visual_style_resolved?: string;
    visual_style_source?: string;
    visual_style_catalog?: VisualStyleCatalogItem[];
    /** @deprecated Transitional read fallback. */
    hf_theme?: string;
    /** @deprecated Transitional read fallback. */
    hf_theme_resolved?: string;
    /** @deprecated Transitional read fallback. */
    hf_theme_source?: string;
    /** @deprecated Transitional read fallback. */
    hf_theme_catalog?: VisualStyleCatalogItem[];
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
    gemini_script?: {
        status?: 'none' | 'queued' | 'processing' | 'completed' | 'failed' | string;
        mode?: 'create' | 'improve' | string;
        job_ids?: number[];
        queued_at?: string;
        updated_at?: string;
        error?: string;
    };
    gemini_script_phonetic?: {
        status?: 'none' | 'queued' | 'processing' | 'completed' | 'failed' | string;
        job_ids?: number[];
        queued_at?: string;
        updated_at?: string;
        error?: string;
        source?: string;
    };
    marketing_post_id?: number;
    app_mobile_id?: number;
    app_mobile_title?: string;
    social_accounts?: SocialAccountItem[];
    social_description?: string;
    social_hashtags?: string;
    thumbnail?: unknown;
    thumbnail_url?: string;
    agent_source_content?: string;
    agent_additional_info?: string;
    agent_github_repo?: string;
    agent_tiktok_url?: string;
    agent_source_format?: string;
    agent_source_format_catalog?: AgentSourceFormatCatalogItem[];
    content_plain_text?: string;
    readme_media?: GithubReadmeMediaItem[];
    post_eligible?: boolean;
    social_posted?: boolean;
    render_mode?: AgentRenderMode;
    import_html?: ImportHtmlSummary;
    tts_phonetic_dict?: TtsPhoneticDictEntry[];
    full_auto_pipeline?: FullAutoPipelineSummary;
    github_top_enrich?: GithubTopEnrichSummary;
};

export type GithubTopEnrichSummary = {
    status?: 'none' | 'preparing' | 'ready' | 'failed' | string;
    period?: string;
    limit?: number | string;
    total?: number;
    done?: number;
    failed?: number;
    queued?: number;
    current_index?: number;
    current_full_name?: string;
    percent?: number;
    error?: string;
    started_at?: string;
    updated_at?: string;
};

export type FullAutoPipelineStepStatus = 'pending' | 'running' | 'skipped' | 'done' | 'failed' | string;

export const FULL_AUTO_PIPELINE_STEP_ORDER = [
    'script_create',
    'script_improve',
    'script_improve_qa',
    'script_phonetic_normalize',
    'approve_tts',
    'whisper',
    'beat_division',
    'beat_division_qa',
    'beat_fill',
    'beat_refine_visual',
    'beat_refine_html',
    'bgm',
    'render',
    'upload',
    'thumbnail_idea',
    'thumbnail_fill',
    'thumbnail_capture',
] as const;

export type FullAutoPipelineStepKey = (typeof FULL_AUTO_PIPELINE_STEP_ORDER)[number];

/**
 * Các bước pipeline dùng trình duyệt nền (Puppeteer / headless Chrome).
 * Mirror backend `marketing_short_video_full_auto_headless_pipeline_steps()`.
 */
export const FULL_AUTO_PIPELINE_HEADLESS_STEPS = [
    'script_create',
    'script_improve',
    'script_improve_qa',
    'script_phonetic_normalize',
    'approve_tts',
    'beat_division',
    'beat_division_qa',
    'beat_fill',
    'beat_refine_visual',
    'beat_refine_html',
    'render',
    'thumbnail_idea',
    'thumbnail_fill',
    'thumbnail_capture',
] as const;

export function isFullAutoPipelineHeadlessStep(step: string): step is FullAutoPipelineStepKey {
    return (FULL_AUTO_PIPELINE_HEADLESS_STEPS as readonly string[]).includes(step);
}

/**
 * Các bước pipeline dùng AI (Gemini, Whisper, TTS AI…).
 * Mirror backend `marketing_short_video_full_auto_ai_pipeline_steps()`.
 */
export const FULL_AUTO_PIPELINE_AI_STEPS = [
    'script_create',
    'script_improve',
    'script_improve_qa',
    'script_phonetic_normalize',
    'approve_tts',
    'whisper',
    'beat_division',
    'beat_division_qa',
    'beat_fill',
    'beat_refine_visual',
    'beat_refine_html',
    'thumbnail_idea',
    'thumbnail_fill',
] as const;

export function isFullAutoPipelineAiStep(step: string): step is FullAutoPipelineStepKey {
    return (FULL_AUTO_PIPELINE_AI_STEPS as readonly string[]).includes(step);
}

export type FullAutoPipelineStep = {
    status?: FullAutoPipelineStepStatus;
    at?: string;
    error?: string | null;
    job_id?: number | null;
};

export type FullAutoPipelineScriptQaLoop = {
    attempt?: number;
    max_attempts?: number;
    last_diagnosis?: {
        pass?: boolean;
        summary?: string;
        issues?: Array<{
            code?: string;
            severity?: string;
            message?: string;
            fix_hint?: string;
        }>;
    } | null;
    previous_script?: string;
    history?: Array<Record<string, unknown>>;
};

export type FullAutoPipelineSummary = {
    enabled?: boolean;
    status?: 'idle' | 'running' | 'paused' | 'failed' | 'completed' | string;
    current_step?: string;
    ran_script_create?: boolean;
    started_at?: string;
    updated_at?: string;
    steps?: Record<string, FullAutoPipelineStep>;
    /** Các bước được phép chạy lại (đã từng tới). */
    restartable_steps?: string[];
    error_count?: number;
    last_error?: {
        step?: string;
        message?: string;
        at?: string;
        detail?: Record<string, unknown>;
    } | null;
    headless_browser_active?: boolean;
    /** Danh sách step key dùng headless browser — mirror PHP. */
    headless_steps?: FullAutoPipelineStepKey[];
    /** Danh sách step key dùng AI — mirror PHP. */
    ai_steps?: FullAutoPipelineStepKey[];
    /** Vòng lặp QA (mirror full_auto_pipeline.qa_loops). */
    qa_loops?: Record<string, FullAutoPipelineScriptQaLoop>;
};

export const FULL_AUTO_PIPELINE_STEP_LABELS: Record<FullAutoPipelineStepKey, string> = {
    script_create: 'Tạo script',
    script_improve: 'Cải thiện script',
    script_improve_qa: 'Đánh giá script',
    script_phonetic_normalize: 'Chuẩn hóa giọng đọc',
    approve_tts: 'Duyệt / TTS',
    whisper: 'Whisper',
    beat_division: 'Chia beat',
    beat_division_qa: 'Đánh giá beat',
    beat_fill: 'Fill HTML beat',
    beat_refine_visual: 'Refine visual',
    beat_refine_html: 'Refine HTML beat',
    bgm: 'BGM',
    render: 'Render',
    upload: 'Upload store',
    thumbnail_idea: 'Thumbnail idea',
    thumbnail_fill: 'Thumbnail HTML',
    thumbnail_capture: 'Chụp thumbnail',
};

export const FULL_AUTO_PIPELINE_STEP_GROUPS = [
    {
        key: 'script',
        label: 'Script',
        steps: [
            'script_create',
            'script_improve',
            'script_improve_qa',
            'script_phonetic_normalize',
            'approve_tts',
            'whisper',
        ],
    },
    {
        key: 'beat',
        label: 'Beat',
        steps: [
            'beat_division',
            'beat_division_qa',
            'beat_fill',
            'beat_refine_visual',
            'beat_refine_html',
        ],
    },
    {
        key: 'audio_background',
        label: 'Audio background',
        steps: ['bgm'],
    },
    {
        key: 'render',
        label: 'Render',
        steps: ['render', 'upload'],
    },
    {
        key: 'thumbnail',
        label: 'Thumbnail',
        steps: ['thumbnail_idea', 'thumbnail_fill', 'thumbnail_capture'],
    },
] as const;

export function getFullAutoPipelineStepIndex(step: FullAutoPipelineStepKey): number {
    return FULL_AUTO_PIPELINE_STEP_ORDER.indexOf(step) + 1;
}

const GROUPED_FULL_AUTO_PIPELINE_STEP_ORDER = FULL_AUTO_PIPELINE_STEP_GROUPS.flatMap((group) => group.steps);
if (
    GROUPED_FULL_AUTO_PIPELINE_STEP_ORDER.length !== FULL_AUTO_PIPELINE_STEP_ORDER.length
    || GROUPED_FULL_AUTO_PIPELINE_STEP_ORDER.some((step, index) => step !== FULL_AUTO_PIPELINE_STEP_ORDER[index])
) {
    throw new Error('FULL_AUTO_PIPELINE_STEP_GROUPS phải khớp 1:1 với FULL_AUTO_PIPELINE_STEP_ORDER');
}

const HEADLESS_STEPS_IN_ORDER = FULL_AUTO_PIPELINE_HEADLESS_STEPS.filter(
    (step) => (FULL_AUTO_PIPELINE_STEP_ORDER as readonly string[]).includes(step),
);
if (HEADLESS_STEPS_IN_ORDER.length !== FULL_AUTO_PIPELINE_HEADLESS_STEPS.length) {
    throw new Error('FULL_AUTO_PIPELINE_HEADLESS_STEPS chứa step không hợp lệ');
}

const AI_STEPS_IN_ORDER = FULL_AUTO_PIPELINE_AI_STEPS.filter(
    (step) => (FULL_AUTO_PIPELINE_STEP_ORDER as readonly string[]).includes(step),
);
if (AI_STEPS_IN_ORDER.length !== FULL_AUTO_PIPELINE_AI_STEPS.length) {
    throw new Error('FULL_AUTO_PIPELINE_AI_STEPS chứa step không hợp lệ');
}

export type JsonResponse = {
    success?: boolean;
    message?: ApiMessage;
};

export type AgentHeadlessPreviewAccessResponse = JsonResponse & {
    ws_url?: string;
    websocket_url?: string;
    viewer_url?: string;
    token?: string;
    access_token?: string;
    expires_at?: string | number;
    expires_in?: number;
    short_video_id?: number;
};

export type SaveAdminAudioScriptResponse = JsonResponse & {
    audio_script_approved?: boolean;
    audio_reset?: boolean;
};

export type SaveAdminAudioScriptTtsReadingResponse = JsonResponse & {
    reading_changed?: boolean;
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

export async function uploadAgentVisualImage(shortVideoId: number, file: File): Promise<JsonResponse & {
    url?: string;
    preview_url?: string;
    s3_key?: string;
}> {
    const formData = new FormData();
    formData.append('short_video_id', String(shortVideoId));
    formData.append('id', String(shortVideoId));
    formData.append('image', file);
    formData.append('__l', window.btoa(`${getLanguage().code}#${Date.now()}`));

    const headers: Record<string, string> = { Accept: 'application/json' };
    const token = getAccessToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
        convertToURL(
            getAdminApiPrefix(),
            'plugin/vn4-e-learning/app-mobile/marketing/short-video/upload-agent-visual-image',
        ),
        {
            method: 'POST',
            headers,
            body: formData,
        },
    );

    const result = await response.json() as JsonResponse & {
        url?: string;
        preview_url?: string;
        s3_key?: string;
    };
    if (!response.ok && !result?.message) {
        throw new Error(response.statusText || 'Upload ảnh thất bại');
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

export async function postFacebookReels(
    shortVideoId: number,
    options: {
        socialIndex: number;
        accountTitle?: string;
        autoPublish?: boolean;
        openBrowser?: boolean;
        caption?: string;
        hashtags?: string;
    },
): Promise<JsonResponse & {
    social_posted?: boolean;
    matched_account?: string;
    reel_url?: string;
    ready_to_publish?: boolean;
    published?: boolean;
    error_code?: string;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/post-facebook-reels',
        shortVideoBody(shortVideoId, {
            social_index: options.socialIndex,
            account_title: options.accountTitle || '',
            auto_publish: options.autoPublish ? '1' : '0',
            open_browser: options.openBrowser === false ? '0' : '1',
            caption: options.caption || '',
            hashtags: options.hashtags || '',
        }),
    );
}

export async function postTikTok(
    shortVideoId: number,
    options: {
        socialIndex: number;
        accountTitle?: string;
        autoPublish?: boolean;
        openBrowser?: boolean;
        caption?: string;
        hashtags?: string;
    },
): Promise<JsonResponse & {
    social_posted?: boolean;
    matched_account?: string;
    post_url?: string;
    ready_to_publish?: boolean;
    published?: boolean;
    thumbnail_uploaded?: boolean;
    error_code?: string;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/post-tiktok',
        shortVideoBody(shortVideoId, {
            social_index: options.socialIndex,
            account_title: options.accountTitle || '',
            auto_publish: options.autoPublish ? '1' : '0',
            open_browser: options.openBrowser === false ? '0' : '1',
            caption: options.caption || '',
            hashtags: options.hashtags || '',
        }),
    );
}

export async function saveSocialCopy(
    shortVideoId: number,
    payload: { socialDescription?: string; socialHashtags?: string },
): Promise<JsonResponse & {
    social_description?: string;
    social_hashtags?: string;
}> {
    const body: Record<string, unknown> = shortVideoBody(shortVideoId);
    if (payload.socialDescription !== undefined) {
        body.social_description = payload.socialDescription;
    }
    if (payload.socialHashtags !== undefined) {
        body.social_hashtags = payload.socialHashtags;
    }
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-social-copy',
        body,
    );
}

export async function saveAgentVisualStyle(
    shortVideoId: number,
    visualStyle: string,
): Promise<JsonResponse & {
    visual_style?: string;
    visual_style_resolved?: string;
    visual_style_source?: string;
    hf_theme?: string;
    hf_theme_resolved?: string;
    hf_theme_source?: string;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-hf-theme',
        shortVideoBody(shortVideoId, { visual_style: visualStyle }),
    );
}

export async function saveAgentOmnivoiceVoice(
    shortVideoId: number,
    payload: SaveOmnivoiceVoicePayload,
): Promise<JsonResponse & {
    agent_omnivoice_voice?: string;
    agent_omnivoice_voice_mode?: OmnivoiceVoiceMode;
    agent_omnivoice_voice_design?: string;
    omnivoice_voice_catalog?: OmnivoiceVoiceCatalogItem[];
    omnivoice_voice_design_tokens?: OmnivoiceVoiceDesignTokenGroup[];
}> {
    const body: Record<string, unknown> = shortVideoBody(shortVideoId, {
        agent_omnivoice_voice_mode: payload.mode,
    });
    if (payload.mode === 'clone' && payload.voice) {
        body.agent_omnivoice_voice = payload.voice;
    }
    if (payload.mode === 'design' && payload.design) {
        body.agent_omnivoice_voice_design = payload.design;
    }
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-omnivoice-voice',
        body,
    );
}

export async function saveAgentTtsSettings(
    shortVideoId: number,
    enabled?: boolean,
    platforms?: string[],
    speed?: number,
): Promise<JsonResponse> {
    const body: Record<string, unknown> = shortVideoBody(shortVideoId);
    if (enabled !== undefined) {
        body.agent_tts_auto = enabled ? '1' : '0';
    }
    if (platforms !== undefined) {
        body.agent_tts_platforms = platforms;
    }
    if (speed !== undefined) {
        body.agent_omnivoice_speed = speed;
    }
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-tts-mode',
        body,
    );
}

export async function saveAgentAutoFillBeatHtml(
    shortVideoId: number,
    enabled: boolean,
): Promise<JsonResponse & { agent_auto_fill_beat_html?: boolean }> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-auto-fill-beat-html',
        shortVideoBody(shortVideoId, {
            agent_auto_fill_beat_html: enabled ? '1' : '0',
        }),
    ) as Promise<JsonResponse & { agent_auto_fill_beat_html?: boolean }>;
}

export async function saveAgentGeminiOpenBrowser(
    shortVideoId: number,
    enabled: boolean,
): Promise<JsonResponse & { agent_gemini_open_browser?: boolean }> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-gemini-open-browser',
        shortVideoBody(shortVideoId, {
            agent_gemini_open_browser: enabled ? '1' : '0',
        }),
    ) as Promise<JsonResponse & { agent_gemini_open_browser?: boolean }>;
}

export async function saveAgentGithubScreenshotHomepage(
    shortVideoId: number,
    enabled: boolean,
): Promise<JsonResponse & {
    agent_github_screenshot_homepage?: boolean;
    screenshot_status?: string;
    readme_media?: GithubReadmeMediaItem[];
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-github-screenshot-homepage',
        shortVideoBody(shortVideoId, {
            agent_github_screenshot_homepage: enabled ? '1' : '0',
        }),
    ) as Promise<JsonResponse & {
        agent_github_screenshot_homepage?: boolean;
        screenshot_status?: string;
        readme_media?: GithubReadmeMediaItem[];
    }>;
}

export async function saveAgentIntroduceApp(
    shortVideoId: number,
    enabled: boolean,
): Promise<JsonResponse & { agent_introduce_app?: boolean }> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-introduce-app',
        shortVideoBody(shortVideoId, {
            agent_introduce_app: enabled ? '1' : '0',
        }),
    ) as Promise<JsonResponse & { agent_introduce_app?: boolean }>;
}

export async function saveAgentShowKaraoke(
    shortVideoId: number,
    enabled: boolean,
): Promise<JsonResponse & { agent_show_karaoke?: boolean }> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-show-karaoke',
        shortVideoBody(shortVideoId, {
            agent_show_karaoke: enabled ? '1' : '0',
        }),
    ) as Promise<JsonResponse & { agent_show_karaoke?: boolean }>;
}

export type VerifiedAvatarOption = {
    id: number;
    title: string;
    master_url: string;
};

export async function listVerifiedAvatars(): Promise<JsonResponse & { avatars?: VerifiedAvatarOption[] }> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/list-verified-avatars',
        {},
    ) as Promise<JsonResponse & { avatars?: VerifiedAvatarOption[] }>;
}

export async function saveAgentAvatar(
    shortVideoId: number,
    avatarId: number,
    anchor?: AvatarPipAnchor | string | null,
): Promise<JsonResponse & {
    agent_avatar_id?: number;
    agent_show_avatar?: boolean;
    agent_avatar_anchor?: AvatarPipAnchor;
    agent_avatar?: AgentVideoContentResponse['agent_avatar'];
}> {
    const body: Record<string, string> = {
        agent_avatar_id: avatarId > 0 ? String(avatarId) : '0',
    };
    if (anchor != null && String(anchor).trim() !== '') {
        body.agent_avatar_anchor = String(anchor).trim();
    }
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-avatar',
        shortVideoBody(shortVideoId, body),
    ) as Promise<JsonResponse & {
        agent_avatar_id?: number;
        agent_show_avatar?: boolean;
        agent_avatar_anchor?: AvatarPipAnchor;
        agent_avatar?: AgentVideoContentResponse['agent_avatar'];
    }>;
}

export async function enqueueGeminiWebBeatFill(
    shortVideoId: number,
    beatIds?: string[],
    force = true,
): Promise<JsonResponse & {
    queued?: number;
    skipped_active?: number;
    beat_ids?: string[];
    job_ids?: number[];
    gemini_fill?: ImportHtmlGeminiJobBlock;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/import-html-workflow/enqueue-gemini-web-beat-fill',
        shortVideoBody(shortVideoId, {
            force: force ? '1' : '0',
            ...(beatIds ? { beat_ids: beatIds } : {}),
        }),
    ) as Promise<JsonResponse & {
        queued?: number;
        skipped_active?: number;
        beat_ids?: string[];
        job_ids?: number[];
        gemini_fill?: ImportHtmlGeminiJobBlock;
    }>;
}

export async function enqueueGeminiWebThumbnailIdea(
    shortVideoId: number,
    force = true,
): Promise<JsonResponse & {
    queued?: number;
    skipped_active?: number;
    job_id?: number;
    gemini_thumbnail_idea?: ImportHtmlGeminiJobBlock;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/import-html-workflow/enqueue-gemini-web-thumbnail-idea',
        shortVideoBody(shortVideoId, {
            force: force ? '1' : '0',
        }),
    ) as Promise<JsonResponse & {
        queued?: number;
        skipped_active?: number;
        job_id?: number;
        gemini_thumbnail_idea?: ImportHtmlGeminiJobBlock;
    }>;
}

export async function enqueueGeminiWebThumbnailFill(
    shortVideoId: number,
    force = true,
    options?: { mode?: 'create' | 'refine'; userPrompt?: string },
): Promise<JsonResponse & {
    queued?: number;
    skipped_active?: number;
    job_id?: number;
    gemini_thumbnail_fill?: ImportHtmlGeminiJobBlock;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/import-html-workflow/enqueue-gemini-web-thumbnail-fill',
        shortVideoBody(shortVideoId, {
            force: force ? '1' : '0',
            ...(options?.mode ? { mode: options.mode } : {}),
            ...(options?.userPrompt ? { user_prompt: options.userPrompt } : {}),
        }),
    ) as Promise<JsonResponse & {
        queued?: number;
        skipped_active?: number;
        job_id?: number;
        gemini_thumbnail_fill?: ImportHtmlGeminiJobBlock;
    }>;
}

export async function captureAgentThumbnail(
    shortVideoId: number,
    force = false,
): Promise<JsonResponse & {
    image_url?: string;
    thumbnail?: ImportHtmlThumbnailBlock;
    import_html?: ImportHtmlSummary;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/capture-agent-thumbnail',
        shortVideoBody(shortVideoId, {
            force: force ? '1' : '0',
        }),
    ) as Promise<JsonResponse & {
        image_url?: string;
        thumbnail?: ImportHtmlThumbnailBlock;
        import_html?: ImportHtmlSummary;
    }>;
}

export async function enqueueGeminiWebBeatDivision(
    shortVideoId: number,
    force = true,
): Promise<JsonResponse & {
    queued?: number;
    skipped_active?: number;
    job_ids?: number[];
    gemini_division?: ImportHtmlSummary['gemini_division'];
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/import-html-workflow/enqueue-gemini-web-beat-division',
        shortVideoBody(shortVideoId, {
            force: force ? '1' : '0',
        }),
    ) as Promise<JsonResponse & {
        queued?: number;
        skipped_active?: number;
        job_ids?: number[];
        gemini_division?: ImportHtmlSummary['gemini_division'];
    }>;
}

export async function enqueueGeminiWebAudioScript(
    shortVideoId: number,
    mode: 'create' | 'improve',
    force = true,
): Promise<JsonResponse & {
    queued?: number;
    skipped_active?: number;
    mode?: string;
    job_ids?: number[];
    gemini_script?: AgentVideoContentResponse['gemini_script'];
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/enqueue-gemini-web-audio-script',
        shortVideoBody(shortVideoId, {
            mode,
            force: force ? '1' : '0',
        }),
    ) as Promise<JsonResponse & {
        queued?: number;
        skipped_active?: number;
        mode?: string;
        job_ids?: number[];
        gemini_script?: AgentVideoContentResponse['gemini_script'];
    }>;
}

export async function enqueueGeminiWebScriptPhonetic(
    shortVideoId: number,
    force = true,
): Promise<JsonResponse & {
    queued?: number;
    skipped_active?: number;
    job_ids?: number[];
    gemini_script_phonetic?: AgentVideoContentResponse['gemini_script_phonetic'];
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/enqueue-gemini-web-script-phonetic',
        shortVideoBody(shortVideoId, {
            force: force ? '1' : '0',
        }),
    ) as Promise<JsonResponse & {
        queued?: number;
        skipped_active?: number;
        job_ids?: number[];
        gemini_script_phonetic?: AgentVideoContentResponse['gemini_script_phonetic'];
    }>;
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

export async function saveAdminAudioScriptTtsReading(
    shortVideoId: number,
    audioScriptTtsReading: string,
): Promise<SaveAdminAudioScriptTtsReadingResponse> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-admin-audio-script-tts-reading',
        shortVideoBody(shortVideoId, { audio_script_tts_reading: audioScriptTtsReading }),
    ) as Promise<SaveAdminAudioScriptTtsReadingResponse>;
}

export type SaveAgentSourceContentResponse = JsonResponse & {
    agent_source_content?: string;
    agent_additional_info?: string;
    agent_github_repo?: string;
    agent_tiktok_url?: string;
    agent_source_format?: string;
    agent_source_format_label?: string;
    content_plain_text?: string;
    readme_media?: GithubReadmeMediaItem[];
};

export async function saveAgentSourceContent(
    shortVideoId: number,
    content: string,
    githubRepo?: string,
    sourceFormat?: string,
    additionalInfo?: string,
    tiktokUrl?: string,
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
    if (additionalInfo !== undefined) {
        extra.agent_additional_info = additionalInfo;
    }
    if (tiktokUrl !== undefined) {
        extra.agent_tiktok_url = tiktokUrl;
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
    default_branch?: string;
    readme_media?: GithubReadmeMediaItem[];
    repo_stats?: {
        stars?: string;
        forks?: string;
        line?: string;
    };
    additional_info_merged?: string;
    partial?: boolean;
};

export async function fetchGithubReadme(
    shortVideoId: number,
    githubRepo: string,
    currentAdditionalInfo?: string,
): Promise<FetchGithubReadmeResponse> {
    const extra: Record<string, unknown> = {
        github_repo: githubRepo,
        agent_github_repo: githubRepo,
    };
    if (currentAdditionalInfo !== undefined) {
        extra.agent_additional_info = currentAdditionalInfo;
    }
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/fetch-github-readme',
        shortVideoBody(shortVideoId, extra),
    ) as Promise<FetchGithubReadmeResponse>;
}

export type ExtractVideoScriptMeta = {
    title?: string;
    uploader?: string;
    duration_sec?: number | null;
};

export type ExtractVideoScriptResponse = JsonResponse & {
    platform?: string;
    language?: string;
    meta?: ExtractVideoScriptMeta;
    raw_transcript?: string;
    cleaned_script?: string;
    source?: string;
};

export function isTikTokUrl(raw: string): boolean {
    const url = raw.trim();
    if (!url) return false;
    try {
        const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;
        const host = new URL(withProtocol).hostname.replace(/^www\./i, '').toLowerCase();
        return (
            host === 'tiktok.com'
            || host === 'vm.tiktok.com'
            || host === 'vt.tiktok.com'
            || host.endsWith('.tiktok.com')
        );
    } catch {
        return /tiktok\.com/i.test(url);
    }
}

export async function extractVideoScript(
    url: string,
    platform: 'tiktok' = 'tiktok',
): Promise<ExtractVideoScriptResponse> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/extract-video-script',
        {
            url: url.trim(),
            platform,
        },
    ) as Promise<ExtractVideoScriptResponse>;
}

export type ImportGithubReadmeMediaResponse = JsonResponse & {
    imported?: ImportHtmlVisualCatalogItem[];
    skipped?: Array<{ resolved_url?: string; reason?: string }>;
    errors?: Array<{ resolved_url?: string; message?: string }>;
    visual_catalog?: ImportHtmlVisualCatalogItem[];
    import_html?: {
        assets?: ImportHtmlAssets;
    };
};

export async function importGithubReadmeMedia(
    shortVideoId: number,
    items: GithubReadmeMediaItem[],
): Promise<ImportGithubReadmeMediaResponse> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/import-github-readme-media',
        shortVideoBody(shortVideoId, {
            items: items.map((item) => ({
                id: item.id,
                media_type: item.media_type,
                resolved_url: item.resolved_url,
                origin_path: item.origin_path || '',
                alt: item.alt || '',
                ext: item.ext || '',
            })),
        }),
    ) as Promise<ImportGithubReadmeMediaResponse>;
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

export async function fetchTtsPhoneticDict(): Promise<{
    success?: boolean;
    entries?: TtsPhoneticDictEntry[];
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/get-tts-phonetic-dict',
        {},
    );
}

export async function saveTtsPhoneticDict(payload: {
    source_term: string;
    phonetic: string;
    id?: number;
    enabled?: boolean;
    case_sensitive?: boolean;
}): Promise<JsonResponse & {
    entry?: TtsPhoneticDictEntry;
    entries?: TtsPhoneticDictEntry[];
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-tts-phonetic-dict',
        payload,
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
    source?: string;
    fallback_note?: string;
    provider?: string;
}> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/search-agent-bgm',
        { query, limit },
    );
}

export async function startFullAutoPipeline(
    shortVideoId: number,
    mode: 'resume' | 'restart' = 'resume',
    fromStep?: string,
): Promise<JsonResponse & {
    full_auto_pipeline?: FullAutoPipelineSummary;
    mode?: string;
    from_step?: string | null;
}> {
    const body: Record<string, unknown> = { mode };
    if (mode === 'restart' && fromStep) {
        body.from_step = fromStep;
    }
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/start-full-auto-pipeline',
        shortVideoBody(shortVideoId, body),
    ) as Promise<JsonResponse & {
        full_auto_pipeline?: FullAutoPipelineSummary;
        mode?: string;
        from_step?: string | null;
    }>;
}

export async function cancelFullAutoPipeline(
    shortVideoId: number,
): Promise<JsonResponse & { full_auto_pipeline?: FullAutoPipelineSummary }> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/cancel-full-auto-pipeline',
        shortVideoBody(shortVideoId),
    ) as Promise<JsonResponse & { full_auto_pipeline?: FullAutoPipelineSummary }>;
}

export async function requestAgentHeadlessNewChat(
    shortVideoId: number,
    sessionId?: string,
): Promise<JsonResponse> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/request-agent-headless-new-chat',
        shortVideoBody(shortVideoId, sessionId ? { session_id: sessionId } : {}),
    ) as Promise<JsonResponse>;
}

export async function getAgentHeadlessPreviewAccess(
    shortVideoId: number,
): Promise<AgentHeadlessPreviewAccessResponse> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/get-agent-headless-preview-access',
        shortVideoBody(shortVideoId),
    ) as Promise<AgentHeadlessPreviewAccessResponse>;
}

export async function saveAgentImportHtml(
    shortVideoId: number,
    payload: {
        renderMode?: AgentRenderMode;
        html?: string;
        beatMap?: import('./agentVideoBeatMap').BeatMap;
        beatId?: string;
        beatHtml?: string;
        creativePrompt?: string;
        qaStatus?: import('./agentVideoBeatMap').BeatQaStatus;
        qaRefineNote?: string;
        thumbnailHtml?: string;
        thumbnailCreativePrompt?: string;
        thumbnailQaStatus?: ThumbnailQaStatus;
        thumbnailQaNote?: string;
        thumbnailApproved?: boolean;
        bgmSegments?: ImportHtmlBgmSegment[];
        sfxBeatTransition?: boolean;
        sfxHook?: boolean;
        visualCatalog?: ImportHtmlVisualCatalogItem[];
        visualSearchQueries?: string[];
        githubImageShots?: ImportHtmlGithubImageShot[];
        readmeMedia?: GithubReadmeMediaItem[];
    },
): Promise<JsonResponse & {
    render_mode?: AgentRenderMode;
    import_html?: ImportHtmlSummary;
}> {
    const body: Record<string, unknown> = shortVideoBody(shortVideoId);
    if (payload.renderMode !== undefined) {
        body.render_mode = payload.renderMode;
    }
    if (payload.html !== undefined) {
        body.html = payload.html;
    }
    if (payload.beatMap !== undefined) {
        body.beat_map = payload.beatMap;
    }
    if (payload.beatId !== undefined && (
        payload.beatHtml !== undefined
        || payload.creativePrompt !== undefined
        || payload.qaStatus !== undefined
        || payload.qaRefineNote !== undefined
    )) {
        body.beat_id = payload.beatId;
        if (payload.beatHtml !== undefined) {
            body.beat_html = payload.beatHtml;
        }
        if (payload.creativePrompt !== undefined) {
            body.creative_prompt = payload.creativePrompt;
        }
        if (payload.qaStatus !== undefined) {
            body.qa_status = payload.qaStatus;
        }
        if (payload.qaRefineNote !== undefined) {
            body.qa_refine_note = payload.qaRefineNote;
        }
    }
    if (payload.thumbnailHtml !== undefined) {
        body.thumbnail_html = payload.thumbnailHtml;
    }
    if (payload.thumbnailCreativePrompt !== undefined) {
        body.thumbnail_creative_prompt = payload.thumbnailCreativePrompt;
    }
    if (payload.thumbnailQaStatus !== undefined) {
        body.thumbnail_qa_status = payload.thumbnailQaStatus;
    }
    if (payload.thumbnailQaNote !== undefined) {
        body.thumbnail_qa_note = payload.thumbnailQaNote;
    }
    if (payload.thumbnailApproved !== undefined) {
        body.thumbnail_approved = payload.thumbnailApproved;
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
    if (payload.githubImageShots !== undefined) {
        body.github_image_shots = payload.githubImageShots;
    }
    if (payload.readmeMedia !== undefined) {
        body.readme_media = payload.readmeMedia;
    }
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-import-html',
        body,
    );
}

export async function saveAgentCaptionAlignments(
    shortVideoId: number,
    payload: {
        words: Array<{ text: string; start: number; end: number }>;
        overrides?: CaptionAlignOverride[];
        captionSync?: CaptionSyncSummary;
    },
): Promise<JsonResponse & { import_html?: ImportHtmlSummary }> {
    return postJson(
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/save-agent-caption-alignments',
        {
            ...shortVideoBody(shortVideoId),
            words: payload.words,
            overrides: payload.overrides ?? [],
            caption_sync: payload.captionSync ?? {},
        },
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
