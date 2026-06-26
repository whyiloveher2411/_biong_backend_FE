import type {
    ShortVideoHtmlClip,
    ShortVideoHtmlOverlayMode,
    ShortVideoRenderManifest,
    ShortVideoVisualClip,
} from './shortVideoRenderManifestTypes';
import { FRAME_OVER_BROLL_MARKER } from './shortVideoFrameDesignTokens';

const MIN_OVERLAP_SEC = 0.35;

export type TimelineInterval = { start: number; end: number };

export function timelineItemInterval(item: {
    start_sec?: number;
    duration_sec?: number;
}): TimelineInterval {
    const start = Math.max(0, item.start_sec ?? 0);
    const end = start + Math.max(0.1, item.duration_sec ?? 0);
    return { start, end };
}

export function intervalsOverlap(
    a: TimelineInterval,
    b: TimelineInterval,
    minOverlapSec = MIN_OVERLAP_SEC
): boolean {
    const overlap = Math.min(a.end, b.end) - Math.max(a.start, b.start);
    return overlap >= minOverlapSec;
}

export function htmlClipOverlapsVisualClip(
    htmlClip: ShortVideoHtmlClip,
    visualClip: ShortVideoVisualClip
): boolean {
    return intervalsOverlap(
        timelineItemInterval(htmlClip),
        timelineItemInterval(visualClip)
    );
}

export function htmlClipOverlapsAnyVisual(
    htmlClip: ShortVideoHtmlClip,
    manifest: ShortVideoRenderManifest
): boolean {
    const visuals = manifest.visual_clips ?? [];
    if (visuals.length === 0) {
        return false;
    }
    return visuals.some((visual) => htmlClipOverlapsVisualClip(htmlClip, visual));
}

export function resolveHtmlClipOverlayMode(
    clip: ShortVideoHtmlClip,
    manifest: ShortVideoRenderManifest
): ShortVideoHtmlOverlayMode {
    const explicit = clip.overlay_mode;
    if (explicit === 'full_frame' || explicit === 'over_broll') {
        return explicit;
    }
    return htmlClipOverlapsAnyVisual(clip, manifest) ? 'over_broll' : 'full_frame';
}

function patchFrameHtmlForOverlayMode(
    html: string,
    mode: ShortVideoHtmlOverlayMode
): string {
    if (!html.includes('id="frame"') && !html.includes("id='frame'")) {
        return html;
    }
    if (mode === 'over_broll') {
        if (html.includes(FRAME_OVER_BROLL_MARKER)) {
            return html;
        }
        return html
            .replace(
                /<div\s+id="frame"([^>]*)>/i,
                '<div id="frame"$1 data-overlay="over_broll">'
            )
            .replace(
                /class="frame-content frame-animate-in"/g,
                'class="frame-content frame-animate-in frame-over-broll-slot"'
            );
    }
    return html
        .replace(/\s*data-overlay="over_broll"/gi, '')
        .replace(/\s*frame-over-broll-slot/g, '');
}

/** Áp layout overlay lên HTML/CSS clip theo overlay_mode. */
export function applyHtmlClipOverlayLayout(
    clip: ShortVideoHtmlClip,
    mode: ShortVideoHtmlOverlayMode
): ShortVideoHtmlClip {
    if (mode === 'full_frame') {
        return {
            ...clip,
            overlay_mode: 'full_frame',
            html: patchFrameHtmlForOverlayMode(clip.html, 'full_frame'),
        };
    }
    return {
        ...clip,
        overlay_mode: 'over_broll',
        html: patchFrameHtmlForOverlayMode(clip.html, 'over_broll'),
    };
}

export function normalizeManifestHtmlOverlayModes(
    manifest: ShortVideoRenderManifest
): ShortVideoRenderManifest {
    const clips = manifest.html_clips ?? [];
    if (clips.length === 0) {
        return manifest;
    }
    const nextClips = clips.map((clip) => {
        const mode = resolveHtmlClipOverlayMode(clip, manifest);
        return applyHtmlClipOverlayLayout(clip, mode);
    });
    return {
        ...manifest,
        html_clips: nextClips,
    };
}
