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
    whiteboard_render: 'Render video từng beat',
    whiteboard_mux: 'Final video',
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
    'whiteboard_mux',
] as const;

/**
 * Bước BE phụ (không nằm trong STEP_ORDER BE hiển thị riêng) — ẩn khỏi list «Khác».
 * whiteboard_render dùng slot `render` (label đổi) + nút Run nhóm Render;
 * whiteboard_mux («Final video») là bước riêng — Run độc lập KHÔNG render lại beat.
 */
const FULL_AUTO_PIPELINE_UI_HIDDEN_EXTRA_STEPS = [
    'whiteboard_render',
    'done',
] as const;

const WHITEBOARD_PIPELINE_STEP_LABELS: Record<string, string> = {
    beat_image_fill: 'Ảnh beat',
    render: 'Render video từng beat',
    whiteboard_render: 'Render video từng beat',
    whiteboard_mux: 'Final video',
};

/**
 * Các bước BỎ QUA hoàn toàn khi bật «Audio từng beat» (bỏ chức năng lẫn UI):
 * chuẩn hóa giọng đọc (4) — TTS từng beat đọc trực tiếp content;
 * duyệt / TTS (5) — không sinh TTS full; whisper (6) — whisper chạy riêng từng beat.
 */
export const FULL_AUTO_PIPELINE_BEAT_AUDIO_SKIPPED_STEPS = [
    'script_phonetic_normalize',
    'approve_tts',
    'whisper',
] as const;

export function isFullAutoPipelineStepRelevantForMode(
    step: string,
    agentVisualMode?: string | null,
    beatAudioMode = false,
): boolean {
    const key = String(step || '').trim();
    if (!key) {
        return false;
    }
    if ((FULL_AUTO_PIPELINE_UI_HIDDEN_EXTRA_STEPS as readonly string[]).includes(key)) {
        return false;
    }
    if (beatAudioMode && (FULL_AUTO_PIPELINE_BEAT_AUDIO_SKIPPED_STEPS as readonly string[]).includes(key)) {
        return false;
    }
    if (isAgentWhiteboardMode(agentVisualMode)) {
        return !(FULL_AUTO_PIPELINE_HYPERFRAMES_ONLY_STEPS as readonly string[]).includes(key);
    }
    return !(FULL_AUTO_PIPELINE_WHITEBOARD_ONLY_STEPS as readonly string[]).includes(key);
}

export function getVisibleFullAutoPipelineStepOrder(
    agentVisualMode?: string | null,
    beatAudioMode = false,
): FullAutoPipelineStepKey[] {
    return FULL_AUTO_PIPELINE_STEP_ORDER.filter((step) => (
        isFullAutoPipelineStepRelevantForMode(step, agentVisualMode, beatAudioMode)
    ));
}

export type VisibleFullAutoPipelineStepGroup = {
    key: (typeof FULL_AUTO_PIPELINE_STEP_GROUPS)[number]['key'];
    label: string;
    steps: FullAutoPipelineStepKey[];
};

export function getVisibleFullAutoPipelineStepGroups(
    agentVisualMode?: string | null,
    beatAudioMode = false,
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
            if (isFullAutoPipelineStepRelevantForMode(step, agentVisualMode, beatAudioMode)) {
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
    beatAudioMode = false,
): number {
    const idx = getVisibleFullAutoPipelineStepOrder(agentVisualMode, beatAudioMode)
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
