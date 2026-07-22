import { useMemo } from 'react';
import {
    FULL_AUTO_PIPELINE_STEP_LABELS,
    type FullAutoPipelineScriptQaLoop,
    type FullAutoPipelineStepKey,
    type FullAutoPipelineSummary,
} from './agentVideoApi';
import { PIPELINE_STEP_STATUS_LABEL } from './agentVideoPipelineUi';

export const BEAT_DIVISION_QA_LOOP_STEPS: readonly ['beat_division', 'beat_division_qa'] = [
    'beat_division',
    'beat_division_qa',
];

export type BeatDivisionQaLoopStepKey = (typeof BEAT_DIVISION_QA_LOOP_STEPS)[number];

export type BeatDivisionQaLoopPhase =
    | 'idle'
    | 'dividing'
    | 'auditing'
    | 'retrying'
    | 'passed';

export type BeatDivisionQaLoopView = {
    showLoopChrome: boolean;
    attempt: number;
    maxAttempts: number;
    phase: BeatDivisionQaLoopPhase;
    activeStep: BeatDivisionQaLoopStepKey | null;
    isLoopActive: boolean;
    retryCount: number;
    lastSummary: string;
    rhythmProfile: {
        rest_beats?: string[];
        peak_beats?: string[];
        cta_beat?: string;
    } | null;
    criticalIssues: Array<{
        code?: string;
        severity?: string;
        message?: string;
        fix_hint?: string;
        beat_id?: string;
    }>;
    divisionStatus: string;
    qaStatus: string;
};

export function isBeatDivisionQaLoopStep(step: string): step is BeatDivisionQaLoopStepKey {
    return (BEAT_DIVISION_QA_LOOP_STEPS as readonly string[]).includes(step);
}

export function resolveBeatDivisionQaLoopView(
    pipeline: FullAutoPipelineSummary | null | undefined,
): BeatDivisionQaLoopView {
    const loop: FullAutoPipelineScriptQaLoop | undefined = pipeline?.qa_loops?.beat_division;
    const attempt = Math.max(1, Number(loop?.attempt ?? 1));
    const maxAttempts = Math.max(1, Number(loop?.max_attempts ?? 3));
    const currentStep = String(pipeline?.current_step || '').trim();
    const pipelineStatus = String(pipeline?.status || '').trim().toLowerCase();
    const isRunning = pipelineStatus === 'running';
    const divisionStatus = String(pipeline?.steps?.beat_division?.status || 'pending');
    const qaStatus = String(pipeline?.steps?.beat_division_qa?.status || 'pending');
    const historyList = loop && Array.isArray(loop.history) ? loop.history : [];
    const retryCount = historyList.filter(
        (entry) => entry != null && (entry as { pass?: boolean }).pass === false,
    ).length;
    const diagnosisIssues = loop?.last_diagnosis?.issues;
    const criticalIssues = Array.isArray(diagnosisIssues)
        ? diagnosisIssues.filter((issue) => String(issue?.severity || '') === 'critical')
        : [];
    const rhythmProfile = (loop?.last_diagnosis as { rhythm_profile?: BeatDivisionQaLoopView['rhythmProfile'] })
        ?.rhythm_profile ?? null;

    const isInLoopSteps = isBeatDivisionQaLoopStep(currentStep);
    const showLoopChrome = true;

    let phase: BeatDivisionQaLoopPhase = 'idle';
    if (isRunning && currentStep === 'beat_division') {
        phase = attempt > 1 || retryCount > 0 ? 'retrying' : 'dividing';
    } else if (isRunning && currentStep === 'beat_division_qa') {
        phase = 'auditing';
    } else if (divisionStatus === 'done' && qaStatus === 'done') {
        phase = 'passed';
    }

    const activeStep: BeatDivisionQaLoopStepKey | null = isRunning && currentStep === 'beat_division'
        ? 'beat_division'
        : isRunning && currentStep === 'beat_division_qa'
            ? 'beat_division_qa'
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
        rhythmProfile,
        criticalIssues,
        divisionStatus,
        qaStatus,
    };
}

export function beatQaLoopPhaseLabel(phase: BeatDivisionQaLoopPhase, view: BeatDivisionQaLoopView): string {
    switch (phase) {
        case 'dividing':
            return `Đang chia beat — lần ${view.attempt}/${view.maxAttempts}`;
        case 'retrying':
            return `Đang sửa visual beat map — lần ${view.attempt}/${view.maxAttempts}`;
        case 'auditing':
            return `Đang đánh giá nhịp visual — lần ${view.attempt}/${view.maxAttempts}`;
        case 'passed':
            return view.retryCount > 0
                ? `QA nhịp visual đã pass sau ${view.retryCount} lần thử lại`
                : 'QA nhịp visual đã pass';
        default:
            return `Vòng QA nhịp visual — tối đa ${view.maxAttempts} lần`;
    }
}

export function beatQaLoopStepStatusLabel(
    stepKey: BeatDivisionQaLoopStepKey,
    stepStatus: string,
    view: BeatDivisionQaLoopView,
): string {
    const normalized = String(stepStatus || 'pending').trim().toLowerCase();
    const base = PIPELINE_STEP_STATUS_LABEL[normalized] || stepStatus || '—';

    if (!view.isLoopActive || view.activeStep !== stepKey) {
        return base;
    }

    if (stepKey === 'beat_division') {
        return view.phase === 'retrying'
            ? `Sửa visual · ${view.attempt}/${view.maxAttempts}`
            : `Đang chia beat · ${view.attempt}/${view.maxAttempts}`;
    }

    return `Đang đánh giá · ${view.attempt}/${view.maxAttempts}`;
}

export function beatQaLoopCurrentStepLabel(
    currentStep: string,
    view: BeatDivisionQaLoopView,
): string {
    if (!isBeatDivisionQaLoopStep(currentStep)) {
        if (currentStep in FULL_AUTO_PIPELINE_STEP_LABELS) {
            return FULL_AUTO_PIPELINE_STEP_LABELS[currentStep as FullAutoPipelineStepKey];
        }
        return currentStep;
    }

    const stepLabel = FULL_AUTO_PIPELINE_STEP_LABELS[currentStep];
    if (!view.isLoopActive) {
        return stepLabel;
    }

    if (currentStep === 'beat_division') {
        return view.phase === 'retrying'
            ? `${stepLabel} (lần ${view.attempt}/${view.maxAttempts})`
            : `${stepLabel} · lần ${view.attempt}/${view.maxAttempts}`;
    }

    return `${stepLabel} · lần ${view.attempt}/${view.maxAttempts}`;
}

export function splitBeatGroupSteps<T extends string>(steps: readonly T[]): {
    before: T[];
    loop: T[];
    after: T[];
} {
    const divisionIdx = steps.indexOf('beat_division' as T);
    const qaIdx = steps.indexOf('beat_division_qa' as T);
    if (divisionIdx < 0 || qaIdx < 0 || qaIdx <= divisionIdx) {
        return { before: [...steps], loop: [], after: [] };
    }

    return {
        before: steps.slice(0, divisionIdx),
        loop: steps.slice(divisionIdx, qaIdx + 1),
        after: steps.slice(qaIdx + 1),
    };
}

export function useBeatDivisionQaLoopView(pipeline: FullAutoPipelineSummary | null | undefined) {
    return useMemo(() => resolveBeatDivisionQaLoopView(pipeline), [pipeline]);
}
