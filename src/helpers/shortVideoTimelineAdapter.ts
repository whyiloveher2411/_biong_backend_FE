import type { TimelineAction, TimelineEffect, TimelineRow } from '@xzdarcy/timeline-engine';
import {
    compositionSecToManifestSec,
    getCompositionDurationSec,
    getSceneCompositionRange,
    manifestSecToCompositionSec,
} from '@spacedev/remotion-short-video/compositionTimeline';
import type {
    ShortVideoManifestScene,
    ShortVideoRenderManifest,
    ShortVideoVisualClip,
} from './shortVideoRenderManifestTypes';
import {
    resolveSceneHeadlineText,
    resolveSceneShowVisual,
    resolveSceneVisualRef,
    resolveSceneVisualType,
} from './shortVideoRenderManifest';
import { clampClipTiming, setVisualClipsInManifest } from './shortVideoVisualClips';

export type { TimelineAction, TimelineEffect, TimelineRow };

export {
    compositionSecToManifestSec,
    getCompositionDurationSec,
    getSceneCompositionRange,
    manifestSecToCompositionSec,
} from '@spacedev/remotion-short-video/compositionTimeline';

export const TIMELINE_ROW_NARRATION = 'narration';
export const TIMELINE_ROW_VISUAL = 'visual';

/** Track trống dự phòng (Phase 2+) — luôn hiển thị dưới Visual. */
export const TIMELINE_SPARE_ROW_COUNT = 1;
export const TIMELINE_SPARE_ROW_HEIGHT = 40;
export const TIMELINE_NARRATION_ROW_HEIGHT = 36;
export const TIMELINE_VISUAL_ROW_HEIGHT = 44;
export const TIMELINE_RULER_HEIGHT = 32;

const TIMELINE_SPARE_ROW_IDS = ['spare_1', 'spare_2'] as const;

export const SHORT_VIDEO_TIMELINE_EFFECTS: Record<string, TimelineEffect> = {
    narration: { id: 'narration', name: 'Lời thoại' },
    visual: { id: 'visual', name: 'Visual' },
};

export type ShortVideoTimelineActionData = {
    kind: 'narration' | 'visual';
    sceneId?: string;
    clipId?: string;
    label?: string;
    status?: 'ready' | 'pending' | 'running';
    thumbnailUrl?: string;
    visualType?: string;
};

export type ShortVideoTimelineAction = TimelineAction & {
    data?: ShortVideoTimelineActionData;
};

const MIN_ACTION_DURATION_SEC = 0.1;
export const DEFAULT_NEW_NARRATION_DURATION_SEC = 3;
const MIN_NEW_NARRATION_DURATION_SEC = 1;

export function isSceneReadyForTimeline(scene: ShortVideoManifestScene): boolean {
    return Boolean(scene.audio_url?.trim())
        && Array.isArray(scene.words)
        && scene.words.length > 0;
}

export function sortScenesByTimelineOrder(
    scenes: ShortVideoManifestScene[]
): ShortVideoManifestScene[] {
    return [...scenes].sort((a, b) => {
        const startDiff = a.start_offset_sec - b.start_offset_sec;
        if (Math.abs(startDiff) > 0.0001) {
            return startDiff;
        }
        return a.id.localeCompare(b.id);
    });
}

function narrationSceneDurationSec(scene: ShortVideoManifestScene): number {
    if (isSceneReadyForTimeline(scene)) {
        return Math.max(MIN_ACTION_DURATION_SEC, scene.duration_sec);
    }
    return DEFAULT_NEW_NARRATION_DURATION_SEC;
}

function recalcManifestDurationSec(manifest: ShortVideoRenderManifest): number {
    const ends = manifest.scenes.map(
        (scene) => scene.start_offset_sec + narrationSceneDurationSec(scene)
    );
    return Number(Math.max(manifest.duration_sec || 0, ...ends, 0).toFixed(3));
}

function sceneNarrationLabel(scene: ShortVideoRenderManifest['scenes'][number]): string {
    const headline = resolveSceneHeadlineText(scene).trim();
    if (headline) {
        return headline.length > 28 ? `${headline.slice(0, 28)}…` : headline;
    }
    return scene.id;
}

function clipThumbnailUrl(clip: ShortVideoVisualClip): string | undefined {
    if (clip.type === 'image' && /^https:\/\//i.test(clip.ref.trim())) {
        return clip.ref.trim();
    }
    return undefined;
}

function narrationCompositionStartSec(
    manifest: ShortVideoRenderManifest,
    scene: ShortVideoManifestScene
): number {
    return manifestSecToCompositionSec(manifest, scene.start_offset_sec);
}

function hasVisualRowDragChanges(
    rows: TimelineRow[],
    manifest: ShortVideoRenderManifest
): boolean {
    const visualRow = rows.find((row) => row.id === TIMELINE_ROW_VISUAL);
    if (!visualRow) {
        return false;
    }
    const expectedVisual = manifestToTimelineRows(manifest).find(
        (row) => row.id === TIMELINE_ROW_VISUAL
    );
    if (!expectedVisual) {
        return false;
    }
    const expectedByClipId = new Map(
        expectedVisual.actions.map((action) => {
            const extended = action as ShortVideoTimelineAction;
            const clipId = extended.data?.clipId || action.id;
            return [clipId, action] as const;
        })
    );
    return visualRow.actions.some((action) => {
        const extended = action as ShortVideoTimelineAction;
        const clipId = extended.data?.clipId || action.id;
        const expected = expectedByClipId.get(clipId);
        if (!expected) {
            return false;
        }
        return Math.abs(action.start - expected.start) > 0.02
            || Math.abs(action.end - expected.end) > 0.02;
    });
}

export function manifestToTimelineRows(
    manifest: ShortVideoRenderManifest,
    selectedClipId?: string,
    runningSceneIds: string[] = [],
    selectedNarrationSceneId = ''
): TimelineRow[] {
    const durationSec = Math.max(MIN_ACTION_DURATION_SEC, getCompositionDurationSec(manifest));

    const runningSceneSet = new Set(runningSceneIds);
    const narrationActions: ShortVideoTimelineAction[] = manifest.scenes.map((scene) => {
        const displayDurationSec = narrationSceneDurationSec(scene);
        const start = manifestSecToCompositionSec(manifest, scene.start_offset_sec);
        const end = manifestSecToCompositionSec(
            manifest,
            scene.start_offset_sec + displayDurationSec
        );
        return {
            id: `narr_${scene.id}`,
            start: Math.max(0, start),
            end: Math.max(start + MIN_ACTION_DURATION_SEC, end),
            effectId: 'narration',
            movable: true,
            flexible: false,
            selected: selectedNarrationSceneId === scene.id,
            data: {
                kind: 'narration',
                sceneId: scene.id,
                label: sceneNarrationLabel(scene),
                status: runningSceneSet.has(scene.id)
                    ? 'running'
                    : (isSceneReadyForTimeline(scene) ? 'ready' : 'pending'),
            },
        };
    });

    const visualClips = manifest.visual_clips ?? [];
    const visualActions: ShortVideoTimelineAction[] = visualClips.map((clip) => {
        const compStart = manifestSecToCompositionSec(manifest, clip.start_sec);
        const compEnd = manifestSecToCompositionSec(
            manifest,
            clip.start_sec + clip.duration_sec
        );
        return {
            id: clip.id,
            start: Math.max(0, compStart),
            end: Math.max(compStart + MIN_ACTION_DURATION_SEC, compEnd),
            effectId: 'visual',
            movable: true,
            flexible: true,
            minStart: 0,
            maxEnd: durationSec,
            selected: selectedClipId === clip.id,
            data: {
                kind: 'visual',
                clipId: clip.id,
                label: clip.label?.trim() || clip.id,
                thumbnailUrl: clipThumbnailUrl(clip),
                visualType: clip.type,
            },
        };
    });

    return [
        {
            id: TIMELINE_ROW_NARRATION,
            actions: narrationActions,
            rowHeight: TIMELINE_NARRATION_ROW_HEIGHT,
        },
        {
            id: TIMELINE_ROW_VISUAL,
            actions: visualActions,
            rowHeight: TIMELINE_VISUAL_ROW_HEIGHT,
        },
        ...TIMELINE_SPARE_ROW_IDS.map((id) => ({
            id,
            actions: [],
            rowHeight: TIMELINE_SPARE_ROW_HEIGHT,
        })),
    ];
}

export function timelineRowsToVisualClips(
    rows: TimelineRow[],
    manifest: ShortVideoRenderManifest
): ShortVideoVisualClip[] {
    const visualRow = rows.find((row) => row.id === TIMELINE_ROW_VISUAL);
    if (!visualRow) {
        return manifest.visual_clips ?? [];
    }

    const existingById = new Map(
        (manifest.visual_clips ?? []).map((clip) => [clip.id, clip] as const)
    );

    const clips: ShortVideoVisualClip[] = [];
    visualRow.actions.forEach((action: TimelineAction) => {
        const extended = action as ShortVideoTimelineAction;
        const clipId = extended.data?.clipId || action.id;
        const existing = existingById.get(clipId);
        if (!existing) {
            return;
        }
        const startSec = Math.max(0, action.start);
        const endSec = Math.max(startSec + MIN_ACTION_DURATION_SEC, action.end);
        const manifestStartSec = compositionSecToManifestSec(manifest, startSec);
        const manifestEndSec = compositionSecToManifestSec(manifest, endSec);
        const durationSec = Math.max(MIN_ACTION_DURATION_SEC, manifestEndSec - manifestStartSec);
        clips.push(
            clampClipTiming(
                {
                    ...existing,
                    start_sec: manifestStartSec,
                    duration_sec: durationSec,
                },
                manifest.duration_sec
            )
        );
    });

    return clips;
}

function applyNarrationRippleFromTimelineRows(
    rows: TimelineRow[],
    manifest: ShortVideoRenderManifest,
    previousManifest: ShortVideoRenderManifest
): ShortVideoManifestScene[] {
    const narrationRow = rows.find((row) => row.id === TIMELINE_ROW_NARRATION);
    if (!narrationRow) {
        return manifest.scenes;
    }

    const narrationBySceneId = new Map<string, TimelineAction>();
    narrationRow.actions.forEach((action) => {
        const extended = action as ShortVideoTimelineAction;
        const sceneId = extended.data?.sceneId;
        if (sceneId) {
            narrationBySceneId.set(sceneId, action);
        }
    });

    const sortedIds = sortScenesByTimelineOrder(previousManifest.scenes).map((scene) => scene.id);
    const prevById = new Map(previousManifest.scenes.map((scene) => [scene.id, scene] as const));

    let draggedSceneId = '';
    let maxAbsDelta = 0;
    sortedIds.forEach((sceneId) => {
        const action = narrationBySceneId.get(sceneId);
        const prevScene = prevById.get(sceneId);
        if (!action || !prevScene) {
            return;
        }
        const prevCompStart = narrationCompositionStartSec(previousManifest, prevScene);
        const delta = action.start - prevCompStart;
        if (Math.abs(delta) > maxAbsDelta) {
            maxAbsDelta = Math.abs(delta);
            draggedSceneId = sceneId;
        }
    });

    if (!draggedSceneId || maxAbsDelta < 0.01) {
        return manifest.scenes;
    }

    const draggedAction = narrationBySceneId.get(draggedSceneId);
    const draggedPrev = prevById.get(draggedSceneId);
    if (!draggedAction || !draggedPrev) {
        return manifest.scenes;
    }

    const newManifestStart = compositionSecToManifestSec(
        previousManifest,
        Math.max(0, draggedAction.start)
    );
    const deltaManifestSec = newManifestStart - draggedPrev.start_offset_sec;
    const dragIndex = sortedIds.indexOf(draggedSceneId);

    return manifest.scenes.map((scene) => {
        const prevScene = prevById.get(scene.id);
        if (!prevScene) {
            return scene;
        }
        const sceneIndex = sortedIds.indexOf(scene.id);
        const nextStart = sceneIndex >= dragIndex
            ? Math.max(0, prevScene.start_offset_sec + deltaManifestSec)
            : prevScene.start_offset_sec;
        const durationSec = narrationSceneDurationSec(prevScene);
        return {
            ...scene,
            start_offset_sec: Number(nextStart.toFixed(3)),
            duration_sec: Number(durationSec.toFixed(3)),
            duration_hint_sec: Number(durationSec.toFixed(3)),
        };
    });
}

export function reconcileNarrationDurationPush(
    prevManifest: ShortVideoRenderManifest,
    nextManifest: ShortVideoRenderManifest
): ShortVideoRenderManifest {
    const prevById = new Map(prevManifest.scenes.map((scene) => [scene.id, scene] as const));
    let scenes = [...nextManifest.scenes];

    const ordered = sortScenesByTimelineOrder(scenes);
    for (let i = 0; i < ordered.length; i += 1) {
        const scene = ordered[i];
        const prev = prevById.get(scene.id);
        const current = scenes.find((item) => item.id === scene.id);
        if (!current) {
            continue;
        }

        const oldDuration = prev
            ? narrationSceneDurationSec(prev)
            : narrationSceneDurationSec(current);
        const newDuration = narrationSceneDurationSec(current);
        const pushDelta = Math.max(0, newDuration - oldDuration);
        if (pushDelta < 0.001) {
            continue;
        }

        const laterIds = new Set(
            sortScenesByTimelineOrder(scenes)
                .slice(i + 1)
                .map((item) => item.id)
        );
        scenes = scenes.map((item) => {
            if (!laterIds.has(item.id)) {
                return item;
            }
            return {
                ...item,
                start_offset_sec: Number((item.start_offset_sec + pushDelta).toFixed(3)),
            };
        });
    }

    const nextDurationSec = recalcManifestDurationSec({ ...nextManifest, scenes });
    return {
        ...nextManifest,
        scenes,
        duration_sec: nextDurationSec,
    };
}

export function mergeRefreshedNarrationManifest(
    localManifest: ShortVideoRenderManifest,
    serverManifest: ShortVideoRenderManifest
): ShortVideoRenderManifest {
    const serverById = new Map(serverManifest.scenes.map((scene) => [scene.id, scene] as const));
    const mergedScenes = localManifest.scenes.map((localScene) => {
        const serverScene = serverById.get(localScene.id);
        if (!serverScene) {
            return localScene;
        }
        return {
            ...localScene,
            audio_url: serverScene.audio_url,
            words: serverScene.words,
            duration_sec: serverScene.duration_sec,
            duration_hint_sec: serverScene.duration_hint_sec || serverScene.duration_sec,
            start_offset_sec: localScene.start_offset_sec,
        };
    });

    const merged: ShortVideoRenderManifest = {
        ...localManifest,
        duration_sec: serverManifest.duration_sec || localManifest.duration_sec,
        scene_gap_sec: serverManifest.scene_gap_sec ?? localManifest.scene_gap_sec,
        scenes: mergedScenes,
        visual_clips: serverManifest.visual_clips ?? localManifest.visual_clips,
        warnings: serverManifest.warnings ?? localManifest.warnings,
    };

    return reconcileNarrationDurationPush(localManifest, merged);
}

export function applyTimelineRowsToManifest(
    rows: TimelineRow[],
    manifest: ShortVideoRenderManifest,
    previousManifest?: ShortVideoRenderManifest
): ShortVideoRenderManifest {
    const rippleBase = previousManifest ?? manifest;
    const visualChanged = hasVisualRowDragChanges(rows, rippleBase);
    const nextWithClips = visualChanged
        ? setVisualClipsInManifest(
            manifest,
            timelineRowsToVisualClips(rows, rippleBase)
        )
        : manifest;
    const rippledScenes = applyNarrationRippleFromTimelineRows(rows, nextWithClips, rippleBase);
    const nextDurationSec = recalcManifestDurationSec({
        ...nextWithClips,
        scenes: rippledScenes,
    });

    return {
        ...nextWithClips,
        scenes: rippledScenes,
        duration_sec: nextDurationSec,
    };
}

export function narrationSnapPointsSec(manifest: ShortVideoRenderManifest): number[] {
    const points = new Set<number>();
    manifest.scenes.forEach((scene) => {
        const range = getSceneCompositionRange(manifest, scene.id);
        if (range) {
            points.add(range.startSec);
            points.add(range.endSec);
        }
    });
    points.add(0);
    points.add(getCompositionDurationSec(manifest));
    return Array.from(points).sort((a, b) => a - b);
}

export function findSceneIdAtTimelineSec(
    manifest: ShortVideoRenderManifest,
    compositionSec: number
): string | null {
    for (const scene of manifest.scenes) {
        const range = getSceneCompositionRange(manifest, scene.id);
        if (!range) {
            continue;
        }
        if (compositionSec >= range.startSec - 0.01 && compositionSec < range.endSec + 0.01) {
            return scene.id;
        }
    }
    return manifest.scenes[0]?.id ?? null;
}

export function manifestHasEditableVisualTimeline(manifest: ShortVideoRenderManifest): boolean {
    return Array.isArray(manifest.visual_clips);
}

function buildNewNarrationScene(
    manifest: ShortVideoRenderManifest,
    startOffsetSec: number,
    durationSec: number
): ShortVideoManifestScene {
    const idBase = `scene_${Date.now().toString(36)}`;
    const exists = new Set(manifest.scenes.map((scene) => scene.id));
    let id = idBase;
    let counter = 1;
    while (exists.has(id)) {
        id = `${idBase}_${counter}`;
        counter += 1;
    }
    const roundedDuration = Math.max(MIN_NEW_NARRATION_DURATION_SEC, Number(durationSec.toFixed(3)));
    const roundedStart = Math.max(0, Number(startOffsetSec.toFixed(3)));
    return {
        id,
        voiceover: '',
        on_screen_text: '',
        duration_hint_sec: roundedDuration,
        visual: {
            type: 'none',
            ref: '',
            motion: 'pop',
        },
        audio_url: '',
        duration_sec: roundedDuration,
        start_offset_sec: roundedStart,
        words: [],
        layout: {
            show_headline: true,
            show_karaoke: true,
            show_visual: false,
        },
    };
}

export function addNarrationSceneAtCompositionSec(
    manifest: ShortVideoRenderManifest,
    compositionSec: number
): { manifest: ShortVideoRenderManifest; createdSceneId: string } {
    const insertAtManifestSec = Math.max(0, compositionSecToManifestSec(manifest, compositionSec));
    const maxDuration = Math.max(MIN_NEW_NARRATION_DURATION_SEC, manifest.duration_sec || 0);
    const newDuration = Math.min(DEFAULT_NEW_NARRATION_DURATION_SEC, maxDuration);
    const newScene = buildNewNarrationScene(manifest, insertAtManifestSec, newDuration);
    const insertEndSec = insertAtManifestSec + newDuration;

    const nextScenes: ShortVideoManifestScene[] = [];
    manifest.scenes.forEach((scene) => {
        const sceneStart = Math.max(0, scene.start_offset_sec);
        const sceneEnd = sceneStart + Math.max(MIN_ACTION_DURATION_SEC, scene.duration_sec);
        if (sceneEnd <= insertAtManifestSec) {
            nextScenes.push(scene);
            return;
        }
        if (sceneStart >= insertAtManifestSec) {
            nextScenes.push({
                ...scene,
                start_offset_sec: sceneStart + newDuration,
            });
            return;
        }
        // Scene bị cắt bởi vùng insert -> giữ phần trước, timeline còn lại được dời về sau.
        const leadingDuration = Math.max(MIN_ACTION_DURATION_SEC, insertAtManifestSec - sceneStart);
        const trailingDuration = Math.max(0, sceneEnd - insertAtManifestSec);
        nextScenes.push({
            ...scene,
            duration_sec: leadingDuration,
            duration_hint_sec: leadingDuration,
        });
        if (trailingDuration > MIN_ACTION_DURATION_SEC) {
            const trailingScene: ShortVideoManifestScene = {
                ...scene,
                id: `${scene.id}_part2_${Date.now().toString(36)}`,
                start_offset_sec: insertEndSec,
                duration_sec: trailingDuration,
                duration_hint_sec: trailingDuration,
                audio_url: '',
                words: [],
            };
            nextScenes.push(trailingScene);
        }
    });

    nextScenes.push(newScene);
    nextScenes.sort((a, b) => a.start_offset_sec - b.start_offset_sec);

    const normalizedScenes = nextScenes.map((scene) => ({
        ...scene,
        start_offset_sec: Number(scene.start_offset_sec.toFixed(3)),
        duration_sec: Number(Math.max(MIN_ACTION_DURATION_SEC, scene.duration_sec).toFixed(3)),
        duration_hint_sec: Number(
            Math.max(MIN_ACTION_DURATION_SEC, scene.duration_hint_sec || scene.duration_sec).toFixed(3)
        ),
    }));

    const nextDurationSec = Math.max(
        manifest.duration_sec,
        ...normalizedScenes.map((scene) => scene.start_offset_sec + scene.duration_sec)
    );

    return {
        manifest: {
            ...manifest,
            duration_sec: Number(nextDurationSec.toFixed(3)),
            scenes: normalizedScenes,
        },
        createdSceneId: newScene.id,
    };
}

export function sceneHasResolvableVisualForClip(scene: ShortVideoRenderManifest['scenes'][number]): boolean {
    return resolveSceneShowVisual(scene) && !!resolveSceneVisualRef(scene);
}

export function defaultVisualClipFromSceneAtSec(
    manifest: ShortVideoRenderManifest,
    compositionSec: number
): Partial<ShortVideoVisualClip> | undefined {
    const sceneId = findSceneIdAtTimelineSec(manifest, compositionSec);
    const scene = manifest.scenes.find((item) => item.id === sceneId);
    if (!scene || !sceneHasResolvableVisualForClip(scene)) {
        return undefined;
    }
    return {
        type: resolveSceneVisualType(scene),
        ref: resolveSceneVisualRef(scene),
        motion: scene.layout?.visual_motion || scene.visual?.motion || 'pop',
        label: sceneNarrationLabel(scene),
    };
}
