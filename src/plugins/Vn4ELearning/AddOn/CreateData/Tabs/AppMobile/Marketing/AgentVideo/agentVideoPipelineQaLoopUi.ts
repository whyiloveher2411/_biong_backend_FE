import { useMemo } from 'react';
import {
    FULL_AUTO_PIPELINE_STEP_LABELS,
    type FullAutoPipelineScriptQaLoop,
    type FullAutoPipelineStepKey,
    type FullAutoPipelineSummary,
} from './agentVideoApi';
import { PIPELINE_STEP_STATUS_LABEL } from './agentVideoPipelineUi';

export const SCRIPT_IMPROVE_QA_LOOP_STEPS: readonly ['script_improve', 'script_improve_qa'] = [
    'script_improve',
    'script_improve_qa',
];

export type ScriptImproveQaLoopStepKey = (typeof SCRIPT_IMPROVE_QA_LOOP_STEPS)[number];

export type ScriptImproveQaLoopPhase =
    | 'idle'
    | 'improving'
    | 'auditing'
    | 'retrying'
    | 'passed';

export type ScriptImproveQaLoopView = {
    showLoopChrome: boolean;
    attempt: number;
    maxAttempts: number;
    phase: ScriptImproveQaLoopPhase;
    activeStep: ScriptImproveQaLoopStepKey | null;
    isLoopActive: boolean;
    retryCount: number;
    lastSummary: string;
    criticalIssues: Array<{
        code?: string;
        severity?: string;
        message?: string;
        fix_hint?: string;
    }>;
    improveStatus: string;
    qaStatus: string;
};

export function isScriptImproveQaLoopStep(step: string): step is ScriptImproveQaLoopStepKey {
    return (SCRIPT_IMPROVE_QA_LOOP_STEPS as readonly string[]).includes(step);
}

export function resolveScriptImproveQaLoopView(
    pipeline: FullAutoPipelineSummary | null | undefined,
): ScriptImproveQaLoopView {
    const loop: FullAutoPipelineScriptQaLoop | undefined = pipeline?.qa_loops?.script_improve;
    const attempt = Math.max(1, Number(loop?.attempt ?? 1));
    const maxAttempts = Math.max(1, Number(loop?.max_attempts ?? 5));
    const currentStep = String(pipeline?.current_step || '').trim();
    const pipelineStatus = String(pipeline?.status || '').trim().toLowerCase();
    const isRunning = pipelineStatus === 'running';
    const improveStatus = String(pipeline?.steps?.script_improve?.status || 'pending');
    const qaStatus = String(pipeline?.steps?.script_improve_qa?.status || 'pending');
    const historyList = loop && Array.isArray(loop.history) ? loop.history : [];
    const retryCount = historyList.filter(
        (entry) => entry != null && (entry as { pass?: boolean }).pass === false,
    ).length;
    const diagnosisIssues = loop?.last_diagnosis?.issues;
    const criticalIssues = Array.isArray(diagnosisIssues)
        ? diagnosisIssues.filter((issue) => String(issue?.severity || '') === 'critical')
        : [];

    const isInLoopSteps = isScriptImproveQaLoopStep(currentStep);
    const showLoopChrome = true;

    let phase: ScriptImproveQaLoopPhase = 'idle';
    if (isRunning && currentStep === 'script_improve') {
        phase = attempt > 1 || retryCount > 0 ? 'retrying' : 'improving';
    } else if (isRunning && currentStep === 'script_improve_qa') {
        phase = 'auditing';
    } else if (improveStatus === 'done' && qaStatus === 'done') {
        phase = 'passed';
    }

    const activeStep: ScriptImproveQaLoopStepKey | null = isRunning && currentStep === 'script_improve'
        ? 'script_improve'
        : isRunning && currentStep === 'script_improve_qa'
            ? 'script_improve_qa'
            : null;

    return {
        showLoopChrome,
        attempt,
        maxAttempts,
        phase,
        activeStep,
        isLoopActive: isRunning && isInLoopSteps,
        retryCount,
        lastSummary: String(loop?.last_diagnosis?.summary || '').trim(),
        criticalIssues,
        improveStatus,
        qaStatus,
    };
}

export function scriptQaLoopPhaseLabel(phase: ScriptImproveQaLoopPhase, view: ScriptImproveQaLoopView): string {
    switch (phase) {
        case 'improving':
            return `Đang cải thiện script — lần ${view.attempt}/${view.maxAttempts}`;
        case 'retrying':
            return `Đang cải thiện lại — lần ${view.attempt}/${view.maxAttempts}`;
        case 'auditing':
            return `Đang đánh giá script — lần ${view.attempt}/${view.maxAttempts}`;
        case 'passed':
            return view.retryCount > 0
                ? `QA script đã pass sau ${view.retryCount} lần thử lại`
                : 'QA script đã pass';
        default:
            return `Vòng QA script — tối đa ${view.maxAttempts} lần`;
    }
}

export function scriptQaLoopStepStatusLabel(
    stepKey: ScriptImproveQaLoopStepKey,
    stepStatus: string,
    view: ScriptImproveQaLoopView,
): string {
    const normalized = String(stepStatus || 'pending').trim().toLowerCase();
    const base = PIPELINE_STEP_STATUS_LABEL[normalized] || stepStatus || '—';

    if (!view.isLoopActive || view.activeStep !== stepKey) {
        return base;
    }

    if (stepKey === 'script_improve') {
        return view.phase === 'retrying'
            ? `Cải thiện lại · ${view.attempt}/${view.maxAttempts}`
            : `Đang cải thiện · ${view.attempt}/${view.maxAttempts}`;
    }

    return `Đang đánh giá · ${view.attempt}/${view.maxAttempts}`;
}

export function scriptQaLoopCurrentStepLabel(
    currentStep: string,
    view: ScriptImproveQaLoopView,
): string {
    if (!isScriptImproveQaLoopStep(currentStep)) {
        if (currentStep in FULL_AUTO_PIPELINE_STEP_LABELS) {
            return FULL_AUTO_PIPELINE_STEP_LABELS[currentStep as FullAutoPipelineStepKey];
        }
        return currentStep;
    }

    const stepLabel = FULL_AUTO_PIPELINE_STEP_LABELS[currentStep];
    if (!view.isLoopActive) {
        return stepLabel;
    }

    if (currentStep === 'script_improve') {
        return view.phase === 'retrying'
            ? `${stepLabel} (lần ${view.attempt}/${view.maxAttempts})`
            : `${stepLabel} · lần ${view.attempt}/${view.maxAttempts}`;
    }

    return `${stepLabel} · lần ${view.attempt}/${view.maxAttempts}`;
}

export function splitScriptGroupSteps<T extends string>(steps: readonly T[]): {
    before: T[];
    loop: T[];
    after: T[];
} {
    const improveIdx = steps.indexOf('script_improve' as T);
    const qaIdx = steps.indexOf('script_improve_qa' as T);
    if (improveIdx < 0 || qaIdx < 0 || qaIdx <= improveIdx) {
        return { before: [...steps], loop: [], after: [] };
    }

    return {
        before: steps.slice(0, improveIdx),
        loop: steps.slice(improveIdx, qaIdx + 1),
        after: steps.slice(qaIdx + 1),
    };
}

export function useScriptImproveQaLoopView(pipeline: FullAutoPipelineSummary | null | undefined) {
    return useMemo(() => resolveScriptImproveQaLoopView(pipeline), [pipeline]);
}
