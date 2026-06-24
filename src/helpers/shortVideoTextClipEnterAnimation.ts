import type { ShortVideoTextClip } from './shortVideoRenderManifestTypes';
import { TEXT_CLIP_SLIDE_ENTER_MOTIONS } from './shortVideoRenderManifestTypes';
import {
    TEXT_CLIP_ENTER_DURATION_SEC,
    TEXT_CLIP_SLIDE_OFFSET_PERCENT,
    type TextClipMotionStyle,
} from './shortVideoTextClipAnimationConstants';

export { TEXT_CLIP_ENTER_DURATION_SEC, TEXT_CLIP_SLIDE_OFFSET_PERCENT } from './shortVideoTextClipAnimationConstants';
export type { TextClipMotionStyle as TextClipEnterStyle } from './shortVideoTextClipAnimationConstants';

function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
}

export function isSlideEnterMotion(motion: string | undefined): boolean {
    if (!motion) {
        return false;
    }
    return (TEXT_CLIP_SLIDE_ENTER_MOTIONS as string[]).includes(motion);
}

export function resolveEnterProgress(localSec: number, durationSec = TEXT_CLIP_ENTER_DURATION_SEC): number {
    if (localSec <= 0) {
        return 0;
    }
    if (durationSec <= 0) {
        return 1;
    }
    return clamp01(localSec / durationSec);
}

function resolveSlideOffsets(
    motion: string,
    offsetPercent: number,
    progress: number
): Pick<TextClipMotionStyle, 'translateXPercent' | 'translateYPercent'> {
    const remaining = 1 - progress;
    if (motion === 'slide_up') {
        return { translateXPercent: 0, translateYPercent: offsetPercent * remaining };
    }
    if (motion === 'slide_down') {
        return { translateXPercent: 0, translateYPercent: -offsetPercent * remaining };
    }
    if (motion === 'slide_left') {
        return { translateXPercent: offsetPercent * remaining, translateYPercent: 0 };
    }
    if (motion === 'slide_right') {
        return { translateXPercent: -offsetPercent * remaining, translateYPercent: 0 };
    }
    return { translateXPercent: 0, translateYPercent: 0 };
}

export function resolveTextClipEnterStyle(
    clip: Pick<ShortVideoTextClip, 'motion'>,
    localSec: number,
    options?: {
        durationSec?: number;
        slideOffsetPercent?: number;
    }
): TextClipMotionStyle {
    const motion = clip.motion ?? 'pop';
    const durationSec = options?.durationSec ?? TEXT_CLIP_ENTER_DURATION_SEC;
    const slideOffsetPercent = options?.slideOffsetPercent ?? TEXT_CLIP_SLIDE_OFFSET_PERCENT;

    if (motion === 'none') {
        return {
            opacityFactor: 1,
            translateXPercent: 0,
            translateYPercent: 0,
            scale: 1,
        };
    }

    if (isSlideEnterMotion(motion)) {
        const progress = resolveEnterProgress(localSec, durationSec);
        const offsets = resolveSlideOffsets(motion, slideOffsetPercent, progress);
        return {
            opacityFactor: progress,
            translateXPercent: offsets.translateXPercent,
            translateYPercent: offsets.translateYPercent,
            scale: 1,
        };
    }

    if (motion === 'fade') {
        const progress = resolveEnterProgress(localSec, durationSec);
        return {
            opacityFactor: progress,
            translateXPercent: 0,
            translateYPercent: 0,
            scale: 1,
        };
    }

    if (motion === 'pop') {
        const progress = resolveEnterProgress(localSec, durationSec);
        return {
            opacityFactor: progress,
            translateXPercent: 0,
            translateYPercent: 0,
            scale: 0.92 + (0.08 * progress),
        };
    }

    return {
        opacityFactor: 1,
        translateXPercent: 0,
        translateYPercent: 0,
        scale: 1,
    };
}

export function buildTextClipEnterTransform(
    enterStyle: TextClipMotionStyle,
    extraParts: string[] = []
): string | undefined {
    const parts: string[] = [];
    if (enterStyle.translateXPercent !== 0) {
        parts.push(`translateX(${enterStyle.translateXPercent}%)`);
    }
    if (enterStyle.translateYPercent !== 0) {
        parts.push(`translateY(${enterStyle.translateYPercent}%)`);
    }
    if (enterStyle.scale !== 1) {
        parts.push(`scale(${enterStyle.scale})`);
    }
    parts.push(...extraParts);
    return parts.length > 0 ? parts.join(' ') : undefined;
}
