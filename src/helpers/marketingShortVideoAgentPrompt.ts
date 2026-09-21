import { getAccessToken } from 'store/user/user.reducers';
import { getApiHost } from 'helpers/apiHost';
import { convertToURL } from 'helpers/url';

export type ShortVideoAgentPromptVariant = 'agent' | 'chatbot';

export type ShortVideoAgentPromptPhase =
    | '1'
    | '2'
    | 'audio_script'
    | 'render_video'
    | 'continue'
    | 'post_approval'
    | 'import_assemble'
    | 'import_html_full'
    | '3';

export type ShortVideoAgentPromptResponse = {
    success?: boolean;
    prompt?: string;
    phase?: string;
    stage?: string;
    short_video_id?: number;
    workflow_mode?: 'manual_2_step' | 'auto_tts_full';
    agent_workflow?: {
        phase?: string;
        has_script?: boolean;
        script_approved?: boolean;
        ready_for_continue?: boolean;
        ready_for_video?: boolean;
        ready_for_phase_2?: boolean;
        has_agent_video?: boolean;
        agent_tts_auto?: boolean;
        workflow_mode?: string;
    };
    message?: { content?: string } | string;
    variant?: ShortVideoAgentPromptVariant;
};

function pluginApiPath(suffix: string): string {
    return convertToURL(getApiHost(), `/api/admin/plugin/vn4-e-learning/app-mobile/marketing/${suffix}`);
}

function normalizePromptPhase(phase: ShortVideoAgentPromptPhase): string {
    if (phase === 'audio_script' || phase === '1') {
        return '1';
    }
    if (phase === 'render_video' || phase === '2') {
        return '2';
    }
    if (phase === 'import_assemble') {
        return 'import_assemble';
    }
    if (phase === 'import_html_full') {
        return 'import_html_full';
    }
    if (phase === 'continue' || phase === 'post_approval' || phase === '3') {
        return 'continue';
    }
    return phase;
}

export function resolveAgentPromptPhaseFromAction(phaseKey: string): ShortVideoAgentPromptPhase {
    if (phaseKey === 'continue' || phaseKey === 'post_approval') {
        return 'continue';
    }
    if (phaseKey === 'full_pipeline' || phaseKey === 'full' || phaseKey === 'pipeline') {
        return 'continue';
    }
    if (phaseKey === 'render_video') {
        return '2';
    }
    return '1';
}

export type CopyShortVideoAgentPromptOptions = {
    variant?: ShortVideoAgentPromptVariant;
};

export type ShortVideoPromptFetchResponse = {
    success?: boolean;
    prompt?: string;
    stage?: string;
    short_video_id?: number;
    content?: string;
    content_file_name?: string;
    file?: string;
    kind?: 'title' | 'thumbnail' | string;
    video_content?: string;
    selected_title?: string;
    style_reference?: string;
    replaced?: Record<string, boolean>;
    message?: { content?: string } | string;
};

export type YoutubePromptKind = 'title' | 'thumbnail';

export type YoutubeThumbnailImageResponse = ShortVideoPromptFetchResponse & {
    url?: string;
    image_url?: string;
    preview_url?: string;
    s3_key?: string;
    width?: number;
    height?: number;
    cookie_id?: number;
    /** Url chatbot (Meta.ai / Duck.ai) đã tạo ảnh — dùng để mở lại/update theo feedback. */
    chat_url?: string;
    image_prompt?: string;
    rank?: number;
    mode?: string;
    /** true khi Meta.ai chặn prompt gốc và ảnh được tạo bằng prompt phiên bản an toàn. */
    safe_version_used?: boolean;
};

/** Sinh ảnh thumbnail YouTube từ prompt qua Meta.ai headless (đồng bộ). */
export async function generateYoutubeThumbnailImage(
    shortVideoId: number,
    prompt: string,
    options: { rank?: number; label?: string } = {},
): Promise<YoutubeThumbnailImageResponse> {
    return postShortVideoPrompt('short-video/generate-youtube-thumbnail-image', shortVideoId, {
        prompt,
        label: options.label ?? '',
        rank: options.rank ?? 0,
    }) as Promise<YoutubeThumbnailImageResponse>;
}

export type YoutubeThumbnailConceptPrompt = {
    rank: number;
    prompt: string;
    label?: string;
};

export type EnqueueYoutubeThumbnailImagesResponse = {
    success?: boolean;
    regenerate?: boolean;
    cancelled_job_count?: number;
    queued?: { rank: number; job_id: number }[];
    skipped?: { rank: number; reason: string }[];
    invalid?: number[];
    message?: { content?: string } | string;
};

/**
 * Enqueue render ảnh thumbnail cho nhiều concept (job riêng mỗi concept).
 * regenerate = true → huỷ job đang chạy và render lại TẤT CẢ concept.
 */
export async function enqueueYoutubeThumbnailImages(
    shortVideoId: number,
    concepts: YoutubeThumbnailConceptPrompt[],
    regenerate = false,
): Promise<EnqueueYoutubeThumbnailImagesResponse> {
    return postShortVideoPrompt('short-video/enqueue-youtube-thumbnail-images', shortVideoId, {
        concepts,
        regenerate,
    }) as Promise<EnqueueYoutubeThumbnailImagesResponse>;
}

export type YoutubeThumbnailStatusResponse = {
    success?: boolean;
    active?: { rank: number; job_id: number; status: string }[];
    image_urls?: Record<string, string>;
    /** rank → url chatbot đã tạo ảnh (để mở lại / update theo feedback). */
    chat_urls?: Record<string, string>;
    /** rank → cookie_id account Meta.ai đã tạo chat (để set lại cookie khi mở). */
    chat_cookie_ids?: Record<string, number>;
    /** rank → feedback đang chờ update (pending tới khi worker render xong). */
    feedback_notes?: Record<string, string>;
    message?: { content?: string } | string;
};

/** Trạng thái job thumbnail đang chạy + URL ảnh đã render (UI polling). */
export async function fetchYoutubeThumbnailStatus(
    shortVideoId: number,
): Promise<YoutubeThumbnailStatusResponse> {
    return postShortVideoPrompt('short-video/youtube-thumbnail-status', shortVideoId) as Promise<YoutubeThumbnailStatusResponse>;
}

export type RefineYoutubeThumbnailImageResponse = ShortVideoPromptFetchResponse & {
    job_id?: number;
    rank?: number;
    feedback?: string;
};

/**
 * Gửi feedback cho 1 concept thumbnail: BE lưu feedback + tạo job ngay để mở lại
 * chat Meta.ai cũ và render lại ảnh theo feedback mới.
 */
export async function refineYoutubeThumbnailImage(
    shortVideoId: number,
    rank: number,
    feedback: string,
): Promise<RefineYoutubeThumbnailImageResponse> {
    return postShortVideoPrompt('short-video/refine-youtube-thumbnail-image', shortVideoId, {
        rank,
        feedback,
        note: feedback,
    }) as Promise<RefineYoutubeThumbnailImageResponse>;
}

export type SyncLatestYoutubeThumbnailImageResponse = ShortVideoPromptFetchResponse & {
    job_id?: number;
    rank?: number;
};

/**
 * Lấy HÌNH MỚI NHẤT từ chat Meta.ai cũ của thumbnail: tạo job nền mở lại chat
 * (không gửi message) để pull ảnh cuối cùng. Dùng khi user đã feedback trực tiếp
 * với chatbot ngoài CMS.
 */
export async function syncLatestYoutubeThumbnailImage(
    shortVideoId: number,
    rank: number,
): Promise<SyncLatestYoutubeThumbnailImageResponse> {
    return postShortVideoPrompt('short-video/sync-latest-youtube-thumbnail-image', shortVideoId, {
        rank,
    }) as Promise<SyncLatestYoutubeThumbnailImageResponse>;
}

export async function fetchShortVideoAgentPrompt(
    shortVideoId: number,
    phase: ShortVideoAgentPromptPhase,
    options: CopyShortVideoAgentPromptOptions = {},
): Promise<ShortVideoAgentPromptResponse> {
    const token = getAccessToken() ?? '';
    const normalizedPhase = normalizePromptPhase(phase);
    const variant = options.variant === 'chatbot' ? 'chatbot' : 'agent';

    const res = await fetch(pluginApiPath('short-video/get-agent-prompt'), {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
            short_video_id: shortVideoId,
            id: shortVideoId,
            phase: normalizedPhase,
            variant,
            access_token: token,
        }),
    });

    return res.json() as Promise<ShortVideoAgentPromptResponse>;
}

async function postShortVideoPrompt<T = ShortVideoPromptFetchResponse>(
    suffix: string,
    shortVideoId: number,
    extra: Record<string, unknown> = {},
): Promise<T> {
    const token = getAccessToken() ?? '';
    const res = await fetch(pluginApiPath(suffix), {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
            short_video_id: shortVideoId,
            id: shortVideoId,
            access_token: token,
            ...extra,
        }),
    });
    return res.json() as Promise<T>;
}

export async function fetchImproveScriptPrompt(
    shortVideoId: number,
): Promise<ShortVideoPromptFetchResponse> {
    return postShortVideoPrompt('short-video/get-improve-script-prompt', shortVideoId);
}

export async function fetchScriptPhoneticPrompt(
    shortVideoId: number,
    contentMode: 'text' | 'file' = 'text',
): Promise<ShortVideoPromptFetchResponse> {
    return postShortVideoPrompt('short-video/get-script-phonetic-prompt', shortVideoId, {
        content_mode: contentMode === 'file' ? 'file' : 'inline',
    });
}

/**
 * Prompt generate title/thumbnail YouTube — BE thay các keyword:
 * [VIDEO_CONTENT] = audio script, [TITLE] = tiêu đề đã chọn, [STYLE_REFERENCE] = phong cách hình ảnh.
 */
export async function fetchYoutubePrompt(
    shortVideoId: number,
    kind: YoutubePromptKind,
): Promise<ShortVideoPromptFetchResponse> {
    return postShortVideoPrompt('short-video/get-youtube-prompt', shortVideoId, { kind });
}

export async function copyYoutubePromptToClipboard(
    shortVideoId: number,
    kind: YoutubePromptKind,
): Promise<{ ok: boolean; message: string }> {
    const res = await fetchYoutubePrompt(shortVideoId, kind);
    const content = String(res?.content || '').trim();
    if (!res?.success || !content) {
        return {
            ok: false,
            message: parseShortVideoPromptMessage(res?.message) || 'Không tải được prompt',
        };
    }

    const copied = await writePromptTextToClipboard(content);
    if (!copied) {
        return { ok: false, message: 'Không copy được — hãy chọn và copy thủ công' };
    }

    return {
        ok: true,
        message: kind === 'title'
            ? 'Đã copy prompt tạo tiêu đề (YouTube)'
            : 'Đã copy prompt tạo ảnh thu nhỏ (YouTube)',
    };
}

export type YoutubeResolvedChapterResponse = {
    success?: boolean;
    short_video_id?: number;
    timing_source?: string;
    chapter_count?: number;
    chapters?: Array<{
        title?: string;
        anchor_line?: string;
        line_index?: number;
        startSec?: number;
        endSec?: number | null;
        startLabel?: string;
        timing_source?: string;
    }>;
    chapters_text?: string;
    unmatched_titles?: string[];
    message?: { content?: string } | string;
};

/**
 * Nhờ BE quyết mốc thời gian thật cho chapter — chatbot chỉ trả neo nội dung
 * (anchor_line/anchor_text/title), BE dò từ whisper/beat_map rồi trả `M:SS`.
 */
export async function resolveYoutubeChapters(
    shortVideoId: number,
    chapters: Array<{ anchor_line: string; anchor_text?: string; title: string }>,
): Promise<YoutubeResolvedChapterResponse> {
    return postShortVideoPrompt<YoutubeResolvedChapterResponse>(
        'short-video/resolve-youtube-chapters',
        shortVideoId,
        { chapters },
    );
}

export function parseShortVideoPromptMessage(
    message: ShortVideoPromptFetchResponse['message'] | ShortVideoAgentPromptResponse['message'],
): string {
    if (typeof message === 'object' && message?.content) {
        return String(message.content);
    }
    if (typeof message === 'string') {
        return message;
    }
    return '';
}

function parseMessage(message: ShortVideoAgentPromptResponse['message']): string {
    return parseShortVideoPromptMessage(message);
}

export async function writePromptTextToClipboard(text: string): Promise<boolean> {
    const value = String(text || '').trim();
    if (!value) {
        return false;
    }
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(value);
        } else {
            const ta = document.createElement('textarea');
            ta.value = value;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
        return true;
    } catch {
        return false;
    }
}

export async function copyShortVideoAgentPromptToClipboard(
    shortVideoId: number,
    phase: ShortVideoAgentPromptPhase,
    options: CopyShortVideoAgentPromptOptions = {},
): Promise<{ ok: boolean; message: string }> {
    const res = await fetchShortVideoAgentPrompt(shortVideoId, phase, options);
    if (!res?.success || !res.prompt?.trim()) {
        return {
            ok: false,
            message: parseMessage(res?.message) || 'Không tạo được prompt agent',
        };
    }

    const ok = await writePromptTextToClipboard(res.prompt);
    if (!ok) {
        return {
            ok: false,
            message: 'Không copy được — hãy chọn và copy thủ công',
        };
    }
    return {
        ok: true,
        message: normalizedPhaseLabel(phase, options.variant),
    };
}

function normalizedPhaseLabel(
    phase: ShortVideoAgentPromptPhase,
    variant: ShortVideoAgentPromptVariant = 'agent',
): string {
    if (phase === 'import_html_full') {
        return 'Đã copy prompt auto HTML beat + ghép video vào clipboard';
    }
    if (phase === 'import_assemble') {
        return 'Đã copy prompt agent ghép HTML chatbot vào clipboard';
    }
    if (phase === 'continue' || phase === 'post_approval' || phase === '3') {
        return 'Đã copy prompt agent tiếp tục (TTS + render) vào clipboard';
    }
    if (phase === '1' || phase === 'audio_script') {
        if (variant === 'chatbot') {
            return 'Đã copy prompt sinh audio script (chatbot)';
        }
        return 'Đã copy prompt agent bước 1 (script) vào clipboard';
    }
    return 'Đã copy prompt agent bước 2 (video) vào clipboard';
}
