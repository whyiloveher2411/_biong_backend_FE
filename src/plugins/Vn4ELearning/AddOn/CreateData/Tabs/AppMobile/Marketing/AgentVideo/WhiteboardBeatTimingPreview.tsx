import React from 'react';
import { Box, Typography } from '@mui/material';
import type { BeatRegion } from './agentVideoApi';

type Word = { index: number; text: string; start: number };

type Props = {
    imageUrl: string;
    regions: BeatRegion[];
    playheadSec: number;
    durationSec: number;
    beatStartSec: number;
    beatWords: Word[];
};

const BOARD_COLOR = '#efe6d4';

function wordTimeOf(wordIndex: number | null | undefined, beatWords: Word[], beatStartSec: number, duration: number): number | null {
    if (wordIndex == null) {
        return null;
    }
    const word = beatWords.find((item) => item.index === wordIndex);
    return word ? Math.max(0, Math.min(duration, word.start - beatStartSec)) : null;
}

function startSecOf(region: BeatRegion, beatWords: Word[], beatStartSec: number, duration: number): number {
    if (region.start_sec != null) {
        return Math.max(0, Math.min(duration, region.start_sec));
    }
    const fromWord = wordTimeOf(region.script_start_word, beatWords, beatStartSec, duration);
    return fromWord != null ? fromWord : 0;
}

function endSecOf(region: BeatRegion, beatWords: Word[], beatStartSec: number, duration: number): number {
    if (region.end_sec != null) {
        return Math.max(0, Math.min(duration, region.end_sec));
    }
    const fromWord = wordTimeOf(region.script_end_word, beatWords, beatStartSec, duration);
    return fromWord != null ? fromWord : duration;
}

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
    const start = startSecOf(region, beatWords, beatStartSec, duration);
    const end = Math.max(start + 0.05, endSecOf(region, beatWords, beatStartSec, duration));
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
 * Ảnh gốc bị che bằng nền bảng; từng vùng lộ dần theo [start_sec, end_sec].
 */
export default function WhiteboardBeatTimingPreview({
    imageUrl,
    regions,
    playheadSec,
    durationSec,
    beatStartSec,
    beatWords,
}: Props) {
    const duration = Math.max(0.1, durationSec);
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

    return (
        <Box
            sx={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                overflow: 'hidden',
                bgcolor: BOARD_COLOR,
            }}
        >
            {ordered.map((region) => {
                if (!Array.isArray(region.points) || region.points.length < 3) {
                    return null;
                }
                const hasChildren = regions.some((item) => item.parent_id === region.id);
                const progress = regionProgress(
                    region,
                    playheadSec,
                    beatWords,
                    beatStartSec,
                    duration,
                    hasChildren,
                );
                if (region.action === 'erase') {
                    if (progress <= 0.01) {
                        return null;
                    }
                    return (
                        <Box
                            key={`${region.id}-erase`}
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
                if (progress <= 0.01) {
                    return null;
                }
                const bbox = polygonBBox(region.points);
                const isPlace = region.action === 'place';
                return (
                    <Box
                        key={region.id}
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            clipPath: polygonClip(region.points),
                            opacity: isPlace ? Math.max(0.15, progress) : 1,
                            transform: isPlace && progress < 1 ? `scale(${0.86 + 0.14 * progress})` : undefined,
                            transformOrigin: `${((bbox.minX + bbox.w / 2) * 100).toFixed(2)}% ${((bbox.minY + bbox.h / 2) * 100).toFixed(2)}%`,
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
                        {!isPlace && progress < 0.995 ? (
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
                        ) : null}
                    </Box>
                );
            })}
        </Box>
    );
}

type VideoPreviewProps = {
    videoUrl: string;
    durationSec: number;
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
    durationSec,
    initialSec = 0,
    initialPlaying = false,
}, ref) {
    const videoRef = React.useRef<HTMLVideoElement | null>(null);
    const pendingSecRef = React.useRef<number | null>(null);
    const seekingRef = React.useRef(false);
    const playingRef = React.useRef(initialPlaying);
    const durationRef = React.useRef(durationSec);
    durationRef.current = durationSec;
    const [labelSec, setLabelSec] = React.useState(initialSec);
    const labelRafRef = React.useRef(0);

    const clampSec = React.useCallback((sec: number) => {
        const video = videoRef.current;
        const dur = video && Number.isFinite(video.duration) && video.duration > 0
            ? video.duration
            : Math.max(0.1, durationRef.current);
        return Math.max(0, Math.min(Math.max(0, dur - 0.04), sec));
    }, []);

    const flushSeek = React.useCallback(() => {
        const video = videoRef.current;
        if (!video || seekingRef.current) {
            return;
        }
        if (pendingSecRef.current == null) {
            return;
        }
        const t = clampSec(pendingSecRef.current);
        pendingSecRef.current = null;
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
    }, [clampSec]);

    const seekTo = React.useCallback((sec: number, playing: boolean) => {
        pendingSecRef.current = sec;
        playingRef.current = playing;
        if (!labelRafRef.current) {
            labelRafRef.current = window.requestAnimationFrame(() => {
                labelRafRef.current = 0;
                setLabelSec(sec);
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
            if (Math.abs(video.currentTime - clampSec(sec)) > 0.28) {
                flushSeek();
            }
            return;
        }
        if (!video.paused) {
            video.pause();
        }
        flushSeek();
    }, [clampSec, flushSeek]);

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
            if (pendingSecRef.current == null) {
                pendingSecRef.current = initialSec;
            }
            flushSeek();
            if (playingRef.current && video.paused) {
                void video.play().catch(() => undefined);
            }
        };
        const watchdog = window.setInterval(() => {
            if (seekingRef.current && pendingSecRef.current != null) {
                seekingRef.current = false;
                flushSeek();
            }
        }, 160);
        video.addEventListener('seeked', onSeeked);
        video.addEventListener('loadedmetadata', onLoaded);
        pendingSecRef.current = initialSec;
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
