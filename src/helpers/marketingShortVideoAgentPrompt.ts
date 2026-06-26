import { getAccessToken } from 'store/user/user.reducers';
import { getApiHost } from 'helpers/apiHost';
import { convertToURL } from 'helpers/url';

export type ShortVideoAgentPromptResponse = {
    success?: boolean;
    prompt?: string;
    phase?: string;
    stage?: string;
    short_video_id?: number;
    agent_workflow?: {
        phase?: string;
        has_script?: boolean;
        ready_for_video?: boolean;
        has_agent_video?: boolean;
    };
    message?: { content?: string } | string;
};

function pluginApiPath(suffix: string): string {
    return convertToURL(getApiHost(), `/api/admin/plugin/vn4-e-learning/app-mobile/marketing/${suffix}`);
}

export async function fetchShortVideoAgentPrompt(
    shortVideoId: number,
    phase: '1' | '2' | 'audio_script' | 'render_video',
): Promise<ShortVideoAgentPromptResponse> {
    const token = getAccessToken() ?? '';
    const normalizedPhase = phase === 'audio_script' || phase === '1' ? '1' : '2';

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
    phase: '1' | '2' | 'audio_script' | 'render_video',
): Promise<{ ok: boolean; message: string }> {
    const res = await fetchShortVideoAgentPrompt(shortVideoId, phase);
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
            message: normalizedPhaseLabel(phase),
        };
    } catch {
        return {
            ok: false,
            message: 'Không copy được — hãy chọn và copy thủ công',
        };
    }
}

function normalizedPhaseLabel(phase: '1' | '2' | 'audio_script' | 'render_video'): string {
    if (phase === '1' || phase === 'audio_script') {
        return 'Đã copy prompt agent bước 1 (script) vào clipboard';
    }
    return 'Đã copy prompt agent bước 2 (video) vào clipboard';
}
