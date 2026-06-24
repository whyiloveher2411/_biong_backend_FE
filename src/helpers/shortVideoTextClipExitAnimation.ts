import type { ShortVideoTextClip } from './shortVideoRenderManifestTypes';
import { TEXT_CLIP_SLIDE_ENTER_MOTIONS } from './shortVideoRenderManifestTypes';
import {
    TEXT_CLIP_EXIT_DURATION_SEC,
    TEXT_CLIP_SLIDE_OFFSET_PERCENT,
    type TextClipMotionStyle,
} from './shortVideoTextClipAnimationConstants';

export { TEXT_CLIP_EXIT_DURATION_SEC } from './shortVideoTextClipAnimationConstants';

function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
}

export function isSlideExitMotion(motion: string | undefined): boolean {
    if (!motion || motion === 'none') {
        return false;
    }
    return (TEXT_CLIP_SLIDE_ENTER_MOTIONS as string[]).includes(motion);
}

export function resolveExitProgress(
    localSec: number,
    clipDurationSec: number,
    exitDurationSec = TEXT_CLIP_EXIT_DURATION_SEC
): number {
    const exitStart = Math.max(0, clipDurationSec - exitDurationSec);
    if (localSec <= exitStart) {
        return 0;
    }
    if (exitDurationSec <= 0) {
        return 1;
    }
    return clamp01((localSec - exitStart) / exitDurationSec);
}

function resolveExitSlideOffsets(
    motion: string,
    offsetPercent: number,
    progress: number
): Pick<TextClipMotionStyle, 'translateXPercent' | 'translateYPercent'> {
    if (motion === 'slide_up') {
        return { translateXPercent: 0, translateYPercent: -offsetPercent * progress };
    }
    if (motion === 'slide_down') {
        return { translateXPercent: 0, translateYPercent: offsetPercent * progress };
    }
    if (motion === 'slide_left') {
        return { translateXPercent: -offsetPercent * progress, translateYPercent: 0 };
    }
    if (motion === 'slide_right') {
        return { translateXPercent: offsetPercent * progress, translateYPercent: 0 };
    }
    return { translateXPercent: 0, translateYPercent: 0 };
}

export function resolveTextClipExitStyle(
    clip: Pick<ShortVideoTextClip, 'exit_motion' | 'exit_duration_sec' | 'duration_sec'>,
    localSec: number,
    options?: {
        clipDurationSec?: number;
        durationSec?: number;
        slideOffsetPercent?: number;
    }
): TextClipMotionStyle {
    const motion = clip.exit_motion ?? 'none';
    const clipDurationSec = options?.clipDurationSec ?? clip.duration_sec;
    const durationSec = options?.durationSec ?? clip.exit_duration_sec ?? TEXT_CLIP_EXIT_DURATION_SEC;
    const slideOffsetPercent = options?.slideOffsetPercent ?? TEXT_CLIP_SLIDE_OFFSET_PERCENT;

    if (motion === 'none') {
        return {
            opacityFactor: 1,
            translateXPercent: 0,
            translateYPercent: 0,
            scale: 1,
        };
    }

    const progress = resolveExitProgress(localSec, clipDurationSec, durationSec);

    if (isSlideExitMotion(motion)) {
        const offsets = resolveExitSlideOffsets(motion, slideOffsetPercent, progress);
        return {
            opacityFactor: 1 - progress,
            translateXPercent: offsets.translateXPercent,
            translateYPercent: offsets.translateYPercent,
            scale: 1,
        };
    }

    if (motion === 'fade') {
        return {
            opacityFactor: 1 - progress,
            translateXPercent: 0,
            translateYPercent: 0,
            scale: 1,
        };
    }

    if (motion === 'pop') {
        return {
            opacityFactor: 1 - progress,
            translateXPercent: 0,
            translateYPercent: 0,
            scale: 1 - (0.08 * progress),
        };
    }

    return {
        opacityFactor: 1,
        translateXPercent: 0,
        translateYPercent: 0,
        scale: 1,
    };
}
