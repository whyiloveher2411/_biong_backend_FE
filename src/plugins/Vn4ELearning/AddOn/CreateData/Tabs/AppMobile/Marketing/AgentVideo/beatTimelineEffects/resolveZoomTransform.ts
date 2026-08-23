import type { BeatTimelineEffect } from '../agentVideoApi';
import { isBeatZoomEffect } from './effects/zoom/definition';
import { resolveZoomPhaseStateAt, type ZoomPhaseEffectLike } from './effects/zoom/zoomPhases';

export type ZoomTransformState = {
    scale: number;
    focusX: number;
    focusY: number;
};

export type NormalizedRect = {
    x: number;
    y: number;
    w: number;
    h: number;
};

/**
 * Tính transform zoom tại thời điểm t (scene-relative sec).
 * Các effect active sort theo layer ASC, compose tuần tự.
 */
export function resolveZoomTransformAt(
    tSec: number,
    effects: BeatTimelineEffect[],
    beatDurationSec?: number,
): ZoomTransformState {
    let scale = 1;
    let focusX = 0.5;
    let focusY = 0.5;

    const active = effects
        .filter(isBeatZoomEffect)
        .filter((effect) => tSec >= effect.start_sec && tSec <= effect.end_sec)
        .sort((a, b) => a.layer - b.layer);

    for (const effect of active) {
        const state = resolveZoomPhaseStateAt(tSec, effect, beatDurationSec);
        if (state.phase === 'idle') continue;
        scale *= state.scale;
        focusX = state.focusX;
        focusY = state.focusY;
    }

    return { scale, focusX, focusY };
}

/**
 * Khung nhìn thấy trên ảnh gốc (ratio 0–1) khi zoom scale S quanh focus.
 * Khớp logic clamp center của engine Python.
 */
export function getZoomVisibleRect(
    focusX: number,
    focusY: number,
    scale: number,
): NormalizedRect {
    if (scale <= 1.0005) {
        return { x: 0, y: 0, w: 1, h: 1 };
    }
    const hw = 0.5 / scale;
    const hh = 0.5 / scale;
    const cx = Math.max(hw, Math.min(1 - hw, focusX));
    const cy = Math.max(hh, Math.min(1 - hh, focusY));
    return {
        x: cx - hw,
        y: cy - hh,
        w: hw * 2,
        h: hh * 2,
    };
}

/**
 * CSS transform khớp engine warp:
 * 1. scale(z) quanh TÂM khung preview (50%, 50%) — không quanh chấm focus trên ảnh
 * 2. translate để đưa điểm focus (đã clamp như engine) ra đúng giữa khung
 *
 * Sau bước scale, focus ở (0.5 + (cx−0.5)·z) → cần dịch −(cx−0.5)·z để về 0.5.
 */
export function zoomTransformToCss(state: ZoomTransformState): string {
    if (state.scale <= 1.0005) return 'none';
    const z = state.scale;
    const rect = getZoomVisibleRect(state.focusX, state.focusY, z);
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    const tx = -(cx - 0.5) * z * 100;
    const ty = -(cy - 0.5) * z * 100;
    return `translate(${tx}%, ${ty}%) scale(${z})`;
}

/**
 * Khung overlay trên ảnh gốc (phạm vi đích zoom_level).
 * - Ngoài effect: khung cố định để chỉnh (planning)
 * - Trong effect (in / giữ / out): cùng transform timeline với ảnh
 */
export function getZoomOverlayCropRect(
    effect: ZoomPhaseEffectLike & { start_sec: number; end_sec: number },
    playheadSec: number,
    beatDurationSec?: number,
): {
    rect: NormalizedRect;
    scale: number;
    inRange: boolean;
    phase: string;
    syncTimelinePreview: boolean;
} {
    const inRange = playheadSec >= effect.start_sec && playheadSec <= effect.end_sec;
    let phase = 'target';
    if (inRange) {
        const live = resolveZoomPhaseStateAt(playheadSec, effect, beatDurationSec);
        phase = live.phase;
    }
    return {
        rect: getZoomVisibleRect(effect.focus_x, effect.focus_y, effect.zoom_level),
        scale: effect.zoom_level,
        inRange,
        phase,
        syncTimelinePreview: inRange,
    };
}

export function zoomRectToSvgAttrs(rect: NormalizedRect): {
    x: number;
    y: number;
    width: number;
    height: number;
} {
    return {
        x: rect.x * 1000,
        y: rect.y * 1000,
        width: rect.w * 1000,
        height: rect.h * 1000,
    };
}
