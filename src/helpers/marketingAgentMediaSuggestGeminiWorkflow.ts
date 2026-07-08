import { getAccessToken } from 'store/user/user.reducers';
import { getApiHost } from 'helpers/apiHost';
import { convertToURL } from 'helpers/url';
import { waitForExtensionReady, openExternalTabViaExtension } from 'helpers/openExternalTabViaExtension';
import { dispatchCmsExtensionEvent } from 'helpers/cmsExtensionEventBridge';

const GEMINI_WEB_APP_URL = 'https://gemini.google.com/u/0/app?pageId=none';
const OPEN_AGENT_MEDIA_SUGGEST_GEMINI_EVENT = 'vn4-open-agent-media-suggest-gemini';
const OPEN_AGENT_MEDIA_SUGGEST_GEMINI_RESULT_EVENT = 'vn4-open-agent-media-suggest-gemini-result';
const MAX_PROMPT_CHARS = 12000;
const MAX_SCRIPT_CHARS = 2800;
const MAX_CONTEXT_JSON_CHARS = 6000;

function pluginApiPath(suffix: string): string {
    return convertToURL(getApiHost(), `/api/admin/plugin/vn4-e-learning/app-mobile/marketing/${suffix}`);
}

export function agentMediaSuggestionSaveFromGeminiApiUrl(): string {
    return pluginApiPath('short-video/save-agent-media-suggestions-from-gemini');
}

function trimText(value: unknown, maxChars: number): string {
    const text = String(value || '').trim();
    if (text.length <= maxChars) {
        return text;
    }
    return `${text.slice(0, maxChars)}...`;
}

function buildCompactContext(contextPayload: unknown): string {
    if (!contextPayload || typeof contextPayload !== 'object') {
        return '{}';
    }
    const raw = contextPayload as Record<string, unknown>;
    const compact = {
        short_video_id: raw.short_video_id,
        title: raw.title,
        language: raw.language,
        hf_prompt_type: raw.hf_prompt_type,
        audio_file_duration_sec: raw.audio_file_duration_sec,
        beat_map_ready: raw.beat_map_ready,
        beat_count: Array.isArray((raw.beat_map as { sections?: unknown[] } | undefined)?.sections)
            ? (((raw.beat_map as { sections?: unknown[] }).sections || []).length)
            : undefined,
        marketing_post_images: Array.isArray(raw.marketing_post_images)
            ? (raw.marketing_post_images as unknown[]).slice(0, 8)
            : [],
        visual_catalog: Array.isArray(raw.visual_catalog)
            ? (raw.visual_catalog as unknown[]).slice(0, 12)
            : [],
    };
    const json = JSON.stringify(compact, null, 2);
    return trimText(json, MAX_CONTEXT_JSON_CHARS);
}

export function buildAgentMediaSuggestionPrompt(options: {
    shortVideoId: number;
    title?: string;
    appMobileTitle?: string;
    audioScript?: string;
    contextPayload?: unknown;
}): string {
    const contextJson = buildCompactContext(options.contextPayload);
    const prompt = [
        'Bạn là trợ lý chọn visual cho short video.',
        'Mục tiêu: đề xuất danh sách câu search ảnh (tiếng Anh, ngắn gọn, cụ thể) để tìm ảnh stock trên Pexels.',
        'Yêu cầu:',
        '- Trả về đúng 8-12 query ảnh.',
        '- Mỗi query mô tả 1 visual rõ ràng, không trùng ý.',
        '- Ưu tiên visual an toàn, bối cảnh đời thực hoặc concept dễ tìm ảnh.',
        '- Không trả markdown, không giải thích thêm.',
        '- Chỉ trả JSON theo đúng format:',
        '{"visual_search_queries":["query 1","query 2"]}',
        '',
        `short_video_id: ${options.shortVideoId}`,
        `title: ${String(options.title || '').trim()}`,
        `app_mobile_title: ${String(options.appMobileTitle || '').trim()}`,
        '',
        'audio_script:',
        trimText(options.audioScript, MAX_SCRIPT_CHARS),
        '',
        'context_compact:',
        contextJson,
    ].join('\n');
    return trimText(prompt, MAX_PROMPT_CHARS);
}

export async function openAgentMediaSuggestionGemini(options: {
    shortVideoId: number;
    marketingPostId: number;
    prompt: string;
    autoSubmit?: boolean;
}): Promise<void> {
    const accessToken = getAccessToken() ?? '';
    const saveApiUrl = agentMediaSuggestionSaveFromGeminiApiUrl();
    const extensionReady = await waitForExtensionReady(8000);
    if (extensionReady) {
        const result = await dispatchCmsExtensionEvent(
            OPEN_AGENT_MEDIA_SUGGEST_GEMINI_EVENT,
            {
                short_video_id: options.shortVideoId,
                marketing_post_id: options.marketingPostId,
                stage: 'agent_media_suggestion',
                save_api_url: saveApiUrl,
                access_token: accessToken,
                marketing_prompt: trimText(options.prompt, MAX_PROMPT_CHARS),
                auto_submit: options.autoSubmit !== false,
            },
            OPEN_AGENT_MEDIA_SUGGEST_GEMINI_RESULT_EVENT,
            10000,
        );
        if (!result.ok) {
            throw new Error(result.error || 'Không mở được tab Gemini gợi ý media');
        }
        return;
    }

    const url = new URL(GEMINI_WEB_APP_URL);
    const hashParams = new URLSearchParams({
        copy_marketing_ai: '1',
        marketing_ai_provider: 'gemini',
        marketing_post_id: String(options.marketingPostId),
        marketing_short_video_id: String(options.shortVideoId),
        marketing_stage: 'agent_media_suggestion',
        access_token: accessToken,
        api_url: saveApiUrl,
        content_type: 'agent_media_suggestion',
        fresh_session: '1',
        marketing_fill_only: '1',
        marketing_open_nonce: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    });

    if (options.autoSubmit !== false) {
        hashParams.set('marketing_auto_submit', '1');
    }

    const prompt = trimText(options.prompt, MAX_PROMPT_CHARS);
    if (prompt) {
        hashParams.set('marketing_prompt', encodeURIComponent(prompt));
    }

    url.hash = hashParams.toString();
    openExternalTabViaExtension(url.toString());
}
