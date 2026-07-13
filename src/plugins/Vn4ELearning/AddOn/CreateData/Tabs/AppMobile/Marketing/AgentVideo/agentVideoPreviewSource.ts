import type { AgentRenderMode } from './agentVideoApi';

export type AgentPreviewSource = 'final' | 'html_beat';

export type AgentPreviewSourceInput = {
    renderMode: AgentRenderMode;
    hasAudio: boolean;
    agentVideoUrl: string;
    beatMapReady: boolean;
    beatsHtmlCompleted: number;
    beatHtml: Record<string, { html?: string }>;
    importHtml: string;
};

export function canShowFinalPreview(input: AgentPreviewSourceInput): boolean {
    return String(input.agentVideoUrl || '').trim() !== '';
}

export function canShowHtmlBeatPreview(input: AgentPreviewSourceInput): boolean {
    if (input.renderMode !== 'import_html' || !input.hasAudio) {
        return false;
    }
    if (input.beatMapReady) {
        return true;
    }
    return input.importHtml.trim().length > 0;
}

export function canShowPreviewSourceTabs(input: AgentPreviewSourceInput): boolean {
    return canShowFinalPreview(input) && canShowHtmlBeatPreview(input);
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

export function resolvePreviewSourceTitle(source: AgentPreviewSource): string {
    return source === 'html_beat' ? 'Preview HTML beat + audio' : 'Preview video HyperFrames';
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
