export const SHORT_VIDEO_AGENT_VIDEO_URL_PARAM = 'short_video_agent_id';
export const SHORT_VIDEO_AGENT_TAB_URL_PARAM = 'short_video_agent_tab';

/** `chatbot` / `resources` giữ để tương thích URL cũ — map vào tab Render. */
export type ShortVideoAgentLeftTab = 'content' | 'script' | 'chatbot' | 'resources' | 'render' | 'facebook';

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

export function parseShortVideoAgentTabFromSearch(search: string): ShortVideoAgentLeftTab {
    const normalized = search.startsWith('?') ? search.slice(1) : search;
    const raw = new URLSearchParams(normalized).get(SHORT_VIDEO_AGENT_TAB_URL_PARAM);
    if (raw === 'script') {
        return 'script';
    }
    if (raw === 'facebook') {
        return 'facebook';
    }
    if (raw === 'render' || raw === 'resources' || raw === 'chatbot') {
        return 'render';
    }
    return 'content';
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
        next.delete(SHORT_VIDEO_AGENT_TAB_URL_PARAM);
    }
    return next;
}

export function setShortVideoAgentTabInSearchParams(
    searchParams: URLSearchParams,
    tab: ShortVideoAgentLeftTab | null,
): URLSearchParams {
    const next = new URLSearchParams(searchParams.toString());
    if (tab === 'script') {
        next.set(SHORT_VIDEO_AGENT_TAB_URL_PARAM, 'script');
    } else if (tab === 'facebook') {
        next.set(SHORT_VIDEO_AGENT_TAB_URL_PARAM, 'facebook');
    } else if (tab === 'render' || tab === 'resources' || tab === 'chatbot') {
        next.set(SHORT_VIDEO_AGENT_TAB_URL_PARAM, 'render');
    } else {
        // content = default — không ghi URL
        next.delete(SHORT_VIDEO_AGENT_TAB_URL_PARAM);
    }
    return next;
}

export function openShortVideoAgentInSearchParams(
    searchParams: URLSearchParams,
    postId: number,
    tab: ShortVideoAgentLeftTab = 'content',
): URLSearchParams {
    let next = setShortVideoAgentIdInSearchParams(searchParams, postId);
    const persistTab = tab === 'script'
        || tab === 'facebook'
        || tab === 'chatbot'
        || tab === 'resources'
        || tab === 'render';
    next = setShortVideoAgentTabInSearchParams(next, persistTab ? tab : null);
    return next;
}

export function clearShortVideoAgentSearchParams(searchParams: URLSearchParams): URLSearchParams {
    return setShortVideoAgentIdInSearchParams(searchParams, null);
}
