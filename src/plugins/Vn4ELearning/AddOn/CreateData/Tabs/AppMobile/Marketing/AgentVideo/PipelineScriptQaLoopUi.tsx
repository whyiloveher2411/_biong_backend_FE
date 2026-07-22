import React from 'react';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import LoopIcon from '@mui/icons-material/Loop';
import SouthIcon from '@mui/icons-material/South';
import {
    Box,
    Chip,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import type { FullAutoPipelineSummary } from './agentVideoApi';
import {
    resolveScriptImproveQaLoopView,
    scriptQaLoopPhaseLabel,
    type ScriptImproveQaLoopView,
} from './agentVideoPipelineQaLoopUi';

type Variant = 'light' | 'dark';

function loopBoxColors(variant: Variant, active: boolean) {
    if (variant === 'light') {
        return {
            border: active ? 'info.main' : 'rgba(25, 118, 210, 0.38)',
            bg: active ? 'rgba(2, 136, 209, 0.06)' : 'rgba(25, 118, 210, 0.03)',
            labelBg: active ? 'rgba(232, 245, 253, 1)' : 'rgba(237, 247, 255, 1)',
            labelColor: active ? 'info.dark' : 'info.main',
            divider: active ? 'rgba(2, 136, 209, 0.28)' : 'rgba(25, 118, 210, 0.18)',
            subtext: 'text.secondary',
        };
    }

    return {
        border: active ? 'rgba(129, 212, 250, 0.72)' : 'rgba(144, 202, 249, 0.38)',
        bg: active ? 'rgba(2, 136, 209, 0.16)' : 'rgba(25, 118, 210, 0.1)',
        labelBg: active ? 'rgba(13, 71, 161, 0.95)' : 'rgba(21, 101, 192, 0.88)',
        labelColor: 'rgba(187, 222, 251, 0.98)',
        divider: active ? 'rgba(129, 212, 250, 0.35)' : 'rgba(144, 202, 249, 0.22)',
        subtext: 'rgba(255,255,255,0.62)',
    };
}

type BorderLabelProps = {
    label: string;
    variant: Variant;
    active: boolean;
    align?: 'left' | 'center' | 'right';
    anchor?: 'top' | 'bottom';
};

function BorderLabel({
    label,
    variant,
    active,
    align = 'left',
    anchor = 'top',
}: BorderLabelProps) {
    const colors = loopBoxColors(variant, active);
    const vertical = anchor === 'bottom'
        ? { bottom: 0, transform: 'translateY(50%)' }
        : { top: 0, transform: 'translateY(-50%)' };
    const horizontal = align === 'center'
        ? { left: '50%', transform: anchor === 'bottom' ? 'translate(-50%, 50%)' : 'translate(-50%, -50%)' }
        : align === 'right'
            ? { right: 10, transform: anchor === 'bottom' ? 'translateY(50%)' : 'translateY(-50%)' }
            : { left: 10, transform: anchor === 'bottom' ? 'translateY(50%)' : 'translateY(-50%)' };

    return (
        <Box
            sx={{
                position: 'absolute',
                zIndex: 1,
                px: 0.75,
                py: 0.1,
                borderRadius: 999,
                bgcolor: colors.labelBg,
                border: '1px solid',
                borderColor: colors.border,
                ...vertical,
                ...horizontal,
            }}
        >
            <Typography
                variant="caption"
                sx={{
                    display: 'block',
                    fontWeight: 800,
                    fontSize: 10,
                    lineHeight: 1.2,
                    letterSpacing: 0.15,
                    color: colors.labelColor,
                    whiteSpace: 'nowrap',
                }}
            >
                {label}
            </Typography>
        </Box>
    );
}

type PipelineScriptQaLoopFeedbackProps = {
    view: ScriptImproveQaLoopView;
    variant?: Variant;
};

export function PipelineScriptQaLoopFeedback({
    view,
    variant = 'light',
}: PipelineScriptQaLoopFeedbackProps) {
    if (!view.showLoopChrome) {
        return null;
    }

    const hasFeedback = view.lastSummary !== '' || view.criticalIssues.length > 0;
    if (!hasFeedback || view.phase === 'passed') {
        return null;
    }

    const colors = loopBoxColors(variant, view.isLoopActive);
    const issuePreview = view.criticalIssues
        .slice(0, 2)
        .map((issue) => {
            const code = String(issue.code || 'issue').trim();
            const message = String(issue.message || '').trim();
            return message ? `[${code}] ${message}` : `[${code}]`;
        })
        .join(' · ');

    return (
        <Box
            sx={{
                mx: 0.75,
                mt: 0.35,
                mb: 0.25,
                px: 0.75,
                py: 0.45,
                borderRadius: 1,
                bgcolor: variant === 'light' ? 'rgba(237, 108, 2, 0.08)' : 'rgba(255, 183, 77, 0.12)',
                border: '1px solid',
                borderColor: variant === 'light' ? 'rgba(237, 108, 2, 0.2)' : 'rgba(255, 183, 77, 0.25)',
            }}
        >
            {view.lastSummary ? (
                <Typography
                    variant="caption"
                    sx={{
                        display: 'block',
                        color: variant === 'light' ? 'warning.dark' : 'rgba(255, 224, 178, 0.95)',
                        fontSize: 10,
                        lineHeight: 1.35,
                        fontWeight: 600,
                    }}
                >
                    {view.lastSummary}
                </Typography>
            ) : null}
            {issuePreview ? (
                <Typography
                    variant="caption"
                    sx={{
                        display: 'block',
                        mt: view.lastSummary ? 0.25 : 0,
                        color: colors.subtext,
                        fontSize: 9,
                        lineHeight: 1.35,
                    }}
                >
                    {issuePreview}
                </Typography>
            ) : null}
        </Box>
    );
}

type PipelineScriptQaLoopSectionProps = {
    view: ScriptImproveQaLoopView;
    variant?: Variant;
    compact?: boolean;
    improveNode: React.ReactNode;
    qaNode: React.ReactNode;
};

export function PipelineScriptQaLoopSection({
    view,
    variant = 'light',
    compact = false,
    improveNode,
    qaNode,
}: PipelineScriptQaLoopSectionProps) {
    if (!view.showLoopChrome) {
        return (
            <>
                {improveNode}
                {qaNode}
            </>
        );
    }

    const colors = loopBoxColors(variant, view.isLoopActive);
    const phaseLabel = scriptQaLoopPhaseLabel(view.phase, view);
    const sectionPx = compact ? 0.65 : 0.85;
    const sectionPy = compact ? 0.45 : 0.55;

    return (
        <Box
            sx={{
                position: 'relative',
                mx: compact ? 0.5 : 0.75,
                my: compact ? 0.5 : 0.65,
                pt: compact ? 1.1 : 1.25,
                pb: compact ? 0.85 : 1,
                borderRadius: 1.5,
                border: '1.5px solid',
                borderColor: colors.border,
                bgcolor: colors.bg,
            }}
        >
            <BorderLabel label="Cải thiện script" variant={variant} active={view.isLoopActive} />

            <Box sx={{ position: 'absolute', top: 0, right: 10, transform: 'translateY(-50%)', zIndex: 1 }}>
                <Tooltip title={phaseLabel} arrow placement="top">
                    <Chip
                        size="small"
                        icon={view.isLoopActive ? (
                            <AutorenewIcon
                                sx={{
                                    fontSize: '13px !important',
                                    animation: 'pipelineQaSpin 1.2s linear infinite',
                                    '@keyframes pipelineQaSpin': {
                                        from: { transform: 'rotate(0deg)' },
                                        to: { transform: 'rotate(360deg)' },
                                    },
                                }}
                            />
                        ) : (
                            <LoopIcon sx={{ fontSize: '13px !important' }} />
                        )}
                        label={`Lần ${view.attempt}/${view.maxAttempts}`}
                        color={view.isLoopActive ? 'info' : view.phase === 'passed' ? 'success' : 'default'}
                        variant={view.isLoopActive ? 'filled' : 'outlined'}
                        sx={{
                            height: compact ? 20 : 22,
                            bgcolor: colors.labelBg,
                            '& .MuiChip-label': {
                                px: 0.65,
                                fontSize: 10,
                                fontWeight: 700,
                            },
                        }}
                    />
                </Tooltip>
            </Box>

            <Box sx={{ px: sectionPx, pt: sectionPy, pb: compact ? 0.35 : 0.45 }}>
                {improveNode}
            </Box>

            <PipelineScriptQaLoopFeedback view={view} variant={variant} />

            <Box
                sx={{
                    mx: sectionPx,
                    borderTop: '1px solid',
                    borderColor: colors.divider,
                }}
            />

            <Box sx={{ px: sectionPx, pt: compact ? 0.65 : 0.75, pb: compact ? 1.15 : 1.35 }}>
                {qaNode}
            </Box>

            <BorderLabel
                label="Đánh giá QA"
                variant={variant}
                active={view.isLoopActive}
                align="center"
                anchor="bottom"
            />

            {view.isLoopActive || view.retryCount > 0 ? (
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: 0,
                        right: 10,
                        transform: 'translateY(50%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        bgcolor: colors.labelBg,
                        border: '1px solid',
                        borderColor: colors.border,
                        color: colors.labelColor,
                        zIndex: 1,
                    }}
                >
                    <SouthIcon sx={{ fontSize: 12, transform: 'rotate(180deg)' }} />
                </Box>
            ) : null}
        </Box>
    );
}

type PipelineScriptQaLoopMetaProps = {
    pipeline: FullAutoPipelineSummary | null | undefined;
};

export function PipelineScriptQaLoopMeta({ pipeline }: PipelineScriptQaLoopMetaProps) {
    const view = React.useMemo(() => resolveScriptImproveQaLoopView(pipeline), [pipeline]);
    const hasQaActivity = view.isLoopActive
        || view.retryCount > 0
        || Boolean(pipeline?.qa_loops?.script_improve)
        || view.improveStatus === 'running'
        || view.qaStatus === 'running';

    if (!hasQaActivity) {
        return null;
    }

    const phaseLabel = scriptQaLoopPhaseLabel(view.phase, view);

    return (
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
            <Chip
                size="small"
                icon={view.isLoopActive ? <AutorenewIcon sx={{ fontSize: '14px !important' }} /> : <LoopIcon sx={{ fontSize: '14px !important' }} />}
                label={phaseLabel}
                color={view.isLoopActive ? 'info' : view.phase === 'passed' ? 'success' : 'default'}
                variant={view.isLoopActive ? 'filled' : 'outlined'}
            />
            {view.retryCount > 0 ? (
                <Chip
                    size="small"
                    variant="outlined"
                    color="warning"
                    label={`Đã thử lại ${view.retryCount} lần`}
                />
            ) : null}
        </Stack>
    );
}
