import React from 'react';
import {
    Box,
    LinearProgress,
    Step,
    StepLabel,
    Stepper,
    Typography,
    useMediaQuery,
    useTheme,
    Alert,
} from '@mui/material';
import {
    resolveWorkflowBlockedMessage,
    type ShortVideoWorkflowHistoryEntry,
    type ShortVideoWorkflowProgress,
    type ShortVideoWorkflowProgressStep,
    type ShortVideoWorkflowStatus,
} from 'helpers/marketingShortVideoWorkflowApi';

const WORKFLOW_STAGE_LABELS: Record<string, string> = {
    script: 'Đang viết kịch bản',
    scene_audio: 'Đang tạo giọng nói',
    scene_audio_vieneu: 'Đang tạo giọng nói',
    timeline_plan: 'Đang dựng timeline',
    manifest: 'Đang dựng manifest',
    render: 'Đang render video',
    assets: 'Hoàn tất',
    done: 'Hoàn tất',
    blocked: 'Bị chặn',
};

const STEP_LABELS: Record<string, string> = {
    script: 'Kịch bản',
    scene_audio: 'Giọng nói',
    timeline_plan: 'Timeline AI',
    manifest: 'Manifest',
    render: 'Render video',
};

export function resolveWorkflowStageLabel(stage: string): string {
    const key = stage.trim().toLowerCase();
    if (!key) {
        return 'Đang chạy pipeline…';
    }
    return WORKFLOW_STAGE_LABELS[key] ?? `Pipeline: ${stage}`;
}

export function resolveWorkflowDisplayStage(
    status: ShortVideoWorkflowStatus | null | undefined,
    fallbackStage = ''
): string {
    if (!status) {
        return resolveWorkflowStageLabel(fallbackStage);
    }

    const activeStep = String(status.pipeline_active_step || '').trim();
    const progress = status.workflow_progress;
    const runningStepId = activeStep
        || String(progress?.current_step_id || '').trim();
    if (runningStepId && progress?.steps?.length) {
        const step = progress.steps.find((item) => item.id === runningStepId);
        if (step && (step.status === 'running' || activeStep !== '')) {
            return `Đang ${resolveStepLabel(step).toLowerCase()}`;
        }
    }

    if (activeStep) {
        return resolveWorkflowStageLabel(activeStep);
    }

    const stage = String(status.stage || fallbackStage).trim().toLowerCase();
    const reason = String(status.next_action?.reason || '').trim().toLowerCase();
    if (stage === 'blocked' && reason === 'pipeline_running') {
        return 'Đang chạy pipeline…';
    }

    return resolveWorkflowStageLabel(String(status.stage || fallbackStage));
}

function resolveStepLabel(step: ShortVideoWorkflowProgressStep): string {
    return step.label || STEP_LABELS[step.id] || step.id;
}

function resolveRunningLabel(status: ShortVideoWorkflowStatus | null): string {
    return resolveWorkflowDisplayStage(status, String(status?.stage || ''));
}

function buildFallbackProgress(status: ShortVideoWorkflowStatus | null): ShortVideoWorkflowProgress {
    const stage = String(status?.stage || '').trim().toLowerCase();
    const stepIds = ['script', 'scene_audio', 'timeline_plan', 'manifest', 'render'];
    const stageIndex = stepIds.indexOf(stage === 'scene_audio_vieneu' ? 'scene_audio' : stage);

    const steps: ShortVideoWorkflowProgressStep[] = stepIds.map((id, index) => {
        let stepStatus: ShortVideoWorkflowProgressStep['status'] = 'pending';
        if (stageIndex < 0) {
            stepStatus = stage === 'assets' || stage === 'done' ? 'done' : 'pending';
        } else if (index < stageIndex) {
            stepStatus = 'done';
        } else if (index === stageIndex) {
            stepStatus = 'running';
        }
        return {
            id,
            label: STEP_LABELS[id] || id,
            status: stepStatus,
        };
    });

    const total = steps.length;
    const completed = steps.filter((step) => step.status === 'done').length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
        steps,
        current_step_id: stageIndex >= 0 ? stepIds[stageIndex] : '',
        current_step_index: Math.max(0, stageIndex),
        total_steps: total,
        completed_steps: completed,
        remaining_steps: Math.max(0, total - completed - (stageIndex >= 0 ? 1 : 0)),
        percent,
    };
}

type ShortVideoPipelineProgressPanelProps = {
    status: ShortVideoWorkflowStatus | null;
};

const WorkflowStepDurationChart: React.FC<{
    history: ShortVideoWorkflowHistoryEntry[];
}> = ({ history }) => {
    const entries = history.filter((item) => Number(item.elapsed_ms || 0) > 0);
    if (entries.length === 0) {
        return null;
    }

    const maxMs = Math.max(...entries.map((item) => Number(item.elapsed_ms || 0)), 1);

    return (
        <Box sx={{ mt: 1.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                Thời gian từng bước (ms)
            </Typography>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: 0.75,
                    height: 56,
                }}
            >
                {entries.map((entry, index) => {
                    const elapsedMs = Number(entry.elapsed_ms || 0);
                    const stepId = String(entry.step || `step_${index}`);
                    const heightPct = Math.max(8, (elapsedMs / maxMs) * 100);
                    return (
                        <Box
                            key={`${stepId}-${entry.at || index}`}
                            sx={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                minWidth: 0,
                            }}
                        >
                            <Box
                                title={`${STEP_LABELS[stepId] || stepId}: ${elapsedMs.toLocaleString()} ms`}
                                sx={{
                                    width: '100%',
                                    height: `${heightPct}%`,
                                    bgcolor: entry.success === false ? 'error.main' : 'primary.main',
                                    borderRadius: '4px 4px 0 0',
                                    opacity: 0.85,
                                }}
                            />
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                    mt: 0.5,
                                    fontSize: 10,
                                    textAlign: 'center',
                                    lineHeight: 1.2,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    width: '100%',
                                }}
                            >
                                {STEP_LABELS[stepId] || stepId}
                            </Typography>
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
};

const ShortVideoPipelineProgressPanel: React.FC<ShortVideoPipelineProgressPanelProps> = ({
    status,
}) => {
    const theme = useTheme();
    const isNarrow = useMediaQuery(theme.breakpoints.down('sm'));
    const progress = status?.workflow_progress ?? buildFallbackProgress(status);
    const percent = Math.min(100, Math.max(0, Number(progress.percent ?? 0)));
    const totalSteps = Number(progress.total_steps ?? progress.steps.length);
    const completedSteps = Number(progress.completed_steps ?? 0);
    const remainingSteps = Number(
        progress.remaining_steps ?? Math.max(0, totalSteps - completedSteps)
    );
    const currentIndex = Math.max(0, Number(progress.current_step_index ?? 0));
    const runningLabel = resolveRunningLabel(status);
    const isBlocked = String(status?.stage || '').trim().toLowerCase() === 'blocked'
        && String(status?.next_action?.reason || '').trim().toLowerCase() !== 'pipeline_running';
    const blockedMessage = status && isBlocked ? resolveWorkflowBlockedMessage(status) : '';
    const subProgress = progress.sub_progress;
    const history = progress.workflow_history ?? [];

    return (
        <Box
            sx={{
                px: 2,
                pt: 2,
                pb: 1.5,
                flexShrink: 0,
                borderBottom: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <LinearProgress
                        variant="determinate"
                        value={percent}
                        sx={{ height: 8, borderRadius: 1 }}
                    />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                    {percent}%
                </Typography>
            </Box>

            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25 }}>
                {isBlocked ? 'Pipeline bị chặn' : runningLabel}
            </Typography>
            {isBlocked ? (
                <Alert severity="error" sx={{ mb: 1.5, py: 0.25 }}>
                    {blockedMessage}
                </Alert>
            ) : null}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                Bước {Math.min(totalSteps, currentIndex + 1)}/{totalSteps || progress.steps.length}
                {remainingSteps > 0 ? ` · Còn ${remainingSteps} bước` : ' · Sắp hoàn tất'}
            </Typography>

            <Box
                sx={{
                    ...(isNarrow
                        ? {
                            '& .MuiStepConnector-root': { marginLeft: '12px' },
                        }
                        : {}),
                    '& .MuiStepLabel-label': {
                        fontSize: isNarrow ? 12 : 11,
                        mt: isNarrow ? 0 : 0.5,
                    },
                }}
            >
                <Stepper
                    activeStep={currentIndex}
                    orientation={isNarrow ? 'vertical' : 'horizontal'}
                    alternativeLabel={!isNarrow}
                >
                    {progress.steps.map((step: ShortVideoWorkflowProgressStep) => {
                    const isRunning = step.status === 'running';
                    const isSkipped = step.status === 'skipped';
                    const isFailed = step.status === 'failed';
                    const isDone = step.status === 'done' || isSkipped;

                    return (
                        <Step
                            key={step.id}
                            completed={isDone && !isRunning}
                            active={isRunning}
                            sx={isSkipped ? { opacity: 0.55 } : {}}
                        >
                            <StepLabel
                                error={isFailed}
                                optional={
                                    isSkipped ? (
                                        <Typography variant="caption">Bỏ qua</Typography>
                                    ) : undefined
                                }
                                StepIconProps={
                                    isRunning
                                        ? {
                                              icon: (
                                                  <CircularProgressThin />
                                              ),
                                          }
                                        : undefined
                                }
                            >
                                {resolveStepLabel(step)}
                            </StepLabel>
                            {isRunning
                                && subProgress
                                && subProgress.type === 'scene_audio'
                                && step.id === 'scene_audio' ? (
                                <Box sx={{ mt: 0.5, px: isNarrow ? 4 : 1, width: '100%' }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Scene {subProgress.done}/{subProgress.total}
                                    </Typography>
                                    <LinearProgress
                                        variant="determinate"
                                        value={
                                            subProgress.total > 0
                                                ? (subProgress.done / subProgress.total) * 100
                                                : 0
                                        }
                                        sx={{ height: 4, borderRadius: 1, mt: 0.25 }}
                                    />
                                </Box>
                            ) : null}
                        </Step>
                    );
                    })}
                </Stepper>
            </Box>

            <WorkflowStepDurationChart history={history} />
        </Box>
    );
};

const CircularProgressThin: React.FC = () => (
    <Box
        sx={{
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        }}
    >
        <Box
            component="span"
            sx={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                border: '2px solid',
                borderColor: 'primary.main',
                borderTopColor: 'transparent',
                animation: 'shortVideoPipelineSpin 0.8s linear infinite',
                '@keyframes shortVideoPipelineSpin': {
                    to: { transform: 'rotate(360deg)' },
                },
            }}
        />
    </Box>
);

export default ShortVideoPipelineProgressPanel;
