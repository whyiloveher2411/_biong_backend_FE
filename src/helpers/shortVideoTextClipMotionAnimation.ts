import type { ShortVideoTextClip } from './shortVideoRenderManifestTypes';
import type { TextClipMotionStyle } from './shortVideoTextClipAnimationConstants';
import {
    buildTextClipEnterTransform,
    resolveTextClipEnterStyle,
} from './shortVideoTextClipEnterAnimation';
import { resolveTextClipExitStyle } from './shortVideoTextClipExitAnimation';

export function resolveTextClipMotionStyle(
    clip: Pick<ShortVideoTextClip, 'motion' | 'enter_duration_sec' | 'exit_motion' | 'exit_duration_sec' | 'duration_sec'>,
    localSec: number,
    options?: {
        enterDurationSec?: number;
        exitDurationSec?: number;
        clipDurationSec?: number;
    }
): TextClipMotionStyle {
    const clipDurationSec = options?.clipDurationSec ?? clip.duration_sec;
    const enterStyle = resolveTextClipEnterStyle(clip, localSec, {
        durationSec: options?.enterDurationSec,
    });
    const exitStyle = resolveTextClipExitStyle(clip, localSec, {
        clipDurationSec,
        durationSec: options?.exitDurationSec,
    });
    return {
        opacityFactor: enterStyle.opacityFactor * exitStyle.opacityFactor,
        translateXPercent: enterStyle.translateXPercent + exitStyle.translateXPercent,
        translateYPercent: enterStyle.translateYPercent + exitStyle.translateYPercent,
        scale: enterStyle.scale * exitStyle.scale,
    };
}

export const buildTextClipMotionTransform = buildTextClipEnterTransform;
