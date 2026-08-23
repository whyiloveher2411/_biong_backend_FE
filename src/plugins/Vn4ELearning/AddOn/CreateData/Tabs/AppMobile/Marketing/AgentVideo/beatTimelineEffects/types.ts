import type { BeatTimelineEffect, BeatTimelineEffectType } from '../agentVideoApi';

export type BeatEditorSelection =
    | { kind: 'region'; id: string }
    | { kind: 'effect'; id: string }
    | null;

export type EffectCreateContext = {
    beatDurationSec: number;
    playheadSec: number;
    nextLayer: number;
};

export type EffectSettingsProps<T extends BeatTimelineEffect = BeatTimelineEffect> = {
    effect: T;
    beatDurationSec: number;
    allEffects: BeatTimelineEffect[];
    onChange: (patch: Partial<T>) => void;
    onDelete: () => void;
    onMoveLayer: (direction: 'up' | 'down') => void;
    saving?: boolean;
};

export type EffectDefinition<T extends BeatTimelineEffect = BeatTimelineEffect> = {
    type: T['type'];
    label: string;
    description: string;
    timelineColor: string;
    defaultDurationSec: number;
    createDefault: (ctx: EffectCreateContext) => T;
    normalize: (raw: unknown, beatDurationSec: number) => T | null;
    validate: (effect: T, all: BeatTimelineEffect[], beatDurationSec: number) => string | null;
    SettingsPanel: React.ComponentType<EffectSettingsProps<T>>;
};

export type BeatTimelineEffectTypeKey = BeatTimelineEffectType;
