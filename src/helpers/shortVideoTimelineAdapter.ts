import type { TimelineAction, TimelineEffect, TimelineRow } from '@xzdarcy/timeline-engine';
import type {
    ShortVideoManifestScene,
    ShortVideoRenderManifest,
    ShortVideoVisualClip,
} from './shortVideoRenderManifestTypes';
import { resolveSceneHeadlineText } from './shortVideoRenderManifest';
import { clampClipTiming, setVisualClipsInManifest } from './shortVideoVisualClips';
import {
    ensureManifestTimelineTracks,
    getTrackRowHeight,
    resolveClipTrackId,
    resolveSceneTrackId,
    resolveTimelineTracks,
    TIMELINE_DEFAULT_TRACK_NARRATION_ID,
    TIMELINE_DEFAULT_TRACK_VISUAL_ID,
    TIMELINE_NARRATION_TRACK_ROW_HEIGHT,
    TIMELINE_TRACK_ROW_HEIGHT,
} from './shortVideoTimelineTracks';

export {
    addTimelineTrack,
    DEFAULT_TIMELINE_TRACKS,
    ensureManifestTimelineTracks,
    getTrackRowHeight,
    resolveTimelineTracks,
    resolveTrackRowIdFromPointer,
    TIMELINE_DEFAULT_TRACK_NARRATION_ID,
    TIMELINE_DEFAULT_TRACK_VISUAL_ID,
    TIMELINE_NARRATION_TRACK_ROW_HEIGHT,
    TIMELINE_TRACK_ROW_HEIGHT,
    updateTimelineTrackNameInManifest,
} from './shortVideoTimelineTracks';
export type { ShortVideoTimelineTrack } from './shortVideoRenderManifestTypes';

export { timelineLayoutFingerprint } from './shortVideoTimelineLayout';

export type { TimelineAction, TimelineEffect, TimelineRow };

export {
    calcCompositionDurationInFrames,
    compositionSecToManifestSec,
    getCompositionDurationSec,
    getSceneCompositionRange,
    manifestSecToCompositionSec,
} from '@spacedev/remotion-short-video/compositionTimeline';

export const TIMELINE_ROW_NARRATION = TIMELINE_DEFAULT_TRACK_NARRATION_ID;
export const TIMELINE_ROW_VISUAL = TIMELINE_DEFAULT_TRACK_VISUAL_ID;

/** @deprecated Dùng track động từ manifest.timeline_tracks */
export const TIMELINE_SPARE_ROW_IDS = [] as const;
export const TIMELINE_SPARE_ROW_COUNT = 0;
export const TIMELINE_SPARE_ROW_HEIGHT = TIMELINE_TRACK_ROW_HEIGHT;
export const TIMELINE_NARRATION_ROW_HEIGHT = TIMELINE_NARRATION_TRACK_ROW_HEIGHT;
export const TIMELINE_VISUAL_ROW_HEIGHT = TIMELINE_TRACK_ROW_HEIGHT;
export const TIMELINE_RULER_HEIGHT = 32;
/** Khoảng cách mặc định giữa ruler và vùng track (khớp `.timeline-editor-edit-area { margin-top }`). */
export const TIMELINE_EDIT_AREA_TOP_GAP = 10;

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
    audioPeaks?: number[];
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
    const explicitDuration = scene.duration_sec;
    if (explicitDuration > MIN_ACTION_DURATION_SEC + 0.001) {
        return explicitDuration;
    }
    if (isSceneReadyForTimeline(scene)) {
        return Math.max(MIN_ACTION_DURATION_SEC, explicitDuration);
    }
    return DEFAULT_NEW_NARRATION_DURATION_SEC;
}

function maxItemEndSecFromManifest(manifest: ShortVideoRenderManifest): number {
    const sceneEnds = manifest.scenes.map(
        (scene) => scene.start_offset_sec + narrationSceneDurationSec(scene)
    );
    const clipEnds = (manifest.visual_clips ?? []).map(
        (clip) => clip.start_sec + clip.duration_sec
    );
    const allEnds = [...sceneEnds, ...clipEnds];
    if (allEnds.length === 0) {
        return MIN_ACTION_DURATION_SEC;
    }
    return Math.max(MIN_ACTION_DURATION_SEC, ...allEnds);
}

function recalcManifestDurationSec(manifest: ShortVideoRenderManifest): number {
    return Number(maxItemEndSecFromManifest(manifest).toFixed(3));
}

/** Thời lượng ruler timeline editor — max(end) mọi item. */
export function getProjectTimelineDurationSec(manifest: ShortVideoRenderManifest): number {
    return recalcManifestDurationSec(manifest);
}

/** Giới hạn kéo-thả trên timeline — rộng hơn nội dung để chỉnh từng track độc lập. */
export function timelineEditorWorkspaceEndSec(contentDurationSec: number): number {
    const content = Math.max(MIN_ACTION_DURATION_SEC, contentDurationSec);
    return Math.max(content + 120, 180);
}

function maxActionEndSecFromRows(rows: TimelineRow[]): number {
    let maxEnd = MIN_ACTION_DURATION_SEC;
    rows.forEach((row) => {
        row.actions.forEach((action) => {
            maxEnd = Math.max(maxEnd, action.end);
        });
    });
    return maxEnd;
}

function timelineEditorMaxEndSec(
    manifest: ShortVideoRenderManifest,
    rows?: TimelineRow[]
): number {
    const fromManifest = maxItemEndSecFromManifest(manifest);
    const fromRows = rows ? maxActionEndSecFromRows(rows) : MIN_ACTION_DURATION_SEC;
    return timelineEditorWorkspaceEndSec(Math.max(fromManifest, fromRows));
}

/** @deprecated Dùng getProjectTimelineDurationSec */
export function getManifestTimelineDurationSec(manifest: ShortVideoRenderManifest): number {
    return getProjectTimelineDurationSec(manifest);
}

export function isProjectTimeInRange(
    startSec: number,
    durationSec: number,
    timeSec: number
): boolean {
    const start = Math.max(0, startSec);
    const end = start + Math.max(MIN_ACTION_DURATION_SEC, durationSec);
    return timeSec >= start - 0.01 && timeSec < end + 0.01;
}

function narrationManifestStartSec(scene: ShortVideoManifestScene): number {
    return Math.max(0, scene.start_offset_sec);
}

function narrationManifestEndSec(scene: ShortVideoManifestScene): number {
    return narrationManifestStartSec(scene) + narrationSceneDurationSec(scene);
}

function sceneNarrationLabel(scene: ShortVideoRenderManifest['scenes'][number]): string {
    const headline = resolveSceneHeadlineText(scene).trim();
    if (headline) {
        return headline.length > 28 ? `${headline.slice(0, 28)}…` : headline;
    }
    return scene.id;
}

/** Khóa chỉnh nhãn timeline: `{rowId}:{itemId}` — dùng chung mọi loại track. */
export function timelineActionEditKey(rowId: string, action: ShortVideoTimelineAction): string {
    const itemId = action.data?.clipId || action.data?.sceneId || action.id;
    return `${rowId}:${itemId}`;
}

export function resolveSceneTimelineLabel(scene: ShortVideoManifestScene): string {
    const custom = scene.timeline_label?.trim();
    if (custom) {
        return custom.length > 28 ? `${custom.slice(0, 28)}…` : custom;
    }
    return sceneNarrationLabel(scene);
}

export function updateSceneTimelineLabelInManifest(
    manifest: ShortVideoRenderManifest,
    sceneId: string,
    label: string | undefined
): ShortVideoRenderManifest {
    const trimmed = label?.trim() || '';
    return {
        ...manifest,
        scenes: manifest.scenes.map((scene) => {
            if (scene.id !== sceneId) {
                return scene;
            }
            if (!trimmed) {
                const nextScene = { ...scene };
                delete nextScene.timeline_label;
                return nextScene;
            }
            return { ...scene, timeline_label: trimmed };
        }),
    };
}

function clipThumbnailUrl(clip: ShortVideoVisualClip): string | undefined {
    if (clip.type === 'image' && /^https:\/\//i.test(clip.ref.trim())) {
        return clip.ref.trim();
    }
    return undefined;
}

function hasTimelineRowsDragChanges(
    rows: TimelineRow[],
    manifest: ShortVideoRenderManifest
): boolean {
    const expected = manifestToTimelineRows(manifest);
    const expectedByKey = new Map<string, { start: number; end: number; rowId: string }>();
    expected.forEach((row) => {
        row.actions.forEach((action) => {
            const extended = action as ShortVideoTimelineAction;
            const key = `${extended.data?.kind || 'unknown'}:${extended.data?.clipId || extended.data?.sceneId || action.id}`;
            expectedByKey.set(key, { start: action.start, end: action.end, rowId: row.id });
        });
    });

    return rows.some((row) => row.actions.some((action) => {
        const extended = action as ShortVideoTimelineAction;
        const key = `${extended.data?.kind || 'unknown'}:${extended.data?.clipId || extended.data?.sceneId || action.id}`;
        const expectedAction = expectedByKey.get(key);
        if (!expectedAction) {
            return false;
        }
        return expectedAction.rowId !== row.id
            || Math.abs(action.start - expectedAction.start) > 0.02
            || Math.abs(action.end - expectedAction.end) > 0.02;
    }));
}

export function moveActionBetweenRows(
    rows: TimelineRow[],
    actionId: string,
    fromRowId: string,
    toRowId: string
): TimelineRow[] {
    if (fromRowId === toRowId) {
        return rows;
    }
    const sourceRow = rows.find((row) => row.id === fromRowId);
    const movingAction = sourceRow?.actions.find((action) => action.id === actionId);
    if (!movingAction) {
        return rows;
    }
    return rows.map((row) => {
        if (row.id === fromRowId) {
            return {
                ...row,
                actions: row.actions.filter((action) => action.id !== actionId),
            };
        }
        if (row.id === toRowId) {
            return {
                ...row,
                actions: [...row.actions, movingAction],
            };
        }
        return row;
    });
}

export function manifestToTimelineRows(
    manifest: ShortVideoRenderManifest,
    selectedClipId?: string,
    runningSceneIds: string[] = [],
    selectedNarrationSceneId = '',
    dragRows?: TimelineRow[]
): TimelineRow[] {
    const normalizedManifest = ensureManifestTimelineTracks(manifest);
    const tracks = resolveTimelineTracks(normalizedManifest);
    const editorMaxEndSec = timelineEditorMaxEndSec(normalizedManifest, dragRows);
    const runningSceneSet = new Set(runningSceneIds);
    const actionsByTrack = new Map<string, ShortVideoTimelineAction[]>();
    tracks.forEach((track) => actionsByTrack.set(track.id, []));

    normalizedManifest.scenes.forEach((scene) => {
        const trackId = resolveSceneTrackId(scene, tracks);
        const start = narrationManifestStartSec(scene);
        const end = narrationManifestEndSec(scene);
        const action: ShortVideoTimelineAction = {
            id: `narr_${scene.id}`,
            start: Math.max(0, start),
            end: Math.max(start + MIN_ACTION_DURATION_SEC, end),
            effectId: 'narration',
            movable: true,
            flexible: true,
            minStart: 0,
            maxEnd: editorMaxEndSec,
            selected: selectedNarrationSceneId === scene.id,
            data: {
                kind: 'narration',
                sceneId: scene.id,
                label: resolveSceneTimelineLabel(scene),
                status: runningSceneSet.has(scene.id)
                    ? 'running'
                    : (isSceneReadyForTimeline(scene) ? 'ready' : 'pending'),
                audioPeaks: scene.audio_peaks?.length ? scene.audio_peaks : undefined,
            },
        };
        actionsByTrack.get(trackId)?.push(action);
    });

    (normalizedManifest.visual_clips ?? []).forEach((clip) => {
        const trackId = resolveClipTrackId(clip, tracks);
        const start = Math.max(0, clip.start_sec);
        const end = Math.max(start + MIN_ACTION_DURATION_SEC, start + clip.duration_sec);
        const action: ShortVideoTimelineAction = {
            id: clip.id,
            start,
            end,
            effectId: 'visual',
            movable: true,
            flexible: true,
            minStart: 0,
            maxEnd: editorMaxEndSec,
            selected: selectedClipId === clip.id,
            data: {
                kind: 'visual',
                clipId: clip.id,
                label: clip.label?.trim() || clip.id,
                thumbnailUrl: clipThumbnailUrl(clip),
                visualType: clip.type,
            },
        };
        actionsByTrack.get(trackId)?.push(action);
    });

    return tracks.map((track) => ({
        id: track.id,
        actions: actionsByTrack.get(track.id) ?? [],
        rowHeight: getTrackRowHeight(track.id),
    }));
}

export function timelineRowsToVisualClips(
    rows: TimelineRow[],
    manifest: ShortVideoRenderManifest
): ShortVideoVisualClip[] {
    const tracks = resolveTimelineTracks(manifest);
    const existingById = new Map(
        (manifest.visual_clips ?? []).map((clip) => [clip.id, clip] as const)
    );

    const clips: ShortVideoVisualClip[] = [];
    rows.forEach((row) => {
        if (!tracks.some((track) => track.id === row.id)) {
            return;
        }
        row.actions.forEach((action: TimelineAction) => {
            const extended = action as ShortVideoTimelineAction;
            if (extended.data?.kind !== 'visual') {
                return;
            }
            const clipId = extended.data?.clipId || action.id;
            const existing = existingById.get(clipId);
            if (!existing) {
                return;
            }
            const manifestStartSec = Math.max(0, action.start);
            const manifestEndSec = Math.max(
                manifestStartSec + MIN_ACTION_DURATION_SEC,
                action.end
            );
            const durationSec = Math.max(MIN_ACTION_DURATION_SEC, manifestEndSec - manifestStartSec);
            clips.push(
                clampClipTiming({
                    ...existing,
                    start_sec: manifestStartSec,
                    duration_sec: durationSec,
                    timeline_track_id: row.id,
                })
            );
        });
    });

    return clips;
}

function timelineRowsToNarrationScenes(
    rows: TimelineRow[],
    manifest: ShortVideoRenderManifest
): ShortVideoManifestScene[] {
    const tracks = resolveTimelineTracks(manifest);
    const actionBySceneId = new Map<string, { action: TimelineAction; trackId: string }>();

    rows.forEach((row) => {
        if (!tracks.some((track) => track.id === row.id)) {
            return;
        }
        row.actions.forEach((action) => {
            const extended = action as ShortVideoTimelineAction;
            if (extended.data?.kind !== 'narration') {
                return;
            }
            const sceneId = extended.data?.sceneId || action.id.replace(/^narr_/, '');
            if (sceneId) {
                actionBySceneId.set(sceneId, { action, trackId: row.id });
            }
        });
    });

    return manifest.scenes.map((scene) => {
        const mapped = actionBySceneId.get(scene.id);
        if (!mapped) {
            return scene;
        }
        const { action, trackId } = mapped;
        const startSec = Math.max(0, action.start);
        const endSec = Math.max(startSec + MIN_ACTION_DURATION_SEC, action.end);
        const durationSec = Math.max(MIN_ACTION_DURATION_SEC, endSec - startSec);
        return {
            ...scene,
            start_offset_sec: Number(startSec.toFixed(3)),
            duration_sec: Number(durationSec.toFixed(3)),
            duration_hint_sec: Number(durationSec.toFixed(3)),
            timeline_track_id: trackId,
        };
    });
}

export function applyTimelineRowsToManifest(
    rows: TimelineRow[],
    manifest: ShortVideoRenderManifest,
    previousManifest?: ShortVideoRenderManifest
): ShortVideoRenderManifest {
    const dragBase = ensureManifestTimelineTracks(previousManifest ?? manifest);
    const hasChanges = hasTimelineRowsDragChanges(rows, dragBase);

    let next: ShortVideoRenderManifest = ensureManifestTimelineTracks(manifest);
    if (hasChanges) {
        next = setVisualClipsInManifest(
            next,
            timelineRowsToVisualClips(rows, dragBase)
        );
        const scenes = sortScenesByTimelineOrder(
            timelineRowsToNarrationScenes(rows, next)
        );
        next = { ...next, scenes };
    }

    const nextDurationSec = recalcManifestDurationSec(next);
    return {
        ...next,
        duration_sec: nextDurationSec,
        timeline_tracks: resolveTimelineTracks(next),
    };
}

/** Các khoảng cách khi sắp xếp nối tiếp track timeline. */
export const TIMELINE_PACK_GAP_OPTIONS_SEC = [0, 0.5, 1, 1.5, 2, 3] as const;

export type TimelinePackGapSec = (typeof TIMELINE_PACK_GAP_OPTIONS_SEC)[number];

/** Sắp xếp mọi item trên một track nối tiếp từ 0. */
export function packTimelineTrackSequential(
    manifest: ShortVideoRenderManifest,
    trackId: string,
    gapSec = 0
): ShortVideoRenderManifest {
    const gap = Math.max(0, gapSec);
    const tracks = resolveTimelineTracks(manifest);
    if (!tracks.some((track) => track.id === trackId)) {
        return manifest;
    }

    type PackItem =
        | { kind: 'narration'; sceneId: string; startSec: number; durationSec: number }
        | { kind: 'visual'; clipId: string; startSec: number; durationSec: number };

    const items: PackItem[] = [];
    manifest.scenes.forEach((scene) => {
        if (resolveSceneTrackId(scene, tracks) !== trackId) {
            return;
        }
        items.push({
            kind: 'narration',
            sceneId: scene.id,
            startSec: scene.start_offset_sec,
            durationSec: narrationSceneDurationSec(scene),
        });
    });
    (manifest.visual_clips ?? []).forEach((clip) => {
        if (resolveClipTrackId(clip, tracks) !== trackId) {
            return;
        }
        items.push({
            kind: 'visual',
            clipId: clip.id,
            startSec: clip.start_sec,
            durationSec: Math.max(MIN_ACTION_DURATION_SEC, clip.duration_sec),
        });
    });

    items.sort((a, b) => {
        const startDiff = a.startSec - b.startSec;
        if (Math.abs(startDiff) > 0.0001) {
            return startDiff;
        }
        const aId = a.kind === 'narration' ? a.sceneId : a.clipId;
        const bId = b.kind === 'narration' ? b.sceneId : b.clipId;
        return aId.localeCompare(bId);
    });

    let cursorSec = 0;
    const packedStarts = new Map<string, number>();
    items.forEach((item, index) => {
        const gapBefore = index === 0 ? 0 : gap;
        const startSec = Number((cursorSec + gapBefore).toFixed(3));
        const key = item.kind === 'narration' ? `narration:${item.sceneId}` : `visual:${item.clipId}`;
        packedStarts.set(key, startSec);
        cursorSec = startSec + item.durationSec;
    });

    let next: ShortVideoRenderManifest = {
        ...manifest,
        scenes: manifest.scenes.map((scene) => {
            const packedStart = packedStarts.get(`narration:${scene.id}`);
            if (packedStart === undefined) {
                return scene;
            }
            const durationSec = narrationSceneDurationSec(scene);
            return {
                ...scene,
                start_offset_sec: packedStart,
                duration_sec: Number(durationSec.toFixed(3)),
                duration_hint_sec: Number(durationSec.toFixed(3)),
            };
        }),
    };

    const packedClips = (manifest.visual_clips ?? []).map((clip) => {
        const packedStart = packedStarts.get(`visual:${clip.id}`);
        if (packedStart === undefined) {
            return clip;
        }
        const durationSec = Math.max(MIN_ACTION_DURATION_SEC, clip.duration_sec);
        return {
            ...clip,
            start_sec: packedStart,
            duration_sec: Number(durationSec.toFixed(3)),
        };
    });
    next = setVisualClipsInManifest(next, packedClips);

    return {
        ...next,
        duration_sec: recalcManifestDurationSec(next),
        timeline_tracks: tracks,
    };
}

/** @deprecated Dùng packTimelineTrackSequential */
export function packNarrationScenesSequential(
    manifest: ShortVideoRenderManifest,
    gapSec = 0
): ShortVideoRenderManifest {
    return packTimelineTrackSequential(manifest, TIMELINE_DEFAULT_TRACK_NARRATION_ID, gapSec);
}

/** @deprecated Dùng packTimelineTrackSequential */
export function packVisualClipsSequential(
    manifest: ShortVideoRenderManifest,
    gapSec = 0
): ShortVideoRenderManifest {
    return packTimelineTrackSequential(manifest, TIMELINE_DEFAULT_TRACK_VISUAL_ID, gapSec);
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
    const localSceneIds = new Set(localManifest.scenes.map((scene) => scene.id));

    const mergedScenes: ShortVideoRenderManifest['scenes'] = localManifest.scenes.map((localScene) => {
        const serverScene = serverById.get(localScene.id);
        if (!serverScene) {
            return localScene;
        }
        return {
            ...localScene,
            audio_url: serverScene.audio_url,
            words: serverScene.words,
            audio_peaks: serverScene.audio_peaks,
            duration_sec: serverScene.duration_sec,
            duration_hint_sec: serverScene.duration_hint_sec || serverScene.duration_sec,
        };
    });

    serverManifest.scenes.forEach((serverScene) => {
        if (!localSceneIds.has(serverScene.id)) {
            mergedScenes.push(serverScene);
        }
    });

    const localClips = localManifest.visual_clips ?? [];
    const serverClips = serverManifest.visual_clips ?? [];
    const visualClips = manifestHasEditableVisualTimeline(localManifest) && localClips.length > 0
        ? localClips
        : (serverClips.length > 0 ? serverClips : localClips);

    const merged: ShortVideoRenderManifest = {
        ...localManifest,
        scene_gap_sec: serverManifest.scene_gap_sec ?? localManifest.scene_gap_sec,
        scenes: mergedScenes,
        visual_clips: visualClips.length > 0 ? visualClips : undefined,
        timeline_tracks: localManifest.timeline_tracks ?? serverManifest.timeline_tracks,
        warnings: serverManifest.warnings ?? localManifest.warnings,
    };

    const withDuration: ShortVideoRenderManifest = {
        ...merged,
        duration_sec: getProjectTimelineDurationSec(merged),
    };

    return reconcileNarrationDurationPush(localManifest, withDuration);
}

export function narrationSnapPointsSec(manifest: ShortVideoRenderManifest): number[] {
    const points = new Set<number>();
    manifest.scenes.forEach((scene) => {
        points.add(narrationManifestStartSec(scene));
        points.add(narrationManifestEndSec(scene));
    });
    points.add(0);
    points.add(getProjectTimelineDurationSec(manifest));
    return Array.from(points).sort((a, b) => a - b);
}

export function findSceneIdAtTimelineSec(
    manifest: ShortVideoRenderManifest,
    manifestTimelineSec: number
): string | null {
    for (const scene of manifest.scenes) {
        const start = narrationManifestStartSec(scene);
        const end = narrationManifestEndSec(scene);
        if (manifestTimelineSec >= start - 0.01 && manifestTimelineSec < end + 0.01) {
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
    manifestTimelineSec: number,
    trackId = TIMELINE_DEFAULT_TRACK_NARRATION_ID
): { manifest: ShortVideoRenderManifest; createdSceneId: string } {
    const insertAtManifestSec = Math.max(0, manifestTimelineSec);
    const maxDuration = Math.max(MIN_NEW_NARRATION_DURATION_SEC, manifest.duration_sec || 0);
    const newDuration = Math.min(DEFAULT_NEW_NARRATION_DURATION_SEC, maxDuration);
    const newScene = {
        ...buildNewNarrationScene(manifest, insertAtManifestSec, newDuration),
        timeline_track_id: trackId,
    };
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
            timeline_tracks: resolveTimelineTracks(manifest),
        },
        createdSceneId: newScene.id,
    };
}
