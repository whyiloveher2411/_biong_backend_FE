import React from 'react';
import type { PlayerRef } from '@remotion/player';
import { Box } from '@mui/material';
import type { ShortVideoRenderManifest } from 'helpers/shortVideoRenderManifest';
import type { ShortVideoHtmlClip } from 'helpers/shortVideoRenderManifestTypes';
import {
    buildHtmlClipSrcDoc,
    resolveActiveHtmlClipsAtSec,
    seekHtmlClipIframeTime,
} from 'helpers/shortVideoHtmlClips';

type PlayerLayout = {
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
};

type Props = {
    manifest: ShortVideoRenderManifest;
    timeSec: number;
};

function computePlayerLayout(
    containerWidth: number,
    containerHeight: number,
    compositionWidth: number,
    compositionHeight: number
): PlayerLayout | null {
    if (containerWidth <= 0 || containerHeight <= 0) {
        return null;
    }
    const scale = Math.min(containerWidth / compositionWidth, containerHeight / compositionHeight);
    const width = Math.max(1, Math.floor(compositionWidth * scale));
    const height = Math.max(1, Math.floor(compositionHeight * scale));
    const offsetX = Math.floor((containerWidth - width) / 2);
    const offsetY = Math.floor((containerHeight - height) / 2);
    return { offsetX, offsetY, width, height };
}

function buildClipSrcDocMap(
    clips: ShortVideoHtmlClip[] | undefined,
    width: number,
    height: number
): Map<string, string> {
    const map = new Map<string, string>();
    (clips ?? []).forEach((clip) => {
        map.set(clip.id, buildHtmlClipSrcDoc(clip, { width, height }));
    });
    return map;
}

export default function ShortVideoPreviewHtmlOverlay({
    manifest,
    timeSec,
}: Props) {
    const hostRef = React.useRef<HTMLDivElement | null>(null);
    const iframeRefs = React.useRef<Record<string, HTMLIFrameElement | null>>({});
    const [layout, setLayout] = React.useState<PlayerLayout | null>(null);
    const compositionWidth = manifest.width || 1080;
    const compositionHeight = manifest.height || 1920;

    const srcDocByClipId = React.useMemo(
        () => buildClipSrcDocMap(manifest.html_clips, compositionWidth, compositionHeight),
        [compositionHeight, compositionWidth, manifest.html_clips]
    );

    React.useEffect(() => {
        const host = hostRef.current;
        if (!host || typeof ResizeObserver === 'undefined') {
            return undefined;
        }
        const observer = new ResizeObserver(() => {
            const rect = host.getBoundingClientRect();
            setLayout(computePlayerLayout(
                rect.width,
                rect.height,
                compositionWidth,
                compositionHeight
            ));
        });
        observer.observe(host);
        const rect = host.getBoundingClientRect();
        setLayout(computePlayerLayout(
            rect.width,
            rect.height,
            compositionWidth,
            compositionHeight
        ));
        return () => observer.disconnect();
    }, [compositionHeight, compositionWidth]);

    const activeClips = React.useMemo(
        () => resolveActiveHtmlClipsAtSec(manifest, timeSec),
        [manifest, timeSec]
    );

    React.useEffect(() => {
        activeClips.forEach((clip) => {
            const localTimeSec = timeSec - clip.start_sec;
            seekHtmlClipIframeTime(iframeRefs.current[clip.id], localTimeSec);
        });
    }, [activeClips, timeSec]);

    if (activeClips.length === 0 || !layout) {
        return (
            <Box
                ref={hostRef}
                sx={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                }}
            />
        );
    }

    return (
        <Box
            ref={hostRef}
            sx={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 12,
            }}
        >
            <Box
                sx={{
                    position: 'absolute',
                    left: layout.offsetX,
                    top: layout.offsetY,
                    width: layout.width,
                    height: layout.height,
                    overflow: 'hidden',
                }}
            >
                <Box
                    sx={{
                        position: 'relative',
                        width: compositionWidth,
                        height: compositionHeight,
                        transform: `scale(${layout.width / compositionWidth})`,
                        transformOrigin: 'top left',
                    }}
                >
                    {activeClips.map((clip) => (
                        <Box
                            key={clip.id}
                            component="iframe"
                            ref={(node: HTMLIFrameElement | null) => {
                                iframeRefs.current[clip.id] = node;
                            }}
                            title={clip.label || clip.id}
                            sandbox="allow-scripts"
                            srcDoc={srcDocByClipId.get(clip.id)}
                            onLoad={(event: React.SyntheticEvent<HTMLIFrameElement>) => {
                                const localTimeSec = timeSec - clip.start_sec;
                                seekHtmlClipIframeTime(event.currentTarget, localTimeSec);
                            }}
                            sx={{
                                position: 'absolute',
                                inset: 0,
                                width: compositionWidth,
                                height: compositionHeight,
                                border: 0,
                                display: 'block',
                                bgcolor: 'transparent',
                            }}
                        />
                    ))}
                </Box>
            </Box>
        </Box>
    );
}
