import type { TimelineRow } from '@xzdarcy/timeline-engine';
import type {
    AgentWhiteboardBeatOverride,
    AgentWhiteboardConfig,
    WhiteboardTransitionOption,
} from './agentVideoApi';

export const AGENT_VIDEO_TRACK_ROW_HEIGHT = 72;

export const AGENT_VIDEO_TRACK_ID = 'agent-video-track';
export const AGENT_VIDEO_CLIP_ID = 'agent-video-clip';

export const AGENT_VIDEO_TIMELINE_EFFECTS = {
    video: { id: 'video', name: 'Video' },
} as const;

export type AgentVideoTimelineLayout = {
    startLeft: number;
    scaleWidth: number;
    timelineScale: number;
};

export function timeSecToTimelineLeftPx(
    timeSec: number,
    layout: AgentVideoTimelineLayout,
): number {
    const time = Math.max(0, Number(timeSec) || 0);
    return layout.startLeft + (time * layout.scaleWidth) / layout.timelineScale;
}

/** Chuẩn hóa thời lượng chuyển cảnh — đồng bộ PHP normalize_transition_duration_sec (0.3–8s). */
function clampTransitionDurationSec(value: number): number {
    if (!Number.isFinite(value) || value <= 0) {
        return 0;
    }
    return Math.max(0.3, Math.min(8, value));
}

/**
 * Thời lượng chuyển cảnh CUỐI beat (giây) — mirror logic PHP
 * marketing_short_video_agent_resolve_whiteboard_scene_params_for_beat:
 * override beat > effect_duration_sec của transition (API transitions) >
 * transition_duration_sec config > 1.2s. Beat cuối / 'none' = 0 (không có box).
 * 'random' không đoán được hiệu ứng cụ thể → dùng duration setting chung.
 */
/**
 * Thời lượng scene thực tế (engine cap frame) = cửa sổ beat − transition cuối.
 * Timeline hiệu ứng zoom chạy trên trục này — KHÔNG gồm vùng đỏ transition.
 */
export function resolveAgentVideoBeatSceneBudgetSec(input: {
    beatDurationSec: number;
    transitionDurationSec: number;
}): number {
    const beatWindow = Math.max(0.1, Number(input.beatDurationSec) || 8);
    const tx = Math.max(0, Number(input.transitionDurationSec) || 0);
    return Math.max(0.1, Math.round((beatWindow - tx) * 1000) / 1000);
}

export function resolveAgentVideoBeatTransitionDurationSec(input: {
    isLastBeat: boolean;
    config?: AgentWhiteboardConfig | null;
    override?: AgentWhiteboardBeatOverride | null;
    transitions?: WhiteboardTransitionOption[] | null;
}): number {
    if (input.isLastBeat) {
        return 0;
    }
    const overrideRaw = input.override?.transition_duration_sec;
    if (overrideRaw != null) {
        const overrideDur = Number(overrideRaw);
        if (Number.isFinite(overrideDur) && overrideDur > 0) {
            return clampTransitionDurationSec(overrideDur);
        }
    }
    const clipTx = String(input.config?.transition || '').trim();
    if (clipTx === 'none') {
        return 0;
    }
    const cfgRaw = Number(input.config?.transition_duration_sec);
    const fallback = Number.isFinite(cfgRaw) && cfgRaw > 0 ? cfgRaw : 1.2;
    if (clipTx && clipTx !== 'random') {
        const effRaw = Number(
            input.transitions?.find((tx) => tx.id === clipTx)?.effect_duration_sec,
        );
        if (Number.isFinite(effRaw) && effRaw > 0) {
            return clampTransitionDurationSec(effRaw);
        }
    }
    return clampTransitionDurationSec(fallback);
}

export function buildAgentVideoTimelineRows(
    durationSec: number,
): TimelineRow[] {
    const duration = Math.max(1, durationSec);

    return [{
        id: AGENT_VIDEO_TRACK_ID,
        actions: [{
            id: AGENT_VIDEO_CLIP_ID,
            start: 0,
            end: duration,
            effectId: 'video',
            movable: false,
            flexible: false,
        }],
    }];
}

export function resolveAgentVideoDurationSec(input: {
    mediaDurationSec: number | null;
    audioDurationSec?: number | null;
    estimatedDurationSec?: number | null;
}): number {
    if (input.mediaDurationSec != null && Number.isFinite(input.mediaDurationSec) && input.mediaDurationSec > 0) {
        return input.mediaDurationSec;
    }
    const audio = Number(input.audioDurationSec || 0);
    if (Number.isFinite(audio) && audio > 0) {
        return audio;
    }
    const estimated = Number(input.estimatedDurationSec || 0);
    if (Number.isFinite(estimated) && estimated > 0) {
        return estimated;
    }
    return 1;
}
