import React from 'react';
import {
    BEAT_TIMELINE_EFFECT_MIN_DUR_SEC,
    normalizeBeatTimelineEffects,
    type BeatTimelineEffect,
    type BeatTimelineEffectType,
} from '../agentVideoApi';
import { getBeatTimelineEffectDefinition } from './registry';

type Options = {
    beatDurationSec: number;
    playheadSec: number;
    initialEffects: BeatTimelineEffect[];
    onPersist: (effects: BeatTimelineEffect[]) => Promise<boolean>;
};

function nextLayer(effects: BeatTimelineEffect[]): number {
    if (effects.length === 0) return 0;
    return Math.max(...effects.map((item) => item.layer)) + 1;
}

function normalizeAll(effects: BeatTimelineEffect[], beatDurationSec: number): BeatTimelineEffect[] {
    return normalizeBeatTimelineEffects(effects, beatDurationSec);
}

export function useBeatTimelineEffects({
    beatDurationSec,
    playheadSec,
    initialEffects,
    onPersist,
}: Options) {
    const [effects, setEffects] = React.useState<BeatTimelineEffect[]>(() =>
        normalizeAll(initialEffects, beatDurationSec));
    const [saving, setSaving] = React.useState(false);
    const beatDurationRef = React.useRef(beatDurationSec);
    const effectsRef = React.useRef(effects);
    const commitTimerRef = React.useRef<number | null>(null);
    beatDurationRef.current = beatDurationSec;
    effectsRef.current = effects;

    React.useEffect(() => {
        setEffects(normalizeAll(initialEffects, beatDurationSec));
    }, [initialEffects, beatDurationSec]);

    const persist = React.useCallback(async (next: BeatTimelineEffect[]) => {
        const normalized = normalizeAll(next, beatDurationRef.current);
        setEffects(normalized);
        setSaving(true);
        try {
            return await onPersist(normalized);
        } finally {
            setSaving(false);
        }
    }, [onPersist]);

    const addEffect = React.useCallback(async (type: BeatTimelineEffectType) => {
        const def = getBeatTimelineEffectDefinition(type);
        if (!def) return null;
        const created = def.createDefault({
            beatDurationSec: beatDurationRef.current,
            playheadSec,
            nextLayer: nextLayer(effects),
        });
        const next = normalizeAll([...effects, created], beatDurationRef.current);
        const ok = await persist(next);
        return ok ? created : null;
    }, [effects, persist, playheadSec]);

    const updateEffectLocal = React.useCallback((id: string, patch: Partial<BeatTimelineEffect>) => {
        setEffects((prev) => normalizeAll(
            prev.map((item) => (item.id === id ? { ...item, ...patch } as BeatTimelineEffect : item)),
            beatDurationRef.current,
        ));
    }, []);

    const commitEffect = React.useCallback(async (id: string, patch: Partial<BeatTimelineEffect> = {}) => {
        const next = normalizeAll(
            effectsRef.current.map((item) => (item.id === id ? { ...item, ...patch } as BeatTimelineEffect : item)),
            beatDurationRef.current,
        );
        return persist(next);
    }, [persist]);

    const scheduleEffectCommit = React.useCallback((id: string, patch: Partial<BeatTimelineEffect>) => {
        if (commitTimerRef.current != null) {
            window.clearTimeout(commitTimerRef.current);
        }
        commitTimerRef.current = window.setTimeout(() => {
            commitTimerRef.current = null;
            void commitEffect(id, patch);
        }, 400);
    }, [commitEffect]);

    React.useEffect(() => () => {
        if (commitTimerRef.current != null) {
            window.clearTimeout(commitTimerRef.current);
        }
    }, []);

    const updateEffect = React.useCallback(async (id: string, patch: Partial<BeatTimelineEffect>) => {
        updateEffectLocal(id, patch);
        return commitEffect(id, patch);
    }, [commitEffect, updateEffectLocal]);

    const removeEffect = React.useCallback(async (id: string) => {
        const next = effects.filter((item) => item.id !== id);
        return persist(next);
    }, [effects, persist]);

    const moveLayer = React.useCallback(async (id: string, direction: 'up' | 'down') => {
        const sorted = [...effects].sort((a, b) => a.layer - b.layer || a.start_sec - b.start_sec);
        const index = sorted.findIndex((item) => item.id === id);
        if (index < 0) return false;
        const swapIndex = direction === 'up' ? index + 1 : index - 1;
        if (swapIndex < 0 || swapIndex >= sorted.length) return false;
        const current = sorted[index];
        const swap = sorted[swapIndex];
        const next = effects.map((item) => {
            if (item.id === current.id) return { ...item, layer: swap.layer };
            if (item.id === swap.id) return { ...item, layer: current.layer };
            return item;
        });
        return persist(next);
    }, [effects, persist]);

    const validateEffect = React.useCallback((effect: BeatTimelineEffect): string | null => {
        const def = getBeatTimelineEffectDefinition(effect.type);
        if (!def) return 'Loại hiệu ứng không hỗ trợ';
        return def.validate(effect, effects, beatDurationRef.current);
    }, [effects]);

    const getEffectStartSec = React.useCallback((id: string) => {
        const item = effects.find((effect) => effect.id === id);
        return item?.start_sec ?? 0;
    }, [effects]);

    const getEffectEndSec = React.useCallback((id: string) => {
        const item = effects.find((effect) => effect.id === id);
        return item?.end_sec ?? BEAT_TIMELINE_EFFECT_MIN_DUR_SEC;
    }, [effects]);

    const commitEffectTiming = React.useCallback(async (id: string, startSec: number, endSec: number) => {
        return updateEffect(id, { start_sec: startSec, end_sec: endSec });
    }, [updateEffect]);

    return {
        effects,
        saving,
        addEffect,
        updateEffect,
        updateEffectLocal,
        commitEffect,
        scheduleEffectCommit,
        removeEffect,
        moveLayer,
        validateEffect,
        getEffectStartSec,
        getEffectEndSec,
        commitEffectTiming,
        setEffectsLocal: setEffects,
    };
}
