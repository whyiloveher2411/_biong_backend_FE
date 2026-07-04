import type { TimelineRow } from '@xzdarcy/timeline-engine';

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

export function buildAgentVideoTimelineRows(
    durationSec: number,
    filmstripVersion = 0,
): TimelineRow[] {
    const duration = Math.max(1, durationSec);
    const clipId = filmstripVersion > 0
        ? `${AGENT_VIDEO_CLIP_ID}-${filmstripVersion}`
        : AGENT_VIDEO_CLIP_ID;

    return [{
        id: AGENT_VIDEO_TRACK_ID,
        actions: [{
            id: clipId,
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
