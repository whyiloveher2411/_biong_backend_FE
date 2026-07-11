import { getAccessToken } from 'store/user/user.reducers';
import { getApiHost } from 'helpers/apiHost';
import { convertToURL } from 'helpers/url';
import { waitForExtensionReady } from 'helpers/openExternalTabViaExtension';
import { dispatchCmsExtensionEvent } from 'helpers/cmsExtensionEventBridge';
import { parseApiMessage } from 'plugins/Vn4ELearning/AddOn/CreateData/Tabs/AppMobile/Marketing/AgentVideo/agentVideoApi';

const GEMINI_WEB_APP_URL = 'https://gemini.google.com/u/0/app?pageId=none';

const OPEN_TTS_PHONETIC_GEMINI_EVENT = 'vn4-open-tts-phonetic-gemini';
const OPEN_TTS_PHONETIC_GEMINI_RESULT_EVENT = 'vn4-open-tts-phonetic-gemini-result';

function apiHost(): string {
    return getApiHost();
}

function pluginApiPath(suffix: string): string {
    return convertToURL(apiHost(), `/api/admin/plugin/vn4-e-learning/app-mobile/marketing/${suffix}`);
}

export function ttsPhoneticGeminiPromptApiUrl(): string {
    return pluginApiPath('short-video/get-tts-phonetic-gemini-prompt');
}

export function ttsPhoneticDictSaveApiUrl(): string {
    return pluginApiPath('short-video/save-tts-phonetic-dict');
}

export async function fetchTtsPhoneticGeminiPrompt(
    sourceTerm: string,
): Promise<{ success?: boolean; prompt?: string; message?: { content?: string } | string }> {
    const token = getAccessToken() ?? '';
    const res = await fetch(ttsPhoneticGeminiPromptApiUrl(), {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
            source_term: sourceTerm,
            access_token: token,
        }),
    });
    return res.json();
}

function buildTtsPhoneticGeminiWorkflowUrl(options: {
    shortVideoId: number;
    sourceTerm: string;
    marketingPrompt: string;
    autoSubmit?: boolean;
}): string {
    const accessToken = getAccessToken() ?? '';
    const saveApiUrl = ttsPhoneticDictSaveApiUrl();
    const url = new URL(GEMINI_WEB_APP_URL);
    const hashParams = new URLSearchParams({
        copy_marketing_ai: '1',
        marketing_ai_provider: 'gemini',
        marketing_short_video_id: String(options.shortVideoId),
        marketing_stage: 'tts_phonetic_dict',
        access_token: accessToken,
        api_url: saveApiUrl,
        content_type: 'tts_phonetic_dict',
        fresh_session: '1',
        marketing_fill_only: '1',
        marketing_open_nonce: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        source_term: options.sourceTerm,
    });

    if (options.autoSubmit !== false) {
        hashParams.set('marketing_auto_submit', '1');
    }

    const prompt = String(options.marketingPrompt || '').trim();
    if (prompt && prompt.length <= 6000) {
        hashParams.set('marketing_prompt', encodeURIComponent(prompt));
    }

    url.hash = hashParams.toString();
    return url.toString();
}

function dispatchOpenTtsPhoneticGeminiEvent(
    detail: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
    return dispatchCmsExtensionEvent(
        OPEN_TTS_PHONETIC_GEMINI_EVENT,
        detail,
        OPEN_TTS_PHONETIC_GEMINI_RESULT_EVENT,
        12000,
    );
}

let ttsPhoneticGeminiOpenInFlight: Promise<void> | null = null;

export async function openTtsPhoneticGeminiFillOnly(options: {
    shortVideoId: number;
    sourceTerm: string;
    autoSubmit?: boolean;
}): Promise<void> {
    if (ttsPhoneticGeminiOpenInFlight) {
        return ttsPhoneticGeminiOpenInFlight;
    }

    ttsPhoneticGeminiOpenInFlight = (async () => {
        const shortVideoId = Number(options.shortVideoId || 0);
        const sourceTerm = String(options.sourceTerm || '').trim();
        if (!shortVideoId) {
            throw new Error('Thiếu short_video_id');
        }
        if (!sourceTerm) {
            throw new Error('Thiếu từ/cụm gốc');
        }

        const promptRes = await fetchTtsPhoneticGeminiPrompt(sourceTerm);
        if (!promptRes?.success || !promptRes.prompt?.trim()) {
            throw new Error(parseApiMessage(promptRes?.message) || 'Không lấy được prompt phiên âm');
        }
        const marketingPrompt = promptRes.prompt.trim();

        const extensionReady = await waitForExtensionReady(8000);
        if (!extensionReady) {
            const { openExternalTabViaExtension } = await import('helpers/openExternalTabViaExtension');
            openExternalTabViaExtension(buildTtsPhoneticGeminiWorkflowUrl({
                shortVideoId,
                sourceTerm,
                marketingPrompt,
                autoSubmit: options.autoSubmit,
            }));
            return;
        }

        const accessToken = getAccessToken() ?? '';
        const result = await dispatchOpenTtsPhoneticGeminiEvent({
            short_video_id: shortVideoId,
            source_term: sourceTerm,
            stage: 'tts_phonetic_dict',
            save_api_url: ttsPhoneticDictSaveApiUrl(),
            access_token: accessToken,
            marketing_prompt: marketingPrompt,
            auto_submit: options.autoSubmit !== false,
        });

        if (!result.ok) {
            const err = String(result.error || '').toLowerCase();
            const shouldDirectFallback =
                err.includes('không phản hồi')
                || err.includes('no_response')
                || err.includes('runtime_error');
            if (!shouldDirectFallback) {
                throw new Error(result.error || 'Không mở được tab Gemini');
            }
            const { openExternalTabViaExtension } = await import('helpers/openExternalTabViaExtension');
            openExternalTabViaExtension(buildTtsPhoneticGeminiWorkflowUrl({
                shortVideoId,
                sourceTerm,
                marketingPrompt,
                autoSubmit: options.autoSubmit,
            }));
        }
    })();

    try {
        await ttsPhoneticGeminiOpenInFlight;
    } finally {
        ttsPhoneticGeminiOpenInFlight = null;
    }
}
