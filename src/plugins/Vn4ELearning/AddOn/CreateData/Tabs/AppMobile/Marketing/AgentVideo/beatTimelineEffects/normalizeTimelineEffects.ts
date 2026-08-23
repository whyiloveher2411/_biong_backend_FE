import {
    BEAT_TIMELINE_EFFECT_MAX_ZOOM,
    BEAT_TIMELINE_EFFECT_MIN_DUR_SEC,
    type BeatTimelineEffect,
    type BeatZoomEffect,
} from '../agentVideoApi';
import { normalizeZoomPhaseBounds } from './effects/zoom/zoomPhases';

function clampTimelineEffect01(value: unknown, fallback: number): number {
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? Math.max(0, Math.min(1, num)) : fallback;
}

function clampTimelineEffectZoom(value: unknown, fallback = 1.5): number {
    const num = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(num)) return fallback;
    return Math.max(1.0, Math.min(BEAT_TIMELINE_EFFECT_MAX_ZOOM, num));
}

export function normalizeBeatZoomEffect(
    raw: unknown,
    beatDurationSec: number,
): BeatZoomEffect | null {
    if (!raw || typeof raw !== 'object') return null;
    const item = raw as Record<string, unknown>;
    const id = String(item.id || '').trim();
    if (!id) return null;
    const dur = Math.max(0.1, beatDurationSec);
    const minDur = BEAT_TIMELINE_EFFECT_MIN_DUR_SEC;
    let start = typeof item.start_sec === 'number' ? item.start_sec : Number(item.start_sec);
    let end = typeof item.end_sec === 'number' ? item.end_sec : Number(item.end_sec);
    if (!Number.isFinite(start)) start = 0;
    if (!Number.isFinite(end)) end = Math.min(dur, start + 2);
    start = Math.max(0, Math.min(dur, start));
    end = Math.max(0, Math.min(dur, end));
    if (end - start < minDur) {
        end = Math.min(dur, start + minDur);
        if (end - start < minDur) start = Math.max(0, end - minDur);
    }
    const layerRaw = typeof item.layer === 'number' ? item.layer : Number(item.layer);
    const layer = Number.isFinite(layerRaw) ? Math.max(0, Math.floor(layerRaw)) : 0;
    const name = String(item.name || '').trim();

    const phases = normalizeZoomPhaseBounds(start, end, item.zoom_in_end_sec, item.hold_end_sec, dur);

    return {
        id,
        type: 'zoom',
        start_sec: phases.start,
        end_sec: phases.end,
        zoom_in_end_sec: phases.zoomInEnd,
        hold_end_sec: phases.holdEnd,
        layer,
        ...(name ? { name } : {}),
        zoom_level: clampTimelineEffectZoom(item.zoom_level, 1.5),
        focus_x: clampTimelineEffect01(item.focus_x, 0.5),
        focus_y: clampTimelineEffect01(item.focus_y, 0.5),
    };
}

export function normalizeBeatTimelineEffects(
    raw: unknown,
    beatDurationSec: number,
): BeatTimelineEffect[] {
    if (!Array.isArray(raw)) return [];
    const out: BeatTimelineEffect[] = [];
    for (const item of raw) {
        if (!item || typeof item !== 'object') continue;
        const type = String((item as Record<string, unknown>).type || '').trim();
        if (type === 'zoom') {
            const normalized = normalizeBeatZoomEffect(item, beatDurationSec);
            if (normalized) out.push(normalized);
        }
    }
    return out.sort((a, b) => a.layer - b.layer || a.start_sec - b.start_sec);
}
