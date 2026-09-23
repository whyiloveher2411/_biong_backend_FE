/**
 * Danh sách "Preview nhanh" — user tự ghim short video (kể cả video làm thủ công,
 * không chạy pipeline) để dock toàn admin truy cập lại nhanh.
 *
 * Lưu localStorage (theo trình duyệt) + phát event để dock và nút ghim đồng bộ ngay
 * trong cùng tab (dock cũng tự đọc lại mỗi nhịp poll).
 */

export type QuickPreviewItem = {
    id: number;
    title: string;
    app_mobile_id?: number;
};

const STORAGE_KEY = 'short-video-quick-preview';
const CHANGE_EVENT = 'short-video-quick-preview-changed';

function normalizeItem(raw: unknown): QuickPreviewItem | null {
    if (!raw || typeof raw !== 'object') {
        return null;
    }
    const record = raw as Record<string, unknown>;
    const id = Number(record.id);
    if (!Number.isFinite(id) || id <= 0) {
        return null;
    }
    const appMobileId = Number(record.app_mobile_id);
    return {
        id,
        title: String(record.title || '').trim(),
        app_mobile_id: Number.isFinite(appMobileId) && appMobileId > 0 ? appMobileId : undefined,
    };
}

export function readQuickPreviewList(): QuickPreviewItem[] {
    if (typeof window === 'undefined') {
        return [];
    }
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return [];
        }
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }
        const seen = new Set<number>();
        const items: QuickPreviewItem[] = [];
        parsed.forEach((entry) => {
            const item = normalizeItem(entry);
            if (item && !seen.has(item.id)) {
                seen.add(item.id);
                items.push(item);
            }
        });
        return items;
    } catch {
        return [];
    }
}

function writeQuickPreviewList(items: QuickPreviewItem[]): void {
    if (typeof window === 'undefined') {
        return;
    }
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
        // Trình duyệt chặn localStorage — bỏ qua.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function isQuickPreviewPinned(id: number): boolean {
    return readQuickPreviewList().some((item) => item.id === id);
}

export function addQuickPreview(item: QuickPreviewItem): void {
    const normalized = normalizeItem(item);
    if (!normalized) {
        return;
    }
    const list = readQuickPreviewList().filter((entry) => entry.id !== normalized.id);
    writeQuickPreviewList([...list, normalized]);
}

export function removeQuickPreview(id: number): void {
    writeQuickPreviewList(readQuickPreviewList().filter((entry) => entry.id !== id));
}

/** Trả về true nếu sau khi toggle video đang nằm trong danh sách. */
export function toggleQuickPreview(item: QuickPreviewItem): boolean {
    if (isQuickPreviewPinned(item.id)) {
        removeQuickPreview(item.id);
        return false;
    }
    addQuickPreview(item);
    return true;
}

export function subscribeQuickPreview(listener: () => void): () => void {
    if (typeof window === 'undefined') {
        return () => undefined;
    }
    window.addEventListener(CHANGE_EVENT, listener);
    window.addEventListener('storage', listener);
    return () => {
        window.removeEventListener(CHANGE_EVENT, listener);
        window.removeEventListener('storage', listener);
    };
}
