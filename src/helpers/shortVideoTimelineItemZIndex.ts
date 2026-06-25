import type { ShortVideoRenderManifest, ShortVideoTextClip } from './shortVideoRenderManifestTypes';
import {
    resolveTextClipTrackId,
    resolveTimelineTracksForRender,
} from './shortVideoTimelineTracks';

export type TimelineItemKind = 'visual' | 'html' | 'text' | 'scene';

export const TIMELINE_ITEM_Z_INDEX_MIN = -999;
export const TIMELINE_ITEM_Z_INDEX_MAX = 999;
export const TIMELINE_TRACK_Z_INDEX_STEP = 1000;

const TIMELINE_ITEM_Z_TIER: Record<TimelineItemKind, number> = {
    visual: 0,
    html: 50,
    text: 100,
    scene: 200,
};

export function normalizeItemZIndex(value: unknown): number | undefined {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return undefined;
    }
    return Math.max(
        TIMELINE_ITEM_Z_INDEX_MIN,
        Math.min(TIMELINE_ITEM_Z_INDEX_MAX, Math.round(value))
    );
}

export function resolveIntraTrackItemZ(params: {
    z_index?: number;
    kind: TimelineItemKind;
    indexInKind: number;
}): number {
    const normalized = normalizeItemZIndex(params.z_index);
    if (normalized !== undefined) {
        return normalized;
    }
    return TIMELINE_ITEM_Z_TIER[params.kind] + Math.max(0, params.indexInKind);
}

export function resolveTrackContainerZIndex(trackRenderIndex: number): number {
    return trackRenderIndex >= 0 ? trackRenderIndex + 1 : 1;
}

export function resolveTimelineItemStackZ(params: {
    trackRenderIndex: number;
    z_index?: number;
    kind: TimelineItemKind;
    indexInKind: number;
}): number {
    const trackZ = resolveTrackContainerZIndex(params.trackRenderIndex);
    const itemZ = resolveIntraTrackItemZ({
        z_index: params.z_index,
        kind: params.kind,
        indexInKind: params.indexInKind,
    });
    return (trackZ * TIMELINE_TRACK_Z_INDEX_STEP) + itemZ;
}

export function resolveTextClipIndexInTrack(
    manifest: ShortVideoRenderManifest,
    clip: Pick<ShortVideoTextClip, 'id' | 'timeline_track_id'>
): { trackRenderIndex: number; indexInKind: number } {
    const tracks = resolveTimelineTracksForRender(manifest);
    const trackId = resolveTextClipTrackId(clip, tracks);
    const trackRenderIndex = tracks.findIndex((track) => track.id === trackId);
    const trackTextClips = (manifest.text_clips ?? []).filter(
        (item) => resolveTextClipTrackId(item, tracks) === trackId
    );
    const indexInKind = trackTextClips.findIndex((item) => item.id === clip.id);
    return {
        trackRenderIndex,
        indexInKind: Math.max(0, indexInKind),
    };
}

export function resolveTextClipOverlayZIndex(
    manifest: ShortVideoRenderManifest,
    clip: ShortVideoTextClip
): number {
    const { trackRenderIndex, indexInKind } = resolveTextClipIndexInTrack(manifest, clip);
    return resolveTimelineItemStackZ({
        trackRenderIndex,
        z_index: clip.z_index,
        kind: 'text',
        indexInKind,
    });
}
