import type {
    ShortVideoHtmlClip,
    ShortVideoRenderManifest,
} from './shortVideoRenderManifestTypes';
import { normalizeItemZIndex } from './shortVideoTimelineItemZIndex';
import { isHtmlClipEffectivelyHidden } from './shortVideoTimelineVisibility';
import { buildHtmlClipDocument } from './shortVideoHtmlClipDocument';

export { buildHtmlClipDocument } from './shortVideoHtmlClipDocument';

export type { ShortVideoHtmlClip } from './shortVideoRenderManifestTypes';

const MIN_CLIP_DURATION_SEC = 0.1;
const DEFAULT_HTML_DURATION_SEC = 5;
const MAX_HTML_FIELD_BYTES = 512 * 1024;

export const HTML_CLIP_DEFAULT_TIMELINE_LABEL = 'HTML';
export const SHORT_VIDEO_HTML_DRAG_MIME = 'application/x-short-video-html';

export type ShortVideoHtmlDragPreset = 'blank' | 'intro';

export const HTML_CLIP_BLANK_PRESET: Partial<ShortVideoHtmlClip> = {
    label: 'HTML scene',
    html: '<div id="app"><h1>HTML scene</h1></div>',
    css: `@keyframes fadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
#app {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  color: #fff;
  font-family: system-ui, sans-serif;
}
#app h1 {
  animation: fadeIn 0.8s ease-out both;
}`,
    js: '',
};

export const HTML_CLIP_INTRO_PRESET: Partial<ShortVideoHtmlClip> = {
    label: 'Intro HTML',
    html: '<div id="app"><p class="eyebrow">Spacedev</p><h1>Tiêu đề intro</h1></div>',
    css: `@keyframes rise {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}
#app {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  min-height: 100vh;
  padding: 64px;
  color: #fff;
  font-family: system-ui, sans-serif;
}
.eyebrow {
  margin: 0 0 12px;
  font-size: 28px;
  color: #ff3331;
  animation: rise 0.6s ease-out both;
}
h1 {
  margin: 0;
  font-size: 72px;
  line-height: 1.1;
  animation: rise 0.8s ease-out 0.15s both;
}`,
    js: '',
};

export function serializeHtmlClipDragPayload(preset: ShortVideoHtmlDragPreset): string {
    return JSON.stringify({ preset });
}

export function parseHtmlClipDragPayload(raw: string): ShortVideoHtmlDragPreset | null {
    try {
        const parsed = JSON.parse(raw) as { preset?: string };
        if (parsed.preset === 'blank' || parsed.preset === 'intro') {
            return parsed.preset;
        }
    } catch {
        return null;
    }
    return null;
}

export function resolveHtmlClipDragPreset(
    preset: ShortVideoHtmlDragPreset
): Partial<ShortVideoHtmlClip> {
    return preset === 'intro' ? HTML_CLIP_INTRO_PRESET : HTML_CLIP_BLANK_PRESET;
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
    const activeIds = resolveActiveHtmlClipsAtSec(manifest, timeSec).map((clip) => clip.id);
    if (activeIds.length === 0) {
        return {
            ...manifest,
            preview_suppress_html_clip_ids: undefined,
        };
    }
    return {
        ...manifest,
        preview_suppress_html_clip_ids: activeIds,
    };
}

export function sanitizeHtmlClipsForPersist(
    clips: ShortVideoHtmlClip[] | undefined
): ShortVideoHtmlClip[] | undefined {
    if (!Array.isArray(clips) || clips.length === 0) {
        return undefined;
    }
    return clips.map((clip) => {
        const normalized = clampHtmlClipTiming(clip);
        const { prerender_playback_url: _ignored, ...rest } = normalized;
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
