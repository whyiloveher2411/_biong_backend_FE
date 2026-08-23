import type { BeatTimelineEffect, BeatTimelineEffectType } from '../agentVideoApi';
import { zoomEffectDefinition } from './effects/zoom/definition';
import type { EffectDefinition } from './types';

export const BEAT_TIMELINE_EFFECT_REGISTRY: Record<
    BeatTimelineEffectType,
    EffectDefinition<BeatTimelineEffect>
> = {
    zoom: zoomEffectDefinition as EffectDefinition<BeatTimelineEffect>,
};

export function getBeatTimelineEffectDefinition(
    type: BeatTimelineEffectType,
): EffectDefinition<BeatTimelineEffect> | null {
    return BEAT_TIMELINE_EFFECT_REGISTRY[type] || null;
}

export function listBeatTimelineEffectDefinitions(): EffectDefinition<BeatTimelineEffect>[] {
    return Object.values(BEAT_TIMELINE_EFFECT_REGISTRY);
}
