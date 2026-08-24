import React from 'react';
import { Box, Typography } from '@mui/material';
import type { BeatImageOverlay, BeatRegion, BeatTimelineEffect } from './agentVideoApi';
import { resolveZoomTransformAt, zoomTransformToCss } from './beatTimelineEffects/resolveZoomTransform';
import {
    resolveAttentionScaleAt,
    resolveAttentionWindow,
    resolveOverlayEndSec,
    resolveOverlayStartSec,
} from './regionAttentionTiming';
import {
    beatPlayheadToVideoSec,
    resolveRegionEndSec,
    resolveRegionStartSec,
} from './regionTimelineTiming';

type Word = { index: number; text: string; start: number };

type Props = {
    imageUrl: string;
    regions: BeatRegion[];
    imageOverlays?: BeatImageOverlay[];
    playheadSec: number;
    durationSec: number;
    sceneBudgetSec?: number;
    beatStartSec: number;
    beatWords: Word[];
    timelineEffects?: BeatTimelineEffect[];
};

const BOARD_COLOR = '#efe6d4';

function regionProgress(
    region: BeatRegion,
    playheadSec: number,
    beatWords: Word[],
    beatStartSec: number,
    duration: number,
    hasChildren: boolean,
): number {
    if (region.parent_leftover_instant && hasChildren) {
        return 1;
    }
    const start = resolveRegionStartSec(region, beatWords, beatStartSec, duration);
    const end = Math.max(start + 0.05, resolveRegionEndSec(region, beatWords, beatStartSec, duration));
    if (playheadSec <= start) {
        return 0;
    }
    if (playheadSec >= end) {
        return 1;
    }
    return (playheadSec - start) / (end - start);
}

function polygonClip(points: [number, number][]): string {
    return `polygon(${points.map((point) => `${(point[0] * 100).toFixed(3)}% ${(point[1] * 100).toFixed(3)}%`).join(', ')})`;
}

function polygonBBox(points: [number, number][]): { minX: number; minY: number; w: number; h: number } {
    const xs = points.map((point) => point[0]);
    const ys = points.map((point) => point[1]);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    return {
        minX,
        minY,
        w: Math.max(0.001, Math.max(...xs) - minX),
        h: Math.max(0.001, Math.max(...ys) - minY),
    };
}

/**
 * Mô phỏng kết quả whiteboard theo playhead — khi CHƯA có video beat.
 * Nền = ảnh gốc (instant base); chỉ che bảng trắng TRONG vùng chưa lộ.
 */
export default function WhiteboardBeatTimingPreview({
    imageUrl,
    regions,
    imageOverlays = [],
    playheadSec,
    durationSec,
    sceneBudgetSec,
    beatStartSec,
    beatWords,
    timelineEffects = [],
}: Props) {
    const duration = Math.max(0.1, durationSec);
    const budget = Math.max(0.1, sceneBudgetSec ?? duration);
    const timelineZoomCss = zoomTransformToCss(resolveZoomTransformAt(playheadSec, timelineEffects, durationSec));
    const ordered = React.useMemo(() => {
        const out: BeatRegion[] = [];
        const visited = new Set<string>();
        const visit = (region: BeatRegion) => {
            if (visited.has(region.id)) {
                return;
            }
            visited.add(region.id);
            out.push(region);
            regions.filter((child) => child.parent_id === region.id).forEach(visit);
        };
        regions.filter((region) => !region.parent_id).forEach(visit);
        regions.forEach(visit);
        return out;
    }, [regions]);

    const regionStates = ordered.map((region) => {
        const hasChildren = regions.some((item) => item.parent_id === region.id);
        const progress = regionProgress(
            region,
            playheadSec,
            beatWords,
            beatStartSec,
            duration,
            hasChildren,
        );
        const attention = resolveAttentionWindow(region, beatWords, beatStartSec, duration, budget);
        const breatheScale = progress >= 0.995 && attention.enabled
            ? resolveAttentionScaleAt(
                playheadSec,
                attention.start,
                attention.end,
                attention.cycleSec,
                attention.scaleMax,
            )
            : 1;
        return { region, hasChildren, progress, attention, breatheScale };
    });

    return (
        <Box
            sx={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                overflow: 'hidden',
            }}
        >
            <Box
                sx={{
                    position: 'absolute',
                    inset: 0,
                    transform: timelineZoomCss !== 'none' ? timelineZoomCss : undefined,
                    transformOrigin: 'center center',
                }}
            >
                {/* Ảnh beat đầy đủ — nền ngoài vùng luôn hiện ảnh gốc (khớp engine instant base). */}
                <Box
                    component="img"
                    src={imageUrl}
                    alt=""
                    draggable={false}
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'fill',
                        display: 'block',
                        pointerEvents: 'none',
                    }}
                />

                {/* Che bảng trắng chỉ TRONG polygon chưa lộ / đang animate — không phủ toàn canvas. */}
                {regionStates.map(({ region, progress }) => {
                    if (!Array.isArray(region.points) || region.points.length < 3) {
                        return null;
                    }
                    if (region.action === 'erase') {
                        if (progress <= 0.01) {
                            return null;
                        }
                        return (
                            <Box
                                key={`${region.id}-erase-mask`}
                                sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    clipPath: polygonClip(region.points),
                                    bgcolor: BOARD_COLOR,
                                    opacity: progress,
                                }}
                            />
                        );
                    }
                    if (progress >= 0.995) {
                        return null;
                    }
                    const bbox = polygonBBox(region.points);
                    const isPlace = region.action === 'place';
                    // Place: không phủ lớp trắng chồng reveal (gây "filter trắng" lúc fade-in).
                    // Chỉ che bảng khi chưa bắt đầu lộ; khi đang đưa vào dùng opacity ở lớp reveal.
                    if (isPlace) {
                        if (progress > 0.01) {
                            return null;
                        }
                        return (
                            <Box
                                key={`${region.id}-place-mask`}
                                sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    clipPath: polygonClip(region.points),
                                    bgcolor: BOARD_COLOR,
                                }}
                            />
                        );
                    }
                    return (
                        <Box
                            key={`${region.id}-draw-mask`}
                            sx={{
                                position: 'absolute',
                                inset: 0,
                                clipPath: polygonClip(region.points),
                            }}
                        >
                            <Box
                                sx={{
                                    position: 'absolute',
                                    left: `${bbox.minX * 100}%`,
                                    top: `${(bbox.minY + bbox.h * progress) * 100}%`,
                                    width: `${bbox.w * 100}%`,
                                    height: `${bbox.h * (1 - progress) * 100}%`,
                                    bgcolor: BOARD_COLOR,
                                }}
                            />
                        </Box>
                    );
                })}

                {/* Lớp cutout đã lộ — scale thở riêng từng vùng (isolation tránh dính màu GPU). */}
                {regionStates.map(({ region, progress, breatheScale }) => {
                    if (!Array.isArray(region.points) || region.points.length < 3) {
                        return null;
                    }
                    if (region.action === 'erase' || progress <= 0.01) {
                        return null;
                    }
                    const bbox = polygonBBox(region.points);
                    const isPlace = region.action === 'place';
                    const placeScale = isPlace && progress < 1 ? (0.86 + 0.14 * progress) : 1;
                    const totalScale = Math.max(1, breatheScale * placeScale);
                    const originX = (bbox.minX + bbox.w / 2) * 100;
                    const originY = (bbox.minY + bbox.h / 2) * 100;
                    return (
                        <Box
                            key={`${region.id}-reveal`}
                            sx={{
                                position: 'absolute',
                                inset: 0,
                                clipPath: polygonClip(region.points),
                                opacity: isPlace && progress < 1 ? progress : 1,
                                transform: totalScale !== 1 ? `scale(${totalScale})` : undefined,
                                transformOrigin: `${originX.toFixed(2)}% ${originY.toFixed(2)}%`,
                                isolation: 'isolate',
                                willChange: totalScale !== 1 ? 'transform' : undefined,
                            }}
                        >
                            <Box
                                component="img"
                                src={imageUrl}
                                alt=""
                                draggable={false}
                                sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'fill',
                                    display: 'block',
                                }}
                            />
                        </Box>
                    );
                })}

                {imageOverlays.map((overlay) => {
                    const start = resolveOverlayStartSec(overlay);
                    const end = resolveOverlayEndSec(overlay, duration);
                    if (playheadSec < start || playheadSec > end + 0.05) {
                        return null;
                    }
                    const appearProgress = playheadSec <= start
                        ? 0
                        : (playheadSec >= end ? 1 : (playheadSec - start) / Math.max(0.05, end - start));
                    const attention = resolveAttentionWindow(overlay, beatWords, beatStartSec, duration, budget);
                    const breatheScale = appearProgress >= 0.995 && attention.enabled
                        ? resolveAttentionScaleAt(
                            playheadSec,
                            attention.start,
                            attention.end,
                            attention.cycleSec,
                            attention.scaleMax,
                        )
                        : 1;
                    const entryScale = appearProgress < 1 ? (0.86 + 0.14 * appearProgress) : 1;
                    const scale = Math.max(1, breatheScale * entryScale);
                    return (
                        <Box
                            key={overlay.id}
                            sx={{
                                position: 'absolute',
                                left: `${(overlay.x - overlay.width / 2) * 100}%`,
                                top: `${(overlay.y - overlay.height / 2) * 100}%`,
                                width: `${overlay.width * 100}%`,
                                height: `${overlay.height * 100}%`,
                                transform: `rotate(${overlay.rotation_deg || 0}deg) scale(${scale})`,
                                transformOrigin: 'center center',
                                pointerEvents: 'none',
                                isolation: 'isolate',
                            }}
                        >
                            <Box
                                component="img"
                                src={overlay.image_url}
                                alt=""
                                draggable={false}
                                sx={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain',
                                    display: 'block',
                                }}
                            />
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
}

type VideoPreviewProps = {
    videoUrl: string;
    /** Cửa sổ beat đầy đủ (scene + transition) — khớp độ dài file beat_*.mp4. */
    beatWindowSec: number;
    /** Intro đầu file video (0.15 khi có vùng, 0.3 mặc định). */
    videoIntroSec?: number;
    initialSec?: number;
    initialPlaying?: boolean;
};

export type WhiteboardBeatVideoPreviewHandle = {
    seekTo: (sec: number, playing: boolean) => void;
};

/**
 * Overlay video beat — seek KHÔNG đi qua React state từng frame.
 * Latest-wins: chỉ giữ mốc mới nhất, chờ `seeked` rồi mới seek tiếp
 * (tránh xếp hàng currentTime làm preview giật).
 */
export const WhiteboardBeatVideoPreview = React.forwardRef<
    WhiteboardBeatVideoPreviewHandle,
    VideoPreviewProps
>(function WhiteboardBeatVideoPreview({
    videoUrl,
    beatWindowSec,
    videoIntroSec = 0.15,
    initialSec = 0,
    initialPlaying = false,
}, ref) {
    const videoRef = React.useRef<HTMLVideoElement | null>(null);
    const pendingBeatSecRef = React.useRef<number | null>(null);
    const seekingRef = React.useRef(false);
    const playingRef = React.useRef(initialPlaying);
    const beatWindowRef = React.useRef(beatWindowSec);
    const introSecRef = React.useRef(videoIntroSec);
    beatWindowRef.current = beatWindowSec;
    introSecRef.current = videoIntroSec;
    const [labelSec, setLabelSec] = React.useState(initialSec);
    const labelRafRef = React.useRef(0);

    const beatToVideoSec = React.useCallback((beatSec: number) => (
        beatPlayheadToVideoSec(beatSec, beatWindowRef.current, introSecRef.current)
    ), []);

    const clampVideoSec = React.useCallback((videoSec: number) => {
        const video = videoRef.current;
        const fallback = Math.max(0.1, introSecRef.current + beatWindowRef.current);
        const dur = video && Number.isFinite(video.duration) && video.duration > 0
            ? video.duration
            : fallback;
        return Math.max(0, Math.min(Math.max(0, dur - 0.04), videoSec));
    }, []);

    const flushSeek = React.useCallback(() => {
        const video = videoRef.current;
        if (!video || seekingRef.current) {
            return;
        }
        if (pendingBeatSecRef.current == null) {
            return;
        }
        const beatSec = pendingBeatSecRef.current;
        pendingBeatSecRef.current = null;
        const t = clampVideoSec(beatToVideoSec(beatSec));
        if (Math.abs(video.currentTime - t) < 0.012) {
            return;
        }
        seekingRef.current = true;
        const media = video as HTMLVideoElement & { fastSeek?: (time: number) => void };
        try {
            if (typeof media.fastSeek === 'function') {
                media.fastSeek(t);
            } else {
                video.currentTime = t;
            }
        } catch {
            seekingRef.current = false;
        }
    }, [beatToVideoSec, clampVideoSec]);

    const seekTo = React.useCallback((beatSec: number, playing: boolean) => {
        pendingBeatSecRef.current = beatSec;
        playingRef.current = playing;
        if (!labelRafRef.current) {
            labelRafRef.current = window.requestAnimationFrame(() => {
                labelRafRef.current = 0;
                setLabelSec(beatSec);
            });
        }
        const video = videoRef.current;
        if (!video) {
            return;
        }
        if (playing) {
            if (video.paused) {
                void video.play().catch(() => undefined);
            }
            if (Math.abs(video.currentTime - clampVideoSec(beatToVideoSec(beatSec))) > 0.28) {
                flushSeek();
            }
            return;
        }
        if (!video.paused) {
            video.pause();
        }
        flushSeek();
    }, [beatToVideoSec, clampVideoSec, flushSeek]);

    React.useImperativeHandle(ref, () => ({ seekTo }), [seekTo]);

    React.useEffect(() => {
        const video = videoRef.current;
        if (!video) {
            return undefined;
        }
        const onSeeked = () => {
            seekingRef.current = false;
            flushSeek();
        };
        const onLoaded = () => {
            seekingRef.current = false;
            if (pendingBeatSecRef.current == null) {
                pendingBeatSecRef.current = initialSec;
            }
            flushSeek();
            if (playingRef.current && video.paused) {
                void video.play().catch(() => undefined);
            }
        };
        const watchdog = window.setInterval(() => {
            if (seekingRef.current && pendingBeatSecRef.current != null) {
                seekingRef.current = false;
                flushSeek();
            }
        }, 160);
        video.addEventListener('seeked', onSeeked);
        video.addEventListener('loadedmetadata', onLoaded);
        pendingBeatSecRef.current = initialSec;
        flushSeek();
        return () => {
            window.clearInterval(watchdog);
            video.removeEventListener('seeked', onSeeked);
            video.removeEventListener('loadedmetadata', onLoaded);
        };
    }, [flushSeek, initialSec, videoUrl]);

    React.useEffect(() => () => {
        if (labelRafRef.current) {
            window.cancelAnimationFrame(labelRafRef.current);
        }
    }, []);

    return (
        <Box
            sx={{
                position: 'absolute',
                inset: 0,
                zIndex: 3,
                bgcolor: '#000',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <video
                ref={videoRef}
                src={videoUrl}
                muted
                playsInline
                preload="auto"
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    display: 'block',
                    pointerEvents: 'none',
                }}
            >
                <track kind="captions" />
            </video>
            <WhiteboardBeatPreviewBadge playheadSec={labelSec} />
        </Box>
    );
});

export function WhiteboardBeatPreviewBadge({
    playheadSec,
}: {
    playheadSec: number;
    hasVideo?: boolean;
}) {
    return (
        <Box
            sx={{
                position: 'absolute',
                bottom: 10,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 6,
                pointerEvents: 'none',
                bgcolor: 'rgba(0,0,0,0.72)',
                color: '#fff',
                borderRadius: 1.5,
                px: 1.25,
                py: 0.4,
            }}
        >
            <Typography
                variant="caption"
                sx={{
                    display: 'block',
                    fontWeight: 800,
                    fontSize: 11,
                    lineHeight: 1.25,
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    fontVariantNumeric: 'tabular-nums',
                }}
            >
                {`Video beat · ${playheadSec.toFixed(1)}s`}
            </Typography>
        </Box>
    );
}
