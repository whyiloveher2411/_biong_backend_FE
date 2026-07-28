export type ClipAspect = '9:16' | '16:9';

export type ClipRenderSpec = {
    aspect_ratio: ClipAspect;
    width: number;
    height: number;
    fps: number;
    resolution: 'portrait' | 'landscape';
    caption_band_px: number;
    content_area: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
};

export function normalizeClipAspect(raw: unknown): ClipAspect {
    const value = String(raw ?? '').trim().toLowerCase();
    if (value === '16:9' || value === '16x9' || value === 'landscape') {
        return '16:9';
    }
    return '9:16';
}

export function getClipRenderSpec(aspect: ClipAspect | unknown = '9:16'): ClipRenderSpec {
    const normalized = normalizeClipAspect(aspect);
    if (normalized === '16:9') {
        return {
            aspect_ratio: '16:9',
            width: 1920,
            height: 1080,
            fps: 30,
            resolution: 'landscape',
            caption_band_px: 120,
            content_area: {
                top: 48,
                right: 64,
                bottom: 120,
                left: 64,
            },
        };
    }
    return {
        aspect_ratio: '9:16',
        width: 1080,
        height: 1920,
        fps: 30,
        resolution: 'portrait',
        caption_band_px: 360,
        content_area: {
            top: 80,
            right: 48,
            bottom: 360,
            left: 48,
        },
    };
}

export function getClipStageDimensions(aspect: ClipAspect | unknown = '9:16'): {
    width: number;
    height: number;
    aspectRatioCss: string;
} {
    const spec = getClipRenderSpec(aspect);
    return {
        width: spec.width,
        height: spec.height,
        aspectRatioCss: spec.aspect_ratio === '16:9' ? '16 / 9' : '9 / 16',
    };
}
