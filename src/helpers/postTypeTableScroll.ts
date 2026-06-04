export type PostTypeTableScrollQuerySlice = {
    page?: unknown;
    filter?: unknown;
    filter_saved_name?: unknown;
    filters?: unknown;
};

export function buildPostTypeTableQueryScrollKey(
    queryUrl: PostTypeTableScrollQuerySlice
): string {
    return [
        queryUrl.page,
        queryUrl.filter,
        queryUrl.filter_saved_name,
        queryUrl.filters,
    ].join('|');
}

/**
 * Element thực sự có thanh scroll (TableContainer hoặc con overflow).
 */
export function resolvePostTypeTableScrollElement(
    root: HTMLElement | null
): HTMLElement | null {
    if (!root) {
        return null;
    }

    const canScroll = (node: HTMLElement) =>
        node.scrollHeight > node.clientHeight + 1
        && /(auto|scroll)/.test(getComputedStyle(node).overflowY);

    if (canScroll(root)) {
        return root;
    }

    const nodes = root.querySelectorAll<HTMLElement>('*');
    for (let i = nodes.length - 1; i >= 0; i--) {
        if (canScroll(nodes[i])) {
            return nodes[i];
        }
    }

    return root;
}

export type ScrollPostTypeTableOptions = {
    behavior?: ScrollBehavior;
};

/**
 * Cuộn về đầu vùng danh sách trong TableContainer — không đụng #warperMain.
 */
export function scrollPostTypeTableContainer(
    root: HTMLElement | null,
    options?: ScrollPostTypeTableOptions
): boolean {
    const scrollEl = resolvePostTypeTableScrollElement(root);
    if (!scrollEl) {
        return false;
    }

    const behavior = options?.behavior ?? 'smooth';
    scrollEl.scrollTo({ top: 0, left: 0, behavior });

    return true;
}

/**
 * Gọi sau paint (sau khi rows mới render) để scrollTop có hiệu lực.
 */
export function scrollPostTypeTableContainerAfterPaint(
    root: HTMLElement | null,
    options?: ScrollPostTypeTableOptions
): void {
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            scrollPostTypeTableContainer(root, options);
        });
    });
}
