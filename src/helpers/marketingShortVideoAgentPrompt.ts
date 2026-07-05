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

function parseMessage(message: ShortVideoAgentPromptResponse['message']): string {
    if (typeof message === 'object' && message?.content) {
        return String(message.content);
    }
    if (typeof message === 'string') {
        return message;
    }
    return '';
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

    const text = res.prompt.trim();
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
        } else {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
        return {
            ok: true,
            message: normalizedPhaseLabel(phase, options.variant),
        };
    } catch {
        return {
            ok: false,
            message: 'Không copy được — hãy chọn và copy thủ công',
        };
    }
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
