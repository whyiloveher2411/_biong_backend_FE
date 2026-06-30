export const SHORT_VIDEO_AGENT_VIDEO_URL_PARAM = 'short_video_agent_id';

export function parseShortVideoAgentIdFromSearch(search: string): number | null {
    const normalized = search.startsWith('?') ? search.slice(1) : search;
    const raw = new URLSearchParams(normalized).get(SHORT_VIDEO_AGENT_VIDEO_URL_PARAM);
    if (!raw) {
        return null;
    }
    const id = Number(raw);
    if (!Number.isFinite(id) || id <= 0) {
        return null;
    }
    return id;
}

export function setShortVideoAgentIdInSearchParams(
    searchParams: URLSearchParams,
    postId: number | null,
): URLSearchParams {
    const next = new URLSearchParams(searchParams.toString());
    if (postId && postId > 0) {
        next.set(SHORT_VIDEO_AGENT_VIDEO_URL_PARAM, String(postId));
    } else {
        next.delete(SHORT_VIDEO_AGENT_VIDEO_URL_PARAM);
    }
    return next;
}
