import type { ShortVideoRenderManifest } from 'helpers/shortVideoRenderManifest';
import {
    getProjectTimelineDurationSec,
    resolveNarrationAudioSourceDurationSec,
    resolveNarrationAudioTrimStartSec,
} from 'helpers/shortVideoTimelineAdapter';

const DURATION_EPSILON_SEC = 0.05;

export function probeAudioUrlDurationSec(audioUrl: string): Promise<number | null> {
    const trimmed = audioUrl.trim();
    if (!trimmed) {
        return Promise.resolve(null);
    }

    return new Promise((resolve) => {
        const audio = document.createElement('audio');
        audio.preload = 'metadata';

        const cleanup = () => {
            audio.removeAttribute('src');
            audio.load();
        };

        audio.addEventListener('loadedmetadata', () => {
            const duration = audio.duration;
            cleanup();
            resolve(Number.isFinite(duration) && duration > 0 ? duration : null);
        }, { once: true });

        audio.addEventListener('error', () => {
            cleanup();
            resolve(null);
        }, { once: true });

        audio.src = trimmed;
    });
}

export async function probeSceneAudioDurations(
    scenes: ShortVideoRenderManifest['scenes']
): Promise<Record<string, number>> {
    const scenesWithAudio = scenes.filter((scene) => scene.audio_url?.trim());
    if (scenesWithAudio.length === 0) {
        return {};
    }

    const entries = await Promise.all(
        scenesWithAudio.map(async (scene) => {
            const durationSec = await probeAudioUrlDurationSec(scene.audio_url);
            if (!durationSec || durationSec <= 0) {
                return null;
            }
            return [scene.id, durationSec] as const;
        })
    );

    return entries.reduce<Record<string, number>>((acc, entry) => {
        if (!entry) {
            return acc;
        }
        acc[entry[0]] = entry[1];
        return acc;
    }, {});
}

export function reconcileSceneAudioDurationsInManifest(
    manifest: ShortVideoRenderManifest,
    probedBySceneId: Record<string, number>
): ShortVideoRenderManifest {
    let changed = false;

    const scenes = manifest.scenes.map((scene) => {
        const probedDurationSec = probedBySceneId[scene.id];
        if (!probedDurationSec || probedDurationSec <= 0) {
            return scene;
        }

        const currentSourceDurationSec = resolveNarrationAudioSourceDurationSec(scene) ?? scene.duration_sec;
        if (probedDurationSec <= currentSourceDurationSec + DURATION_EPSILON_SEC) {
            return scene;
        }

        changed = true;
        const trimStartSec = resolveNarrationAudioTrimStartSec(scene);
        const wasFullClip = scene.duration_sec >= currentSourceDurationSec - 0.1;
        const maxClipDurationSec = Math.max(0.1, probedDurationSec - trimStartSec);
        const nextDurationSec = wasFullClip
            ? maxClipDurationSec
            : scene.duration_sec;

        return {
            ...scene,
            audio_source_duration_sec: Number(probedDurationSec.toFixed(3)),
            duration_sec: Number(nextDurationSec.toFixed(3)),
            duration_hint_sec: Number(
                Math.max(scene.duration_hint_sec || scene.duration_sec, nextDurationSec).toFixed(3)
            ),
        };
    });

    if (!changed) {
        return manifest;
    }

    const nextManifest: ShortVideoRenderManifest = {
        ...manifest,
        scenes,
    };

    return {
        ...nextManifest,
        duration_sec: getProjectTimelineDurationSec(nextManifest),
    };
}
