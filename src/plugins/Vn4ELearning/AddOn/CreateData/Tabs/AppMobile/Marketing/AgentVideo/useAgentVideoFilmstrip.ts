import React from 'react';
import { resolveAgentVideoFilmstripFetchUrl } from './agentVideoApi';
import { generateAgentVideoFilmstrip } from './agentVideoFilmstrip';
import { readFilmstripCache, writeFilmstripCache } from './agentVideoFilmstripCache';

type UseAgentVideoFilmstripResult = {
    thumbnails: string[];
    loading: boolean;
    failed: boolean;
};

function buildFilmstripSessionKey(input: {
    shortVideoId: number;
    renderedAt: string;
    durationSec: number;
    fetchUrl: string;
}): string {
    const durationKey = Math.round(Math.max(0, input.durationSec) * 10);
    const renderedAt = String(input.renderedAt || '').trim() || 'unknown';
    return `${input.shortVideoId}|${renderedAt}|${durationKey}|${input.fetchUrl}`;
}

export function useAgentVideoFilmstrip(
    videoUrl: string,
    durationSec: number,
    shortVideoId: number,
    agentVideoRenderedAt: string,
): UseAgentVideoFilmstripResult {
    const [thumbnails, setThumbnails] = React.useState<string[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [failed, setFailed] = React.useState(false);

    const fetchUrl = React.useMemo(
        () => resolveAgentVideoFilmstripFetchUrl(videoUrl, shortVideoId),
        [shortVideoId, videoUrl],
    );

    const cacheLookup = React.useMemo(() => ({
        shortVideoId,
        renderedAt: String(agentVideoRenderedAt || '').trim(),
        durationSec: Math.max(0, durationSec),
    }), [agentVideoRenderedAt, durationSec, shortVideoId]);

    const sessionKey = React.useMemo(
        () => buildFilmstripSessionKey({
            shortVideoId,
            renderedAt: cacheLookup.renderedAt,
            durationSec: cacheLookup.durationSec,
            fetchUrl,
        }),
        [cacheLookup.renderedAt, cacheLookup.durationSec, fetchUrl, shortVideoId],
    );

    React.useEffect(() => {
        const url = String(fetchUrl || '').trim();
        const duration = Math.max(0, durationSec);

        if (!url || duration <= 0 || shortVideoId <= 0) {
            setThumbnails([]);
            setLoading(false);
            setFailed(false);
            return undefined;
        }

        let cancelled = false;
        const controller = new AbortController();

        void (async () => {
            const cached = await readFilmstripCache(cacheLookup);
            if (cancelled) {
                return;
            }
            if (cached && cached.length > 0) {
                setThumbnails(cached);
                setLoading(false);
                setFailed(false);
                return;
            }

            setFailed(false);
            setThumbnails([]);
            setLoading(true);

            try {
                const nextThumbnails = await generateAgentVideoFilmstrip(url, duration, {
                    signal: controller.signal,
                    onThumbnail: (progressThumbnails) => {
                        if (!cancelled) {
                            setThumbnails([...progressThumbnails]);
                        }
                    },
                });

                if (cancelled) {
                    return;
                }

                if (nextThumbnails.length === 0) {
                    setFailed(true);
                    setThumbnails([]);
                } else {
                    setThumbnails(nextThumbnails);
                    setFailed(false);
                    await writeFilmstripCache(cacheLookup, nextThumbnails);
                }
            } catch (error: unknown) {
                if (cancelled) {
                    return;
                }
                if (error instanceof DOMException && error.name === 'AbortError') {
                    return;
                }
                setFailed(true);
                setThumbnails([]);
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [agentVideoRenderedAt, durationSec, fetchUrl, sessionKey, shortVideoId]);

    return { thumbnails, loading, failed };
}
