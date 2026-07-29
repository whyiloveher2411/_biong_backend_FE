import type { AgentVisualMode } from './agentVideoApi';

export function normalizeAgentVisualMode(raw: unknown): AgentVisualMode {
    const value = String(raw || '').trim().toLowerCase();
    return value === 'whiteboard' ? 'whiteboard' : 'hyperframes';
}

export function isAgentWhiteboardMode(mode: unknown): boolean {
    return normalizeAgentVisualMode(mode) === 'whiteboard';
}

export function agentVisualModeLabel(mode: AgentVisualMode): string {
    return mode === 'whiteboard' ? 'Whiteboard' : 'Motion HTML';
}
