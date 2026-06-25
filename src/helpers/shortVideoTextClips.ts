import type {
    ShortVideoRenderManifest,
    ShortVideoTextClip,
    ShortVideoTextClipBackgroundEffect,
    ShortVideoTextClipMotion,
    ShortVideoTextFontWeight,
    ShortVideoTextTransform,
} from './shortVideoRenderManifestTypes';
import { TEXT_CLIP_SLIDE_ENTER_MOTIONS } from './shortVideoRenderManifestTypes';
import {
    TEXT_CLIP_ENTER_DURATION_SEC,
    TEXT_CLIP_EXIT_DURATION_SEC,
} from './shortVideoTextClipAnimationConstants';
import {
    normalizeItemZIndex,
    resolveTextClipOverlayZIndex,
} from './shortVideoTimelineItemZIndex';
import { mergePreviewSuppressIds } from './shortVideoPreviewManifestClone';
import { isTextClipEffectivelyHidden } from './shortVideoTimelineVisibility';

export type { ShortVideoTextClip } from './shortVideoRenderManifestTypes';
export {
    TEXT_CLIP_BACKGROUND_EFFECT_OPTIONS,
    TEXT_CLIP_ENTER_SLIDE_OPTIONS,
    TEXT_CLIP_ENTER_SLIDE_GROUP,
    TEXT_CLIP_EXIT_SLIDE_GROUP,
} from './shortVideoRenderManifestTypes';
export { TEXT_CLIP_ENTER_DURATION_SEC, TEXT_CLIP_EXIT_DURATION_SEC } from './shortVideoTextClipAnimationConstants';

export const TEXT_CLIP_ENTER_DURATION_MIN_SEC = 0.05;
export const TEXT_CLIP_ENTER_DURATION_MAX_SEC = 3;

export const TEXT_CLIP_EXIT_DURATION_MIN_SEC = TEXT_CLIP_ENTER_DURATION_MIN_SEC;
export const TEXT_CLIP_EXIT_DURATION_MAX_SEC = TEXT_CLIP_ENTER_DURATION_MAX_SEC;

export const TEXT_CLIP_MAX_WIDTH_RATIO = 0.92;

export function resolveTextClipMaxWidthPx(compositionWidth: number): number {
    return Math.max(1, compositionWidth * TEXT_CLIP_MAX_WIDTH_RATIO);
}

export function scaleTextClipPx(
    valuePx: number,
    compositionAxis: number,
    displayAxis: number
): number {
    if (compositionAxis <= 0) {
        return valuePx;
    }
    return (valuePx / compositionAxis) * displayAxis;
}

export const TEXT_CLIP_MOTION_OPTIONS = [
    { value: 'none', label: 'Không hiệu ứng' },
    { value: 'fade', label: 'Fade' },
    { value: 'pop', label: 'Pop' },
] as const;

export const TEXT_CLIP_FONT_WEIGHT_OPTIONS = [
    { value: '400', label: 'Thường (400)' },
    { value: '600', label: 'Semi-bold (600)' },
    { value: '700', label: 'Đậm (700)' },
    { value: '800', label: 'Extra-bold (800)' },
    { value: '900', label: 'Black (900)' },
] as const;

export const TEXT_CLIP_TRANSFORM_OPTIONS = [
    { value: 'none', label: 'Giữ nguyên' },
    { value: 'uppercase', label: 'In hoa' },
    { value: 'lowercase', label: 'In thường' },
    { value: 'capitalize', label: 'Hoa đầu từ' },
] as const;

const DEFAULT_LINE_HEIGHT_PERCENT = 120;
const DEFAULT_BOX_MAX_WIDTH_PERCENT = TEXT_CLIP_MAX_WIDTH_RATIO * 100;

const MIN_CLIP_DURATION_SEC = 0.1;
const DEFAULT_TEXT_DURATION_SEC = 4;

export const TEXT_CLIP_DEFAULT_TIMELINE_LABEL = 'Text';

export const TEXT_CLIP_TITLE_PRESET: Partial<ShortVideoTextClip> = {
    label: 'Tiêu đề',
    content: 'Tiêu đề',
    font_size: 72,
    font_weight: 700,
    color: '#FFFFFF',
    opacity: 100,
    text_align: 'center',
    position_x: 50,
    position_y: 50,
    motion: 'pop',
};

export const TEXT_CLIP_BODY_PRESET: Partial<ShortVideoTextClip> = {
    label: 'Nội dung chính',
    content: 'Nội dung chính',
    font_size: 48,
    font_weight: 700,
    color: '#FFFFFF',
    opacity: 100,
    text_align: 'center',
    position_x: 50,
    position_y: 50,
    motion: 'fade',
};

export const SHORT_VIDEO_TEXT_DRAG_MIME = 'application/x-short-video-text';

export type ShortVideoTextDragPreset = 'title' | 'body';

export function serializeTextClipDragPayload(preset: ShortVideoTextDragPreset): string {
    return JSON.stringify({ preset });
}

export function parseTextClipDragPayload(raw: string): ShortVideoTextDragPreset | null {
    try {
        const parsed = JSON.parse(raw) as { preset?: string };
        if (parsed.preset === 'title' || parsed.preset === 'body') {
            return parsed.preset;
        }
    } catch {
        return null;
    }
    return null;
}

export function resolveTextClipPresetByDragKind(
    kind: ShortVideoTextDragPreset
): Partial<ShortVideoTextClip> {
    return kind === 'title' ? TEXT_CLIP_TITLE_PRESET : TEXT_CLIP_BODY_PRESET;
}

function clampPercent(value: number | undefined, fallback: number): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return fallback;
    }
    return Math.max(0, Math.min(100, value));
}

function clampOpacity(value: number | undefined, fallback = 100): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return fallback;
    }
    return Math.max(0, Math.min(100, value));
}

const ALLOWED_TEXT_CLIP_MOTIONS: ShortVideoTextClipMotion[] = [
    'none', 'fade', 'pop',
    ...TEXT_CLIP_SLIDE_ENTER_MOTIONS,
];

function normalizeMotion(value: string | undefined): ShortVideoTextClipMotion {
    if (value && (ALLOWED_TEXT_CLIP_MOTIONS as string[]).includes(value)) {
        return value as ShortVideoTextClipMotion;
    }
    return 'pop';
}

function normalizeFontWeight(value: unknown): ShortVideoTextFontWeight {
    const weight = Number(value);
    if (weight === 400 || weight === 600 || weight === 700 || weight === 800 || weight === 900) {
        return weight;
    }
    return 700;
}

function normalizeTextTransform(value: string | undefined): ShortVideoTextTransform {
    if (value === 'uppercase' || value === 'lowercase' || value === 'capitalize') {
        return value;
    }
    return 'none';
}

function clampSkewDeg(value: number | undefined): number | undefined {
    if (typeof value !== 'number' || !Number.isFinite(value) || value === 0) {
        return undefined;
    }
    return Math.max(-45, Math.min(45, value));
}

export function resolveTextClipDisplayContent(clip: ShortVideoTextClip): string {
    const content = normalizeTextClip(clip).content;
    switch (clip.text_transform) {
        case 'uppercase':
            return content.toUpperCase();
        case 'lowercase':
            return content.toLowerCase();
        case 'capitalize':
            return content.replace(/\b\w/g, (char) => char.toUpperCase());
        default:
            return content;
    }
}

export function resolveTextClipLineHeight(clip: ShortVideoTextClip): number {
    const percent = clip.line_height_percent;
    if (typeof percent === 'number' && percent > 0) {
        return percent / 100;
    }
    return DEFAULT_LINE_HEIGHT_PERCENT / 100;
}

export function resolveTextClipLetterSpacingPx(clip: ShortVideoTextClip): number | undefined {
    const value = clip.letter_spacing_px;
    if (typeof value !== 'number' || !Number.isFinite(value) || value === 0) {
        return undefined;
    }
    return value;
}

export function resolveTextClipSkewXDeg(clip: ShortVideoTextClip): number {
    return clip.skew_x_deg ?? 0;
}

export function resolveTextClipBoxMaxWidthPercent(clip: ShortVideoTextClip): number {
    const value = clip.box_max_width_percent;
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.max(10, Math.min(100, value));
    }
    return DEFAULT_BOX_MAX_WIDTH_PERCENT;
}

export function resolveTextClipBoxMaxWidthPx(
    clip: ShortVideoTextClip,
    compositionWidth: number
): number {
    return Math.max(1, compositionWidth * (resolveTextClipBoxMaxWidthPercent(clip) / 100));
}

export function resolveTextClipFontWeightValue(clip: ShortVideoTextClip): ShortVideoTextFontWeight {
    return normalizeFontWeight(clip.font_weight);
}

export function hasTextClipEnterAnimation(motion: string | undefined): boolean {
    const resolved = motion ?? 'pop';
    return resolved !== 'none';
}

export function clampTextClipEnterDurationSec(
    value: number,
    clipDurationSec: number
): number {
    const max = Math.min(
        Math.max(MIN_CLIP_DURATION_SEC, clipDurationSec),
        TEXT_CLIP_ENTER_DURATION_MAX_SEC
    );
    return Math.round(
        Math.max(TEXT_CLIP_ENTER_DURATION_MIN_SEC, Math.min(max, value)) * 100
    ) / 100;
}

export function resolveTextClipEnterDurationSec(
    clip: Pick<ShortVideoTextClip, 'enter_duration_sec' | 'duration_sec'>
): number {
    const clipDuration = Math.max(MIN_CLIP_DURATION_SEC, clip.duration_sec);
    if (typeof clip.enter_duration_sec === 'number' && Number.isFinite(clip.enter_duration_sec)) {
        return clampTextClipEnterDurationSec(clip.enter_duration_sec, clipDuration);
    }
    return clampTextClipEnterDurationSec(TEXT_CLIP_ENTER_DURATION_SEC, clipDuration);
}

export function resolveTextClipEnterMotionLabel(motion: string | undefined): string {
    switch (motion) {
        case 'slide_up':
            return 'Slide up';
        case 'slide_down':
            return 'Slide down';
        case 'slide_left':
            return 'Slide left';
        case 'slide_right':
            return 'Slide right';
        case 'fade':
            return 'Fade';
        case 'pop':
            return 'Pop';
        case 'none':
            return 'None';
        default:
            return 'Pop';
    }
}

export function hasTextClipExitAnimation(motion: string | undefined): boolean {
    return Boolean(motion && motion !== 'none');
}

export function clampTextClipExitDurationSec(
    value: number,
    clipDurationSec: number
): number {
    return clampTextClipEnterDurationSec(value, clipDurationSec);
}

export function resolveTextClipExitDurationSec(
    clip: Pick<ShortVideoTextClip, 'exit_duration_sec' | 'duration_sec' | 'exit_motion'>
): number {
    const clipDuration = Math.max(MIN_CLIP_DURATION_SEC, clip.duration_sec);
    if (!hasTextClipExitAnimation(clip.exit_motion)) {
        return clampTextClipExitDurationSec(TEXT_CLIP_EXIT_DURATION_SEC, clipDuration);
    }
    if (typeof clip.exit_duration_sec === 'number' && Number.isFinite(clip.exit_duration_sec)) {
        return clampTextClipExitDurationSec(clip.exit_duration_sec, clipDuration);
    }
    return clampTextClipExitDurationSec(TEXT_CLIP_EXIT_DURATION_SEC, clipDuration);
}

export function resolveTextClipExitMotionLabel(motion: string | undefined): string {
    return resolveTextClipEnterMotionLabel(motion);
}

export function isSlideExitMotion(motion: string | undefined): boolean {
    return isSlideEnterMotion(motion);
}

export function isSlideEnterMotion(motion: string | undefined): boolean {
    if (!motion) {
        return false;
    }
    return (TEXT_CLIP_SLIDE_ENTER_MOTIONS as string[]).includes(motion);
}

function normalizeExitMotion(value: string | undefined): ShortVideoTextClipMotion | 'none' | undefined {
    if (!value || value === 'none') {
        return undefined;
    }
    if ((ALLOWED_TEXT_CLIP_MOTIONS as string[]).includes(value)) {
        return value as ShortVideoTextClipMotion;
    }
    return undefined;
}

const ALLOWED_BACKGROUND_EFFECTS: ShortVideoTextClipBackgroundEffect[] = [
    'disabled',
    'sliding',
    'scaling',
    'scaling_w_clip',
];

export function normalizeBackgroundEffect(
    value: string | undefined,
    hasBackgroundColor: boolean
): ShortVideoTextClipBackgroundEffect | undefined {
    if (!hasBackgroundColor || !value) {
        return undefined;
    }
    if ((ALLOWED_BACKGROUND_EFFECTS as string[]).includes(value)) {
        return value as ShortVideoTextClipBackgroundEffect;
    }
    return undefined;
}

export function resolveTextClipTimelineLabel(clip: ShortVideoTextClip): string {
    return clip.label?.trim() || TEXT_CLIP_DEFAULT_TIMELINE_LABEL;
}

export function normalizeTextClip(clip: ShortVideoTextClip): ShortVideoTextClip {
    const rawContent = typeof clip.content === 'string' ? clip.content : '';
    const content = rawContent.trim().length === 0 ? 'Text' : rawContent;
    const label = resolveTextClipTimelineLabel({ ...clip, content });
    const lineHeightPercent = typeof clip.line_height_percent === 'number' && clip.line_height_percent > 0
        ? Math.max(50, Math.min(300, clip.line_height_percent))
        : undefined;
    const letterSpacingPx = typeof clip.letter_spacing_px === 'number' && Number.isFinite(clip.letter_spacing_px)
        ? clip.letter_spacing_px
        : undefined;
    const boxMaxWidthPercent = typeof clip.box_max_width_percent === 'number'
        && Number.isFinite(clip.box_max_width_percent)
        ? Math.max(10, Math.min(100, clip.box_max_width_percent))
        : undefined;
    const skewXDeg = clampSkewDeg(clip.skew_x_deg);
    const textTransform = normalizeTextTransform(clip.text_transform);
    const motion = normalizeMotion(clip.motion);
    const exitMotion = normalizeExitMotion(clip.exit_motion);
    const clipDuration = Math.max(MIN_CLIP_DURATION_SEC, clip.duration_sec);
    const enterDurationSec = hasTextClipEnterAnimation(motion)
        ? clampTextClipEnterDurationSec(
            clip.enter_duration_sec ?? TEXT_CLIP_ENTER_DURATION_SEC,
            clipDuration
        )
        : undefined;
    const exitDurationSec = hasTextClipExitAnimation(exitMotion)
        ? clampTextClipExitDurationSec(
            clip.exit_duration_sec ?? TEXT_CLIP_EXIT_DURATION_SEC,
            clipDuration
        )
        : undefined;

    const backgroundColor = clip.background_color?.trim() || undefined;
    const backgroundEffect = normalizeBackgroundEffect(
        clip.background_effect,
        Boolean(backgroundColor)
    );

    return {
        ...clip,
        content,
        label,
        start_sec: Math.max(0, clip.start_sec),
        duration_sec: Math.max(MIN_CLIP_DURATION_SEC, clip.duration_sec),
        font_size: typeof clip.font_size === 'number' && clip.font_size > 0 ? clip.font_size : 48,
        font_weight: normalizeFontWeight(clip.font_weight),
        color: clip.color?.trim() || '#FFFFFF',
        opacity: clampOpacity(clip.opacity),
        text_align: clip.text_align === 'left' || clip.text_align === 'right' ? clip.text_align : 'center',
        line_height_percent: lineHeightPercent,
        letter_spacing_px: letterSpacingPx,
        skew_x_deg: skewXDeg,
        text_transform: textTransform === 'none' ? undefined : textTransform,
        box_max_width_percent: boxMaxWidthPercent,
        background_color: backgroundColor,
        background_opacity: backgroundColor
            ? clampOpacity(clip.background_opacity, 100)
            : undefined,
        background_effect: backgroundEffect,
        padding_x: typeof clip.padding_x === 'number' && clip.padding_x >= 0 ? clip.padding_x : 16,
        padding_y: typeof clip.padding_y === 'number' && clip.padding_y >= 0 ? clip.padding_y : 8,
        border_radius: typeof clip.border_radius === 'number' && clip.border_radius >= 0
            ? clip.border_radius
            : 0,
        position_x: clampPercent(clip.position_x, 50),
        position_y: clampPercent(clip.position_y, 50),
        motion,
        enter_duration_sec: enterDurationSec,
        exit_motion: exitMotion,
        exit_duration_sec: exitDurationSec,
        z_index: normalizeItemZIndex(clip.z_index),
    };
}

export function clampTextClipTiming(clip: ShortVideoTextClip): ShortVideoTextClip {
    return normalizeTextClip({
        ...clip,
        start_sec: Math.max(0, clip.start_sec),
        duration_sec: Math.max(MIN_CLIP_DURATION_SEC, clip.duration_sec),
    });
}

export function setTextClipsInManifest(
    manifest: ShortVideoRenderManifest,
    clips: ShortVideoTextClip[]
): ShortVideoRenderManifest {
    return {
        ...manifest,
        text_clips: clips.map((clip) => clampTextClipTiming(clip)),
    };
}

export function updateTextClipInManifest(
    manifest: ShortVideoRenderManifest,
    clipId: string,
    patch: Partial<ShortVideoTextClip>
): ShortVideoRenderManifest {
    const clips = manifest.text_clips ?? [];
    return {
        ...manifest,
        text_clips: clips.map((clip) => (
            clip.id === clipId ? clampTextClipTiming({ ...clip, ...patch }) : clip
        )),
    };
}

export function removeTextClipFromManifest(
    manifest: ShortVideoRenderManifest,
    clipId: string
): ShortVideoRenderManifest {
    const remaining = (manifest.text_clips ?? []).filter((clip) => clip.id !== clipId);
    return {
        ...manifest,
        text_clips: remaining.length > 0 ? remaining : undefined,
    };
}

export function addTextClipAtSec(
    manifest: ShortVideoRenderManifest,
    startSec: number,
    preset: Partial<ShortVideoTextClip> & { timeline_track_id: string }
): ShortVideoRenderManifest {
    const trackId = preset.timeline_track_id.trim();
    if (!trackId) {
        return manifest;
    }
    const existing = manifest.text_clips ?? [];
    const index = existing.length + 1;
    const clip = clampTextClipTiming({
        id: `txt_${index}_${Date.now().toString(36)}`,
        content: 'Text',
        start_sec: Math.max(0, startSec),
        duration_sec: DEFAULT_TEXT_DURATION_SEC,
        ...preset,
        timeline_track_id: trackId,
    });
    return {
        ...manifest,
        text_clips: [...existing, clip],
    };
}

export function resolveActiveTextClipsAtSec(
    manifest: ShortVideoRenderManifest,
    timeSec: number
): ShortVideoTextClip[] {
    const clips = manifest.text_clips ?? [];
    if (clips.length === 0) {
        return [];
    }
    const active = clips.filter((clip) => {
        if (isTextClipEffectivelyHidden(manifest, clip)) {
            return false;
        }
        const end = clip.start_sec + clip.duration_sec;
        return timeSec >= clip.start_sec - 0.01 && timeSec < end + 0.01;
    });
    return [...active].sort((a, b) => {
        const zDiff = resolveTextClipOverlayZIndex(manifest, a)
            - resolveTextClipOverlayZIndex(manifest, b);
        if (zDiff !== 0) {
            return zDiff;
        }
        return a.start_sec - b.start_sec || a.id.localeCompare(b.id);
    });
}

export function resolveTextClipRenderZIndex(
    manifest: ShortVideoRenderManifest,
    clip: ShortVideoTextClip
): number {
    return resolveTextClipOverlayZIndex(manifest, clip);
}

export function buildPreviewManifestWithTextOverlay(
    manifest: ShortVideoRenderManifest,
    timeSec: number,
    selectedTextClipId: string
): ShortVideoRenderManifest {
    if (!selectedTextClipId) {
        return mergePreviewSuppressIds(manifest, 'preview_suppress_text_clip_ids', []);
    }
    const activeIds = resolveActiveTextClipsAtSec(manifest, timeSec).map((clip) => clip.id);
    return mergePreviewSuppressIds(manifest, 'preview_suppress_text_clip_ids', activeIds);
}

export function resolveActiveTextClipAtSec(
    manifest: ShortVideoRenderManifest,
    timeSec: number,
    preferredClipId?: string
): ShortVideoTextClip | null {
    const clips = manifest.text_clips ?? [];
    if (clips.length === 0) {
        return null;
    }
    if (preferredClipId) {
        const preferred = clips.find((clip) => clip.id === preferredClipId);
        if (preferred) {
            const end = preferred.start_sec + preferred.duration_sec;
            if (timeSec >= preferred.start_sec - 0.01 && timeSec < end + 0.01) {
                return preferred;
            }
        }
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

export function sanitizeTextClipsForPersist(
    clips: ShortVideoTextClip[] | undefined
): ShortVideoTextClip[] | undefined {
    if (!Array.isArray(clips) || clips.length === 0) {
        return undefined;
    }
    return clips.map((clip) => clampTextClipTiming(clip));
}
