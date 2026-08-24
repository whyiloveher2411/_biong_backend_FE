import type { BeatImageOverlay, BeatRegion } from './agentVideoApi';
import {
    ATTENTION_CYCLE_SEC_DEFAULT,
    ATTENTION_DURATION_DEFAULT_SEC,
    ATTENTION_MIN_WINDOW_SEC,
    ATTENTION_SCALE_MAX_DEFAULT,
    drawEffectAfterSec,
    isRegionAttentionEnabled,
    normalizeAttentionCycleSec,
    normalizeAttentionScaleMax,
    normalizeDrawEffect,
    normalizePlaceEffect,
    placeEffectAfterSec,
} from './agentVideoApi';
import {
    resolveRegionEndSec,
} from './regionTimelineTiming';

type Word = { index: number; text: string; start: number };

export type AttentionTimingSource = BeatRegion | BeatImageOverlay;

function placeTailSec(source: AttentionTimingSource): number {
    if ('action' in source) {
        if (source.action === 'draw') {
            return drawEffectAfterSec(normalizeDrawEffect(source.place_effect));
        }
        if (source.action === 'place') {
            return placeEffectAfterSec(normalizePlaceEffect(source.place_effect));
        }
        return 0;
    }
    return placeEffectAfterSec(normalizePlaceEffect(source.place_effect));
}

function resolveAppearEndSec(
    source: AttentionTimingSource,
    beatWords: Word[],
    beatStartSec: number,
    beatDurationSec: number,
): number {
    if ('action' in source) {
        return resolveRegionEndSec(source, beatWords, beatStartSec, beatDurationSec);
    }
    const end = Number(source.end_sec);
    return Number.isFinite(end) ? Math.max(0, end) : beatDurationSec;
}

/**
 * Mốc sớm nhất hiệu ứng gây chú ý được phép bắt đầu:
 * ảnh render xong (`end_sec`) + thời lượng hiệu ứng sau ảnh (loang/neon/…).
 * User không kéo cửa sổ chú ý trước mốc này.
 */
export function attentionEarliestStartSec(
    source: AttentionTimingSource,
    beatWords: Word[],
    beatStartSec: number,
    beatDurationSec: number,
): number {
    const appearEnd = resolveAppearEndSec(source, beatWords, beatStartSec, beatDurationSec);
    return appearEnd + placeTailSec(source);
}

/** @deprecated Dùng attentionEarliestStartSec — cùng công thức. */
export function defaultAttentionStartSec(
    source: AttentionTimingSource,
    beatWords: Word[],
    beatStartSec: number,
    beatDurationSec: number,
): number {
    return attentionEarliestStartSec(source, beatWords, beatStartSec, beatDurationSec);
}

/** Cửa sổ thở mặc định khi user bật lần đầu. */
export function defaultAttentionWindow(
    source: AttentionTimingSource,
    beatWords: Word[],
    beatStartSec: number,
    beatDurationSec: number,
    sceneBudgetSec: number,
): { start: number; end: number } {
    const start = attentionEarliestStartSec(source, beatWords, beatStartSec, beatDurationSec);
    const budget = Math.max(0.1, sceneBudgetSec);
    const end = Math.min(start + ATTENTION_DURATION_DEFAULT_SEC, budget);
    return clampAttentionWindow(start, end, budget, start);
}

export function clampAttentionWindow(
    start: number,
    end: number,
    sceneBudgetSec: number,
    minStartSec = 0,
): { start: number; end: number } {
    const budget = Math.max(0.1, sceneBudgetSec);
    const minStart = Math.max(0, Math.min(budget, minStartSec));
    let s = Math.max(minStart, Math.min(budget, start));
    let e = Math.max(minStart, Math.min(budget, end));
    if (e - s < ATTENTION_MIN_WINDOW_SEC) {
        e = Math.min(budget, s + ATTENTION_MIN_WINDOW_SEC);
    }
    if (e <= s) {
        e = Math.min(budget, s + ATTENTION_MIN_WINDOW_SEC);
    }
    if (e - s < ATTENTION_MIN_WINDOW_SEC && s > minStart) {
        s = Math.max(minStart, e - ATTENTION_MIN_WINDOW_SEC);
    }
    return {
        start: Math.round(s * 100) / 100,
        end: Math.round(e * 100) / 100,
    };
}

export function resolveAttentionWindow(
    source: AttentionTimingSource,
    beatWords: Word[],
    beatStartSec: number,
    beatDurationSec: number,
    sceneBudgetSec: number,
): {
    start: number;
    end: number;
    enabled: boolean;
    scaleMax: number;
    cycleSec: number;
} {
    const scaleMax = normalizeAttentionScaleMax(source.attention_scale_max);
    const cycleSec = normalizeAttentionCycleSec(
        source.attention_cycle_sec ?? ATTENTION_CYCLE_SEC_DEFAULT,
    );
    const rawStart = source.attention_start_sec;
    const rawEnd = source.attention_end_sec;
    if (!isRegionAttentionEnabled(rawStart, rawEnd)) {
        return {
            start: 0,
            end: 0,
            enabled: false,
            scaleMax,
            cycleSec,
        };
    }
    const minStart = attentionEarliestStartSec(
        source,
        beatWords,
        beatStartSec,
        beatDurationSec,
    );
    const clamped = clampAttentionWindow(
        Number(rawStart),
        Number(rawEnd),
        sceneBudgetSec,
        minStart,
    );
    return {
        ...clamped,
        enabled: clamped.end - clamped.start >= ATTENTION_MIN_WINDOW_SEC,
        scaleMax,
        cycleSec,
    };
}

/** Scale thở tại thời điểm t — luôn >= 1.0, ngoài cửa sổ = 1.0. */
export function resolveAttentionScaleAt(
    t: number,
    start: number,
    end: number,
    cycleSec: number,
    scaleMax: number = ATTENTION_SCALE_MAX_DEFAULT,
): number {
    if (!(t >= start && t < end)) {
        return 1;
    }
    const max = normalizeAttentionScaleMax(scaleMax);
    const cycle = normalizeAttentionCycleSec(cycleSec);
    const phase = ((t - start) / cycle) * Math.PI * 2;
    const wave = 0.5 + 0.5 * Math.sin(phase);
    return 1 + (max - 1) * wave;
}

export function attentionPatchFromDrag(
    startSec: number,
    endSec: number,
    sceneBudgetSec: number,
    minStartSec = 0,
): {
    attention_start_sec: number;
    attention_end_sec: number;
} {
    const clamped = clampAttentionWindow(startSec, endSec, sceneBudgetSec, minStartSec);
    return {
        attention_start_sec: clamped.start,
        attention_end_sec: clamped.end,
    };
}

/** Giữ cửa sổ chú ý hợp lệ khi đổi mốc ảnh / hiệu ứng sau ảnh. */
export function snapAttentionFieldsToConstraints(
    source: AttentionTimingSource,
    beatWords: Word[],
    beatStartSec: number,
    beatDurationSec: number,
    sceneBudgetSec: number,
): { attention_start_sec: number; attention_end_sec: number } | null {
    if (!isRegionAttentionEnabled(source.attention_start_sec, source.attention_end_sec)) {
        return null;
    }
    const minStart = attentionEarliestStartSec(source, beatWords, beatStartSec, beatDurationSec);
    const clamped = clampAttentionWindow(
        Number(source.attention_start_sec),
        Number(source.attention_end_sec),
        sceneBudgetSec,
        minStart,
    );
    if (
        Math.abs(clamped.start - Number(source.attention_start_sec)) < 0.005
        && Math.abs(clamped.end - Number(source.attention_end_sec)) < 0.005
    ) {
        return null;
    }
    return {
        attention_start_sec: clamped.start,
        attention_end_sec: clamped.end,
    };
}

export function enableAttentionPatch(
    source: AttentionTimingSource,
    beatWords: Word[],
    beatStartSec: number,
    beatDurationSec: number,
    sceneBudgetSec: number,
): { attention_start_sec: number; attention_end_sec: number; attention_scale_max: number; attention_cycle_sec: number } {
    const win = defaultAttentionWindow(
        source,
        beatWords,
        beatStartSec,
        beatDurationSec,
        sceneBudgetSec,
    );
    return {
        attention_start_sec: win.start,
        attention_end_sec: win.end,
        attention_scale_max: normalizeAttentionScaleMax(source.attention_scale_max),
        attention_cycle_sec: normalizeAttentionCycleSec(source.attention_cycle_sec),
    };
}

export function disableAttentionPatch(): {
    attention_start_sec: null;
    attention_end_sec: null;
} {
    return {
        attention_start_sec: null,
        attention_end_sec: null,
    };
}

/** Overlay timing helpers */
export function resolveOverlayStartSec(overlay: BeatImageOverlay): number {
    return Math.max(0, Number(overlay.start_sec) || 0);
}

export function resolveOverlayEndSec(overlay: BeatImageOverlay, beatDurationSec: number): number {
    const maxSec = Math.max(0.1, beatDurationSec);
    const end = Number(overlay.end_sec);
    return Number.isFinite(end) ? Math.max(0, Math.min(maxSec, end)) : maxSec;
}

export function overlayTimingPatchFromDrag(startSec: number, endSec: number, beatDurationSec: number): Pick<BeatImageOverlay, 'start_sec' | 'end_sec'> {
    const maxSec = Math.max(0.1, beatDurationSec);
    let s = Math.max(0, Math.min(maxSec, startSec));
    let e = Math.max(0, Math.min(maxSec, endSec));
    if (e - s < 0.05) {
        e = Math.min(maxSec, s + 0.05);
    }
    return {
        start_sec: Math.round(s * 100) / 100,
        end_sec: Math.round(e * 100) / 100,
    };
}

export function createDefaultBeatImageOverlay(
    imageUrl: string,
    beatDurationSec: number,
    index: number,
): BeatImageOverlay {
    const id = `overlay-${Date.now()}-${index}`;
    const end = Math.min(Math.max(2, beatDurationSec * 0.4), beatDurationSec);
    return {
        id,
        name: `Ảnh ${index + 1}`,
        image_url: imageUrl,
        x: 0.5,
        y: 0.5,
        width: 0.22,
        height: 0.22,
        rotation_deg: 0,
        start_sec: 0,
        end_sec: Math.round(end * 100) / 100,
        entry_mode: 'drag_in',
        place_effect: 'loang',
        place_shadow: true,
        attention_start_sec: null,
        attention_end_sec: null,
        attention_scale_max: ATTENTION_SCALE_MAX_DEFAULT,
        attention_cycle_sec: ATTENTION_CYCLE_SEC_DEFAULT,
    };
}
