import { convertToURL, validURL } from 'helpers/url';

export const CUSTOM_API_HOST_STORAGE_KEY = 'biong_custom_api_host';
export const API_HOST_CHANGED_EVENT = 'biong_api_host_changed';

const VALIDATION_TIMEOUT_MS = 8000;
const VALIDATION_PATH = '/api/admin/login/settings';

export function getEnvApiHost(): string {
    return process.env.REACT_APP_HOST_API_KEY || window.location.origin;
}

export function getCustomApiHost(): string | null {
    try {
        const value = localStorage.getItem(CUSTOM_API_HOST_STORAGE_KEY);
        if (!value) {
            return null;
        }

        const trimmed = value.trim().replace(/\/+$/, '');
        return trimmed || null;
    } catch {
        return null;
    }
}

export function normalizeApiHost(url: string): string | null {
    const trimmed = url.trim();
    if (!trimmed) {
        return null;
    }

    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    if (!validURL(withProtocol)) {
        return null;
    }

    return withProtocol.replace(/\/+$/, '');
}

export function setCustomApiHost(url: string | null): void {
    if (url === null) {
        localStorage.removeItem(CUSTOM_API_HOST_STORAGE_KEY);
    } else {
        localStorage.setItem(CUSTOM_API_HOST_STORAGE_KEY, url);
    }

    window.dispatchEvent(new CustomEvent(API_HOST_CHANGED_EVENT));
}

export function clearCustomApiHost(): void {
    setCustomApiHost(null);
}

export function isUsingCustomApiHost(): boolean {
    return getCustomApiHost() !== null;
}

export function getApiHost(): string {
    return getCustomApiHost() ?? getEnvApiHost();
}

export function getAdminApiPrefix(): string {
    return convertToURL(getApiHost(), '/api/admin/');
}

export async function validateApiHost(host: string): Promise<boolean> {
    const url = convertToURL(host, VALIDATION_PATH);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), VALIDATION_TIMEOUT_MS);

    try {
        await fetch(url, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            signal: controller.signal,
        });
        return true;
    } catch {
        return false;
    } finally {
        window.clearTimeout(timeoutId);
    }
}

export function rollbackCustomApiHost(): boolean {
    if (!isUsingCustomApiHost()) {
        return false;
    }

    clearCustomApiHost();
    return true;
}

export async function bootstrapApiHost(): Promise<void> {
    const custom = getCustomApiHost();
    if (!custom) {
        return;
    }

    const isValid = await validateApiHost(custom);
    if (!isValid) {
        rollbackCustomApiHost();
    }
}

export function subscribeApiHostChange(callback: () => void): () => void {
    window.addEventListener(API_HOST_CHANGED_EVENT, callback);
    return () => window.removeEventListener(API_HOST_CHANGED_EVENT, callback);
}
