import {
    FULL_AUTO_PIPELINE_STEP_LABELS,
    type FullAutoPipelineStepKey,
} from './agentVideoApi';
import { isAgentWhiteboardMode } from './agentVideoVisualMode';

export const EXTENDED_PIPELINE_STEP_LABELS: Record<string, string> = {
    ...FULL_AUTO_PIPELINE_STEP_LABELS,
    beat_image_fill: 'Ảnh beat (Gemini)',
    whiteboard_render: 'Render whiteboard',
    whiteboard_mux: 'Mux whiteboard + audio',
};

const WHITEBOARD_PIPELINE_STEP_LABELS: Record<string, string> = {
    beat_fill: 'Fill HTML beat (bỏ qua)',
    beat_image_fill: 'Ảnh beat (Gemini)',
    beat_refine_visual: 'Refine visual (bỏ qua)',
    beat_refine_html: 'Refine HTML (bỏ qua)',
    render: 'Render whiteboard',
    whiteboard_render: 'Render whiteboard',
    whiteboard_mux: 'Mux whiteboard + audio',
};

export function resolveFullAutoPipelineStepLabel(
    step: string,
    agentVisualMode?: string | null,
): string {
    const key = String(step || '').trim();
    if (!key) {
        return '—';
    }
    if (isAgentWhiteboardMode(agentVisualMode) && WHITEBOARD_PIPELINE_STEP_LABELS[key]) {
        return WHITEBOARD_PIPELINE_STEP_LABELS[key];
    }
    if (key in FULL_AUTO_PIPELINE_STEP_LABELS) {
        return FULL_AUTO_PIPELINE_STEP_LABELS[key as FullAutoPipelineStepKey];
    }
    return EXTENDED_PIPELINE_STEP_LABELS[key] || key;
}
