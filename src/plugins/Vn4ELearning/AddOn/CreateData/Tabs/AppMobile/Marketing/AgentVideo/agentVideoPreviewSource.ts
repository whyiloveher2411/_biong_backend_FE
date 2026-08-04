import type { AgentRenderMode } from './agentVideoApi';
import { isAgentWhiteboardMode } from './agentVideoVisualMode';

export type AgentPreviewSource = 'final' | 'html_beat';

export type AgentPreviewSourceInput = {
    renderMode: AgentRenderMode;
    hasAudio: boolean;
    agentVideoUrl: string;
    localFinalMp4Url?: string;
    beatMapReady: boolean;
    beatsHtmlCompleted: number;
    beatsImageCompleted?: number;
    agentVisualMode?: string;
    beatHtml: Record<string, { html?: string }>;
    beatImage?: Record<string, { image_url?: string }>;
    importHtml: string;
};

export function canShowFinalPreview(input: AgentPreviewSourceInput): boolean {
    return String(input.agentVideoUrl || '').trim() !== ''
        || String(input.localFinalMp4Url || '').trim() !== '';
}

export function hasBeatHtmlForPreview(input: AgentPreviewSourceInput): boolean {
    if (Number(input.beatsHtmlCompleted || 0) > 0) {
        return true;
    }
    const beatHtml = input.beatHtml || {};
    if (Object.values(beatHtml).some((entry) => String(entry?.html || '').trim() !== '')) {
        return true;
    }
    return String(input.importHtml || '').trim().length > 0;
}

export function hasBeatImageForPreview(input: AgentPreviewSourceInput): boolean {
    if (Number(input.beatsImageCompleted || 0) > 0) {
        return true;
    }
    const beatImage = input.beatImage || {};
    return Object.values(beatImage).some((entry) => String(entry?.image_url || '').trim() !== '');
}

/** Whiteboard: vào view ảnh beat ngay khi đã chia beat-map (ảnh có thể chưa sinh). */
export function canEnterWhiteboardBeatPreviewView(input: AgentPreviewSourceInput): boolean {
    return Boolean(input.beatMapReady);
}

export function canShowHtmlBeatPreview(input: AgentPreviewSourceInput): boolean {
    if (isAgentWhiteboardMode(input.agentVisualMode)) {
        return canEnterWhiteboardBeatPreviewView(input) || hasBeatImageForPreview(input);
    }
    return hasBeatHtmlForPreview(input);
}

export function canShowPreviewSourceTabs(input: AgentPreviewSourceInput): boolean {
    return canShowFinalPreview(input) || canShowHtmlBeatPreview(input);
}

export function resolveDefaultPreviewSource(input: AgentPreviewSourceInput): AgentPreviewSource {
    if (canShowHtmlBeatPreview(input)) {
        return 'html_beat';
    }
    if (canShowFinalPreview(input)) {
        return 'final';
    }
    return 'html_beat';
}

export function resolveActivePreviewSource(
    source: AgentPreviewSource,
    input: AgentPreviewSourceInput,
): AgentPreviewSource {
    if (source === 'html_beat' && canShowHtmlBeatPreview(input)) {
        return 'html_beat';
    }
    if (source === 'final' && canShowFinalPreview(input)) {
        return 'final';
    }
    if (canShowHtmlBeatPreview(input)) {
        return 'html_beat';
    }
    if (canShowFinalPreview(input)) {
        return 'final';
    }
    return 'html_beat';
}

export function resolvePreviewSourceTitle(
    source: AgentPreviewSource,
    agentVisualMode?: string,
): string {
    if (source !== 'html_beat') {
        return 'Preview video HyperFrames';
    }
    return isAgentWhiteboardMode(agentVisualMode)
        ? 'Preview ảnh beat + audio'
        : 'Preview HTML beat + audio';
}

export function canPlaybackPreviewSource(
    source: AgentPreviewSource,
    input: AgentPreviewSourceInput,
): boolean {
    if (source === 'final') {
        return canShowFinalPreview(input);
    }
    return canShowHtmlBeatPreview(input);
}
