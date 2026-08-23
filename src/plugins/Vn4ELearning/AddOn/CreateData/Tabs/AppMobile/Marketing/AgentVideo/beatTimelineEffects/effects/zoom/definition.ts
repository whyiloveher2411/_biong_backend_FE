import {
    BEAT_TIMELINE_EFFECT_MIN_DUR_SEC,
    type BeatTimelineEffect,
    type BeatZoomEffect,
} from '../../../agentVideoApi';
import { normalizeBeatZoomEffect } from '../../normalizeTimelineEffects';
import type { EffectDefinition } from '../../types';
import { defaultZoomPhaseBounds, ZOOM_PHASE_MIN_DUR_SEC } from './zoomPhases';
import ZoomSettingsPanel from './ZoomSettingsPanel';

function nextZoomId(): string {
    return `fx_zoom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export const zoomEffectDefinition: EffectDefinition<BeatZoomEffect> = {
    type: 'zoom',
    label: 'Zoom',
    description: 'Zoom in → giữ → zoom out; kéo 3 đoạn trên timeline.',
    timelineColor: '#7c4dff',
    defaultDurationSec: 3.0,
    createDefault: ({ beatDurationSec, playheadSec, nextLayer }) => {
        const dur = Math.max(BEAT_TIMELINE_EFFECT_MIN_DUR_SEC, 3.0);
        const start = Math.max(0, Math.min(beatDurationSec - dur, playheadSec));
        const end = Math.min(beatDurationSec, start + dur);
        const phases = defaultZoomPhaseBounds(start, end);
        return {
            id: nextZoomId(),
            type: 'zoom',
            name: 'Zoom',
            start_sec: Math.round(start * 100) / 100,
            end_sec: Math.round(end * 100) / 100,
            zoom_in_end_sec: phases.zoom_in_end_sec,
            hold_end_sec: phases.hold_end_sec,
            layer: nextLayer,
            zoom_level: 1.5,
            focus_x: 0.5,
            focus_y: 0.5,
        };
    },
    normalize: normalizeBeatZoomEffect,
    validate: (effect, _all, beatDurationSec) => {
        if (effect.end_sec - effect.start_sec < BEAT_TIMELINE_EFFECT_MIN_DUR_SEC) {
            return `Thời lượng zoom tối thiểu ${BEAT_TIMELINE_EFFECT_MIN_DUR_SEC}s`;
        }
        if (effect.zoom_in_end_sec - effect.start_sec < ZOOM_PHASE_MIN_DUR_SEC) {
            return `Đoạn zoom in tối thiểu ${ZOOM_PHASE_MIN_DUR_SEC}s`;
        }
        if (effect.hold_end_sec - effect.zoom_in_end_sec < ZOOM_PHASE_MIN_DUR_SEC) {
            return `Đoạn giữ zoom tối thiểu ${ZOOM_PHASE_MIN_DUR_SEC}s`;
        }
        if (effect.end_sec - effect.hold_end_sec < ZOOM_PHASE_MIN_DUR_SEC) {
            return `Đoạn zoom out tối thiểu ${ZOOM_PHASE_MIN_DUR_SEC}s`;
        }
        if (effect.start_sec < 0 || effect.end_sec > beatDurationSec) {
            return 'Khoảng thời gian zoom nằm ngoài beat';
        }
        if (effect.zoom_level < 1 || effect.zoom_level > 2) {
            return 'Mức zoom phải từ 1.0 đến 2.0';
        }
        return null;
    },
    SettingsPanel: ZoomSettingsPanel,
};

export function isBeatZoomEffect(effect: BeatTimelineEffect): effect is BeatZoomEffect {
    return effect.type === 'zoom';
}

export { getZoomPhaseBounds, ZOOM_PHASE_MIN_DUR_SEC } from './zoomPhases';
