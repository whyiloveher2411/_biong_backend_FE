import React from 'react';
import type { PlayerRef } from '@remotion/player';
import type { ShortVideoRenderManifest } from 'helpers/shortVideoRenderManifest';
import { buildPreviewManifestWithHtmlOverlay, resolveActiveHtmlClipsAtSec } from 'helpers/shortVideoHtmlClips';
import { buildPreviewManifestWithTextOverlay, resolveActiveTextClipsAtSec } from 'helpers/shortVideoTextClips';
import { resolveHtmlClipPreviewUsesIframe } from 'helpers/shortVideoTimelineTracks';

export function usePreviewCurrentTimeSec(
    playerRef: React.MutableRefObject<PlayerRef | null>,
    playerInstance: PlayerRef | null,
    fps: number
): number {
    const [currentTimeSec, setCurrentTimeSec] = React.useState(0);

    React.useEffect(() => {
        const player = playerInstance;
        if (!player) {
            setCurrentTimeSec(0);
            return undefined;
        }

        const syncTime = () => {
            const frame = playerRef.current?.getCurrentFrame() ?? 0;
            setCurrentTimeSec(frame / fps);
        };

        syncTime();
        player.addEventListener('timeupdate', syncTime);
        player.addEventListener('frameupdate', syncTime);
        player.addEventListener('seeked', syncTime);

        return () => {
            player.removeEventListener('timeupdate', syncTime);
            player.removeEventListener('frameupdate', syncTime);
            player.removeEventListener('seeked', syncTime);
        };
    }, [fps, playerInstance, playerRef]);

    return currentTimeSec;
}

function buildPreviewSuppressKey(
    manifest: ShortVideoRenderManifest,
    timeSec: number,
    selectedTextClipId: string
): string {
    const htmlIds = resolveHtmlClipPreviewUsesIframe(manifest)
        ? resolveActiveHtmlClipsAtSec(manifest, timeSec).map((clip) => clip.id).join(',')
        : '';
    const textIds = !selectedTextClipId
        ? ''
        : resolveActiveTextClipsAtSec(manifest, timeSec).map((clip) => clip.id).join(',');
    return `${htmlIds}|${textIds}`;
}

function composePreviewManifest(
    manifest: ShortVideoRenderManifest,
    timeSec: number,
    selectedTextClipId: string
): ShortVideoRenderManifest {
    let next = manifest;
    if (resolveHtmlClipPreviewUsesIframe(manifest)) {
        next = buildPreviewManifestWithHtmlOverlay(next, timeSec);
    }
    next = buildPreviewManifestWithTextOverlay(next, timeSec, selectedTextClipId);
    return next;
}

/**
 * Manifest cho Remotion Player — chỉ đổi khi base manifest hoặc suppress overlay ids đổi,
 * không đổi mỗi frame (tránh Html5Audio preview bị remount / lặp audio).
 */
export function useStablePreviewManifest(
    manifest: ShortVideoRenderManifest | null,
    timeSec: number,
    selectedTextClipId: string
): ShortVideoRenderManifest | null {
    const cacheRef = React.useRef<{
        base: ShortVideoRenderManifest | null;
        key: string;
        value: ShortVideoRenderManifest | null;
    }>({ base: null, key: '', value: null });

    if (!manifest) {
        cacheRef.current = { base: null, key: '', value: null };
        return null;
    }

    const suppressKey = buildPreviewSuppressKey(manifest, timeSec, selectedTextClipId);
    const cache = cacheRef.current;
    if (cache.base === manifest && cache.key === suppressKey && cache.value) {
        return cache.value;
    }

    const value = composePreviewManifest(manifest, timeSec, selectedTextClipId);
    cacheRef.current = { base: manifest, key: suppressKey, value };
    return value;
}
