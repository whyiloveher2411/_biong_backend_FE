import { getAccessToken } from 'store/user/user.reducers';
import { getApiHost } from 'helpers/apiHost';
import { convertToURL } from 'helpers/url';
import {
    isExtensionTabBridgeAvailable,
    openExternalTabViaExtension,
    waitForExtensionTabBridge,
} from 'helpers/openExternalTabViaExtension';

const DEFAULT_DAEMON_URL = 'http://127.0.0.1:9477';

export type AgentLaunchPhase = '1' | '2' | 'continue' | 'import_assemble' | 'import_html_full' | 'import_assemble_script';

export type ImportHtmlDaemonAction = 'assemble' | 'preview' | 'render-import-html';

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
    previewUrl?: string;
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
                : phase === 'import_html_full'
                    ? 'agent-import-html-full-prompt.md'
                    : phase === 'import_assemble_script'
                        ? 'agent-import-assemble-script.meta.json'
                        : 'agent-render-prompt.md';
    return `storage/agent-renders/${shortVideoId}/assets/${fileName}`;
}

function normalizeDaemonUrl(raw?: string): string {
    const trimmed = String(raw || DEFAULT_DAEMON_URL).trim() || DEFAULT_DAEMON_URL;
    try {
        const url = new URL(trimmed);
        if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
            return DEFAULT_DAEMON_URL;
        }
        return url.origin;
    } catch {
        return DEFAULT_DAEMON_URL;
    }
}

function isLocalCmsHost(): boolean {
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1';
}

function formatDaemonConnectionError(error?: string): string {
    const message = String(error || '').trim();
    if (!message) {
        return 'Agent render daemon chưa chạy — mở terminal: cd scripts/agent-render-daemon && npm run daemon';
    }
    if (/failed to fetch|networkerror|network error/i.test(message)) {
        return 'Không kết nối được daemon tại 127.0.0.1:9477 — chạy: cd scripts/agent-render-daemon && npm run daemon';
    }
    return message;
}

function resolveImportHtmlDaemonPath(action: ImportHtmlDaemonAction): string {
    if (action === 'assemble') {
        return '/v1/assemble';
    }
    if (action === 'preview') {
        return '/v1/preview';
    }
    return '/v1/render-import-html';
}

async function queryDaemonHealthDirect(
    daemonUrl = DEFAULT_DAEMON_URL,
): Promise<{ ok: boolean; version?: string; error?: string }> {
    const base = normalizeDaemonUrl(daemonUrl);
    try {
        const res = await fetch(`${base}/health`, { method: 'GET' });
        const json = await res.json().catch(() => ({})) as { ok?: boolean; version?: string };
        if (!res.ok || !json?.ok) {
            return { ok: false, error: 'Daemon không phản hồi health' };
        }
        return { ok: true, version: json.version ? String(json.version) : undefined };
    } catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

async function triggerImportHtmlDaemonDirect(
    payload: {
        short_video_id: number;
        phase: AgentLaunchPhase;
        access_token: string;
        launch_token: string;
        daemon_url: string;
        api_base_url: string;
        daemon_action: ImportHtmlDaemonAction;
        force_assemble?: boolean;
    },
    timeoutMs = 120000,
): Promise<{ ok: boolean; error?: string; result?: unknown }> {
    const base = normalizeDaemonUrl(payload.daemon_url);
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(`${base}${resolveImportHtmlDaemonPath(payload.daemon_action)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: `Bearer ${payload.launch_token}`,
            },
            body: JSON.stringify({
                short_video_id: payload.short_video_id,
                phase: payload.phase,
                daemon_action: payload.daemon_action,
                access_token: payload.access_token,
                api_base_url: payload.api_base_url,
                launch_token: payload.launch_token,
                force_assemble: Boolean(payload.force_assemble),
            }),
            signal: controller.signal,
        });
        const json = await res.json().catch(() => ({})) as { success?: boolean; message?: string };
        if (!res.ok || !json?.success) {
            return {
                ok: false,
                error: String(json?.message || `HTTP ${res.status}`),
            };
        }
        return { ok: true, result: json };
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            return { ok: false, error: 'Daemon không phản hồi kịp thời' };
        }
        return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
        };
    } finally {
        window.clearTimeout(timer);
    }
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
    if (isLocalCmsHost()) {
        const direct = await queryDaemonHealthDirect(daemonUrl);
        if (direct.ok) {
            return direct;
        }
    }

    if (!isExtensionTabBridgeAvailable()) {
        return {
            ok: false,
            error: formatDaemonConnectionError(
                isLocalCmsHost() ? 'Failed to fetch' : 'Chưa có Chrome extension VN4',
            ),
        };
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
            ? formatDaemonConnectionError(String((result as { error?: string }).error || ''))
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
    daemon_action?: ImportHtmlDaemonAction;
    force_assemble?: boolean;
}, timeoutMs = 120000): Promise<{ ok: boolean; error?: string; result?: unknown }> {
    const result = await dispatchExtensionEvent(
        'vn4-trigger-agent-render',
        { payload },
        'vn4-trigger-agent-render-result',
        timeoutMs,
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
                            : phase === 'import_html_full'
                                ? 'Không chuẩn bị được launch auto HTML beat + ghép video'
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

    if (phase === 'import_html_full') {
        return {
            ok: true,
            message: promptRelative
                ? `Đã ghi ${promptRelative} và mở Cursor — agent sinh HTML beat thiếu rồi ghép video`
                : 'Đã mở Cursor với prompt auto HTML beat + ghép video',
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

export async function launchImportHtmlDaemonAction(
    shortVideoId: number,
    daemonAction: ImportHtmlDaemonAction,
    options: { forceAssemble?: boolean } = {},
): Promise<LaunchAgentRenderResult> {
    const id = Number(shortVideoId || 0);
    if (!Number.isInteger(id) || id <= 0) {
        return { ok: false, message: 'Thiếu short_video_id' };
    }

    const extensionReady = await waitForExtensionTabBridge(4000);
    const useDirectDaemon = isLocalCmsHost();

    if (!useDirectDaemon && !extensionReady) {
        return {
            ok: false,
            message: 'Cần cài Chrome extension VN4 và reload trang CMS',
        };
    }

    const prepared = await prepareAgentLaunch(id, 'import_assemble_script');
    if (!prepared?.success || !prepared.launch_token?.trim()) {
        return {
            ok: false,
            message: parseMessage(prepared?.message) || 'Không chuẩn bị được launch ghép/render script',
        };
    }

    const daemonUrl = normalizeDaemonUrl(prepared.daemon_url || DEFAULT_DAEMON_URL);
    const health = await queryAgentRenderDaemonHealth(daemonUrl);
    if (!health.ok) {
        return {
            ok: false,
            message: health.error
                || 'Agent render daemon chưa chạy — mở terminal: cd scripts/agent-render-daemon && npm run daemon',
        };
    }

    const token = getAccessToken() ?? '';
    const daemonPayload = {
        short_video_id: id,
        phase: 'import_assemble_script' as const,
        access_token: token,
        launch_token: prepared.launch_token.trim(),
        daemon_url: daemonUrl,
        api_base_url: getApiHost(),
        daemon_action: daemonAction,
        force_assemble: options.forceAssemble,
    };
    const timeoutMs = daemonAction === 'render-import-html' ? 900000 : 300000;
    const trigger = useDirectDaemon
        ? await triggerImportHtmlDaemonDirect(daemonPayload, timeoutMs)
        : await triggerAgentLaunchViaExtension(daemonPayload, timeoutMs);

    if (!trigger.ok) {
        return {
            ok: false,
            message: formatDaemonConnectionError(trigger.error) || 'Daemon không chạy được tác vụ script',
        };
    }

    const result = trigger.result && typeof trigger.result === 'object' ? trigger.result as Record<string, unknown> : {};
    let previewUrl = '';
    if (daemonAction === 'preview') {
        previewUrl = typeof result.preview_url === 'string' ? result.preview_url.trim() : '';
        if (previewUrl) {
            try {
                openExternalTabViaExtension(previewUrl);
            } catch {
                const opened = window.open(previewUrl, '_blank', 'noopener,noreferrer');
                if (!opened) {
                    return {
                        ok: true,
                        previewUrl,
                        message: `Preview sẵn sàng — mở tab thủ công: ${previewUrl}`,
                    };
                }
            }
        }
    }

    const actionLabel = daemonAction === 'assemble'
        ? 'Ghép composition'
        : daemonAction === 'preview'
            ? 'Mở preview'
            : 'Render video';

    if (daemonAction === 'preview' && previewUrl) {
        return {
            ok: true,
            previewUrl,
            message: `${actionLabel} — ${previewUrl}`,
        };
    }

    return {
        ok: true,
        message: `${actionLabel} — daemon đã xử lý xong`,
    };
}

export async function launchImportHtmlAssemble(shortVideoId: number): Promise<LaunchAgentRenderResult> {
    return launchImportHtmlDaemonAction(shortVideoId, 'assemble');
}

export async function launchImportHtmlPreview(shortVideoId: number): Promise<LaunchAgentRenderResult> {
    return launchImportHtmlDaemonAction(shortVideoId, 'preview');
}

export async function launchImportHtmlRender(shortVideoId: number): Promise<LaunchAgentRenderResult> {
    return launchImportHtmlDaemonAction(shortVideoId, 'render-import-html', { forceAssemble: true });
}

export async function launchShortVideoAgentImportHtmlFull(shortVideoId: number): Promise<LaunchAgentRenderResult> {
    return launchShortVideoAgent(shortVideoId, 'import_html_full');
}
