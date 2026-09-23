/**
 * Chia sẻ layout của box preview headless (ShortVideoAgentHeadlessPreview) cho dock
 * "Pipeline short video" — để dock neo sát bên trái preview khi preview đang mở,
 * và neo sát phải khi không có preview (giống dock chat Facebook).
 */

export type HeadlessPreviewLayout = {
    visible: boolean;
    width: number;
    right: number;
    bottom: number;
};

const DEFAULT_LAYOUT: HeadlessPreviewLayout = {
    visible: false,
    width: 0,
    right: 20,
    bottom: 20,
};

let current: HeadlessPreviewLayout = DEFAULT_LAYOUT;
const listeners = new Set<(layout: HeadlessPreviewLayout) => void>();

export function getHeadlessPreviewLayout(): HeadlessPreviewLayout {
    return current;
}

export function setHeadlessPreviewLayout(next: Partial<HeadlessPreviewLayout>): void {
    current = { ...current, ...next };
    listeners.forEach((listener) => listener(current));
}

export function subscribeHeadlessPreviewLayout(
    listener: (layout: HeadlessPreviewLayout) => void,
): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
