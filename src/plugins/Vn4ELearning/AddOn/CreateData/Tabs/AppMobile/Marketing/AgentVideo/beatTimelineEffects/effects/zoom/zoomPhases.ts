/** Thời lượng tối thiểu mỗi đoạn zoom in / giữ / zoom out. */
export const ZOOM_PHASE_MIN_DUR_SEC = 0.3;
const ZOOM_EFFECT_MIN_TOTAL_SEC = 1.0;

export type ZoomPhaseTiming = {
    start_sec: number;
    end_sec: number;
    zoom_in_end_sec: number;
    hold_end_sec: number;
};

export type ZoomPhaseEffectLike = ZoomPhaseTiming & {
    zoom_level: number;
    focus_x: number;
    focus_y: number;
};

export type ZoomPhaseBounds = {
    start: number;
    zoomInEnd: number;
    holdEnd: number;
    end: number;
};

function ease(t: number): number {
    const clamped = Math.max(0, Math.min(1, t));
    return 0.5 - 0.5 * Math.cos(Math.PI * clamped);
}

function roundSec(value: number): number {
    return Math.round(value * 100) / 100;
}

/** Chia 3 đoạn bằng nhau trong [start, end]. */
export function defaultZoomPhaseBounds(start: number, end: number): Pick<ZoomPhaseTiming, 'zoom_in_end_sec' | 'hold_end_sec'> {
    const span = Math.max(ZOOM_EFFECT_MIN_TOTAL_SEC, end - start);
    const third = span / 3;
    return {
        zoom_in_end_sec: roundSec(start + third),
        hold_end_sec: roundSec(start + third * 2),
    };
}

/** Chuẩn hóa 4 mốc thời gian zoom in → giữ → zoom out. */
export function normalizeZoomPhaseBounds(
    start: number,
    end: number,
    zoomInEndRaw: unknown,
    holdEndRaw: unknown,
    beatDurationSec: number,
): ZoomPhaseBounds {
    const dur = Math.max(0.1, beatDurationSec);
    const minPhase = ZOOM_PHASE_MIN_DUR_SEC;
    const minTotal = Math.max(ZOOM_EFFECT_MIN_TOTAL_SEC, minPhase * 3);

    let startClamped = Math.max(0, Math.min(dur, start));
    let endClamped = Math.max(0, Math.min(dur, end));
    if (endClamped - startClamped < minTotal) {
        endClamped = Math.min(dur, startClamped + minTotal);
        if (endClamped - startClamped < minTotal) {
            startClamped = Math.max(0, endClamped - minTotal);
        }
    }

    const defaults = defaultZoomPhaseBounds(startClamped, endClamped);
    let zoomInEnd = typeof zoomInEndRaw === 'number' ? zoomInEndRaw : Number(zoomInEndRaw);
    let holdEnd = typeof holdEndRaw === 'number' ? holdEndRaw : Number(holdEndRaw);
    if (!Number.isFinite(zoomInEnd)) zoomInEnd = defaults.zoom_in_end_sec;
    if (!Number.isFinite(holdEnd)) holdEnd = defaults.hold_end_sec;

    zoomInEnd = Math.max(startClamped + minPhase, Math.min(endClamped - minPhase * 2, zoomInEnd));
    holdEnd = Math.max(zoomInEnd + minPhase, Math.min(endClamped - minPhase, holdEnd));

    return {
        start: roundSec(startClamped),
        zoomInEnd: roundSec(zoomInEnd),
        holdEnd: roundSec(holdEnd),
        end: roundSec(endClamped),
    };
}

export function getZoomPhaseBounds(effect: ZoomPhaseTiming, beatDurationSec?: number): ZoomPhaseBounds {
    const dur = beatDurationSec ?? Math.max(effect.end_sec, effect.start_sec + ZOOM_EFFECT_MIN_TOTAL_SEC);
    return normalizeZoomPhaseBounds(
        effect.start_sec,
        effect.end_sec,
        effect.zoom_in_end_sec,
        effect.hold_end_sec,
        dur,
    );
}

export type ZoomPhaseVisualState = {
    scale: number;
    focusX: number;
    focusY: number;
    phase: 'in' | 'hold' | 'out' | 'idle';
};

/** Tính scale/focus tại thời điểm t trong một effect zoom. */
export function resolveZoomPhaseStateAt(
    tSec: number,
    effect: ZoomPhaseEffectLike,
    beatDurationSec?: number,
): ZoomPhaseVisualState {
    const { start, zoomInEnd, holdEnd, end } = getZoomPhaseBounds(effect, beatDurationSec);
    const target = effect.zoom_level;
    const fx = effect.focus_x;
    const fy = effect.focus_y;

    if (tSec < start || tSec > end) {
        return { scale: 1, focusX: 0.5, focusY: 0.5, phase: 'idle' };
    }

    if (tSec <= zoomInEnd) {
        const span = Math.max(0.001, zoomInEnd - start);
        const p = ease((tSec - start) / span);
        return {
            scale: 1 + (target - 1) * p,
            focusX: 0.5 + (fx - 0.5) * p,
            focusY: 0.5 + (fy - 0.5) * p,
            phase: 'in',
        };
    }

    if (tSec <= holdEnd) {
        return { scale: target, focusX: fx, focusY: fy, phase: 'hold' };
    }

    const span = Math.max(0.001, end - holdEnd);
    const p = ease((tSec - holdEnd) / span);
    return {
        scale: target + (1 - target) * p,
        focusX: fx + (0.5 - fx) * p,
        focusY: fy + (0.5 - fy) * p,
        phase: 'out',
    };
}

/** Kéo body — dịch cả 4 mốc, giữ tỉ lệ phase. */
export function shiftZoomPhaseBounds(
    bounds: ZoomPhaseBounds,
    deltaSec: number,
    beatDurationSec: number,
): ZoomPhaseBounds {
    const dur = Math.max(0.1, beatDurationSec);
    const span = bounds.end - bounds.start;
    let nextStart = bounds.start + deltaSec;
    nextStart = Math.max(0, Math.min(dur - span, nextStart));
    const nextEnd = nextStart + span;
    return normalizeZoomPhaseBounds(
        nextStart,
        nextEnd,
        bounds.zoomInEnd + deltaSec,
        bounds.holdEnd + deltaSec,
        dur,
    );
}
