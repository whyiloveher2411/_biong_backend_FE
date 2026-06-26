export type {
    ShortVideoManifestScene,
    ShortVideoManifestSceneLayout,
    ShortVideoManifestWord,
    ShortVideoRenderManifest,
    ShortVideoSceneAudioTtsSettings,
    ShortVideoSaydiAudioTtsSettings,
    ShortVideoVbeeAudioTtsSettings,
    ShortVideoVoiceConfig,
    ShortVideoSceneVisualType,
    ShortVideoTextClip,
    ShortVideoHtmlClip,
    ShortVideoHtmlOverlayMode,
    ShortVideoTextAlign,
    ShortVideoTextClipMotion,
    ShortVideoTextFontWeight,
    ShortVideoTextTransform,
    ShortVideoTimelineTrack,
    ShortVideoVisualBackgroundMode,
    ShortVideoVisualBackgroundGradient,
    ShortVideoVisualClip,
    ShortVideoVisualGradientDirection,
    ShortVideoVisualGradientStop,
    ShortVideoVisualLayoutFields,
    ShortVideoVisualVerticalAlign,
} from './shortVideoRenderManifestTypes';

export { TEXT_CLIP_SLIDE_ENTER_MOTIONS, TEXT_CLIP_ENTER_SLIDE_OPTIONS, TEXT_CLIP_ENTER_SLIDE_GROUP, TEXT_CLIP_EXIT_SLIDE_GROUP } from './shortVideoRenderManifestTypes';

import type {
    ShortVideoManifestScene,
    ShortVideoManifestSceneLayout,
    ShortVideoRenderManifest,
    ShortVideoSceneAudioTtsSettings,
    ShortVideoSaydiAudioTtsSettings,
    ShortVideoVbeeAudioTtsSettings,
    ShortVideoVoiceConfig,
    ShortVideoSceneVisualType,
} from './shortVideoRenderManifestTypes';
import { AUDIO_VOLUME_EPSILON, clampAudioVolume } from './shortVideoAudioVolume';
import { reinjectVisualClipPlaybackFromCache, resolveVisualPlaybackPreviewUrl, sanitizeVisualClipsForPersist } from './shortVideoVisualClips';
import { sanitizeTextClipsForPersist } from './shortVideoTextClips';
import { sanitizeHtmlClipsForPersist } from './shortVideoHtmlClips';
import { ensureManifestTimelineTracks } from './shortVideoTimelineTracks';
import {
    resolveSceneVisualImageRef,
    resolveSceneVisualRefByType,
    resolveSceneVisualVideoRef,
    sceneVisualRefIsValid,
    syncLayoutActiveVisualRef,
} from './shortVideoVisualRefHelpers';
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
    'visual_image_ref',
    'visual_video_ref',
    'visual_video_preview_url',
    'visual_youtube_id',
    'visual_youtube_muted',
    'visual_audio_volume',
    'visual_motion',
    'visual_start_sec',
    'show_visual',
];

export { clampAudioVolume, audioVolumePercent, audioVolumeFromPercent } from './shortVideoAudioVolume';

export function resolveSceneAudioVolume(scene: ShortVideoManifestScene): number {
    const stored = scene.audio_volume;
    if (typeof stored === 'number' && Number.isFinite(stored)) {
        return clampAudioVolume(stored);
    }
    return 1;
}

export function resolveSceneVisualAudioVolume(scene: ShortVideoManifestScene): number {
    const stored = scene.layout?.visual_audio_volume;
    if (typeof stored === 'number' && Number.isFinite(stored)) {
        return clampAudioVolume(stored);
    }
    if (scene.layout?.visual_youtube_muted === false) {
        return 1;
    }
    return 0;
}

export function sceneBackgroundColor(
    scene: ShortVideoManifestScene,
    manifest: ShortVideoRenderManifest
): string {
    const custom = scene.layout?.background?.trim();
    if (custom) {
        return custom;
    }
    return manifest.style?.bg && manifest.style.bg !== '#000000' && manifest.style.bg !== '#000'
        ? manifest.style.bg
        : '#E9E5DB';
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
    return sceneVisualRefIsValid(scene, visualType);
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
    if (override === 'stock' || override === 'article_image' || override === 'thumbnail') {
        const playback = scene.layout?.visual_playback_url?.trim() || '';
        if (playback) {
            return 'image';
        }
        const ref = resolveSceneVisualImageRef(scene) || scene.layout?.visual_ref?.trim() || '';
        if (ref && isHttpsImageUrl(ref)) {
            return 'image';
        }
        return 'none';
    }
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
    const ref = resolveSceneVisualVideoRef(scene);
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
    return resolveSceneVisualRefByType(scene, resolveSceneVisualType(scene));
}

export { resolveSceneVisualImageRef, resolveSceneVisualVideoRef } from './shortVideoVisualRefHelpers';

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
    if (typeof scene.layout?.visual_audio_volume === 'number') {
        return resolveSceneVisualAudioVolume(scene) <= AUDIO_VOLUME_EPSILON;
    }
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
                layout: pruneLayout(syncLayoutActiveVisualRef(layout)),
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

export function resolveDefaultSceneAudioTtsSettings(
    manifestLang?: string,
    voiceConfig?: ShortVideoVoiceConfig | null,
): ShortVideoSaydiAudioTtsSettings {
    const lang = manifestLang?.trim().toLowerCase() || 'vi';
    const voiceSample = voiceConfig?.voice_saydi?.trim() || '';
    return {
        provider: 'saydi',
        lang_code: lang,
        voice_sample: voiceSample,
    };
}

export function resolveDefaultVbeeSceneAudioTtsSettings(
    voiceConfig?: ShortVideoVoiceConfig | null,
): ShortVideoVbeeAudioTtsSettings {
    const voiceCode = voiceConfig?.voice_vbee?.trim() || '';
    return {
        provider: 'vbee',
        voice_code: voiceCode,
        speed: 1,
    };
}

export function resolveSceneAudioTtsSettings(
    scene: ShortVideoManifestScene,
    manifestLang?: string,
    voiceConfig?: ShortVideoVoiceConfig | null,
): ShortVideoSceneAudioTtsSettings {
    const saydiDefaults = resolveDefaultSceneAudioTtsSettings(manifestLang, voiceConfig);
    const vbeeDefaults = resolveDefaultVbeeSceneAudioTtsSettings(voiceConfig);
    const stored = scene.audio_tts_settings;
    if (stored?.provider === 'vbee') {
        return {
            provider: 'vbee',
            voice_code: stored.voice_code?.trim() || vbeeDefaults.voice_code || '',
            speed: typeof stored.speed === 'number' && stored.speed > 0 ? stored.speed : 1,
        };
    }
    if (stored?.provider === 'saydi') {
        return {
            provider: 'saydi',
            lang_code: stored.lang_code?.trim() || manifestLang?.trim() || 'vi',
            voice_sample: stored.voice_sample?.trim() || saydiDefaults.voice_sample || '',
        };
    }
    return saydiDefaults;
}

/** Bỏ field transient trước khi so sánh fingerprint / lưu. */
export function sanitizeManifestForPersist(
    manifest: ShortVideoRenderManifest
): ShortVideoRenderManifest {
    const normalized = ensureManifestTimelineTracks(manifest);
    return {
        ...normalized,
        visual_clips: sanitizeVisualClipsForPersist(normalized.visual_clips),
        text_clips: sanitizeTextClipsForPersist(normalized.text_clips),
        html_clips: sanitizeHtmlClipsForPersist(normalized.html_clips),
        preview_suppress_text_clip_ids: undefined,
        preview_suppress_html_clip_ids: undefined,
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
    const normalized = resolveVisualPlaybackPreviewUrl(playbackUrl) || playbackUrl.trim();
    return {
        ...manifest,
        scenes: manifest.scenes.map((scene) => {
            if (scene.id !== sceneId) {
                return scene;
            }
            const layout = { ...(scene.layout ?? {}), visual_playback_url: normalized };
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
