export const SHORT_VIDEO_EDIT_URL_PARAM = 'short_video_edit_id';

export function parseShortVideoEditIdFromSearch(search: string): number | null {
    const normalized = search.startsWith('?') ? search.slice(1) : search;
    const raw = new URLSearchParams(normalized).get(SHORT_VIDEO_EDIT_URL_PARAM);
    if (!raw) {
        return null;
    }
    const id = Number(raw);
    if (!Number.isFinite(id) || id <= 0) {
        return null;
    }
    return id;
}

export function setShortVideoEditIdInSearchParams(
    searchParams: URLSearchParams,
    postId: number | null
): URLSearchParams {
    const next = new URLSearchParams(searchParams.toString());
    if (postId && postId > 0) {
        next.set(SHORT_VIDEO_EDIT_URL_PARAM, String(postId));
    } else {
        next.delete(SHORT_VIDEO_EDIT_URL_PARAM);
    }
    return next;
}
