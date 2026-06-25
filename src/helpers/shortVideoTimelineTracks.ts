import type {
    ShortVideoHtmlClip,
    ShortVideoManifestScene,
    ShortVideoRenderManifest,
    ShortVideoTextClip,
    ShortVideoTimelineTrack,
    ShortVideoVisualClip,
} from './shortVideoRenderManifestTypes';

export const TIMELINE_DEFAULT_TRACK_NARRATION_ID = 'narration';
export const TIMELINE_DEFAULT_TRACK_VISUAL_ID = 'visual';
export const TIMELINE_DEFAULT_TRACK_HTML_ID = 'html';
export const TIMELINE_DEFAULT_TRACK_TEXT_ID = 'text';
export const TIMELINE_TRACK_ROW_HEIGHT = 40;
/** @deprecated Mọi track dùng TIMELINE_TRACK_ROW_HEIGHT — animation bar nằm trong clip. */
export const TIMELINE_TEXT_ROW_HEIGHT_WITH_ANIMATION = TIMELINE_TRACK_ROW_HEIGHT;
/** @deprecated Dùng TIMELINE_TRACK_ROW_HEIGHT — mọi track cùng chiều cao. */
export const TIMELINE_NARRATION_TRACK_ROW_HEIGHT = TIMELINE_TRACK_ROW_HEIGHT;

export const DEFAULT_TIMELINE_TRACKS: ShortVideoTimelineTrack[] = [
    { id: TIMELINE_DEFAULT_TRACK_NARRATION_ID, name: 'Lời thoại', order: 0 },
    { id: TIMELINE_DEFAULT_TRACK_VISUAL_ID, name: 'Visual', order: 1 },
    { id: TIMELINE_DEFAULT_TRACK_HTML_ID, name: 'HTML', order: 2 },
];

export function resolveTimelineTracks(manifest: ShortVideoRenderManifest): ShortVideoTimelineTrack[] {
    const raw = manifest.timeline_tracks;
    if (!Array.isArray(raw) || raw.length === 0) {
        return [...DEFAULT_TIMELINE_TRACKS];
    }
    const normalized = raw
        .map((track, index) => {
            const id = String(track?.id ?? '').trim();
            if (!id) {
                return null;
            }
            const name = String(track?.name ?? '').trim() || id;
            const order = Number.isFinite(track?.order) ? Number(track.order) : index;
            const entry: ShortVideoTimelineTrack = { id, name, order };
            if (track?.timeline_hidden === true) {
                entry.timeline_hidden = true;
            }
            return entry;
        })
        .filter(Boolean) as ShortVideoTimelineTrack[];

    const byId = new Map<string, ShortVideoTimelineTrack>();
    normalized.forEach((track) => {
        byId.set(track.id, track);
    });

    DEFAULT_TIMELINE_TRACKS.forEach((defaultTrack) => {
        if (!byId.has(defaultTrack.id)) {
            byId.set(defaultTrack.id, { ...defaultTrack });
        }
    });

    return Array.from(byId.values()).sort((a, b) => {
        if (a.order !== b.order) {
            return a.order - b.order;
        }
        return a.id.localeCompare(b.id);
    });
}

/** Track đầu mảng = layer trên cùng khi render (khớp Remotion). */
export function resolveTimelineTracksForRender(
    manifest: ShortVideoRenderManifest
): ShortVideoTimelineTrack[] {
    return [...resolveTimelineTracks(manifest)].reverse();
}

export function resolveSceneTrackId(
    scene: ShortVideoManifestScene,
    tracks: ShortVideoTimelineTrack[] = []
): string {
    const trackId = scene.timeline_track_id?.trim();
    if (trackId && tracks.some((track) => track.id === trackId)) {
        return trackId;
    }
    return TIMELINE_DEFAULT_TRACK_NARRATION_ID;
}

export function resolveClipTrackId(
    clip: ShortVideoVisualClip,
    tracks: ShortVideoTimelineTrack[] = []
): string {
    const trackId = clip.timeline_track_id?.trim();
    if (trackId && tracks.some((track) => track.id === trackId)) {
        return trackId;
    }
    return TIMELINE_DEFAULT_TRACK_VISUAL_ID;
}

export function resolveHtmlClipTrackId(
    clip: Pick<ShortVideoHtmlClip, 'timeline_track_id'>,
    tracks: ShortVideoTimelineTrack[] = []
): string {
    const trackId = clip.timeline_track_id?.trim();
    if (trackId && tracks.some((track) => track.id === trackId)) {
        return trackId;
    }
    return TIMELINE_DEFAULT_TRACK_HTML_ID;
}

export function resolveTextClipTrackId(
    clip: Pick<ShortVideoTextClip, 'timeline_track_id'>,
    tracks: ShortVideoTimelineTrack[] = []
): string {
    const trackId = clip.timeline_track_id?.trim();
    if (trackId && tracks.some((track) => track.id === trackId)) {
        return trackId;
    }
    if (tracks.some((track) => track.id === TIMELINE_DEFAULT_TRACK_TEXT_ID)) {
        return TIMELINE_DEFAULT_TRACK_TEXT_ID;
    }
    return TIMELINE_DEFAULT_TRACK_VISUAL_ID;
}

export function ensureManifestTimelineTracks(
    manifest: ShortVideoRenderManifest
): ShortVideoRenderManifest {
    const tracks = resolveTimelineTracks(manifest);

    const scenes = manifest.scenes.map((scene) => {
        const trackId = resolveSceneTrackId(scene, tracks);
        if (scene.timeline_track_id === trackId) {
            return scene;
        }
        return { ...scene, timeline_track_id: trackId };
    });

    const visualClips = (manifest.visual_clips ?? []).map((clip) => {
        const trackId = resolveClipTrackId(clip, tracks);
        if (clip.timeline_track_id === trackId) {
            return clip;
        }
        return { ...clip, timeline_track_id: trackId };
    });

    const textClips = (manifest.text_clips ?? []).map((clip) => {
        const trackId = resolveTextClipTrackId(clip, tracks);
        if (clip.timeline_track_id === trackId) {
            return clip;
        }
        return { ...clip, timeline_track_id: trackId };
    });

    const htmlClips = (manifest.html_clips ?? []).map((clip) => {
        const trackId = resolveHtmlClipTrackId(clip, tracks);
        if (clip.timeline_track_id === trackId) {
            return clip;
        }
        return { ...clip, timeline_track_id: trackId };
    });

    return {
        ...manifest,
        timeline_tracks: tracks,
        scenes,
        visual_clips: visualClips.length > 0 ? visualClips : manifest.visual_clips,
        text_clips: textClips.length > 0 ? textClips : manifest.text_clips,
        html_clips: htmlClips.length > 0 ? htmlClips : manifest.html_clips,
    };
}

export function addTimelineTrack(
    manifest: ShortVideoRenderManifest,
    name?: string
): ShortVideoRenderManifest {
    const tracks = resolveTimelineTracks(manifest);
    const customCount = tracks.filter((track) => !DEFAULT_TIMELINE_TRACKS.some((d) => d.id === track.id)).length;
    const id = `track_${Date.now().toString(36)}`;
    const nextTrack: ShortVideoTimelineTrack = {
        id,
        name: name?.trim() || `Track ${customCount + 1}`,
        order: tracks.length,
    };
    return {
        ...manifest,
        timeline_tracks: [...tracks, nextTrack],
    };
}

export function updateTimelineTrackNameInManifest(
    manifest: ShortVideoRenderManifest,
    trackId: string,
    name: string
): ShortVideoRenderManifest {
    const trimmed = name.trim();
    const tracks = resolveTimelineTracks(manifest).map((track) => (
        track.id === trackId
            ? { ...track, name: trimmed || track.name }
            : track
    ));
    return {
        ...manifest,
        timeline_tracks: tracks,
    };
}

export function reorderTimelineTracksInManifest(
    manifest: ShortVideoRenderManifest,
    activeTrackId: string,
    targetIndex: number
): ShortVideoRenderManifest {
    const tracks = resolveTimelineTracks(manifest);
    const fromIndex = tracks.findIndex((track) => track.id === activeTrackId);
    if (fromIndex < 0 || targetIndex < 0 || targetIndex >= tracks.length || fromIndex === targetIndex) {
        return manifest;
    }

    const reordered = [...tracks];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    return {
        ...manifest,
        timeline_tracks: reordered.map((track, index) => ({ ...track, order: index })),
    };
}

export function isDefaultTimelineTrack(trackId: string): boolean {
    return trackId === TIMELINE_DEFAULT_TRACK_NARRATION_ID
        || trackId === TIMELINE_DEFAULT_TRACK_VISUAL_ID
        || trackId === TIMELINE_DEFAULT_TRACK_HTML_ID;
}

export type TimelineTrackItemCount = {
    sceneCount: number;
    clipCount: number;
    textClipCount: number;
    htmlClipCount: number;
    total: number;
};

export function countTrackItems(
    manifest: ShortVideoRenderManifest,
    trackId: string
): TimelineTrackItemCount {
    const tracks = resolveTimelineTracks(manifest);
    const sceneCount = manifest.scenes.filter(
        (scene) => resolveSceneTrackId(scene, tracks) === trackId
    ).length;
    const clipCount = (manifest.visual_clips ?? []).filter(
        (clip) => resolveClipTrackId(clip, tracks) === trackId
    ).length;
    const textClipCount = (manifest.text_clips ?? []).filter(
        (clip) => resolveTextClipTrackId(clip, tracks) === trackId
    ).length;
    const htmlClipCount = (manifest.html_clips ?? []).filter(
        (clip) => resolveHtmlClipTrackId(clip, tracks) === trackId
    ).length;

    return {
        sceneCount,
        clipCount,
        textClipCount,
        htmlClipCount,
        total: sceneCount + clipCount + textClipCount + htmlClipCount,
    };
}

export function removeTimelineTrackFromManifest(
    manifest: ShortVideoRenderManifest,
    trackId: string
): ShortVideoRenderManifest {
    if (isDefaultTimelineTrack(trackId)) {
        return manifest;
    }

    const tracksBeforeDelete = resolveTimelineTracks(manifest);
    if (!tracksBeforeDelete.some((track) => track.id === trackId)) {
        return manifest;
    }

    const remainingTracks = tracksBeforeDelete
        .filter((track) => track.id !== trackId)
        .map((track, index) => ({ ...track, order: index }));

    const scenes = manifest.scenes.filter(
        (scene) => resolveSceneTrackId(scene, tracksBeforeDelete) !== trackId
    );

    const visualClips = (manifest.visual_clips ?? []).filter(
        (clip) => resolveClipTrackId(clip, tracksBeforeDelete) !== trackId
    );

    const textClips = (manifest.text_clips ?? []).filter(
        (clip) => resolveTextClipTrackId(clip, tracksBeforeDelete) !== trackId
    );

    const htmlClips = (manifest.html_clips ?? []).filter(
        (clip) => resolveHtmlClipTrackId(clip, tracksBeforeDelete) !== trackId
    );

    return {
        ...manifest,
        timeline_tracks: remainingTracks,
        scenes,
        visual_clips: visualClips.length > 0 ? visualClips : undefined,
        text_clips: textClips.length > 0 ? textClips : undefined,
        html_clips: htmlClips.length > 0 ? htmlClips : undefined,
    };
}

export function getTrackRowHeight(
    _trackId?: string,
    _manifest?: ShortVideoRenderManifest
): number {
    return TIMELINE_TRACK_ROW_HEIGHT;
}

export function resolveTrackRowIdFromPointer(
    manifest: ShortVideoRenderManifest,
    clientY: number,
    editGrid: HTMLElement,
    topGapPx = 10
): string | null {
    const tracks = resolveTimelineTracks(manifest);
    if (tracks.length === 0) {
        return null;
    }
    const rect = editGrid.getBoundingClientRect();
    const relativeY = clientY - rect.top + editGrid.scrollTop - topGapPx;
    if (relativeY < 0) {
        return tracks[0].id;
    }

    let cursor = 0;
    for (const track of tracks) {
        const height = getTrackRowHeight(track.id, manifest);
        if (relativeY >= cursor && relativeY < cursor + height) {
            return track.id;
        }
        cursor += height;
    }
    return tracks[tracks.length - 1].id;
}
