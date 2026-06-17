export type {
    ShortVideoManifestScene,
    ShortVideoManifestSceneLayout,
    ShortVideoManifestWord,
    ShortVideoRenderManifest,
    ShortVideoSceneVisualType,
    ShortVideoTimelineTrack,
    ShortVideoVisualClip,
} from './shortVideoRenderManifestTypes';

import type {
    ShortVideoManifestScene,
    ShortVideoManifestSceneLayout,
    ShortVideoRenderManifest,
    ShortVideoSceneVisualType,
} from './shortVideoRenderManifestTypes';
import { reinjectVisualClipPlaybackFromCache, sanitizeVisualClipsForPersist } from './shortVideoVisualClips';
import { ensureManifestTimelineTracks } from './shortVideoTimelineTracks';
import { isHttpsImageUrl, parseYoutubeId } from './shortVideoYoutube';

export const SCENE_LAYOUT_BACKGROUND_KEYS: (keyof ShortVideoManifestSceneLayout)[] = [
    'background',
];

export const SCENE_LAYOUT_HEADLINE_KEYS: (keyof ShortVideoManifestSceneLayout)[] = [
    'headline_text',
    'headline_color',
    'headline_font_size',
    'headline_top',
    'show_headline',
];

export const SCENE_LAYOUT_KARAOKE_KEYS: (keyof ShortVideoManifestSceneLayout)[] = [
    'text_color',
    'active_color',
    'font_size',
    'bottom_padding',
    'text_box_height',
    'show_karaoke',
];

export const SCENE_LAYOUT_VISUAL_KEYS: (keyof ShortVideoManifestSceneLayout)[] = [
    'visual_type',
    'visual_ref',
    'visual_youtube_id',
    'visual_youtube_muted',
    'visual_motion',
    'visual_start_sec',
    'show_visual',
];

export function sceneBackgroundColor(
    scene: ShortVideoManifestScene,
    manifest: ShortVideoRenderManifest
): string {
    const custom = scene.layout?.background?.trim();
    if (custom) {
        return custom;
    }
    return manifest.style?.bg || '#000000';
}

export function resolveSceneHeadlineText(scene: ShortVideoManifestScene): string {
    const override = scene.layout?.headline_text?.trim();
    if (override) {
        return override;
    }
    return scene.on_screen_text?.trim() || '';
}

export function resolveSceneShowHeadline(scene: ShortVideoManifestScene): boolean {
    return scene.layout?.show_headline !== false;
}

export function resolveSceneShowKaraoke(scene: ShortVideoManifestScene): boolean {
    return scene.layout?.show_karaoke !== false;
}

export function resolveSceneShowVisual(scene: ShortVideoManifestScene): boolean {
    if (scene.layout?.show_visual === false) {
        return false;
    }
    const visualType = resolveSceneVisualType(scene);
    if (visualType === 'none') {
        return false;
    }
    const ref = resolveSceneVisualRef(scene);
    if (!ref) {
        return false;
    }
    if (visualType === 'image') {
        return isHttpsImageUrl(ref);
    }
    if (visualType === 'video') {
        return resolveSceneVisualYoutubeId(scene) !== null;
    }
    return false;
}

function inferVisualTypeFromScript(scene: ShortVideoManifestScene): ShortVideoSceneVisualType {
    const scriptType = scene.visual?.type?.trim() || '';
    if (['article_image', 'thumbnail', 'image'].includes(scriptType)) {
        const ref = scene.visual?.ref?.trim() || '';
        return ref && isHttpsImageUrl(ref) ? 'image' : 'none';
    }
    return 'none';
}

export function resolveSceneVisualType(scene: ShortVideoManifestScene): ShortVideoSceneVisualType {
    const override = scene.layout?.visual_type;
    if (override === 'none' || override === 'image' || override === 'video') {
        return override;
    }
    return inferVisualTypeFromScript(scene);
}

export function resolveSceneVisualYoutubeId(scene: ShortVideoManifestScene): string | null {
    const stored = scene.layout?.visual_youtube_id?.trim();
    if (stored) {
        return stored;
    }
    if (resolveSceneVisualType(scene) !== 'video') {
        return null;
    }
    const ref = resolveSceneVisualRef(scene);
    return ref ? parseYoutubeId(ref) : null;
}

export function resolveSceneVisualPlaybackUrl(scene: ShortVideoManifestScene): string {
    return scene.layout?.visual_playback_url?.trim() || '';
}

export function resolveSceneHeadlineColor(
    scene: ShortVideoManifestScene,
    manifest: ShortVideoRenderManifest
): string {
    return scene.layout?.headline_color?.trim() || manifest.style.text || '#FFFFFF';
}

export function resolveSceneTextColor(
    scene: ShortVideoManifestScene,
    manifest: ShortVideoRenderManifest
): string {
    return scene.layout?.text_color?.trim() || manifest.style.text || '#FFFFFF';
}

export function resolveSceneActiveColor(
    scene: ShortVideoManifestScene,
    manifest: ShortVideoRenderManifest
): string {
    return scene.layout?.active_color?.trim() || manifest.style.active || '#E53935';
}

export function resolveSceneHeadlineFontSize(scene: ShortVideoManifestScene): number {
    const value = scene.layout?.headline_font_size;
    if (typeof value === 'number' && value > 0) {
        return value;
    }
    return 56;
}

export function resolveSceneHeadlineTop(scene: ShortVideoManifestScene): number {
    const value = scene.layout?.headline_top;
    if (typeof value === 'number' && value >= 0) {
        return value;
    }
    return 180;
}

export function resolveSceneKaraokeFontSize(
    scene: ShortVideoManifestScene,
    manifest: ShortVideoRenderManifest
): number {
    const value = scene.layout?.font_size;
    if (typeof value === 'number' && value > 0) {
        return value;
    }
    return manifest.text_profile.font_size || 48;
}

export function resolveSceneBottomPadding(
    scene: ShortVideoManifestScene,
    manifest: ShortVideoRenderManifest
): number {
    const value = scene.layout?.bottom_padding;
    if (typeof value === 'number' && value >= 0) {
        return value;
    }
    return manifest.text_profile.bottom_padding || 280;
}

export function resolveSceneTextBoxHeight(
    scene: ShortVideoManifestScene,
    manifest: ShortVideoRenderManifest
): number {
    const value = scene.layout?.text_box_height;
    if (typeof value === 'number' && value > 0) {
        return value;
    }
    return manifest.text_profile.text_box_height || 480;
}

export function resolveSceneVisualRef(scene: ShortVideoManifestScene): string {
    const override = scene.layout?.visual_ref?.trim();
    if (override) {
        return override;
    }
    return scene.visual?.ref?.trim() || '';
}

export function resolveSceneVisualMotion(scene: ShortVideoManifestScene): string {
    const override = scene.layout?.visual_motion?.trim();
    if (override) {
        return override;
    }
    return scene.visual?.motion?.trim() || 'pop';
}

export function resolveSceneVisualStartSec(scene: ShortVideoManifestScene): number {
    const value = scene.layout?.visual_start_sec;
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
        return value;
    }
    return 0;
}

export function resolveSceneVisualYoutubeMuted(scene: ShortVideoManifestScene): boolean {
    return scene.layout?.visual_youtube_muted !== false;
}

function isEmptyLayoutValue(value: unknown): boolean {
    if (value === undefined || value === null) {
        return true;
    }
    if (typeof value === 'string' && value.trim() === '') {
        return true;
    }
    return false;
}

function pruneLayout(
    layout: ShortVideoManifestSceneLayout
): ShortVideoManifestSceneLayout | undefined {
    const next: ShortVideoManifestSceneLayout = { ...layout };
    (Object.keys(next) as (keyof ShortVideoManifestSceneLayout)[]).forEach((key) => {
        const value = next[key];
        if (value === undefined) {
            delete next[key];
            return;
        }
        if (typeof value === 'string' && value.trim() === '' && !key.startsWith('show_')) {
            delete next[key];
        }
    });
    return Object.keys(next).length > 0 ? next : undefined;
}

export function parseShortVideoRenderManifest(raw: unknown): ShortVideoRenderManifest | null {
    if (raw === null || raw === undefined) {
        return null;
    }
    let decoded: unknown = raw;
    if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (!trimmed) {
            return null;
        }
        try {
            decoded = JSON.parse(trimmed);
        } catch {
            return null;
        }
    }
    if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) {
        return null;
    }
    const m = decoded as ShortVideoRenderManifest;
    if (!Array.isArray(m.scenes) || m.scenes.length === 0) {
        return null;
    }
    return m;
}

export function updateSceneLayoutInManifest(
    manifest: ShortVideoRenderManifest,
    sceneId: string,
    patch: Partial<ShortVideoManifestSceneLayout>
): ShortVideoRenderManifest {
    return {
        ...manifest,
        scenes: manifest.scenes.map((scene) => {
            if (scene.id !== sceneId) {
                return scene;
            }
            const layout: ShortVideoManifestSceneLayout = { ...(scene.layout ?? {}) };
            (Object.entries(patch) as [keyof ShortVideoManifestSceneLayout, unknown][]).forEach(
                ([key, value]) => {
                    if (isEmptyLayoutValue(value)) {
                        delete layout[key];
                        return;
                    }
                    if (typeof value === 'number' && Number.isFinite(value)) {
                        layout[key] = value as never;
                        return;
                    }
                    if (typeof value === 'boolean') {
                        layout[key] = value as never;
                        return;
                    }
                    if (typeof value === 'string') {
                        layout[key] = value.trim() as never;
                    }
                }
            );
            return {
                ...scene,
                layout: pruneLayout(layout),
            };
        }),
    };
}

export function clearSceneLayoutKeysInManifest(
    manifest: ShortVideoRenderManifest,
    sceneId: string,
    keys: (keyof ShortVideoManifestSceneLayout)[]
): ShortVideoRenderManifest {
    const patch: Partial<ShortVideoManifestSceneLayout> = {};
    keys.forEach((key) => {
        patch[key] = undefined;
    });
    return updateSceneLayoutInManifest(manifest, sceneId, patch);
}

/** Bỏ field transient trước khi so sánh fingerprint / lưu. */
export function sanitizeManifestForPersist(
    manifest: ShortVideoRenderManifest
): ShortVideoRenderManifest {
    const normalized = ensureManifestTimelineTracks(manifest);
    return {
        ...normalized,
        visual_clips: sanitizeVisualClipsForPersist(normalized.visual_clips),
        scenes: normalized.scenes.map((scene) => {
            if (!scene.layout?.visual_playback_url) {
                return scene;
            }
            const layout = { ...scene.layout };
            delete layout.visual_playback_url;
            return {
                ...scene,
                layout: Object.keys(layout).length > 0 ? layout : undefined,
            };
        }),
    };
}

/** Khôi phục visual_playback_url từ cache client (field transient, không lưu DB). */
export function reinjectVisualPlaybackFromCache(
    manifest: ShortVideoRenderManifest,
    cache: Record<string, string>
): ShortVideoRenderManifest {
    let next = reinjectVisualClipPlaybackFromCache(manifest, cache);
    manifest.scenes.forEach((scene) => {
        if (scene.layout?.visual_playback_url?.trim()) {
            return;
        }
        const youtubeId = resolveSceneVisualYoutubeId(scene);
        if (!youtubeId) {
            return;
        }
        const playback = cache[`${scene.id}:${youtubeId}`]?.trim();
        if (!playback) {
            return;
        }
        next = injectSceneVisualPlaybackUrl(next, scene.id, playback);
    });
    return next;
}

export function injectSceneVisualPlaybackUrl(
    manifest: ShortVideoRenderManifest,
    sceneId: string,
    playbackUrl: string
): ShortVideoRenderManifest {
    return {
        ...manifest,
        scenes: manifest.scenes.map((scene) => {
            if (scene.id !== sceneId) {
                return scene;
            }
            const layout = { ...(scene.layout ?? {}), visual_playback_url: playbackUrl.trim() };
            return { ...scene, layout };
        }),
    };
}

export {
    applyShortVideoTemplateToManifest,
    countScenesWithCustomLayout,
    getShortVideoRenderTemplate,
    sceneHasCustomLayout,
    SHORT_VIDEO_RENDER_TEMPLATES,
    type ShortVideoRenderTemplate,
    type ShortVideoTemplateApplyMode,
} from './shortVideoRenderTemplates';

/** @deprecated Dùng updateSceneLayoutInManifest */
export function updateSceneBackgroundInManifest(
    manifest: ShortVideoRenderManifest,
    sceneId: string,
    background: string
): ShortVideoRenderManifest {
    return updateSceneLayoutInManifest(manifest, sceneId, { background });
}
