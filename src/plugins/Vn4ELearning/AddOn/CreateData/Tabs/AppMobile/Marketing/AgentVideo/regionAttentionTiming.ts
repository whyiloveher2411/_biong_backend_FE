import type { BeatImageOverlay, BeatRegion } from './agentVideoApi';
import {
    ATTENTION_CYCLE_SEC_DEFAULT,
    ATTENTION_DURATION_DEFAULT_SEC,
    ATTENTION_INTENSITY_DEFAULT,
    ATTENTION_MIN_WINDOW_SEC,
    ATTENTION_SCALE_MAX_DEFAULT,
    drawEffectAfterSec,
    isRegionAttentionEnabled,
    normalizeAttentionCycleSec,
    normalizeAttentionIntensity,
    normalizeAttentionScaleMax,
    normalizeAttentionType,
    normalizeDrawEffect,
    normalizePlaceEffect,
    placeEffectAfterSec,
    type AttentionEffectKey,
} from './agentVideoApi';
import {
    resolveRegionEndSec,
} from './regionTimelineTiming';

type Word = { index: number; text: string; start: number };

export type AttentionTimingSource = BeatRegion | BeatImageOverlay;

function overlayHoldsToEnd(source: AttentionTimingSource): boolean {
    return !('action' in source) && Boolean(source.hold_to_end);
}

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
    const mode = String(source.entry_mode || '').trim().toLowerCase();
    if (mode === 'draw') {
        return drawEffectAfterSec(normalizeDrawEffect(source.place_effect));
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
    if (!('action' in source) && !overlayHoldsToEnd(source)) {
        return resolveOverlayStartSec(source);
    }
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
    const maxEnd = !('action' in source) && !overlayHoldsToEnd(source)
        ? resolveOverlayEndSec(source, beatDurationSec)
        : undefined;
    const end = Math.min(start + ATTENTION_DURATION_DEFAULT_SEC, maxEnd ?? budget);
    return clampAttentionWindow(start, end, budget, start, maxEnd);
}

export function clampAttentionWindow(
    start: number,
    end: number,
    sceneBudgetSec: number,
    minStartSec = 0,
    maxEndSec?: number,
): { start: number; end: number } {
    const budget = Math.max(0.1, sceneBudgetSec);
    const cap = maxEndSec != null && Number.isFinite(maxEndSec)
        ? Math.max(0.1, Math.min(budget, maxEndSec))
        : budget;
    const minStart = Math.max(0, Math.min(cap, minStartSec));
    let s = Math.max(minStart, Math.min(cap, start));
    let e = Math.max(minStart, Math.min(cap, end));
    if (e - s < ATTENTION_MIN_WINDOW_SEC) {
        e = Math.min(cap, s + ATTENTION_MIN_WINDOW_SEC);
    }
    if (e <= s) {
        e = Math.min(cap, s + ATTENTION_MIN_WINDOW_SEC);
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
    type: AttentionEffectKey;
    intensity: number;
} {
    const scaleMax = normalizeAttentionScaleMax(source.attention_scale_max);
    const cycleSec = normalizeAttentionCycleSec(
        source.attention_cycle_sec ?? ATTENTION_CYCLE_SEC_DEFAULT,
    );
    const intensity = normalizeAttentionIntensity(source.attention_intensity);
    const rawStart = source.attention_start_sec;
    const rawEnd = source.attention_end_sec;
    const hasWindow = isRegionAttentionEnabled(rawStart, rawEnd);
    const type = normalizeAttentionType(source.attention_type, hasWindow);
    if (!hasWindow || type === 'none') {
        return {
            start: 0,
            end: 0,
            enabled: false,
            scaleMax,
            cycleSec,
            type: 'none',
            intensity,
        };
    }
    const minStart = attentionEarliestStartSec(
        source,
        beatWords,
        beatStartSec,
        beatDurationSec,
    );
    const maxEnd = !('action' in source) && !overlayHoldsToEnd(source)
        ? resolveOverlayEndSec(source, beatDurationSec)
        : undefined;
    const clamped = clampAttentionWindow(
        Number(rawStart),
        Number(rawEnd),
        sceneBudgetSec,
        minStart,
        maxEnd,
    );
    return {
        ...clamped,
        enabled: clamped.end - clamped.start >= ATTENTION_MIN_WINDOW_SEC,
        scaleMax,
        cycleSec,
        type,
        intensity,
    };
}

/** Envelope gây chú ý: 0→1 fade-in, giữ, 1→0 fade-out. */
export function attentionEnvelope(t: number, start: number, end: number): number {
    const span = end - start;
    if (!(span >= ATTENTION_MIN_WINDOW_SEC) || !(t >= start && t < end)) {
        return 0;
    }
    const fade = Math.min(span * 0.4, Math.max(0.12, Math.min(0.45, span * 0.22)));
    const smooth = (u: number) => {
        const x = Math.max(0, Math.min(1, u));
        return x * x * (3 - 2 * x);
    };
    return Math.min(smooth((t - start) / fade), smooth((end - t) / fade));
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
    const env = attentionEnvelope(t, start, end);
    return 1 + (max - 1) * wave * env;
}

export type AttentionFxAt = {
    type: AttentionEffectKey;
    enabled: boolean;
    progress: number;
    cyclePhase: number;
    intensity: number;
    scale: number;
    envelope: number;
};

/** Trạng thái hiệu ứng gây chú ý tại t (progress 0–1 trong cửa sổ, cyclePhase 0–1). */
export function resolveAttentionFxAt(
    t: number,
    start: number,
    end: number,
    type: AttentionEffectKey,
    cycleSec: number,
    scaleMax: number = ATTENTION_SCALE_MAX_DEFAULT,
    intensity: number = ATTENTION_INTENSITY_DEFAULT,
): AttentionFxAt {
    const enabled = type !== 'none' && t >= start && t < end && end - start >= ATTENTION_MIN_WINDOW_SEC;
    if (!enabled) {
        return {
            type: 'none',
            enabled: false,
            progress: 0,
            cyclePhase: 0,
            intensity: normalizeAttentionIntensity(intensity),
            scale: 1,
            envelope: 0,
        };
    }
    const span = Math.max(0.001, end - start);
    const progress = Math.max(0, Math.min(1, (t - start) / span));
    const cycle = normalizeAttentionCycleSec(cycleSec);
    const cyclePhase = ((t - start) / cycle) % 1;
    const env = attentionEnvelope(t, start, end);
    const scale = type === 'breathe'
        ? resolveAttentionScaleAt(t, start, end, cycle, scaleMax)
        : 1;
    return {
        type,
        enabled: true,
        progress,
        cyclePhase: cyclePhase < 0 ? cyclePhase + 1 : cyclePhase,
        intensity: normalizeAttentionIntensity(intensity),
        scale,
        envelope: env,
    };
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
    const maxEnd = !('action' in source) && !overlayHoldsToEnd(source)
        ? resolveOverlayEndSec(source, beatDurationSec)
        : undefined;
    const clamped = clampAttentionWindow(
        Number(source.attention_start_sec),
        Number(source.attention_end_sec),
        sceneBudgetSec,
        minStart,
        maxEnd,
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
    type: AttentionEffectKey = 'breathe',
): {
    attention_start_sec: number;
    attention_end_sec: number;
    attention_type: AttentionEffectKey;
    attention_scale_max: number;
    attention_cycle_sec: number;
    attention_intensity: number;
} {
    const win = defaultAttentionWindow(
        source,
        beatWords,
        beatStartSec,
        beatDurationSec,
        sceneBudgetSec,
    );
    const nextType = type === 'none' ? 'breathe' : type;
    return {
        attention_start_sec: win.start,
        attention_end_sec: win.end,
        attention_type: nextType,
        attention_scale_max: normalizeAttentionScaleMax(source.attention_scale_max),
        attention_cycle_sec: normalizeAttentionCycleSec(source.attention_cycle_sec),
        attention_intensity: normalizeAttentionIntensity(source.attention_intensity),
    };
}

export function disableAttentionPatch(): {
    attention_start_sec: null;
    attention_end_sec: null;
    attention_type: 'none';
} {
    return {
        attention_start_sec: null,
        attention_end_sec: null,
        attention_type: 'none',
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
    opts?: {
        /** Pixel size ảnh upload — khóa tỉ lệ khung với canvas beat. */
        overlayNaturalW?: number;
        overlayNaturalH?: number;
        /** Pixel size ảnh beat (để quy đổi width/height normalized). */
        beatNaturalW?: number;
        beatNaturalH?: number;
    },
): BeatImageOverlay {
    const id = `overlay-${Date.now()}-${index}`;
    const end = Math.min(Math.max(2, beatDurationSec * 0.4), beatDurationSec);
    const width = 0.22;
    let height = 0.22;
    const ow = Number(opts?.overlayNaturalW);
    const oh = Number(opts?.overlayNaturalH);
    const bw = Number(opts?.beatNaturalW);
    const bh = Number(opts?.beatNaturalH);
    if (ow > 0 && oh > 0 && bw > 0 && bh > 0) {
        // (width*bw)/(height*bh) = ow/oh  →  height = width * (bw/bh) * (oh/ow)
        height = Math.max(0.04, Math.min(1, width * (bw / bh) * (oh / ow)));
    } else if (ow > 0 && oh > 0) {
        height = Math.max(0.04, Math.min(1, width * (oh / ow)));
    }
    return {
        id,
        name: `Ảnh ${index + 1}`,
        image_url: imageUrl,
        x: 0.5,
        y: 0.5,
        width,
        height: Math.round(height * 10000) / 10000,
        rotation_deg: 0,
        start_sec: 0,
        end_sec: Math.round(end * 100) / 100,
        hold_to_end: false,
        repeat: true,
        entry_mode: 'instant',
        place_effect: 'none',
        place_shadow: true,
        attention_start_sec: null,
        attention_end_sec: null,
        attention_type: 'none',
        attention_scale_max: ATTENTION_SCALE_MAX_DEFAULT,
        attention_cycle_sec: ATTENTION_CYCLE_SEC_DEFAULT,
        attention_intensity: ATTENTION_INTENSITY_DEFAULT,
    };
}
