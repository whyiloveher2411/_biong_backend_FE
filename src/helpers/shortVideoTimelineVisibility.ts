import type {
    ShortVideoManifestScene,
    ShortVideoRenderManifest,
    ShortVideoTextClip,
    ShortVideoTimelineTrack,
    ShortVideoVisualClip,
} from './shortVideoRenderManifestTypes';
import { resolveClipTrackId, resolveSceneTrackId, resolveTextClipTrackId, resolveTimelineTracks } from './shortVideoTimelineTracks';

type TimelineHiddenField = { timeline_hidden?: boolean };

function clearTimelineHidden<T extends TimelineHiddenField>(item: T): T {
    if (item.timeline_hidden !== true) {
        return item;
    }
    const next = { ...item };
    delete next.timeline_hidden;
    return next;
}

function withTimelineHidden<T extends TimelineHiddenField>(item: T): T {
    return {
        ...item,
        timeline_hidden: true,
    };
}

function toggleTimelineHiddenField<T extends TimelineHiddenField>(item: T): T {
    return isTimelineItemHidden(item) ? clearTimelineHidden(item) : withTimelineHidden(item);
}

export function isTimelineTrackHidden(track: TimelineHiddenField | null | undefined): boolean {
    return track?.timeline_hidden === true;
}

export function isTimelineItemHidden(item: TimelineHiddenField | null | undefined): boolean {
    return item?.timeline_hidden === true;
}

export function isTimelineItemEffectivelyHidden(
    itemHidden: boolean,
    trackHidden: boolean
): boolean {
    return trackHidden || itemHidden;
}

export function resolveTrackHiddenById(
    manifest: ShortVideoRenderManifest,
    trackId: string
): boolean {
    const track = resolveTimelineTracks(manifest).find((entry) => entry.id === trackId);
    return isTimelineTrackHidden(track);
}

export function toggleTimelineTrackHiddenInManifest(
    manifest: ShortVideoRenderManifest,
    trackId: string
): ShortVideoRenderManifest {
    const tracks = resolveTimelineTracks(manifest).map((track) => {
        if (track.id !== trackId) {
            return track;
        }
        const nextHidden = !isTimelineTrackHidden(track);
        return nextHidden ? withTimelineHidden(track) : clearTimelineHidden(track);
    });
    return {
        ...manifest,
        timeline_tracks: tracks,
    };
}

function toggleItemHidden<T extends TimelineHiddenField>(item: T): T {
    return toggleTimelineHiddenField(item);
}

export function toggleTimelineSceneHiddenInManifest(
    manifest: ShortVideoRenderManifest,
    sceneId: string
): ShortVideoRenderManifest {
    return {
        ...manifest,
        scenes: manifest.scenes.map((scene) => (
            scene.id === sceneId ? toggleItemHidden(scene) : scene
        )),
    };
}

export function toggleVisualClipHiddenInManifest(
    manifest: ShortVideoRenderManifest,
    clipId: string
): ShortVideoRenderManifest {
    const visualClips = manifest.visual_clips ?? [];
    if (visualClips.length === 0) {
        return manifest;
    }
    return {
        ...manifest,
        visual_clips: visualClips.map((clip) => (
            clip.id === clipId ? toggleItemHidden(clip) : clip
        )),
    };
}

export function toggleTextClipHiddenInManifest(
    manifest: ShortVideoRenderManifest,
    clipId: string
): ShortVideoRenderManifest {
    const textClips = manifest.text_clips ?? [];
    if (textClips.length === 0) {
        return manifest;
    }
    return {
        ...manifest,
        text_clips: textClips.map((clip) => (
            clip.id === clipId ? toggleItemHidden(clip) : clip
        )),
    };
}

export function isSceneEffectivelyHidden(
    manifest: ShortVideoRenderManifest,
    scene: ShortVideoManifestScene,
    tracks: ShortVideoTimelineTrack[] = resolveTimelineTracks(manifest)
): boolean {
    const trackId = resolveSceneTrackId(scene, tracks);
    const track = tracks.find((entry) => entry.id === trackId);
    return isTimelineItemEffectivelyHidden(
        isTimelineItemHidden(scene),
        isTimelineTrackHidden(track)
    );
}

export function isVisualClipEffectivelyHidden(
    manifest: ShortVideoRenderManifest,
    clip: ShortVideoVisualClip,
    tracks: ShortVideoTimelineTrack[] = resolveTimelineTracks(manifest)
): boolean {
    const trackId = resolveClipTrackId(clip, tracks);
    const track = tracks.find((entry) => entry.id === trackId);
    return isTimelineItemEffectivelyHidden(
        isTimelineItemHidden(clip),
        isTimelineTrackHidden(track)
    );
}

export function isTextClipEffectivelyHidden(
    manifest: ShortVideoRenderManifest,
    clip: ShortVideoTextClip,
    tracks: ShortVideoTimelineTrack[] = resolveTimelineTracks(manifest)
): boolean {
    const trackId = resolveTextClipTrackId(clip, tracks);
    const track = tracks.find((entry) => entry.id === trackId);
    return isTimelineItemEffectivelyHidden(
        isTimelineItemHidden(clip),
        isTimelineTrackHidden(track)
    );
}
