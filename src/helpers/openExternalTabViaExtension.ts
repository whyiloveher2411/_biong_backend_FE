type Vn4Window = Window & {
    __vn4OpenExternalTab?: (url: string) => void;
};

const EXTENSION_BRIDGE_ATTR = 'data-vn4-extension-bridge';

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

    window.open(trimmed, '_blank', 'noopener,noreferrer');
}

export function isExtensionTabBridgeAvailable(): boolean {
    if (typeof (window as Vn4Window).__vn4OpenExternalTab === 'function') {
        return true;
    }
    return document.documentElement.getAttribute(EXTENSION_BRIDGE_ATTR) === '1';
}

/**
 * Đợi extension inject bridge vào MAIN world (sau reload extension / F5).
 */
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
