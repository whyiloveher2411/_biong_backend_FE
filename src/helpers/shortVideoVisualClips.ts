import { getAccessToken } from 'store/user/user.reducers';
import { convertToURL } from 'helpers/url';
import { getApiHost } from 'helpers/apiHost';
import type {
    ShortVideoManifestScene,
    ShortVideoRenderManifest,
    ShortVideoSceneVisualType,
    ShortVideoVisualClip,
} from './shortVideoRenderManifestTypes';
import { AUDIO_VOLUME_EPSILON, clampAudioVolume } from './shortVideoAudioVolume';
import { normalizeItemZIndex } from './shortVideoTimelineItemZIndex';
import {
    clipActsAsImage,
    resolveSceneVisualImageRef,
    resolveSceneVisualRefByType,
    resolveSceneVisualVideoRef,
    resolveVisualClipImageRef,
    resolveVisualClipVideoRef,
    sceneVisualRefIsValid,
    syncClipActiveRef,
} from './shortVideoVisualRefHelpers';
import { isHttpsImageUrl, isValidVideoRef, parseYoutubeId } from './shortVideoYoutube';

export type { ShortVideoVisualClip } from './shortVideoRenderManifestTypes';

export const VISUAL_CLIP_MOTION_OPTIONS = [
    { value: 'none', label: 'Không hiệu ứng' },
    { value: 'fade', label: 'Fade' },
    { value: 'pop', label: 'Pop' },
] as const;

const MIN_CLIP_DURATION_SEC = 0.1;

function inferVisualTypeFromScript(scene: ShortVideoManifestScene): ShortVideoSceneVisualType {
    const scriptType = scene.visual?.type?.trim() || '';
    if (['article_image', 'thumbnail', 'image'].includes(scriptType)) {
        const ref = scene.visual?.ref?.trim() || '';
        return ref && isHttpsImageUrl(ref) ? 'image' : 'none';
    }
    if (scriptType === 'video' || parseYoutubeId(scene.visual?.ref?.trim() || '') || isValidVideoRef(scene.visual?.ref?.trim() || '')) {
        return 'video';
    }
    return 'none';
}

function resolveSceneVisualTypeLocal(scene: ShortVideoManifestScene): ShortVideoSceneVisualType {
    const override = scene.layout?.visual_type;
    if (override === 'none' || override === 'image' || override === 'video') {
        return override;
    }
    return inferVisualTypeFromScript(scene);
}

function resolveSceneVisualRefLocal(scene: ShortVideoManifestScene): string {
    return resolveSceneVisualRefByType(scene, resolveSceneVisualTypeLocal(scene));
}

function resolveSceneVisualYoutubeIdLocal(scene: ShortVideoManifestScene): string | null {
    const stored = scene.layout?.visual_youtube_id?.trim();
    if (stored) {
        return stored;
    }
    if (resolveSceneVisualTypeLocal(scene) !== 'video') {
        return null;
    }
    const ref = resolveSceneVisualVideoRef(scene);
    return ref ? parseYoutubeId(ref) : null;
}

function resolveSceneShowVisualLocal(scene: ShortVideoManifestScene): boolean {
    if (scene.layout?.show_visual === false) {
        return false;
    }
    const visualType = resolveSceneVisualTypeLocal(scene);
    if (visualType === 'none') {
        return false;
    }
    return sceneVisualRefIsValid(scene, visualType);
}

function resolveSceneVisualMotionLocal(scene: ShortVideoManifestScene): string {
    const override = scene.layout?.visual_motion?.trim();
    if (override) {
        return override;
    }
    return scene.visual?.motion?.trim() || 'pop';
}

function resolveSceneVisualStartSecLocal(scene: ShortVideoManifestScene): number {
    const value = scene.layout?.visual_start_sec;
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
        return value;
    }
    return 0;
}

function resolveSceneHeadlineTextLocal(scene: ShortVideoManifestScene): string {
    const override = scene.layout?.headline_text?.trim();
    if (override) {
        return override;
    }
    return scene.on_screen_text?.trim() || '';
}

function clipIdFromScene(sceneId: string): string {
    return `vc_${sceneId}`;
}

function resolveClipType(scene: ShortVideoManifestScene): ShortVideoSceneVisualType {
    if (!resolveSceneShowVisualLocal(scene)) {
        return 'none';
    }
    return resolveSceneVisualTypeLocal(scene);
}

function resolveClipLabel(scene: ShortVideoManifestScene): string {
    const headline = resolveSceneHeadlineTextLocal(scene).trim();
    if (headline) {
        return headline.length > 24 ? `${headline.slice(0, 24)}…` : headline;
    }
    return scene.id;
}

export function manifestUsesVisualClips(manifest: ShortVideoRenderManifest): boolean {
    return Array.isArray(manifest.visual_clips) && manifest.visual_clips.length > 0;
}

export function sceneToVisualClip(
    scene: ShortVideoManifestScene,
    manifestDurationSec: number
): ShortVideoVisualClip | null {
    const type = resolveClipType(scene);
    if (type === 'none') {
        return null;
    }
    const ref = resolveSceneVisualRefLocal(scene);
    if (!ref) {
        return null;
    }

    const startSec = Math.max(0, scene.start_offset_sec);
    const durationSec = Math.max(
        MIN_CLIP_DURATION_SEC,
        Math.min(scene.duration_sec, Math.max(0, manifestDurationSec - startSec))
    );

    const clip: ShortVideoVisualClip = {
        id: clipIdFromScene(scene.id),
        type,
        ref,
        motion: resolveSceneVisualMotionLocal(scene),
        start_sec: startSec,
        duration_sec: durationSec,
        label: resolveClipLabel(scene),
    };

    const imageRef = resolveSceneVisualImageRef(scene);
    if (imageRef) {
        clip.image_ref = imageRef;
    }
    const videoRef = resolveSceneVisualVideoRef(scene);
    if (videoRef) {
        clip.video_ref = videoRef;
    }
    const videoPreview = scene.layout?.visual_video_preview_url?.trim();
    if (videoPreview) {
        clip.video_preview_url = videoPreview;
    }

    if (type === 'video') {
        const youtubeId = resolveSceneVisualYoutubeIdLocal(scene);
        if (youtubeId) {
            clip.visual_youtube_id = youtubeId;
        }
        const startInFile = resolveSceneVisualStartSecLocal(scene);
        if (startInFile > 0) {
            clip.visual_start_sec = startInFile;
        }
        const playback = scene.layout?.visual_playback_url?.trim();
        if (playback) {
            clip.visual_playback_url = playback;
        }
        if (scene.layout?.visual_youtube_muted === false) {
            clip.visual_youtube_muted = false;
        }
    }

    return clip;
}

export function buildVisualClipsFromScenes(manifest: ShortVideoRenderManifest): ShortVideoVisualClip[] {
    const durationSec = manifest.duration_sec || 0;
    const clips: ShortVideoVisualClip[] = [];
    manifest.scenes.forEach((scene) => {
        const clip = sceneToVisualClip(scene, durationSec);
        if (clip) {
            clips.push(clip);
        }
    });
    return clips;
}

export function clampClipTiming(
    clip: ShortVideoVisualClip,
    maxDurationSec?: number
): ShortVideoVisualClip {
    let startSec = Math.max(0, clip.start_sec);
    let durationSec = Math.max(MIN_CLIP_DURATION_SEC, clip.duration_sec);
    if (typeof maxDurationSec === 'number' && Number.isFinite(maxDurationSec)) {
        const maxDuration = Math.max(MIN_CLIP_DURATION_SEC, maxDurationSec);
        if (startSec + durationSec > maxDuration) {
            durationSec = Math.max(MIN_CLIP_DURATION_SEC, maxDuration - startSec);
        }
        if (startSec >= maxDuration) {
            startSec = Math.max(0, maxDuration - MIN_CLIP_DURATION_SEC);
            durationSec = MIN_CLIP_DURATION_SEC;
        }
    }
    return {
        ...clip,
        start_sec: startSec,
        duration_sec: durationSec,
        z_index: normalizeItemZIndex(clip.z_index),
    };
}

export function updateVisualClipInManifest(
    manifest: ShortVideoRenderManifest,
    clipId: string,
    patch: Partial<ShortVideoVisualClip>
): ShortVideoRenderManifest {
    const clips = manifest.visual_clips ?? [];
    return {
        ...manifest,
        visual_clips: clips.map((clip) => {
            if (clip.id !== clipId) {
                return clip;
            }
            const merged = syncClipActiveRef({ ...clip, ...patch });
            return clampClipTiming(merged);
        }),
    };
}

export function addVisualClipAtSec(
    manifest: ShortVideoRenderManifest,
    startSec: number,
    defaults?: Partial<Pick<ShortVideoVisualClip, 'type' | 'ref' | 'motion' | 'label' | 'timeline_track_id'>>
): ShortVideoRenderManifest {
    const existing = manifest.visual_clips ?? [];
    const index = existing.length + 1;
    const durationSec = 4;
    const clip = clampClipTiming(
        {
            id: `vc_new_${index}_${Date.now()}`,
            type: defaults?.type ?? 'image',
            ref: defaults?.ref ?? '',
            motion: defaults?.motion ?? 'pop',
            start_sec: Math.max(0, startSec),
            duration_sec: durationSec,
            label: defaults?.label ?? `Visual ${index}`,
            timeline_track_id: defaults?.timeline_track_id,
        }
    );
    return {
        ...manifest,
        visual_clips: [...existing, clip],
    };
}

export function removeVisualClipFromManifest(
    manifest: ShortVideoRenderManifest,
    clipId: string
): ShortVideoRenderManifest {
    return {
        ...manifest,
        visual_clips: (manifest.visual_clips ?? []).filter((clip) => clip.id !== clipId),
    };
}

export function setVisualClipsInManifest(
    manifest: ShortVideoRenderManifest,
    clips: ShortVideoVisualClip[]
): ShortVideoRenderManifest {
    return {
        ...manifest,
        visual_clips: clips.map((clip) => clampClipTiming(clip)),
    };
}

export function resolveActiveVisualClipAtSec(
    manifest: ShortVideoRenderManifest,
    timeSec: number
): ShortVideoVisualClip | null {
    const clips = manifest.visual_clips ?? [];
    if (clips.length === 0) {
        return null;
    }
    for (let i = clips.length - 1; i >= 0; i -= 1) {
        const clip = clips[i];
        const end = clip.start_sec + clip.duration_sec;
        if (timeSec >= clip.start_sec - 0.01 && timeSec < end + 0.01) {
            return clip;
        }
    }
    return null;
}

export function resolveVisualClipYoutubeId(clip: ShortVideoVisualClip): string | null {
    const stored = clip.visual_youtube_id?.trim();
    if (stored) {
        return stored;
    }
    if (clip.type !== 'video') {
        return null;
    }
    const ref = resolveVisualClipVideoRef(clip);
    return ref ? parseYoutubeId(ref) : null;
}

export {
    resolveVisualClipImageRef,
    resolveVisualClipRef,
    resolveVisualClipVideoPreviewUrl,
    resolveVisualClipVideoRef,
} from './shortVideoVisualRefHelpers';

export function resolveVisualClipPlaybackUrl(clip: ShortVideoVisualClip): string {
    return clip.visual_playback_url?.trim() || '';
}

export function resolveVisualClipMotion(clip: ShortVideoVisualClip): string {
    return clip.motion?.trim() || 'pop';
}

export function resolveVisualClipStartInFile(clip: ShortVideoVisualClip): number {
    const value = clip.visual_start_sec;
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
        return value;
    }
    return 0;
}

export function resolveVisualClipAudioVolume(clip: ShortVideoVisualClip): number {
    const stored = clip.audio_volume;
    if (typeof stored === 'number' && Number.isFinite(stored)) {
        return clampAudioVolume(stored);
    }
    if (clip.visual_youtube_muted === false) {
        return 1;
    }
    return 0;
}

export function resolveVisualClipYoutubeMuted(clip: ShortVideoVisualClip): boolean {
    if (typeof clip.audio_volume === 'number') {
        return resolveVisualClipAudioVolume(clip) <= AUDIO_VOLUME_EPSILON;
    }
    return clip.visual_youtube_muted !== false;
}

/** Patch volume từ slider UI (0–100) — đồng bộ visual_youtube_muted */
export function patchVisualClipAudioVolumeFromPercent(
    percent: number
): Pick<ShortVideoVisualClip, 'audio_volume' | 'visual_youtube_muted'> {
    const volume = clampAudioVolume(percent / 100);
    if (volume <= AUDIO_VOLUME_EPSILON) {
        return { audio_volume: 0 };
    }
    return {
        audio_volume: volume,
        visual_youtube_muted: false,
    };
}

export function sanitizeVisualClipsForPersist(
    clips: ShortVideoVisualClip[] | undefined
): ShortVideoVisualClip[] | undefined {
    if (!clips || clips.length === 0) {
        return clips;
    }
    return clips.map((clip) => {
        if (!clip.visual_playback_url) {
            return clip;
        }
        const rest = { ...clip };
        delete rest.visual_playback_url;
        return rest;
    });
}

export function injectVisualClipPlaybackUrl(
    manifest: ShortVideoRenderManifest,
    clipId: string,
    playbackUrl: string
): ShortVideoRenderManifest {
    const normalized = resolveVisualPlaybackPreviewUrl(playbackUrl) || playbackUrl.trim();
    return updateVisualClipInManifest(manifest, clipId, {
        visual_playback_url: normalized,
    });
}

export function reinjectVisualClipPlaybackFromCache(
    manifest: ShortVideoRenderManifest,
    cache: Record<string, string>
): ShortVideoRenderManifest {
    if (!manifestUsesVisualClips(manifest)) {
        return manifest;
    }
    let next = manifest;
    (manifest.visual_clips ?? []).forEach((clip) => {
        if (clip.visual_playback_url?.trim()) {
            return;
        }
        const youtubeId = resolveVisualClipYoutubeId(clip);
        if (!youtubeId) {
            return;
        }
        const playback = cache[`clip:${clip.id}:${youtubeId}`]?.trim();
        if (!playback) {
            return;
        }
        next = injectVisualClipPlaybackUrl(next, clip.id, playback);
    });
    return next;
}

/** URL preview cho file render-cache (Remotion Player không dùng được staticFile trong CMS). */
export function resolveRenderCachePreviewAssetUrl(relativePath: string): string {
    const trimmed = relativePath.trim();
    if (!trimmed) {
        return '';
    }
    if (/^https?:\/\//i.test(trimmed) && trimmed.includes('render-cache-asset')) {
        const token = getAccessToken();
        if (!token) {
            return trimmed;
        }
        const url = new URL(trimmed);
        if (!url.searchParams.get('access_token')) {
            url.searchParams.set('access_token', token);
        }
        return url.toString();
    }
    if (trimmed.startsWith('/api/') && trimmed.includes('render-cache-asset')) {
        const url = new URL(convertToURL(getApiHost(), trimmed.split('?')[0]));
        const query = trimmed.includes('?') ? trimmed.split('?')[1] : '';
        const params = new URLSearchParams(query);
        const file = params.get('file')?.trim() || '';
        if (!file) {
            return convertToURL(getApiHost(), trimmed);
        }
        url.searchParams.set('file', file);
        const token = getAccessToken();
        if (token) {
            url.searchParams.set('access_token', token);
        }
        return url.toString();
    }
    const file = trimmed.includes('render-cache/')
        ? trimmed.split('/').pop() ?? ''
        : trimmed;
    if (!file) {
        return '';
    }
    const url = new URL(
        convertToURL(
            getApiHost(),
            '/api/admin/plugin/vn4-e-learning/app-mobile/marketing/short-video/render-cache-asset'
        )
    );
    url.searchParams.set('file', file);
    const token = getAccessToken();
    if (token) {
        url.searchParams.set('access_token', token);
    }
    return url.toString();
}

/**
 * URL playback cho preview CMS — luôn thêm access_token cho render-cache API.
 * Dùng chung timeline thumbnail, Remotion Player, inspector.
 */
export function resolveVisualPlaybackPreviewUrl(playback: string): string {
    const trimmed = playback.trim();
    if (!trimmed) {
        return '';
    }
    if (
        trimmed.includes('render-cache-asset')
        || trimmed.includes('render-cache/')
        || trimmed.startsWith('/api/')
    ) {
        return resolveRenderCachePreviewAssetUrl(trimmed);
    }
    if (/^https?:\/\//i.test(trimmed)) {
        if (trimmed.includes('render-cache-asset')) {
            return resolveRenderCachePreviewAssetUrl(trimmed);
        }
        return trimmed;
    }
    return trimmed;
}

function isUnifiedTimelineClipId(clipId: string): boolean {
    return clipId.startsWith('uv_')
        || clipId.startsWith('html_ut_')
        || clipId.startsWith('html_ai_');
}

export function manifestHasUnifiedTimelineClipIds(
    clips: ShortVideoVisualClip[] | undefined
): boolean {
    return (clips ?? []).some((clip) => isUnifiedTimelineClipId(clip.id));
}

/** Inject visual_playback_url cho preview — HTTPS hoặc render-cache qua API CMS (có token). */
export function injectVisualPlaybackUrlsForPreview(
    manifest: ShortVideoRenderManifest
): ShortVideoRenderManifest {
    let next = injectImagePlaybackForPreview(manifest);
    if (manifestUsesVisualClips(next)) {
        (next.visual_clips ?? []).forEach((clip) => {
            const playback = clip.visual_playback_url?.trim() || '';
            if (!playback) {
                return;
            }
            next = injectVisualClipPlaybackUrl(next, clip.id, playback);
        });
    }
    let scenesChanged = false;
    const scenes = next.scenes.map((scene) => {
        const playback = scene.layout?.visual_playback_url?.trim() || '';
        if (!playback) {
            return scene;
        }
        const normalized = resolveVisualPlaybackPreviewUrl(playback) || playback;
        if (normalized === scene.layout?.visual_playback_url) {
            return scene;
        }
        scenesChanged = true;
        return {
            ...scene,
            layout: { ...(scene.layout ?? {}), visual_playback_url: normalized },
        };
    });
    if (scenesChanged) {
        next = { ...next, scenes };
    }
    return next;
}

/** Fallback client: inject URL ảnh HTTPS khi manifest API chưa có visual_playback_url (transient). */
export function injectImagePlaybackForPreview(
    manifest: ShortVideoRenderManifest
): ShortVideoRenderManifest {
    if (!manifestUsesVisualClips(manifest)) {
        return manifest;
    }
    let next = manifest;
    (manifest.visual_clips ?? []).forEach((clip) => {
        if (!clipActsAsImage(clip.type) || clip.visual_playback_url?.trim()) {
            return;
        }
        const ref = resolveVisualClipImageRef(clip);
        if (ref && isHttpsImageUrl(ref)) {
            next = injectVisualClipPlaybackUrl(next, clip.id, ref);
        }
    });
    return next;
}
