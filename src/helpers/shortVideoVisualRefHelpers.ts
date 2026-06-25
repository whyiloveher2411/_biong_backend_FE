import type {
    ShortVideoManifestScene,
    ShortVideoManifestSceneLayout,
    ShortVideoSceneVisualType,
    ShortVideoVisualClip,
} from './shortVideoRenderManifestTypes';
import {
    isHttpsImageUrl,
    isHttpsVideoUrl,
    isValidVideoRef,
    parseYoutubeId,
} from './shortVideoYoutube';

function legacySceneRef(scene: ShortVideoManifestScene): string {
    return scene.layout?.visual_ref?.trim() || scene.visual?.ref?.trim() || '';
}

function inferRefKind(ref: string): 'image' | 'video' | 'unknown' {
    const trimmed = ref.trim();
    if (!trimmed) {
        return 'unknown';
    }
    if (parseYoutubeId(trimmed) || isHttpsVideoUrl(trimmed)) {
        return 'video';
    }
    if (isHttpsImageUrl(trimmed)) {
        return 'image';
    }
    return 'unknown';
}

export function clipActsAsImage(type: ShortVideoSceneVisualType | string): boolean {
    return type === 'image' || type === 'stock' || type === 'article_image' || type === 'thumbnail';
}

export function resolveSceneVisualImageRef(scene: ShortVideoManifestScene): string {
    const stored = scene.layout?.visual_image_ref?.trim();
    if (stored) {
        return stored;
    }
    const legacy = legacySceneRef(scene);
    if (!legacy) {
        return '';
    }
    if (scene.layout?.visual_video_ref?.trim()) {
        return '';
    }
    const visualType = scene.layout?.visual_type;
    if (visualType === 'image' || visualType === 'stock' || inferRefKind(legacy) === 'image') {
        return legacy;
    }
    return '';
}

export function resolveSceneVisualVideoRef(scene: ShortVideoManifestScene): string {
    const stored = scene.layout?.visual_video_ref?.trim();
    if (stored) {
        return stored;
    }
    const legacy = legacySceneRef(scene);
    if (!legacy) {
        return '';
    }
    if (scene.layout?.visual_image_ref?.trim()) {
        return '';
    }
    const visualType = scene.layout?.visual_type;
    if (visualType === 'video' || inferRefKind(legacy) === 'video') {
        return legacy;
    }
    return '';
}

export function resolveSceneVisualRefByType(
    scene: ShortVideoManifestScene,
    visualType: ShortVideoSceneVisualType
): string {
    if (visualType === 'image') {
        return resolveSceneVisualImageRef(scene);
    }
    if (visualType === 'video') {
        return resolveSceneVisualVideoRef(scene);
    }
    return '';
}

export function resolveSceneVisualVideoPreviewUrl(scene: ShortVideoManifestScene): string {
    return scene.layout?.visual_video_preview_url?.trim() || '';
}

export function resolveVisualClipImageRef(clip: ShortVideoVisualClip): string {
    const stored = clip.image_ref?.trim();
    if (stored) {
        return stored;
    }
    const legacy = clip.ref?.trim() || '';
    if (!legacy) {
        return '';
    }
    if (clip.video_ref?.trim()) {
        return '';
    }
    if (clipActsAsImage(clip.type) || inferRefKind(legacy) === 'image') {
        return legacy;
    }
    return '';
}

export function resolveVisualClipVideoRef(clip: ShortVideoVisualClip): string {
    const stored = clip.video_ref?.trim();
    if (stored) {
        return stored;
    }
    const legacy = clip.ref?.trim() || '';
    if (!legacy) {
        return '';
    }
    if (clip.image_ref?.trim()) {
        return '';
    }
    if (clip.type === 'video' || inferRefKind(legacy) === 'video') {
        return legacy;
    }
    return '';
}

export function resolveVisualClipRef(clip: ShortVideoVisualClip): string {
    if (clipActsAsImage(clip.type)) {
        return resolveVisualClipImageRef(clip);
    }
    if (clip.type === 'video') {
        return resolveVisualClipVideoRef(clip);
    }
    return clip.ref?.trim() || '';
}

export function resolveVisualClipVideoPreviewUrl(clip: ShortVideoVisualClip): string {
    return clip.video_preview_url?.trim() || '';
}

export function syncLayoutActiveVisualRef(
    layout: ShortVideoManifestSceneLayout
): ShortVideoManifestSceneLayout {
    const visualType = layout.visual_type;
    if (visualType === 'image') {
        const imageRef = layout.visual_image_ref?.trim() || '';
        return imageRef ? { ...layout, visual_ref: imageRef } : layout;
    }
    if (visualType === 'video') {
        const videoRef = layout.visual_video_ref?.trim() || '';
        return videoRef ? { ...layout, visual_ref: videoRef } : layout;
    }
    return layout;
}

export function syncClipActiveRef(clip: ShortVideoVisualClip): ShortVideoVisualClip {
    const activeRef = resolveVisualClipRef(clip);
    if (activeRef && activeRef !== clip.ref) {
        return { ...clip, ref: activeRef };
    }
    return clip;
}

export function sceneVisualRefIsValid(
    scene: ShortVideoManifestScene,
    visualType: ShortVideoSceneVisualType
): boolean {
    if (visualType === 'image') {
        const playback = scene.layout?.visual_playback_url?.trim() || '';
        if (playback && /^https?:\/\//i.test(playback)) {
            return true;
        }
        const ref = resolveSceneVisualImageRef(scene);
        return Boolean(ref && isHttpsImageUrl(ref));
    }
    if (visualType === 'video') {
        const ref = resolveSceneVisualVideoRef(scene);
        return Boolean(ref && isValidVideoRef(ref));
    }
    return false;
}

export function clipVisualRefIsValid(clip: ShortVideoVisualClip): boolean {
    if (clipActsAsImage(clip.type)) {
        const playback = clip.visual_playback_url?.trim() || '';
        if (playback && /^https?:\/\//i.test(playback)) {
            return true;
        }
        const ref = resolveVisualClipImageRef(clip);
        return Boolean(ref && isHttpsImageUrl(ref));
    }
    if (clip.type === 'video') {
        const ref = resolveVisualClipVideoRef(clip);
        return Boolean(ref && isValidVideoRef(ref));
    }
    return false;
}
