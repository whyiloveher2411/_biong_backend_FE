import type {
    ShortVideoManifestScene,
    ShortVideoRenderManifest,
} from './shortVideoRenderManifestTypes';

const MIN_ACTION_DURATION_SEC = 0.1;
const DEFAULT_NEW_NARRATION_DURATION_SEC = 3;

function isSceneReadyForTimeline(scene: ShortVideoManifestScene): boolean {
    return Boolean(scene.audio_url?.trim()) && Array.isArray(scene.words) && scene.words.length > 0;
}

function narrationSceneDurationSec(scene: ShortVideoManifestScene): number {
    if (isSceneReadyForTimeline(scene)) {
        return Math.max(MIN_ACTION_DURATION_SEC, scene.duration_sec);
    }
    return DEFAULT_NEW_NARRATION_DURATION_SEC;
}

function sortScenesByTimelineOrder(scenes: ShortVideoManifestScene[]): ShortVideoManifestScene[] {
    return [...scenes].sort((a, b) => {
        const startDiff = a.start_offset_sec - b.start_offset_sec;
        if (Math.abs(startDiff) > 0.0001) {
            return startDiff;
        }
        return a.id.localeCompare(b.id);
    });
}

/** Fingerprint layout timeline — so sánh đồng bộ overlay ↔ manifest prop. */
export function timelineLayoutFingerprint(manifest: ShortVideoRenderManifest): string {
    const trackParts = (manifest.timeline_tracks ?? []).map(
        (track) => `${track.id}:${track.name}:${track.order}:${track.timeline_hidden === true ? 1 : 0}`
    );
    const sceneParts = sortScenesByTimelineOrder(manifest.scenes).map(
        (scene) => `${scene.id}:${scene.timeline_track_id || ''}:${scene.start_offset_sec.toFixed(3)}:${narrationSceneDurationSec(scene).toFixed(3)}:${scene.z_index ?? ''}:${scene.timeline_hidden === true ? 1 : 0}`
    );
    const clipParts = (manifest.visual_clips ?? []).map(
        (clip) => `${clip.id}:${clip.timeline_track_id || ''}:${clip.start_sec.toFixed(3)}:${clip.duration_sec.toFixed(3)}:${clip.z_index ?? ''}:${clip.timeline_hidden === true ? 1 : 0}`
    );
    const textClipParts = (manifest.text_clips ?? []).map(
        (clip) => `${clip.id}:${clip.timeline_track_id || ''}:${clip.start_sec.toFixed(3)}:${clip.duration_sec.toFixed(3)}:${clip.motion || ''}:${clip.enter_duration_sec?.toFixed(3) ?? ''}:${clip.exit_motion || ''}:${clip.exit_duration_sec?.toFixed(3) ?? ''}:${clip.background_effect || ''}:${clip.z_index ?? ''}:${clip.timeline_hidden === true ? 1 : 0}`
    );
    return `${trackParts.join('|')};;${sceneParts.join('|')};;${clipParts.join('|')};;${textClipParts.join('|')}`;
}
