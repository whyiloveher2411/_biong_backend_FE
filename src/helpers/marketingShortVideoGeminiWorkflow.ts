import { getAccessToken } from 'store/user/user.reducers';
import { getApiHost } from 'helpers/apiHost';
import { convertToURL } from 'helpers/url';

const GEMINI_WEB_APP_URL = 'https://gemini.google.com/u/0/app?pageId=none';

export type ShortVideoScriptPromptResponse = {
    success?: boolean;
    prompt?: string;
    target_lang?: string;
    marketing_post_id?: number;
    short_video_id?: number;
    message?: { content?: string } | string;
};

function apiHost(): string {
    return getApiHost();
}

function pluginApiPath(suffix: string): string {
    return convertToURL(apiHost(), `/api/admin/plugin/vn4-e-learning/app-mobile/marketing/${suffix}`);
}

export function shortVideoScriptSaveApiUrl(): string {
    return pluginApiPath('short-video-script/update-from-overview');
}

export function shortVideoWorkflowStatusApiUrl(shortVideoId: number): string {
    const url = new URL(pluginApiPath('short-video/workflow/status'));
    url.searchParams.set('short_video_id', String(shortVideoId));
    const token = getAccessToken();
    if (token) {
        url.searchParams.set('access_token', token);
    }
    return url.toString();
}

export async function fetchShortVideoScriptPrompt(
    shortVideoId: number,
    options?: { freshSession?: boolean },
): Promise<ShortVideoScriptPromptResponse> {
    const token = getAccessToken() ?? '';
    const res = await fetch(pluginApiPath('short-video-script/get-gemini-prompt'), {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
            short_video_id: shortVideoId,
            id: shortVideoId,
            fresh_session: options?.freshSession !== false ? 1 : 0,
            access_token: token,
        }),
    });
    return res.json();
}

export function buildShortVideoGeminiWorkflowUrl(options: {
    shortVideoId: number;
    marketingPostId: number;
    lang: string;
    prompt: string;
    auto?: boolean;
}): string {
    const { shortVideoId, marketingPostId, lang, prompt, auto } = options;
    const accessToken = getAccessToken() ?? '';
    const apiUrl = shortVideoScriptSaveApiUrl();

    const url = new URL(GEMINI_WEB_APP_URL);
    const hashParams = new URLSearchParams({
        copy_marketing_ai: '1',
        marketing_short_video_id: String(shortVideoId),
        marketing_post_id: String(marketingPostId),
        marketing_stage: 'short_video_script',
        access_token: accessToken,
        api_url: apiUrl,
        content_type: 'short_video_script',
        target_lang: lang.trim().toLowerCase(),
        fresh_session: '1',
    });

    if (auto) {
        hashParams.set('marketing_workflow_auto', '1');
        hashParams.set('marketing_workflow_step', 'short_video_script');
    }

    const promptTrimmed = prompt.trim();
    if (promptTrimmed) {
        hashParams.set('marketing_prompt', encodeURIComponent(promptTrimmed));
    }

    url.hash = hashParams.toString();
    return url.toString();
}

export async function openShortVideoGeminiWorkflow(options: {
    shortVideoId: number;
    marketingPostId?: number;
    lang?: string | null;
    auto?: boolean;
}): Promise<void> {
    const shortVideoId = Number(options.shortVideoId || 0);
    if (!shortVideoId) {
        window.alert('Thiếu short_video_id');
        return;
    }

    const res = await fetchShortVideoScriptPrompt(shortVideoId, { freshSession: true });
    if (!res?.success) {
        const msg =
            typeof res?.message === 'object'
                ? res.message?.content
                : typeof res?.message === 'string'
                  ? res.message
                  : 'Không tạo được prompt script TikTok';
        window.alert(msg || 'Không tạo được prompt script TikTok');
        return;
    }

    const prompt = String(res.prompt || '').trim();
    if (!prompt) {
        window.alert('Prompt script TikTok trống');
        return;
    }

    const marketingPostId = Number(options.marketingPostId || res.marketing_post_id || 0);
    const lang = String(options.lang || res.target_lang || 'vi').trim().toLowerCase();
    const geminiUrl = buildShortVideoGeminiWorkflowUrl({
        shortVideoId,
        marketingPostId,
        lang,
        prompt,
        auto: options.auto,
    });

    window.open(geminiUrl, '_blank', 'noopener,noreferrer');
}
