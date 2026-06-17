import type {
    ShortVideoManifestScene,
    ShortVideoRenderManifest,
    ShortVideoTimelineTrack,
    ShortVideoVisualClip,
} from './shortVideoRenderManifestTypes';

export const TIMELINE_DEFAULT_TRACK_NARRATION_ID = 'narration';
export const TIMELINE_DEFAULT_TRACK_VISUAL_ID = 'visual';
export const TIMELINE_TRACK_ROW_HEIGHT = 40;

export const DEFAULT_TIMELINE_TRACKS: ShortVideoTimelineTrack[] = [
    { id: TIMELINE_DEFAULT_TRACK_NARRATION_ID, name: 'Lời thoại', order: 0 },
    { id: TIMELINE_DEFAULT_TRACK_VISUAL_ID, name: 'Visual', order: 1 },
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
            return { id, name, order };
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

    return {
        ...manifest,
        timeline_tracks: tracks,
        scenes,
        visual_clips: visualClips.length > 0 ? visualClips : manifest.visual_clips,
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

export function getTrackRowHeight(_trackId: string): number {
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
        const height = getTrackRowHeight(track.id);
        if (relativeY >= cursor && relativeY < cursor + height) {
            return track.id;
        }
        cursor += height;
    }
    return tracks[tracks.length - 1].id;
}
