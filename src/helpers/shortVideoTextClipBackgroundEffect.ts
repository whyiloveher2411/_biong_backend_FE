import type { ShortVideoTextClipBackgroundEffect } from './shortVideoRenderManifestTypes';
import type { TextClipMotionStyle } from './shortVideoTextClipAnimationConstants';
import { buildTextClipEnterTransform } from './shortVideoTextClipEnterAnimation';

export function shouldUseSplitBackgroundLayers(
    backgroundColor: string | undefined,
    backgroundEffect: ShortVideoTextClipBackgroundEffect | undefined
): boolean {
    return Boolean(backgroundColor && backgroundEffect);
}

export function resolveBackgroundMotionStyle(
    motionStyle: TextClipMotionStyle,
    effect: ShortVideoTextClipBackgroundEffect
): TextClipMotionStyle {
    switch (effect) {
        case 'disabled':
            return {
                opacityFactor: 1,
                translateXPercent: 0,
                translateYPercent: 0,
                scale: 1,
            };
        case 'sliding':
            return {
                opacityFactor: motionStyle.opacityFactor,
                translateXPercent: motionStyle.translateXPercent,
                translateYPercent: motionStyle.translateYPercent,
                scale: 1,
            };
        case 'scaling':
        case 'scaling_w_clip':
            return {
                opacityFactor: motionStyle.opacityFactor,
                translateXPercent: 0,
                translateYPercent: 0,
                scale: motionStyle.scale,
            };
        default:
            return motionStyle;
    }
}

export function shouldClipBackgroundToContent(
    effect: ShortVideoTextClipBackgroundEffect | undefined
): boolean {
    return effect === 'scaling_w_clip';
}

export function resolveSplitBackgroundRgbaAlpha(
    backgroundOpacityPercent: number,
    motionOpacityFactor: number,
    effect: ShortVideoTextClipBackgroundEffect
): number {
    const baseOpacity = (backgroundOpacityPercent / 100);
    if (effect === 'disabled') {
        return baseOpacity;
    }
    return baseOpacity * motionOpacityFactor;
}

export function resolveSplitTextOpacity(
    textOpacityPercent: number,
    motionOpacityFactor: number
): number {
    return (textOpacityPercent / 100) * motionOpacityFactor;
}

export function buildBackgroundMotionTransform(
    bgMotionStyle: TextClipMotionStyle,
    extraParts: string[] = []
): string | undefined {
    return buildTextClipEnterTransform(bgMotionStyle, extraParts);
}
