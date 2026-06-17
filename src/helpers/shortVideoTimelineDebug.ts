import type { TimelineRow } from '@xzdarcy/timeline-engine';
import type {
    ShortVideoManifestScene,
    ShortVideoRenderManifest,
} from './shortVideoRenderManifestTypes';

const DEBUG_KEY = 'short_video_timeline_debug';
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

function timelineLayoutFingerprint(manifest: ShortVideoRenderManifest): string {
    const sceneParts = [...manifest.scenes]
        .sort((a, b) => {
            const startDiff = a.start_offset_sec - b.start_offset_sec;
            if (Math.abs(startDiff) > 0.0001) {
                return startDiff;
            }
            return a.id.localeCompare(b.id);
        })
        .map(
            (scene) => `${scene.id}:${scene.start_offset_sec.toFixed(3)}:${narrationSceneDurationSec(scene).toFixed(3)}`
        );
    const clipParts = (manifest.visual_clips ?? []).map(
        (clip) => `${clip.id}:${clip.start_sec.toFixed(3)}:${clip.duration_sec.toFixed(3)}`
    );
    return `${sceneParts.join('|')};;${clipParts.join('|')}`;
}

export function isShortVideoTimelineDebugEnabled(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }
    try {
        return window.localStorage.getItem(DEBUG_KEY) === '1';
    } catch {
        return false;
    }
}

export function shortVideoTimelineDebug(
    source: 'Timeline' | 'EditDrawer',
    event: string,
    payload?: Record<string, unknown>
): void {
    if (!isShortVideoTimelineDebugEnabled()) {
        return;
    }
    const stamp = new Date().toISOString().slice(11, 23);
    // eslint-disable-next-line no-console
    console.log(`[ShortVideoTimeline ${stamp}] [${source}] ${event}`, payload ?? '');
}

export function summarizeTimelineRows(rows: TimelineRow[]): Record<string, unknown> {
    const summary: Record<string, unknown> = {};
    rows.forEach((row) => {
        summary[row.id] = row.actions.map((action) => ({
            id: action.id,
            start: Number(action.start.toFixed(3)),
            end: Number(action.end.toFixed(3)),
        }));
    });
    return summary;
}

export function summarizeManifestLayout(manifest: ShortVideoRenderManifest): Record<string, unknown> {
    return {
        fp: timelineLayoutFingerprint(manifest).slice(0, 80),
        scenes: manifest.scenes.map((scene) => ({
            id: scene.id,
            start: Number(scene.start_offset_sec.toFixed(3)),
            dur: Number(scene.duration_sec.toFixed(3)),
        })),
        clips: (manifest.visual_clips ?? []).map((clip) => ({
            id: clip.id,
            start: Number(clip.start_sec.toFixed(3)),
            dur: Number(clip.duration_sec.toFixed(3)),
        })),
    };
}
