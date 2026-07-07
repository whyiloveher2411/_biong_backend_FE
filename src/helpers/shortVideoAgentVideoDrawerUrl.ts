export const SHORT_VIDEO_AGENT_VIDEO_URL_PARAM = 'short_video_agent_id';
export const SHORT_VIDEO_AGENT_TAB_URL_PARAM = 'short_video_agent_tab';

export type ShortVideoAgentLeftTab = 'script' | 'chatbot' | 'resources' | 'facebook';

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
    if (raw === 'facebook') {
        return 'facebook';
    }
    if (raw === 'resources') {
        return 'resources';
    }
    if (raw === 'chatbot') {
        return 'chatbot';
    }
    return 'script';
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
    if (tab === 'facebook') {
        next.set(SHORT_VIDEO_AGENT_TAB_URL_PARAM, 'facebook');
    } else if (tab === 'resources') {
        next.set(SHORT_VIDEO_AGENT_TAB_URL_PARAM, 'resources');
    } else if (tab === 'chatbot') {
        next.set(SHORT_VIDEO_AGENT_TAB_URL_PARAM, 'chatbot');
    } else {
        next.delete(SHORT_VIDEO_AGENT_TAB_URL_PARAM);
    }
    return next;
}

export function openShortVideoAgentInSearchParams(
    searchParams: URLSearchParams,
    postId: number,
    tab: ShortVideoAgentLeftTab = 'script',
): URLSearchParams {
    let next = setShortVideoAgentIdInSearchParams(searchParams, postId);
    next = setShortVideoAgentTabInSearchParams(next, tab === 'facebook' || tab === 'chatbot' || tab === 'resources' ? tab : null);
    return next;
}

export function clearShortVideoAgentSearchParams(searchParams: URLSearchParams): URLSearchParams {
    return setShortVideoAgentIdInSearchParams(searchParams, null);
}
