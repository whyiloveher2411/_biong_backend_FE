import { getAccessToken } from 'store/user/user.reducers';
import { getApiHost } from 'helpers/apiHost';
import { convertToURL } from 'helpers/url';
import {
    isExtensionTabBridgeAvailable,
    waitForExtensionTabBridge,
} from 'helpers/openExternalTabViaExtension';

const DEFAULT_DAEMON_URL = 'http://127.0.0.1:9477';

export type AgentLaunchPhase = '1' | '2' | 'continue' | 'import_assemble';

export type PrepareAgentRenderResponse = {
    success?: boolean;
    short_video_id?: number;
    phase?: AgentLaunchPhase;
    launch_token?: string;
    daemon_url?: string;
    agent_video_status?: string;
    message?: { content?: string } | string;
};

export type LaunchAgentRenderResult = {
    ok: boolean;
    message: string;
};

function pluginApiPath(suffix: string): string {
    return convertToURL(getApiHost(), `/api/admin/plugin/vn4-e-learning/app-mobile/marketing/${suffix}`);
}

function parseMessage(message: PrepareAgentRenderResponse['message']): string {
    if (typeof message === 'object' && message?.content) {
        return String(message.content);
    }
    if (typeof message === 'string') {
        return message;
    }
    return '';
}

function defaultPromptRelative(shortVideoId: number, phase: AgentLaunchPhase): string {
    const fileName = phase === '1'
        ? 'agent-script-prompt.md'
        : phase === 'continue'
            ? 'agent-continue-prompt.md'
            : phase === 'import_assemble'
                ? 'agent-import-assemble-prompt.md'
                : 'agent-render-prompt.md';
    return `storage/agent-renders/${shortVideoId}/assets/${fileName}`;
}

function dispatchExtensionEvent<T>(eventName: string, detail: T, resultEventName: string, timeoutMs = 20000): Promise<T & { ok?: boolean; error?: string }> {
    return new Promise((resolve) => {
        let settled = false;
        const finish = (value: T & { ok?: boolean; error?: string }) => {
            if (settled) {
                return;
            }
            settled = true;
            window.clearTimeout(timer);
            document.removeEventListener(resultEventName, onResult);
            resolve(value);
        };

        const onResult = (event: Event) => {
            const payload = (event as CustomEvent<T & { ok?: boolean; error?: string }>).detail;
            finish(payload || { ok: false, error: 'empty_response' } as T & { ok?: boolean; error?: string });
        };

        const timer = window.setTimeout(() => {
            finish({ ok: false, error: 'Extension không phản hồi' } as T & { ok?: boolean; error?: string });
        }, timeoutMs);

        document.addEventListener(resultEventName, onResult);
        document.dispatchEvent(
            new CustomEvent(eventName, {
                bubbles: true,
                composed: true,
                detail,
            }),
        );
    });
}

export async function queryAgentRenderDaemonHealth(
    daemonUrl = DEFAULT_DAEMON_URL,
): Promise<{ ok: boolean; version?: string; error?: string }> {
    if (!isExtensionTabBridgeAvailable()) {
        return { ok: false, error: 'Chưa có Chrome extension VN4' };
    }

    const result = await dispatchExtensionEvent(
        'vn4-query-agent-render-daemon-health',
        { daemon_url: daemonUrl },
        'vn4-query-agent-render-daemon-health-result',
        5000,
    );

    return {
        ok: Boolean(result?.ok),
        version: typeof result === 'object' && result && 'version' in result
            ? String((result as { version?: string }).version || '')
            : undefined,
        error: typeof result === 'object' && result && 'error' in result
            ? String((result as { error?: string }).error || '')
            : undefined,
    };
}

async function prepareAgentLaunch(shortVideoId: number, phase: AgentLaunchPhase): Promise<PrepareAgentRenderResponse> {
    const token = getAccessToken() ?? '';
    const res = await fetch(pluginApiPath('short-video/prepare-agent-render'), {
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
            phase,
            access_token: token,
        }),
    });

    return res.json() as Promise<PrepareAgentRenderResponse>;
}

async function triggerAgentLaunchViaExtension(payload: {
    short_video_id: number;
    phase: AgentLaunchPhase;
    access_token: string;
    launch_token: string;
    daemon_url: string;
    api_base_url: string;
}): Promise<{ ok: boolean; error?: string; result?: unknown }> {
    const result = await dispatchExtensionEvent(
        'vn4-trigger-agent-render',
        { payload },
        'vn4-trigger-agent-render-result',
        120000,
    );

    return {
        ok: Boolean(result?.ok),
        error: result?.error ? String(result.error) : undefined,
        result: result && typeof result === 'object' && 'result' in result
            ? (result as { result?: unknown }).result
            : undefined,
    };
}

export async function launchShortVideoAgent(
    shortVideoId: number,
    phase: AgentLaunchPhase = '2',
): Promise<LaunchAgentRenderResult> {
    const id = Number(shortVideoId || 0);
    if (!Number.isInteger(id) || id <= 0) {
        return { ok: false, message: 'Thiếu short_video_id' };
    }

    const extensionReady = await waitForExtensionTabBridge(4000);
    if (!extensionReady) {
        return {
            ok: false,
            message: 'Cần cài Chrome extension VN4 và reload trang CMS',
        };
    }

    const health = await queryAgentRenderDaemonHealth();
    if (!health.ok) {
        return {
            ok: false,
            message: health.error
                || 'Agent render daemon chưa chạy — mở terminal: cd scripts/agent-render-daemon && npm run daemon',
        };
    }

    const prepared = await prepareAgentLaunch(id, phase);
    if (!prepared?.success || !prepared.launch_token?.trim()) {
        return {
            ok: false,
            message: parseMessage(prepared?.message)
                || (phase === '1'
                    ? 'Không chuẩn bị được launch agent bước 1'
                    : phase === 'continue'
                        ? 'Không chuẩn bị được launch agent tiếp tục'
                        : phase === 'import_assemble'
                            ? 'Không chuẩn bị được launch agent ghép HTML'
                            : 'Không chuẩn bị được launch render'),
        };
    }

    const token = getAccessToken() ?? '';
    const trigger = await triggerAgentLaunchViaExtension({
        short_video_id: id,
        phase,
        access_token: token,
        launch_token: prepared.launch_token.trim(),
        daemon_url: String(prepared.daemon_url || DEFAULT_DAEMON_URL).trim() || DEFAULT_DAEMON_URL,
        api_base_url: getApiHost(),
    });

    if (!trigger.ok) {
        return {
            ok: false,
            message: trigger.error || 'Daemon không khởi chạy được agent',
        };
    }

    const promptRelative = trigger.result
        && typeof trigger.result === 'object'
        && 'prompt_relative' in trigger.result
        ? String((trigger.result as { prompt_relative?: string }).prompt_relative || '').trim()
        : defaultPromptRelative(id, phase);

    if (phase === '1') {
        return {
            ok: true,
            message: promptRelative
                ? `Đã ghi ${promptRelative} và mở Cursor — agent sẽ sinh audio script qua MCP`
                : 'Đã mở Cursor với prompt bước 1 — agent sẽ sinh audio script qua MCP',
        };
    }

    if (phase === 'continue') {
        return {
            ok: true,
            message: promptRelative
                ? `Đã ghi ${promptRelative} và mở Cursor — render lại, không dùng data final cũ`
                : 'Đã mở Cursor với prompt tiếp tục — render lại, không dùng data final cũ',
        };
    }

    if (phase === 'import_assemble') {
        return {
            ok: true,
            message: promptRelative
                ? `Đã ghi ${promptRelative} và mở Cursor — agent ghép HTML chatbot + caption + ambient`
                : 'Đã mở Cursor với prompt ghép HTML chatbot',
        };
    }

    return {
        ok: true,
        message: promptRelative
            ? `Đã ghi ${promptRelative} và mở Cursor — status CMS đổi khi agent chạy (MCP update-status)`
            : 'Đã mở Cursor với prompt bước 2 — status CMS chỉ đổi khi agent bắt đầu chạy (MCP update-status)',
    };
}

export async function launchShortVideoAgentRender(shortVideoId: number): Promise<LaunchAgentRenderResult> {
    return launchShortVideoAgent(shortVideoId, '2');
}

export async function launchShortVideoAgentContinue(shortVideoId: number): Promise<LaunchAgentRenderResult> {
    return launchShortVideoAgent(shortVideoId, 'continue');
}

export async function launchShortVideoAgentImportAssemble(shortVideoId: number): Promise<LaunchAgentRenderResult> {
    return launchShortVideoAgent(shortVideoId, 'import_assemble');
}
