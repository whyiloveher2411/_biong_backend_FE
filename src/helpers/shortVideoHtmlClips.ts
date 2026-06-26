import type {
    ShortVideoHtmlClip,
    ShortVideoRenderManifest,
} from './shortVideoRenderManifestTypes';
import { mergePreviewSuppressIds } from './shortVideoPreviewManifestClone';
import { normalizeItemZIndex } from './shortVideoTimelineItemZIndex';
import { isHtmlClipEffectivelyHidden } from './shortVideoTimelineVisibility';
import { buildHtmlClipDocument } from './shortVideoHtmlClipDocument';
import { buildFrameBaseCss, buildFrameShellHtml } from './shortVideoFrameDesignTokens';
import { resolveShortVideoHtmlTemplatePreset } from './shortVideoHtmlTemplatePresets';

export { buildHtmlClipDocument } from './shortVideoHtmlClipDocument';
export { resolveShortVideoHtmlTemplatePreset, SHORT_VIDEO_HTML_TEMPLATE_IDS } from './shortVideoHtmlTemplatePresets';
export type { ShortVideoHtmlTemplateData, ShortVideoHtmlTemplateId } from './shortVideoHtmlTemplatePresets';

export type { ShortVideoHtmlClip } from './shortVideoRenderManifestTypes';

const MIN_CLIP_DURATION_SEC = 0.1;
const DEFAULT_HTML_DURATION_SEC = 5;
const MAX_HTML_FIELD_BYTES = 512 * 1024;

export const HTML_CLIP_DEFAULT_TIMELINE_LABEL = 'HTML';
export const SHORT_VIDEO_HTML_DRAG_MIME = 'application/x-short-video-html';

export type ShortVideoHtmlDragPreset = 'blank' | 'intro' | 'frame_cover' | 'frame_chapter' | 'frame_poster';

const FRAME_BLANK_CSS = buildFrameBaseCss();

export const HTML_CLIP_BLANK_PRESET: Partial<ShortVideoHtmlClip> = {
    label: 'HTML scene',
    html: buildFrameShellHtml('<p class="micro-label">Frame</p><h1 class="type-display--sm">Tiêu đề</h1>'),
    css: FRAME_BLANK_CSS,
    js: '',
};

export const HTML_CLIP_INTRO_PRESET: Partial<ShortVideoHtmlClip> = resolveShortVideoHtmlTemplatePreset('intro', {
    kicker: 'Spacedev',
    title: 'Tiêu đề intro',
}) ?? HTML_CLIP_BLANK_PRESET;

export const HTML_CLIP_FRAME_COVER_PRESET: Partial<ShortVideoHtmlClip> =
    resolveShortVideoHtmlTemplatePreset('frame_cover', {
        kicker: 'Programme',
        title: 'Tiêu đề cover',
    }) ?? HTML_CLIP_BLANK_PRESET;

export const HTML_CLIP_FRAME_CHAPTER_PRESET: Partial<ShortVideoHtmlClip> =
    resolveShortVideoHtmlTemplatePreset('frame_chapter_divider', {
        ordinal: '01',
        title: 'Chương mới',
    }) ?? HTML_CLIP_BLANK_PRESET;

export const HTML_CLIP_FRAME_POSTER_PRESET: Partial<ShortVideoHtmlClip> =
    resolveShortVideoHtmlTemplatePreset('frame_poster_panel', {
        kicker: 'Tải ngay',
        headline: 'Spacedev',
        panelSide: 'bottom',
    }) ?? HTML_CLIP_BLANK_PRESET;

export function serializeHtmlClipDragPayload(preset: ShortVideoHtmlDragPreset): string {
    return JSON.stringify({ preset });
}

const HTML_DRAG_PRESETS: ShortVideoHtmlDragPreset[] = [
    'blank',
    'intro',
    'frame_cover',
    'frame_chapter',
    'frame_poster',
];

export function parseHtmlClipDragPayload(raw: string): ShortVideoHtmlDragPreset | null {
    try {
        const parsed = JSON.parse(raw) as { preset?: string };
        if (HTML_DRAG_PRESETS.includes(parsed.preset as ShortVideoHtmlDragPreset)) {
            return parsed.preset as ShortVideoHtmlDragPreset;
        }
    } catch {
        return null;
    }
    return null;
}

export function resolveHtmlClipDragPreset(
    preset: ShortVideoHtmlDragPreset
): Partial<ShortVideoHtmlClip> {
    switch (preset) {
        case 'intro':
            return HTML_CLIP_INTRO_PRESET;
        case 'frame_cover':
            return HTML_CLIP_FRAME_COVER_PRESET;
        case 'frame_chapter':
            return HTML_CLIP_FRAME_CHAPTER_PRESET;
        case 'frame_poster':
            return HTML_CLIP_FRAME_POSTER_PRESET;
        default:
            return HTML_CLIP_BLANK_PRESET;
    }
}

function clampFieldSize(value: string, maxBytes: number): string {
    const encoder = new TextEncoder();
    if (encoder.encode(value).length <= maxBytes) {
        return value;
    }
    let trimmed = value;
    while (trimmed.length > 0 && encoder.encode(trimmed).length > maxBytes) {
        trimmed = trimmed.slice(0, -256);
    }
    return trimmed;
}

export function buildHtmlClipSrcDoc(
    clip: Pick<ShortVideoHtmlClip, 'html' | 'css' | 'js'>,
    options?: { width?: number; height?: number }
): string {
    return buildHtmlClipDocument(clip, options);
}

export function seekHtmlClipIframeTime(
    iframe: HTMLIFrameElement | null | undefined,
    localTimeSec: number
): void {
    if (!iframe?.contentWindow) {
        return;
    }
    iframe.contentWindow.postMessage({
        type: 'shortvideo-seek',
        timeSec: Math.max(0, localTimeSec),
    }, '*');
}

export function resolveHtmlClipTimelineLabel(clip: ShortVideoHtmlClip): string {
    return clip.label?.trim() || HTML_CLIP_DEFAULT_TIMELINE_LABEL;
}

export function normalizeHtmlClip(clip: ShortVideoHtmlClip): ShortVideoHtmlClip {
    const html = clampFieldSize(
        typeof clip.html === 'string' ? clip.html : '',
        MAX_HTML_FIELD_BYTES
    );
    const css = clip.css !== undefined
        ? clampFieldSize(String(clip.css), MAX_HTML_FIELD_BYTES)
        : undefined;
    const js = clip.js !== undefined
        ? clampFieldSize(String(clip.js), MAX_HTML_FIELD_BYTES)
        : undefined;
    const label = resolveHtmlClipTimelineLabel({ ...clip, html });
    return {
        ...clip,
        html: html.trim() || '<div id="app"></div>',
        css: css?.trim() ? css : undefined,
        js: js?.trim() ? js : undefined,
        label,
        start_sec: Math.max(0, clip.start_sec),
        duration_sec: Math.max(MIN_CLIP_DURATION_SEC, clip.duration_sec),
        z_index: normalizeItemZIndex(clip.z_index),
        prerender_playback_url: clip.prerender_playback_url?.trim() || undefined,
    };
}

export function clampHtmlClipTiming(clip: ShortVideoHtmlClip): ShortVideoHtmlClip {
    return normalizeHtmlClip({
        ...clip,
        start_sec: Math.max(0, clip.start_sec),
        duration_sec: Math.max(MIN_CLIP_DURATION_SEC, clip.duration_sec),
    });
}

export function setHtmlClipsInManifest(
    manifest: ShortVideoRenderManifest,
    clips: ShortVideoHtmlClip[]
): ShortVideoRenderManifest {
    return {
        ...manifest,
        html_clips: clips.map((clip) => clampHtmlClipTiming(clip)),
    };
}

export function updateHtmlClipInManifest(
    manifest: ShortVideoRenderManifest,
    clipId: string,
    patch: Partial<ShortVideoHtmlClip>
): ShortVideoRenderManifest {
    const clips = manifest.html_clips ?? [];
    return {
        ...manifest,
        html_clips: clips.map((clip) => (
            clip.id === clipId ? clampHtmlClipTiming({ ...clip, ...patch }) : clip
        )),
    };
}

export function removeHtmlClipFromManifest(
    manifest: ShortVideoRenderManifest,
    clipId: string
): ShortVideoRenderManifest {
    const remaining = (manifest.html_clips ?? []).filter((clip) => clip.id !== clipId);
    return {
        ...manifest,
        html_clips: remaining.length > 0 ? remaining : undefined,
    };
}

export function addHtmlClipAtSec(
    manifest: ShortVideoRenderManifest,
    startSec: number,
    preset: Partial<ShortVideoHtmlClip> & { timeline_track_id: string }
): ShortVideoRenderManifest {
    const trackId = preset.timeline_track_id.trim();
    if (!trackId) {
        return manifest;
    }
    const existing = manifest.html_clips ?? [];
    const index = existing.length + 1;
    const clip = clampHtmlClipTiming({
        id: `html_${index}_${Date.now().toString(36)}`,
        html: '<div id="app"><h1>HTML scene</h1></div>',
        start_sec: Math.max(0, startSec),
        duration_sec: DEFAULT_HTML_DURATION_SEC,
        ...HTML_CLIP_BLANK_PRESET,
        ...preset,
        timeline_track_id: trackId,
    });
    return {
        ...manifest,
        html_clips: [...existing, clip],
    };
}

export function resolveActiveHtmlClipsAtSec(
    manifest: ShortVideoRenderManifest,
    timeSec: number
): ShortVideoHtmlClip[] {
    return (manifest.html_clips ?? []).filter((clip) => {
        if (isHtmlClipEffectivelyHidden(manifest, clip)) {
            return false;
        }
        const end = clip.start_sec + clip.duration_sec;
        return timeSec >= clip.start_sec - 0.01 && timeSec < end + 0.01;
    });
}

/** Chỉ hiển thị 1 HTML overlay tại một thời điểm — tránh chồng nhiều full-screen iframe. */
export function resolvePrimaryHtmlClipAtSec(
    manifest: ShortVideoRenderManifest,
    timeSec: number
): ShortVideoHtmlClip | null {
    const active = resolveActiveHtmlClipsAtSec(manifest, timeSec);
    if (active.length === 0) {
        return null;
    }
    if (active.length === 1) {
        return active[0];
    }
    const sorted = [...active].sort((a, b) => {
        const labelA = (a.label || '').toLowerCase();
        const labelB = (b.label || '').toLowerCase();
        const score = (label: string) => {
            if (label.includes('stats') || label.includes('big')) {
                return 3;
            }
            if (label.includes('brand') || label.includes('hook')) {
                return 2;
            }
            return 1;
        };
        const scoreDiff = score(labelB) - score(labelA);
        if (scoreDiff !== 0) {
            return scoreDiff;
        }
        return b.duration_sec - a.duration_sec || b.start_sec - a.start_sec;
    });
    return sorted[0];
}

export function resolveActiveHtmlClipAtSec(
    manifest: ShortVideoRenderManifest,
    timeSec: number,
    preferredClipId?: string
): ShortVideoHtmlClip | null {
    const clips = manifest.html_clips ?? [];
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
        if (isHtmlClipEffectivelyHidden(manifest, clip)) {
            continue;
        }
        const end = clip.start_sec + clip.duration_sec;
        if (timeSec >= clip.start_sec - 0.01 && timeSec < end + 0.01) {
            return clip;
        }
    }
    return null;
}

export function buildPreviewManifestWithHtmlOverlay(
    manifest: ShortVideoRenderManifest,
    timeSec: number
): ShortVideoRenderManifest {
    const active = resolveActiveHtmlClipsAtSec(manifest, timeSec);
    return mergePreviewSuppressIds(
        manifest,
        'preview_suppress_html_clip_ids',
        active.map((clip) => clip.id)
    );
}

export function sanitizeHtmlClipsForPersist(
    clips: ShortVideoHtmlClip[] | undefined
): ShortVideoHtmlClip[] | undefined {
    if (!Array.isArray(clips) || clips.length === 0) {
        return undefined;
    }
    return clips.map((clip) => {
        const normalized = clampHtmlClipTiming(clip);
        const rest = { ...normalized };
        delete rest.prerender_playback_url;
        return rest as ShortVideoHtmlClip;
    });
}

export function htmlClipContentHash(
    clip: Pick<ShortVideoHtmlClip, 'html' | 'css' | 'js' | 'duration_sec'>
): string {
    const payload = [
        clip.html ?? '',
        clip.css ?? '',
        clip.js ?? '',
        String(clip.duration_sec ?? 0),
    ].join('\n---\n');
    let hash = 0;
    for (let i = 0; i < payload.length; i += 1) {
        hash = ((hash << 5) - hash + payload.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(16);
}
