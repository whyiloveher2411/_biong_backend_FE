import React from 'react';
import { Box } from '@mui/material';

const DEFAULT_LOW_THRESHOLD = 0.12;
const NORMAL_BAR_COLOR = 'rgba(255, 255, 255, 0.55)';
const LOW_BAR_COLOR = 'rgba(248, 113, 113, 0.85)';

function resamplePeaks(peaks: number[], targetCount: number): number[] {
    if (targetCount <= 0 || peaks.length === 0) {
        return [];
    }
    if (peaks.length === targetCount) {
        return peaks;
    }
    const result: number[] = [];
    for (let i = 0; i < targetCount; i += 1) {
        const start = Math.floor((i / targetCount) * peaks.length);
        const end = Math.max(start + 1, Math.floor(((i + 1) / targetCount) * peaks.length));
        let max = 0;
        for (let j = start; j < end; j += 1) {
            max = Math.max(max, peaks[j] ?? 0);
        }
        result.push(max);
    }
    return result;
}

function drawWaveform(
    canvas: HTMLCanvasElement,
    peaks: number[],
    lowThreshold: number
): void {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width <= 0 || height <= 0 || peaks.length === 0) {
        return;
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const barCount = Math.max(1, Math.min(peaks.length, Math.floor(width / 2)));
    const sampled = resamplePeaks(peaks, barCount);
    const gap = 1;
    const barWidth = Math.max(1, (width - gap * (barCount - 1)) / barCount);
    const centerY = height / 2;
    const maxBarHeight = Math.max(2, height * 0.42);

    sampled.forEach((peak, index) => {
        const clampedPeak = Math.max(0, Math.min(1, peak));
        const barHeight = Math.max(1, clampedPeak * maxBarHeight);
        const x = index * (barWidth + gap);
        ctx.fillStyle = clampedPeak < lowThreshold ? LOW_BAR_COLOR : NORMAL_BAR_COLOR;
        ctx.fillRect(x, centerY - barHeight, barWidth, barHeight * 2);
    });
}

type Props = {
    peaks: number[];
    lowThreshold?: number;
    className?: string;
    /** Giây bắt đầu cắt trong file audio gốc */
    trimStartSec?: number;
    /** Thời lượng file audio gốc */
    sourceDurationSec?: number;
    /** Thời lượng clip hiện tại trên timeline */
    clipDurationSec?: number;
};

function slicePeaksForTrim(
    peaks: number[],
    trimStartSec: number,
    sourceDurationSec: number,
    clipDurationSec: number
): number[] {
    if (
        peaks.length === 0
        || !Number.isFinite(trimStartSec)
        || !Number.isFinite(sourceDurationSec)
        || sourceDurationSec <= 0
        || !Number.isFinite(clipDurationSec)
        || clipDurationSec <= 0
    ) {
        return peaks;
    }

    const trimStart = Math.max(0, trimStartSec);
    const trimEnd = Math.min(sourceDurationSec, trimStart + clipDurationSec);
    if (trimEnd <= trimStart) {
        return peaks;
    }

    const startIndex = Math.floor((trimStart / sourceDurationSec) * peaks.length);
    const endIndex = Math.max(startIndex + 1, Math.ceil((trimEnd / sourceDurationSec) * peaks.length));
    return peaks.slice(startIndex, endIndex);
}

export default function ShortVideoAudioWaveform({
    peaks,
    lowThreshold = DEFAULT_LOW_THRESHOLD,
    className,
    trimStartSec,
    sourceDurationSec,
    clipDurationSec,
}: Props) {
    const hostRef = React.useRef<HTMLDivElement | null>(null);
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
    const displayPeaks = React.useMemo(() => {
        if (
            typeof trimStartSec === 'number'
            && typeof sourceDurationSec === 'number'
            && typeof clipDurationSec === 'number'
            && sourceDurationSec > 0
            && clipDurationSec > 0
        ) {
            return slicePeaksForTrim(peaks, trimStartSec, sourceDurationSec, clipDurationSec);
        }
        return peaks;
    }, [clipDurationSec, peaks, sourceDurationSec, trimStartSec]);

    const redraw = React.useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || displayPeaks.length === 0) {
            return;
        }
        drawWaveform(canvas, displayPeaks, lowThreshold);
    }, [displayPeaks, lowThreshold]);

    React.useLayoutEffect(() => {
        redraw();
    }, [redraw]);

    React.useEffect(() => {
        const host = hostRef.current;
        if (!host) {
            return undefined;
        }
        const observer = new ResizeObserver(() => {
            redraw();
        });
        observer.observe(host);
        return () => {
            observer.disconnect();
        };
    }, [redraw]);

    if (displayPeaks.length === 0) {
        return null;
    }

    return (
        <Box
            ref={hostRef}
            className={className}
            sx={{
                position: 'absolute',
                inset: 0,
                overflow: 'hidden',
                pointerEvents: 'none',
            }}
        >
            <Box
                component="canvas"
                ref={canvasRef}
                sx={{
                    display: 'block',
                    width: '100%',
                    height: '100%',
                }}
            />
        </Box>
    );
}
