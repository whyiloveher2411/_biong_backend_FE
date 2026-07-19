type Vn4Window = Window & {
    __vn4OpenExternalTab?: (url: string) => void;
};

const EXTENSION_BRIDGE_ATTR = 'data-vn4-extension-bridge';
const EXTENSION_CONTENT_SCRIPT_ATTR = 'data-vn4-content-script';
const EXTENSION_PING_EVENT = 'vn4-extension-ping';
const EXTENSION_PONG_EVENT = 'vn4-extension-pong';
const STORE_SCREENSHOT_GEMINI_QUERY_EVENT = 'vn4-query-store-screenshot-gemini';
const STORE_SCREENSHOT_GEMINI_QUERY_RESULT_EVENT = 'vn4-query-store-screenshot-gemini-result';
const AVATAR_ASSET_GEMINI_QUERY_EVENT = 'vn4-query-avatar-asset-gemini';
const AVATAR_ASSET_GEMINI_QUERY_RESULT_EVENT = 'vn4-query-avatar-asset-gemini-result';

/**
 * Mở tab ngoài (xAI, Gemini, …) qua Chrome extension khi có.
 * Tránh popup blocker sau các lệnh async (fetch).
 */
export function openExternalTabViaExtension(url: string): void {
    const trimmed = String(url || '').trim();
    if (!trimmed) {
        throw new Error('Thiếu URL để mở tab');
    }

    const bridge = (window as Vn4Window).__vn4OpenExternalTab;
    if (typeof bridge === 'function') {
        bridge(trimmed);
        return;
    }

    document.dispatchEvent(
        new CustomEvent('vn4-open-external-tab', {
            detail: { url: trimmed },
            bubbles: true,
            composed: true,
        })
    );

    if (!isExtensionTabBridgeAvailable()) {
        window.open(trimmed, '_blank', 'noopener,noreferrer');
    }
}

export function isExtensionTabBridgeAvailable(): boolean {
    const win = window as Vn4Window;
    if (typeof win.__vn4OpenExternalTab === 'function') {
        return true;
    }
    if (document.documentElement.getAttribute(EXTENSION_BRIDGE_ATTR) === '1') {
        return true;
    }
    return document.documentElement.getAttribute(EXTENSION_CONTENT_SCRIPT_ATTR) === '1';
}

export function pingExtension(timeoutMs = 2000): Promise<boolean> {
    return new Promise((resolve) => {
        let settled = false;
        const finish = (value: boolean) => {
            if (settled) {
                return;
            }
            settled = true;
            window.clearTimeout(timer);
            document.removeEventListener(EXTENSION_PONG_EVENT, onPong);
            resolve(value);
        };

        const onPong = () => finish(true);
        const timer = window.setTimeout(() => finish(false), timeoutMs);

        document.addEventListener(EXTENSION_PONG_EVENT, onPong);
        document.dispatchEvent(
            new CustomEvent(EXTENSION_PING_EVENT, {
                bubbles: true,
                composed: true,
            }),
        );
    });
}

export async function waitForExtensionReady(timeoutMs = 6000): Promise<boolean> {
    if (isExtensionTabBridgeAvailable()) {
        return true;
    }

    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
        if (await pingExtension(800)) {
            return true;
        }
        if (isExtensionTabBridgeAvailable()) {
            return true;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 200));
    }

    return isExtensionTabBridgeAvailable();
}

/**
 * Đợi extension inject bridge vào MAIN world (sau reload extension / F5).
 */
export function queryStoreScreenshotGeminiEnabled(timeoutMs = 4000): Promise<boolean> {
    return new Promise((resolve) => {
        let settled = false;
        const finish = (value: boolean) => {
            if (settled) {
                return;
            }
            settled = true;
            window.clearTimeout(timer);
            document.removeEventListener(STORE_SCREENSHOT_GEMINI_QUERY_RESULT_EVENT, onResult);
            resolve(value);
        };

        const onResult = (event: Event) => {
            const detail = (event as CustomEvent<{ enabled?: boolean }>).detail;
            finish(Boolean(detail?.enabled));
        };

        const timer = window.setTimeout(() => finish(false), timeoutMs);
        document.addEventListener(STORE_SCREENSHOT_GEMINI_QUERY_RESULT_EVENT, onResult);
        document.dispatchEvent(
            new CustomEvent(STORE_SCREENSHOT_GEMINI_QUERY_EVENT, {
                bubbles: true,
                composed: true,
            }),
        );
    });
}

export function queryAvatarAssetGeminiEnabled(timeoutMs = 4000): Promise<boolean> {
    return new Promise((resolve) => {
        let settled = false;
        const finish = (value: boolean) => {
            if (settled) {
                return;
            }
            settled = true;
            window.clearTimeout(timer);
            document.removeEventListener(AVATAR_ASSET_GEMINI_QUERY_RESULT_EVENT, onResult);
            resolve(value);
        };

        const onResult = (event: Event) => {
            const detail = (event as CustomEvent<{ enabled?: boolean }>).detail;
            finish(Boolean(detail?.enabled));
        };

        const timer = window.setTimeout(() => finish(false), timeoutMs);
        document.addEventListener(AVATAR_ASSET_GEMINI_QUERY_RESULT_EVENT, onResult);
        document.dispatchEvent(
            new CustomEvent(AVATAR_ASSET_GEMINI_QUERY_EVENT, {
                bubbles: true,
                composed: true,
            }),
        );
    });
}

export function waitForExtensionTabBridge(timeoutMs = 4000): Promise<boolean> {
    if (isExtensionTabBridgeAvailable()) {
        return Promise.resolve(true);
    }

    return new Promise((resolve) => {
        const startedAt = Date.now();
        const timer = window.setInterval(() => {
            if (isExtensionTabBridgeAvailable()) {
                window.clearInterval(timer);
                resolve(true);
                return;
            }
            if (Date.now() - startedAt >= timeoutMs) {
                window.clearInterval(timer);
                resolve(false);
            }
        }, 120);
    });
}
