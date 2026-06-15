const YOUTUBE_ID_REGEX =
    /(?:youtube(?:-nocookie)?\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i;

export function parseYoutubeId(input: string): string | null {
    const trimmed = input.trim();
    if (!trimmed) {
        return null;
    }
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
        return trimmed;
    }
    const match = trimmed.match(YOUTUBE_ID_REGEX);
    return match?.[1] ?? null;
}

export function isYoutubeUrl(input: string): boolean {
    return parseYoutubeId(input) !== null;
}

export type YoutubeEmbedOptions = {
    startSec?: number;
    autoplay?: boolean;
};

export function buildYoutubeEmbedUrl(id: string, options?: YoutubeEmbedOptions): string {
    const safeId = id.trim();
    const params = new URLSearchParams();
    const startSec = options?.startSec;
    if (typeof startSec === 'number' && Number.isFinite(startSec) && startSec > 0) {
        params.set('start', String(Math.floor(startSec)));
    }
    if (options?.autoplay) {
        params.set('autoplay', '1');
        params.set('mute', '1');
    }
    const query = params.toString();
    return query
        ? `https://www.youtube-nocookie.com/embed/${safeId}?${query}`
        : `https://www.youtube-nocookie.com/embed/${safeId}`;
}

export function buildYoutubeThumbnailUrl(id: string): string {
    const safeId = id.trim();
    return `https://i.ytimg.com/vi/${safeId}/hqdefault.jpg`;
}

export function isHttpsImageUrl(input: string): boolean {
    const trimmed = input.trim();
    if (!trimmed) {
        return false;
    }
    if (!/^https:\/\//i.test(trimmed)) {
        return false;
    }
    return !isYoutubeUrl(trimmed);
}
