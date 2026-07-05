import { getAccessToken } from 'store/user/user.reducers';
import { getApiHost } from 'helpers/apiHost';
import { convertToURL } from 'helpers/url';
import { openExternalTabViaExtension, waitForExtensionReady } from 'helpers/openExternalTabViaExtension';
import { dispatchCmsExtensionEvent } from 'helpers/cmsExtensionEventBridge';
import {
    fetchShortVideoAgentPrompt,
    type ShortVideoAgentPromptResponse,
} from 'helpers/marketingShortVideoAgentPrompt';

const GEMINI_WEB_APP_URL = 'https://gemini.google.com/u/0/app?pageId=none';

const OPEN_AGENT_AUDIO_SCRIPT_GEMINI_EVENT = 'vn4-open-agent-audio-script-gemini';
const OPEN_AGENT_AUDIO_SCRIPT_GEMINI_RESULT_EVENT = 'vn4-open-agent-audio-script-gemini-result';

/** Extension dispatch sau khi lưu audio script từ Gemini — drawer Agent Video lắng nghe để reload. */
export const AGENT_AUDIO_SCRIPT_SAVED_EVENT = 'vn4-agent-audio-script-saved';

export type AgentAudioScriptGeminiMode = 'create' | 'improve';

function apiHost(): string {
    return getApiHost();
}

function pluginApiPath(suffix: string): string {
    return convertToURL(apiHost(), `/api/admin/plugin/vn4-e-learning/app-mobile/marketing/${suffix}`);
}

export function agentAudioScriptSaveFromGeminiApiUrl(): string {
    return pluginApiPath('short-video/save-agent-audio-script-from-gemini');
}

function parseApiMessage(message: ShortVideoAgentPromptResponse['message']): string {
    if (typeof message === 'object' && message?.content) {
        return String(message.content);
    }
    if (typeof message === 'string') {
        return message;
    }
    return '';
}

function buildAgentAudioScriptGeminiWorkflowUrl(options: {
    shortVideoId: number;
    mode: AgentAudioScriptGeminiMode;
    autoSubmit?: boolean;
    marketingPrompt?: string;
}): string {
    const accessToken = getAccessToken() ?? '';
    const saveApiUrl = agentAudioScriptSaveFromGeminiApiUrl();
    const url = new URL(GEMINI_WEB_APP_URL);
    const hashParams = new URLSearchParams({
        copy_marketing_ai: '1',
        marketing_ai_provider: 'gemini',
        marketing_short_video_id: String(options.shortVideoId),
        marketing_stage: 'agent_audio_script',
        access_token: accessToken,
        api_url: saveApiUrl,
        content_type: 'agent_audio_script',
        agent_script_mode: options.mode,
        fresh_session: '1',
        marketing_fill_only: '1',
        marketing_open_nonce: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
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

async function openAgentAudioScriptGeminiDirectTab(options: {
    shortVideoId: number;
    mode: AgentAudioScriptGeminiMode;
    improvePrompt?: string;
    autoSubmit?: boolean;
}): Promise<void> {
    const shortVideoId = Number(options.shortVideoId || 0);
    const mode = options.mode === 'improve' ? 'improve' : 'create';
    let marketingPrompt = '';

    if (mode === 'improve') {
        marketingPrompt = String(options.improvePrompt || '').trim();
        if (!marketingPrompt) {
            throw new Error('Thiếu prompt cải thiện script');
        }
    } else {
        const res = await fetchShortVideoAgentPrompt(shortVideoId, '1', { variant: 'chatbot' });
        if (!res?.success || !res.prompt?.trim()) {
            throw new Error(parseApiMessage(res?.message) || 'Không lấy được prompt sinh audio script');
        }
        marketingPrompt = res.prompt.trim();
    }

    const url = buildAgentAudioScriptGeminiWorkflowUrl({
        shortVideoId,
        mode,
        autoSubmit: options.autoSubmit,
        marketingPrompt,
    });

    openExternalTabViaExtension(url);
}

function dispatchOpenAgentAudioScriptGeminiEvent(
    detail: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
    return dispatchCmsExtensionEvent(
        OPEN_AGENT_AUDIO_SCRIPT_GEMINI_EVENT,
        detail,
        OPEN_AGENT_AUDIO_SCRIPT_GEMINI_RESULT_EVENT,
        8000,
    );
}

let agentAudioScriptGeminiOpenInFlight: Promise<void> | null = null;

export async function openAgentAudioScriptGeminiFillOnly(options: {
    shortVideoId: number;
    mode: AgentAudioScriptGeminiMode;
    improvePrompt?: string;
    autoSubmit?: boolean;
}): Promise<void> {
    if (agentAudioScriptGeminiOpenInFlight) {
        return agentAudioScriptGeminiOpenInFlight;
    }

    agentAudioScriptGeminiOpenInFlight = (async () => {
        const shortVideoId = Number(options.shortVideoId || 0);
        if (!shortVideoId) {
            throw new Error('Thiếu short_video_id');
        }

        const mode = options.mode === 'improve' ? 'improve' : 'create';
        if (mode === 'improve') {
            const improvePrompt = String(options.improvePrompt || '').trim();
            if (!improvePrompt) {
                throw new Error('Thiếu prompt cải thiện script');
            }
        }

        const extensionReady = await waitForExtensionReady(8000);
        if (!extensionReady) {
            await openAgentAudioScriptGeminiDirectTab(options);
            return;
        }

        const accessToken = getAccessToken() ?? '';
        const result = await dispatchOpenAgentAudioScriptGeminiEvent({
            short_video_id: shortVideoId,
            stage: 'agent_audio_script',
            agent_script_mode: mode,
            save_api_url: agentAudioScriptSaveFromGeminiApiUrl(),
            access_token: accessToken,
            ...(mode === 'improve' ? { marketing_prompt: String(options.improvePrompt || '').trim() } : {}),
            auto_submit: options.autoSubmit !== false,
        });

        if (!result.ok) {
            const err = String(result.error || '').toLowerCase();
            const shouldDirectFallback =
                err.includes('không phản hồi') ||
                err.includes('no_response') ||
                err.includes('runtime_error');
            if (!shouldDirectFallback) {
                throw new Error(result.error || 'Không mở được tab Gemini');
            }
            try {
                await openAgentAudioScriptGeminiDirectTab(options);
            } catch (directError) {
                const directMsg = directError instanceof Error ? directError.message : String(directError);
                throw new Error(result.error || directMsg || 'Không mở được tab Gemini');
            }
        }
    })();

    try {
        await agentAudioScriptGeminiOpenInFlight;
    } finally {
        agentAudioScriptGeminiOpenInFlight = null;
    }
}
