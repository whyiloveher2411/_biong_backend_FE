import React from 'react';
import { Box, Typography } from '@mui/material';
import type { ShortVideoTextClipMotion } from 'helpers/shortVideoRenderManifest';
import {
    clampTextClipEnterDurationSec,
    clampTextClipExitDurationSec,
    hasTextClipEnterAnimation,
    hasTextClipExitAnimation,
    resolveTextClipEnterMotionLabel,
    resolveTextClipExitMotionLabel,
} from 'helpers/shortVideoTextClips';

type Props = {
    motion?: ShortVideoTextClipMotion;
    enterDurationSec?: number;
    exitMotion?: ShortVideoTextClipMotion | 'none';
    exitDurationSec?: number;
    clipDurationSec: number;
    timelineScaleWidth: number;
    onCommitEnterDuration?: (durationSec: number) => void;
    onCommitExitDuration?: (durationSec: number) => void;
};

const HANDLE_SIZE_PX = 6;

function useDurationDrag({
    clipDurationSec,
    timelineScaleWidth,
    onCommit,
    invertDelta = false,
}: {
    clipDurationSec: number;
    timelineScaleWidth: number;
    onCommit: (durationSec: number) => void;
    invertDelta?: boolean;
}) {
    const [dragDurationSec, setDragDurationSec] = React.useState<number | null>(null);
    const dragRef = React.useRef<{ startX: number; startDurationSec: number } | null>(null);
    const clamp = invertDelta ? clampTextClipExitDurationSec : clampTextClipEnterDurationSec;

    const finishDrag = React.useCallback((durationSec: number) => {
        dragRef.current = null;
        setDragDurationSec(null);
        onCommit(durationSec);
    }, [onCommit]);

    const handlePointerMove = React.useCallback((event: PointerEvent) => {
        const drag = dragRef.current;
        if (!drag || timelineScaleWidth <= 0) {
            return;
        }
        const rawDelta = (event.clientX - drag.startX) / timelineScaleWidth;
        const deltaSec = invertDelta ? -rawDelta : rawDelta;
        const nextDuration = clamp(drag.startDurationSec + deltaSec, clipDurationSec);
        setDragDurationSec(nextDuration);
    }, [clamp, clipDurationSec, invertDelta, timelineScaleWidth]);

    const handlePointerUp = React.useCallback((event: PointerEvent) => {
        const drag = dragRef.current;
        if (!drag) {
            return;
        }
        const rawDelta = (event.clientX - drag.startX) / timelineScaleWidth;
        const deltaSec = invertDelta ? -rawDelta : rawDelta;
        finishDrag(clamp(drag.startDurationSec + deltaSec, clipDurationSec));
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);
    }, [clamp, clipDurationSec, finishDrag, handlePointerMove, invertDelta, timelineScaleWidth]);

    React.useEffect(() => () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);
    }, [handlePointerMove, handlePointerUp]);

    const startDrag = React.useCallback((event: React.PointerEvent, startDurationSec: number) => {
        event.preventDefault();
        event.stopPropagation();
        dragRef.current = { startX: event.clientX, startDurationSec };
        setDragDurationSec(startDurationSec);
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', handlePointerUp);
    }, [handlePointerMove, handlePointerUp]);

    return { dragDurationSec, startDrag };
}

function EnterDurationSegment({
    motion,
    durationSec,
    clipDurationSec,
    timelineScaleWidth,
    onCommit,
}: {
    motion?: ShortVideoTextClipMotion;
    durationSec: number;
    clipDurationSec: number;
    timelineScaleWidth: number;
    onCommit: (durationSec: number) => void;
}) {
    const { dragDurationSec, startDrag } = useDurationDrag({
        clipDurationSec,
        timelineScaleWidth,
        onCommit,
    });
    const resolvedDurationSec = dragDurationSec ?? durationSec;
    const widthPercent = clipDurationSec > 0
        ? Math.max(0, Math.min(100, (resolvedDurationSec / clipDurationSec) * 100))
        : 0;
    const motionLabel = resolveTextClipEnterMotionLabel(motion);

    return (
        <>
            <Box
                sx={{
                    position: 'absolute',
                    left: 4,
                    top: '50%',
                    width: HANDLE_SIZE_PX,
                    height: HANDLE_SIZE_PX,
                    borderRadius: '50%',
                    bgcolor: 'rgba(255,255,255,0.9)',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    zIndex: 2,
                }}
            />
            <Box
                sx={{
                    position: 'absolute',
                    left: `${widthPercent}%`,
                    top: '50%',
                    width: HANDLE_SIZE_PX,
                    height: HANDLE_SIZE_PX,
                    borderRadius: '50%',
                    border: '2px solid #fff',
                    bgcolor: 'transparent',
                    transform: 'translate(-50%, -50%)',
                    cursor: 'ew-resize',
                    zIndex: 3,
                }}
                onPointerDown={(event) => startDrag(event, durationSec)}
            />
            <Box
                sx={{
                    position: 'absolute',
                    left: 4 + HANDLE_SIZE_PX / 2,
                    width: `max(0px, calc(${widthPercent}% - ${4 + HANDLE_SIZE_PX / 2}px))`,
                    top: '50%',
                    height: 2,
                    bgcolor: 'rgba(255,255,255,0.75)',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                }}
            />
            {widthPercent > 18 ? (
                <Typography
                    variant="caption"
                    sx={{
                        position: 'absolute',
                        left: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: 9,
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.92)',
                        pointerEvents: 'none',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: `calc(${widthPercent}% - 16px)`,
                        lineHeight: 1,
                    }}
                >
                    {motionLabel}
                </Typography>
            ) : null}
        </>
    );
}

function ExitDurationSegment({
    motion,
    durationSec,
    clipDurationSec,
    timelineScaleWidth,
    onCommit,
}: {
    motion?: ShortVideoTextClipMotion | 'none';
    durationSec: number;
    clipDurationSec: number;
    timelineScaleWidth: number;
    onCommit: (durationSec: number) => void;
}) {
    const { dragDurationSec, startDrag } = useDurationDrag({
        clipDurationSec,
        timelineScaleWidth,
        onCommit,
        invertDelta: true,
    });
    const resolvedDurationSec = dragDurationSec ?? durationSec;
    const widthPercent = clipDurationSec > 0
        ? Math.max(0, Math.min(100, (resolvedDurationSec / clipDurationSec) * 100))
        : 0;
    const leftPercent = 100 - widthPercent;
    const motionLabel = resolveTextClipExitMotionLabel(motion);

    return (
        <>
            <Box
                sx={{
                    position: 'absolute',
                    right: 4,
                    top: '50%',
                    width: HANDLE_SIZE_PX,
                    height: HANDLE_SIZE_PX,
                    borderRadius: '50%',
                    bgcolor: 'rgba(255,255,255,0.9)',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    zIndex: 2,
                }}
            />
            <Box
                sx={{
                    position: 'absolute',
                    left: `${leftPercent}%`,
                    top: '50%',
                    width: HANDLE_SIZE_PX,
                    height: HANDLE_SIZE_PX,
                    borderRadius: '50%',
                    border: '2px solid #fff',
                    bgcolor: 'transparent',
                    transform: 'translate(-50%, -50%)',
                    cursor: 'ew-resize',
                    zIndex: 3,
                }}
                onPointerDown={(event) => startDrag(event, durationSec)}
            />
            <Box
                sx={{
                    position: 'absolute',
                    left: `calc(${leftPercent}% + ${HANDLE_SIZE_PX / 2}px)`,
                    right: 4 + HANDLE_SIZE_PX / 2,
                    top: '50%',
                    height: 2,
                    bgcolor: 'rgba(255,255,255,0.75)',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                }}
            />
            {widthPercent > 18 ? (
                <Typography
                    variant="caption"
                    sx={{
                        position: 'absolute',
                        right: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: 9,
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.92)',
                        pointerEvents: 'none',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: `calc(${widthPercent}% - 16px)`,
                        lineHeight: 1,
                        textAlign: 'right',
                    }}
                >
                    {motionLabel}
                </Typography>
            ) : null}
        </>
    );
}

export default function ShortVideoTextClipAnimationDurationBars({
    motion,
    enterDurationSec = 0.5,
    exitMotion,
    exitDurationSec = 0.5,
    clipDurationSec,
    timelineScaleWidth,
    onCommitEnterDuration,
    onCommitExitDuration,
}: Props) {
    const showEnter = hasTextClipEnterAnimation(motion) && Boolean(onCommitEnterDuration);
    const showExit = hasTextClipExitAnimation(exitMotion) && Boolean(onCommitExitDuration);

    if (!showEnter && !showExit) {
        return null;
    }

    return (
        <Box
            sx={{
                position: 'relative',
                height: 12,
                px: 0.5,
                flexShrink: 0,
                cursor: 'default',
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
        >
            {showEnter && onCommitEnterDuration ? (
                <EnterDurationSegment
                    motion={motion}
                    durationSec={enterDurationSec}
                    clipDurationSec={clipDurationSec}
                    timelineScaleWidth={timelineScaleWidth}
                    onCommit={onCommitEnterDuration}
                />
            ) : null}
            {showExit && onCommitExitDuration ? (
                <ExitDurationSegment
                    motion={exitMotion}
                    durationSec={exitDurationSec}
                    clipDurationSec={clipDurationSec}
                    timelineScaleWidth={timelineScaleWidth}
                    onCommit={onCommitExitDuration}
                />
            ) : null}
        </Box>
    );
}
