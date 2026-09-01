import type { AgentVisualMode } from './agentVideoApi';

export function normalizeAgentVisualMode(raw: unknown): AgentVisualMode {
    const value = String(raw || '').trim().toLowerCase();
    if (value === 'whiteboard') {
        return 'whiteboard';
    }
    if (value === 'video_2s' || value === 'video2s' || value === 'video-2s' || value === '2s') {
        return 'video_2s';
    }
    return 'hyperframes';
}

/** video_2s dùng chung pipeline ảnh của whiteboard, chỉ khác bước chia beat. */
export function isAgentWhiteboardMode(mode: unknown): boolean {
    const normalized = normalizeAgentVisualMode(mode);
    return normalized === 'whiteboard' || normalized === 'video_2s';
}

export function isAgentVideo2sMode(mode: unknown): boolean {
    return normalizeAgentVisualMode(mode) === 'video_2s';
}

export function agentVisualModeLabel(mode: AgentVisualMode): string {
    if (mode === 'whiteboard') {
        return 'Image';
    }
    if (mode === 'video_2s') {
        return 'Video 2s';
    }
    return 'Motion HTML';
}
