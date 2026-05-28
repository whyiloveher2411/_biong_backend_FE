import { getAccessToken } from 'store/user/user.reducers';
import { convertToURL } from 'helpers/url';

const GEMINI_WEB_APP_URL = 'https://gemini.google.com/u/1/app?pageId=none';

/** Khớp filters_custom post-type spacedev_app_marketing_post (extension auto bật filter này). */
export const MARKETING_PIPELINE_FILTER_SAVED_NAME = 'Pipeline Gemini (viết lại + dịch + Facebook)';

export const MARKETING_PIPELINE_FILTER_SAVED_NAME_LEGACY = 'Pipeline Gemini (viết lại + dịch)';

export type MarketingWorkflowAction = 'article_rewrite' | 'content_translate' | 'facebook_distribution';

export type MarketingWorkflowMeta = {
    action: MarketingWorkflowAction;
    target_lang?: string | null;
    post_id: number;
    platform?: string | null;
    distribution_stage?: string | null;
};

export type MarketingWorkflowStatus = {
    success?: boolean;
    post_id?: number;
    stage?: string;
    source_lang?: string;
    missing_langs?: string[];
    can_rewrite?: boolean;
    next_action?: {
        type?: string;
        target_lang?: string | null;
        post_id?: number;
        can_run?: boolean;
        reason?: string;
        platform?: string | null;
        distribution_stage?: string | null;
    };
};

function apiHost(): string {
    return process.env.REACT_APP_HOST_API_KEY || window.location.origin;
}

function pluginApiPath(suffix: string): string {
    return convertToURL(apiHost(), `/api/admin/plugin/vn4-e-learning/app-mobile/marketing/${suffix}`);
}

export function marketingWorkflowSaveApiUrl(action: MarketingWorkflowAction): string {
    if (action === 'article_rewrite') {
        return pluginApiPath('article-rewrite/update-from-overview');
    }
    if (action === 'facebook_distribution') {
        return pluginApiPath('content-ai/update-from-overview');
    }
    return pluginApiPath('content-translate/update-from-overview');
}

export function marketingWorkflowApplyApiUrl(): string {
    return pluginApiPath('article-rewrite/apply-from-gemini');
}

export function marketingWorkflowStatusApiUrl(postId: number): string {
    const url = new URL(pluginApiPath('workflow/status'));
    url.searchParams.set('post_id', String(postId));
    const token = getAccessToken();
    if (token) {
        url.searchParams.set('access_token', token);
    }
    return url.toString();
}

export async function fetchMarketingWorkflowStatus(postId: number): Promise<MarketingWorkflowStatus> {
    const res = await fetch(marketingWorkflowStatusApiUrl(postId), {
        method: 'GET',
        credentials: 'include',
        headers: getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {},
    });
    return res.json();
}

export async function fetchArticleRewritePrompt(postId: number): Promise<{ success?: boolean; prompt?: string; topic?: string }> {
    const token = getAccessToken() ?? '';
    const url = new URL(pluginApiPath('article-rewrite/get-overview-prompt'));
    url.searchParams.set('post_id', String(postId));
    if (token) {
        url.searchParams.set('access_token', token);
    }
    const res = await fetch(url.toString(), {
        method: 'GET',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return res.json();
}

export async function fetchContentTranslatePrompt(
    postId: number,
    targetLang: string
): Promise<{ success?: boolean; prompt?: string; target_lang?: string }> {
    const token = getAccessToken() ?? '';
    const res = await fetch(pluginApiPath('content-translate/get-gemini-prompt'), {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
            post_id: postId,
            id: postId,
            target_lang: targetLang,
            access_token: token,
        }),
    });
    return res.json();
}

export async function fetchFacebookDistributionPrompt(
    postId: number
): Promise<{ success?: boolean; prompt?: string }> {
    const token = getAccessToken() ?? '';
    const url = new URL(pluginApiPath('content-ai/get-overview-prompt'));
    url.searchParams.set('post_id', String(postId));
    url.searchParams.set('platform', 'facebook');
    url.searchParams.set('distribution_stage', 'plat_copy');
    url.searchParams.set('auto_workflow', '1');
    if (token) {
        url.searchParams.set('access_token', token);
    }
    const res = await fetch(url.toString(), {
        method: 'GET',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return res.json();
}

export function buildGeminiWorkflowUrl(options: {
    postId: number;
    action: MarketingWorkflowAction;
    targetLang?: string | null;
    prompt: string;
    topic?: string;
    auto?: boolean;
}): string {
    const { postId, action, targetLang, prompt, topic, auto } = options;
    const accessToken = getAccessToken() ?? '';
    const apiUrl = marketingWorkflowSaveApiUrl(action);
    const isFacebook = action === 'facebook_distribution';
    const stage = isFacebook
        ? 'dist:facebook:plat_copy'
        : action === 'article_rewrite'
          ? 'article_rewrite'
          : 'content_translate';

    const url = new URL(GEMINI_WEB_APP_URL);
    const hashParams = new URLSearchParams({
        copy_marketing_ai: '1',
        marketing_post_id: String(postId),
        marketing_stage: stage,
        access_token: accessToken,
        api_url: apiUrl,
        content_type: 'long_form',
    });

    if (isFacebook) {
        hashParams.set('platform', 'facebook');
        hashParams.set('distribution_stage', 'plat_copy');
    }
    if (action === 'content_translate' && targetLang) {
        hashParams.set('target_lang', targetLang.trim().toLowerCase());
    }
    if (topic) {
        hashParams.set('topic', topic);
    }
    if (auto) {
        hashParams.set('marketing_workflow_auto', '1');
        hashParams.set(
            'marketing_workflow_step',
            action === 'article_rewrite'
                ? 'rewrite'
                : isFacebook
                  ? 'facebook'
                  : 'translate'
        );
        hashParams.set('marketing_apply_api_url', marketingWorkflowApplyApiUrl());
    }

    const promptTrimmed = prompt.trim();
    if (promptTrimmed) {
        hashParams.set('marketing_prompt', encodeURIComponent(promptTrimmed));
    }

    url.hash = hashParams.toString();
    return url.toString();
}

export async function openMarketingGeminiWorkflow(
    workflow: MarketingWorkflowMeta,
    options?: { auto?: boolean }
): Promise<void> {
    const postId = Number(workflow.post_id || 0);
    if (!postId) {
        window.alert('Thiếu post_id');
        return;
    }

    const action = workflow.action;
    let prompt = '';
    let topic = '';

    if (action === 'article_rewrite') {
        const res = await fetchArticleRewritePrompt(postId);
        if (!res?.success) {
            const msg =
                typeof (res as { message?: { content?: string } })?.message === 'object'
                    ? (res as { message?: { content?: string } }).message?.content
                    : 'Không tạo được prompt viết lại';
            window.alert(msg || 'Không tạo được prompt viết lại');
            return;
        }
        prompt = String(res.prompt || '').trim();
        topic = String(res.topic || '').trim();
    } else if (action === 'facebook_distribution') {
        const res = await fetchFacebookDistributionPrompt(postId);
        if (!res?.success) {
            const msg =
                typeof (res as { message?: { content?: string } })?.message === 'object'
                    ? (res as { message?: { content?: string } }).message?.content
                    : 'Không tạo được prompt Facebook';
            window.alert(msg || 'Không tạo được prompt Facebook');
            return;
        }
        prompt = String(res.prompt || '').trim();
    } else {
        const lang = String(workflow.target_lang || '').trim().toLowerCase();
        if (!lang) {
            window.alert('Thiếu ngôn ngữ đích');
            return;
        }
        const res = await fetchContentTranslatePrompt(postId, lang);
        if (!res?.success) {
            window.alert('Không tạo được prompt dịch');
            return;
        }
        prompt = String(res.prompt || '').trim();
    }

    if (!prompt) {
        window.alert('Prompt trống');
        return;
    }

    const geminiUrl = buildGeminiWorkflowUrl({
        postId,
        action,
        targetLang: workflow.target_lang,
        prompt,
        topic,
        auto: options?.auto,
    });
    window.open(geminiUrl, '_blank', 'noopener,noreferrer');
}
