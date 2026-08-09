import {
    FULL_AUTO_PIPELINE_STEP_GROUPS,
    FULL_AUTO_PIPELINE_STEP_LABELS,
    FULL_AUTO_PIPELINE_STEP_ORDER,
    type FullAutoPipelineStepKey,
} from './agentVideoApi';
import { isAgentWhiteboardMode } from './agentVideoVisualMode';

export const EXTENDED_PIPELINE_STEP_LABELS: Record<string, string> = {
    ...FULL_AUTO_PIPELINE_STEP_LABELS,
    beat_image_fill: 'Ảnh beat',
    whiteboard_render: 'Render ảnh beat',
    whiteboard_mux: 'Ghép video + audio',
};

/** Chỉ thuộc Motion HTML — whiteboard auto-skip, ẩn khỏi UI. */
export const FULL_AUTO_PIPELINE_HYPERFRAMES_ONLY_STEPS = [
    'beat_fill',
    'beat_refine_visual',
    'beat_refine_html',
] as const;

/** Chỉ thuộc Whiteboard — motion HTML auto-skip, ẩn khỏi UI. */
export const FULL_AUTO_PIPELINE_WHITEBOARD_ONLY_STEPS = [
    'beat_image_fill',
] as const;

/**
 * Bước BE phụ (không nằm trong STEP_ORDER FE) — luôn ẩn khỏi list «Khác».
 * Whiteboard dùng slot `render` (label đổi) + nút Run nhóm Render.
 */
const FULL_AUTO_PIPELINE_UI_HIDDEN_EXTRA_STEPS = [
    'whiteboard_render',
    'whiteboard_mux',
    'done',
] as const;

const WHITEBOARD_PIPELINE_STEP_LABELS: Record<string, string> = {
    beat_image_fill: 'Ảnh beat',
    render: 'Render ảnh beat',
    whiteboard_render: 'Render ảnh beat',
    whiteboard_mux: 'Ghép video + audio',
};

export function isFullAutoPipelineStepRelevantForMode(
    step: string,
    agentVisualMode?: string | null,
): boolean {
    const key = String(step || '').trim();
    if (!key) {
        return false;
    }
    if ((FULL_AUTO_PIPELINE_UI_HIDDEN_EXTRA_STEPS as readonly string[]).includes(key)) {
        return false;
    }
    if (isAgentWhiteboardMode(agentVisualMode)) {
        return !(FULL_AUTO_PIPELINE_HYPERFRAMES_ONLY_STEPS as readonly string[]).includes(key);
    }
    return !(FULL_AUTO_PIPELINE_WHITEBOARD_ONLY_STEPS as readonly string[]).includes(key);
}

export function getVisibleFullAutoPipelineStepOrder(
    agentVisualMode?: string | null,
): FullAutoPipelineStepKey[] {
    return FULL_AUTO_PIPELINE_STEP_ORDER.filter((step) => (
        isFullAutoPipelineStepRelevantForMode(step, agentVisualMode)
    ));
}

export type VisibleFullAutoPipelineStepGroup = {
    key: (typeof FULL_AUTO_PIPELINE_STEP_GROUPS)[number]['key'];
    label: string;
    steps: FullAutoPipelineStepKey[];
};

export function getVisibleFullAutoPipelineStepGroups(
    agentVisualMode?: string | null,
): VisibleFullAutoPipelineStepGroup[] {
    const groups = FULL_AUTO_PIPELINE_STEP_GROUPS as ReadonlyArray<{
        key: VisibleFullAutoPipelineStepGroup['key'];
        label: string;
        steps: readonly FullAutoPipelineStepKey[];
    }>;

    const result: VisibleFullAutoPipelineStepGroup[] = [];
    for (const group of groups) {
        const steps: FullAutoPipelineStepKey[] = [];
        for (const step of group.steps) {
            if (isFullAutoPipelineStepRelevantForMode(step, agentVisualMode)) {
                steps.push(step);
            }
        }
        if (steps.length === 0) {
            continue;
        }
        result.push({
            key: group.key,
            label: group.label,
            steps,
        });
    }
    return result;
}

export function getVisibleFullAutoPipelineStepIndex(
    step: string,
    agentVisualMode?: string | null,
): number {
    const idx = getVisibleFullAutoPipelineStepOrder(agentVisualMode)
        .indexOf(step as FullAutoPipelineStepKey);
    return idx >= 0 ? idx + 1 : 0;
}

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
