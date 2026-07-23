import React from 'react';
import {
    getAgentHeadlessPreviewAccess,
    parseApiMessage,
    type AgentHeadlessPreviewAccessResponse,
} from './agentVideoApi';

export type HeadlessPreviewConnectionStatus =
    | 'idle'
    | 'connecting'
    | 'connected'
    | 'reconnecting'
    | 'error';

export type HeadlessPreviewMetadata = {
    type?: string;
    event?: string;
    status?: string;
    session_id?: string;
    preview_session_id?: string;
    beat_id?: string;
    phase?: string;
    step?: string;
    message?: string;
    timestamp?: number | string;
    [key: string]: unknown;
};

type Options = {
    enabled: boolean;
    shortVideoId: number;
    staleAfterMs?: number;
};

type Result = {
    frameUrl: string;
    connectionStatus: HeadlessPreviewConnectionStatus;
    metadata: HeadlessPreviewMetadata | null;
    /** Relay đã có session publisher cho short_video này. */
    sessionActive: boolean;
    stale: boolean;
    error: string;
};

const RECONNECT_MAX_MS = 10000;

function resolveSocketUrl(
    access: AgentHeadlessPreviewAccessResponse,
    shortVideoId: number,
): string {
    const raw = String(
        access.viewer_url
        || access.ws_url
        || access.websocket_url
        || '',
    ).trim();
    if (!raw) {
        throw new Error('API preview không trả về WebSocket URL');
    }

    const url = new URL(raw, window.location.href);
    if (url.protocol === 'http:') {
        url.protocol = 'ws:';
    } else if (url.protocol === 'https:') {
        url.protocol = 'wss:';
    }
    const token = String(access.token || access.access_token || '').trim();
    if (token && !url.searchParams.has('token') && !url.searchParams.has('access_token')) {
        url.searchParams.set('token', token);
    }
    if (!url.searchParams.has('short_video_id')) {
        url.searchParams.set('short_video_id', String(shortVideoId));
    }
    return url.toString();
}

function base64JpegToBlob(value: string): Blob | null {
    try {
        const normalized = value.includes(',') ? value.slice(value.indexOf(',') + 1) : value;
        const binary = window.atob(normalized);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) {
            bytes[index] = binary.charCodeAt(index);
        }
        return new Blob([bytes], { type: 'image/jpeg' });
    } catch {
        return null;
    }
}

function metadataPayload(value: unknown): HeadlessPreviewMetadata | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }
    const record = value as Record<string, unknown>;
    if (record.metadata && typeof record.metadata === 'object' && !Array.isArray(record.metadata)) {
        return {
            ...record,
            ...(record.metadata as Record<string, unknown>),
        } as HeadlessPreviewMetadata;
    }
    return record as HeadlessPreviewMetadata;
}

function isEndLifecycle(metadata: HeadlessPreviewMetadata): boolean {
    const terminalValues = new Set([
        'session_end',
        'session_ended',
        'session-ended',
        'session_closed',
        'ended',
        'closed',
        'stopped',
        'failed',
    ]);
    return [metadata.type, metadata.event, metadata.status]
        .some((value) => terminalValues.has(String(value || '').toLowerCase()));
}

function accessRefreshDelayMs(access: AgentHeadlessPreviewAccessResponse): number {
    const expiresIn = Number(access.expires_in || 0);
    if (expiresIn > 20) {
        return Math.max(5000, (expiresIn - 15) * 1000);
    }
    const rawExpiresAt = access.expires_at;
    if (!rawExpiresAt) {
        return 0;
    }
    const numeric = Number(rawExpiresAt);
    const expiresAtMs = Number.isFinite(numeric)
        ? (numeric < 100000000000 ? numeric * 1000 : numeric)
        : Date.parse(String(rawExpiresAt));
    if (!Number.isFinite(expiresAtMs)) {
        return 0;
    }
    return Math.max(5000, expiresAtMs - Date.now() - 15000);
}

export function useAgentHeadlessPreview({
    enabled,
    shortVideoId,
    staleAfterMs = 5000,
}: Options): Result {
    const [frameUrl, setFrameUrl] = React.useState('');
    const [connectionStatus, setConnectionStatus] =
        React.useState<HeadlessPreviewConnectionStatus>('idle');
    const [metadata, setMetadata] = React.useState<HeadlessPreviewMetadata | null>(null);
    const [sessionActive, setSessionActive] = React.useState(false);
    const [stale, setStale] = React.useState(false);
    const [error, setError] = React.useState('');
    const frameUrlRef = React.useRef('');
    const lastFrameAtRef = React.useRef(0);

    const clearFrame = React.useCallback(() => {
        if (frameUrlRef.current) {
            URL.revokeObjectURL(frameUrlRef.current);
            frameUrlRef.current = '';
        }
        lastFrameAtRef.current = 0;
        setFrameUrl('');
        setStale(false);
    }, []);

    const showFrame = React.useCallback((blob: Blob) => {
        const jpeg = blob.type ? blob : new Blob([blob], { type: 'image/jpeg' });
        const nextUrl = URL.createObjectURL(jpeg);
        const previousUrl = frameUrlRef.current;
        frameUrlRef.current = nextUrl;
        lastFrameAtRef.current = Date.now();
        setFrameUrl(nextUrl);
        setStale(false);
        if (previousUrl) {
            URL.revokeObjectURL(previousUrl);
        }
    }, []);

    React.useEffect(() => {
        if (!enabled || shortVideoId <= 0) {
            clearFrame();
            setMetadata(null);
            setSessionActive(false);
            setConnectionStatus('idle');
            setError('');
            return undefined;
        }

        let disposed = false;
        let socket: WebSocket | null = null;
        let reconnectTimer: number | undefined;
        let refreshTimer: number | undefined;
        let reconnectAttempt = 0;

        const scheduleReconnect = () => {
            if (disposed || reconnectTimer !== undefined) {
                return;
            }
            const delay = Math.min(RECONNECT_MAX_MS, 1000 * (2 ** reconnectAttempt));
            reconnectAttempt += 1;
            setConnectionStatus('reconnecting');
            reconnectTimer = window.setTimeout(() => {
                reconnectTimer = undefined;
                void connect();
            }, delay);
        };

        const handleJsonMessage = (raw: string) => {
            let parsed: unknown;
            try {
                parsed = JSON.parse(raw);
            } catch {
                return;
            }
            const nextMetadata = metadataPayload(parsed);
            if (!nextMetadata) {
                return;
            }

            const type = String(nextMetadata.type || '').toLowerCase();
            if (type === 'session') {
                const active = nextMetadata.active === true
                    || nextMetadata.active === 1
                    || nextMetadata.active === '1'
                    || nextMetadata.active === 'true';
                setSessionActive(active);
                if (!active) {
                    clearFrame();
                }
            }
            const base64Frame = typeof nextMetadata.data === 'string'
                ? nextMetadata.data
                : (typeof nextMetadata.frame === 'string' ? nextMetadata.frame : '');
            if ((type === 'frame' || type === 'jpeg') && base64Frame) {
                const blob = base64JpegToBlob(base64Frame);
                if (blob) {
                    showFrame(blob);
                    setSessionActive(true);
                }
            }
            setMetadata(nextMetadata);
            if (isEndLifecycle(nextMetadata)) {
                clearFrame();
                setSessionActive(false);
            }
        };

        const connect = async () => {
            setConnectionStatus(reconnectAttempt > 0 ? 'reconnecting' : 'connecting');
            setError('');
            try {
                const access = await getAgentHeadlessPreviewAccess(shortVideoId);
                if (disposed) {
                    return;
                }
                if (access.success === false) {
                    throw new Error(parseApiMessage(access.message) || 'Không thể cấp quyền preview');
                }
                socket = new WebSocket(resolveSocketUrl(access, shortVideoId));
                socket.binaryType = 'blob';

                socket.onopen = () => {
                    if (disposed || !socket) {
                        return;
                    }
                    reconnectAttempt = 0;
                    setConnectionStatus('connected');
                    setError('');
                    socket.send(JSON.stringify({
                        type: 'subscribe',
                        short_video_id: shortVideoId,
                    }));

                    const refreshDelayMs = accessRefreshDelayMs(access);
                    if (refreshDelayMs > 0) {
                        refreshTimer = window.setTimeout(() => {
                            socket?.close(4000, 'refresh-access');
                        }, refreshDelayMs);
                    }
                };
                socket.onmessage = (event: MessageEvent) => {
                    if (disposed) {
                        return;
                    }
                    if (event.data instanceof Blob) {
                        showFrame(event.data);
                        setSessionActive(true);
                    } else if (event.data instanceof ArrayBuffer) {
                        showFrame(new Blob([event.data], { type: 'image/jpeg' }));
                        setSessionActive(true);
                    } else if (typeof event.data === 'string') {
                        handleJsonMessage(event.data);
                    }
                };
                socket.onerror = () => {
                    if (!disposed) {
                        setError('Kết nối preview gặp lỗi');
                    }
                };
                socket.onclose = () => {
                    if (refreshTimer !== undefined) {
                        window.clearTimeout(refreshTimer);
                        refreshTimer = undefined;
                    }
                    if (!disposed) {
                        scheduleReconnect();
                    }
                };
            } catch (caught) {
                if (!disposed) {
                    setConnectionStatus('error');
                    setError(caught instanceof Error ? caught.message : String(caught));
                    scheduleReconnect();
                }
            }
        };

        void connect();
        const staleTimer = window.setInterval(() => {
            if (lastFrameAtRef.current > 0) {
                setStale(Date.now() - lastFrameAtRef.current > staleAfterMs);
            }
        }, 1000);

        return () => {
            disposed = true;
            window.clearInterval(staleTimer);
            if (reconnectTimer !== undefined) {
                window.clearTimeout(reconnectTimer);
            }
            if (refreshTimer !== undefined) {
                window.clearTimeout(refreshTimer);
            }
            if (socket) {
                socket.onopen = null;
                socket.onmessage = null;
                socket.onerror = null;
                socket.onclose = null;
                socket.close(1000, 'preview-disabled');
            }
            if (frameUrlRef.current) {
                URL.revokeObjectURL(frameUrlRef.current);
                frameUrlRef.current = '';
            }
            lastFrameAtRef.current = 0;
        };
    }, [clearFrame, enabled, shortVideoId, showFrame, staleAfterMs]);

    return {
        frameUrl,
        connectionStatus,
        metadata,
        sessionActive,
        stale,
        error,
    };
}
