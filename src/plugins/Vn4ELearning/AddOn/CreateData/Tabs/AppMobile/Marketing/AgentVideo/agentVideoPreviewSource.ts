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

/** Có beat HTML để preview — không phụ thuộc audio / renderMode. */
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

export function canShowHtmlBeatPreview(input: AgentPreviewSourceInput): boolean {
    return hasBeatHtmlForPreview(input);
}

export function canShowPreviewSourceTabs(input: AgentPreviewSourceInput): boolean {
    // Hiện tab khi có ít nhất một nguồn — không ẩn HTML beat chỉ vì chưa có video final (hoặc ngược lại).
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
    // Cho phép focus preview HTML beat dù chưa có audio (spacebar no-op nếu không có media).
    return canShowHtmlBeatPreview(input);
}
