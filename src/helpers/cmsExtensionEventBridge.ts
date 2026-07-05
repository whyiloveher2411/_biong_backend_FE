export const VN4_CMS_PAGE_MESSAGE_SOURCE = 'vn4-cms-page';
export const VN4_EXTENSION_CS_MESSAGE_SOURCE = 'vn4-extension-content-script';
export const VN4_CMS_EXTENSION_EVENT_TYPE = 'VN4_CMS_EXTENSION_EVENT';
export const VN4_CMS_EXTENSION_EVENT_RESULT_TYPE = 'VN4_CMS_EXTENSION_EVENT_RESULT';

export function createCmsExtensionRequestId(): string {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function dispatchCmsExtensionEvent(
    eventName: string,
    detail: Record<string, unknown>,
    resultEventName: string,
    timeoutMs = 12000,
): Promise<{ ok: boolean; error?: string }> {
    const requestId = String(detail.request_id || createCmsExtensionRequestId());
    return new Promise((resolve) => {
        let settled = false;
        const finish = (result: { ok: boolean; error?: string }) => {
            if (settled) {
                return;
            }
            settled = true;
            window.clearTimeout(timer);
            window.removeEventListener('message', onPostMessage);
            document.removeEventListener(resultEventName, onCustomResult);
            resolve(result);
        };

        const matchesRequest = (payload: { request_id?: string } | undefined) => {
            const resultRequestId = String(payload?.request_id || '').trim();
            return !resultRequestId || resultRequestId === requestId;
        };

        const onPostMessage = (event: MessageEvent) => {
            if (event.source !== window) {
                return;
            }
            const data = event.data as {
                type?: string;
                source?: string;
                eventName?: string;
                detail?: { ok?: boolean; error?: string; request_id?: string };
            } | null;
            if (!data || data.type !== VN4_CMS_EXTENSION_EVENT_RESULT_TYPE) {
                return;
            }
            if (data.source !== VN4_EXTENSION_CS_MESSAGE_SOURCE) {
                return;
            }
            if (String(data.eventName || '') !== resultEventName) {
                return;
            }
            if (!matchesRequest(data.detail)) {
                return;
            }
            finish({
                ok: Boolean(data.detail?.ok),
                error: data.detail?.error ? String(data.detail.error) : undefined,
            });
        };

        const onCustomResult = (event: Event) => {
            const custom = event as CustomEvent<{ ok?: boolean; error?: string; request_id?: string }>;
            if (!matchesRequest(custom.detail)) {
                return;
            }
            finish({
                ok: Boolean(custom.detail?.ok),
                error: custom.detail?.error ? String(custom.detail.error) : undefined,
            });
        };

        const timer = window.setTimeout(() => {
            finish({
                ok: false,
                error: 'Extension không phản hồi — reload extension (chrome://extensions) rồi F5 CMS',
            });
        }, timeoutMs);

        const payload = {
            ...detail,
            request_id: requestId,
        };

        window.addEventListener('message', onPostMessage);
        document.addEventListener(resultEventName, onCustomResult);

        window.postMessage(
            {
                type: VN4_CMS_EXTENSION_EVENT_TYPE,
                source: VN4_CMS_PAGE_MESSAGE_SOURCE,
                eventName,
                detail: payload,
            },
            '*',
        );
    });
}
