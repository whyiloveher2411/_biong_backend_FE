import type {
    ShortVideoManifestSceneLayout,
    ShortVideoVisualBackgroundMode,
    ShortVideoVisualClip,
    ShortVideoVisualVerticalAlign,
} from './shortVideoRenderManifestTypes';

export const VISUAL_MEDIA_BOX_HEIGHT = 520;
export const VISUAL_MEDIA_BOX_INSET_X = 0;
export const VISUAL_CANVAS_HEIGHT = 1920;

export const DEFAULT_VISUAL_VERTICAL_ALIGN: ShortVideoVisualVerticalAlign = 'top';
export const DEFAULT_VISUAL_INSET_TOP = 320;
export const DEFAULT_VISUAL_INSET_BOTTOM = 280;
export const DEFAULT_VISUAL_BACKGROUND_MODE: ShortVideoVisualBackgroundMode = 'none';
export const DEFAULT_VISUAL_BACKGROUND_COLOR = '#000000';
export const DEFAULT_VISUAL_BACKGROUND_BLUR = 28;

type VisualLayoutSource = Pick<
    ShortVideoVisualClip,
    | 'visual_vertical_align'
    | 'visual_inset_top'
    | 'visual_inset_bottom'
    | 'visual_background_mode'
    | 'visual_background_color'
    | 'visual_background_gradient'
    | 'visual_background_blur'
>;

export function resolveVisualVerticalAlign(
    source: VisualLayoutSource | ShortVideoManifestSceneLayout | undefined
): ShortVideoVisualVerticalAlign {
    const value = source?.visual_vertical_align;
    if (value === 'top' || value === 'center' || value === 'bottom') {
        return value;
    }
    return DEFAULT_VISUAL_VERTICAL_ALIGN;
}

export function resolveVisualInsetTop(
    source: VisualLayoutSource | ShortVideoManifestSceneLayout | undefined
): number {
    const value = source?.visual_inset_top;
    if (typeof value === 'number' && value >= 0) {
        return value;
    }
    return DEFAULT_VISUAL_INSET_TOP;
}

export function resolveVisualInsetBottom(
    source: VisualLayoutSource | ShortVideoManifestSceneLayout | undefined
): number {
    const value = source?.visual_inset_bottom;
    if (typeof value === 'number' && value >= 0) {
        return value;
    }
    return DEFAULT_VISUAL_INSET_BOTTOM;
}

export function resolveVisualBackgroundMode(
    source: VisualLayoutSource | ShortVideoManifestSceneLayout | undefined
): ShortVideoVisualBackgroundMode {
    const value = source?.visual_background_mode;
    if (value === 'none' || value === 'color' || value === 'gradient' || value === 'media_blur') {
        return value;
    }
    return DEFAULT_VISUAL_BACKGROUND_MODE;
}

export function resolveVisualBackgroundColor(
    source: VisualLayoutSource | ShortVideoManifestSceneLayout | undefined
): string {
    const value = source?.visual_background_color?.trim();
    if (value) {
        return value;
    }
    return DEFAULT_VISUAL_BACKGROUND_COLOR;
}

export function resolveVisualBackgroundBlur(
    source: VisualLayoutSource | ShortVideoManifestSceneLayout | undefined
): number {
    const value = source?.visual_background_blur;
    if (typeof value === 'number' && value >= 0) {
        return Math.min(64, value);
    }
    return DEFAULT_VISUAL_BACKGROUND_BLUR;
}

export {
    buildLinearGradientCss,
    createDefaultVisualBackgroundGradient,
    createGradientFromSolidColor,
    DEFAULT_VISUAL_BACKGROUND_GRADIENT,
    getGradientStopEdgeLabel,
    getGradientStopMarkerCoords,
    isColorBackgroundGradient,
    normalizeTwoStopPositions,
    normalizeVisualBackgroundGradient,
    resolveActiveColorGradient,
    resolveGradientPreviewAxis,
    resolveGradientStopPositionFromPointer,
    resolveVisualBackgroundGradient,
    sortGradientStops,
    stopColorToRgba,
    VISUAL_GRADIENT_DIRECTION_OPTIONS,
} from '@spacedev/remotion-short-video/visualBackgroundGradient';

export function resolveVisualMediaBoxTop(
    source: VisualLayoutSource | ShortVideoManifestSceneLayout | undefined,
    canvasHeight: number = VISUAL_CANVAS_HEIGHT,
    boxHeight: number = VISUAL_MEDIA_BOX_HEIGHT
): number {
    const align = resolveVisualVerticalAlign(source);
    if (align === 'center') {
        return Math.max(0, (canvasHeight - boxHeight) / 2);
    }
    if (align === 'bottom') {
        return Math.max(0, canvasHeight - boxHeight - resolveVisualInsetBottom(source));
    }
    return resolveVisualInsetTop(source);
}
