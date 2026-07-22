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
    beatQaLoopPhaseLabel,
    resolveBeatDivisionQaLoopView,
    type BeatDivisionQaLoopView,
} from './agentVideoPipelineBeatQaLoopUi';

type Variant = 'light' | 'dark';

function loopBoxColors(variant: Variant, active: boolean) {
    if (variant === 'light') {
        return {
            border: active ? 'secondary.main' : 'rgba(156, 39, 176, 0.35)',
            bg: active ? 'rgba(156, 39, 176, 0.06)' : 'rgba(156, 39, 176, 0.03)',
            labelBg: active ? 'rgba(243, 229, 245, 1)' : 'rgba(250, 245, 252, 1)',
            labelColor: active ? 'secondary.dark' : 'secondary.main',
            divider: active ? 'rgba(156, 39, 176, 0.28)' : 'rgba(156, 39, 176, 0.18)',
            subtext: 'text.secondary',
        };
    }

    return {
        border: active ? 'rgba(206, 147, 216, 0.72)' : 'rgba(186, 104, 200, 0.38)',
        bg: active ? 'rgba(156, 39, 176, 0.16)' : 'rgba(156, 39, 176, 0.1)',
        labelBg: active ? 'rgba(74, 20, 140, 0.95)' : 'rgba(106, 27, 154, 0.88)',
        labelColor: 'rgba(225, 190, 231, 0.98)',
        divider: active ? 'rgba(206, 147, 216, 0.35)' : 'rgba(186, 104, 200, 0.22)',
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

type PipelineBeatQaLoopFeedbackProps = {
    view: BeatDivisionQaLoopView;
    variant?: Variant;
};

export function PipelineBeatQaLoopFeedback({
    view,
    variant = 'light',
}: PipelineBeatQaLoopFeedbackProps) {
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
            const beatId = String(issue.beat_id || '').trim();
            const message = String(issue.message || '').trim();
            const prefix = beatId ? `[${code}@${beatId}]` : `[${code}]`;
            return message ? `${prefix} ${message}` : prefix;
        })
        .join(' · ');

    const rhythmHint = view.rhythmProfile
        ? [
            view.rhythmProfile.peak_beats?.length
                ? `Peak: ${view.rhythmProfile.peak_beats.join(', ')}`
                : '',
            view.rhythmProfile.rest_beats?.length
                ? `Rest: ${view.rhythmProfile.rest_beats.join(', ')}`
                : '',
            view.rhythmProfile.cta_beat
                ? `CTA: ${view.rhythmProfile.cta_beat}`
                : '',
        ].filter(Boolean).join(' · ')
        : '';

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
            {rhythmHint ? (
                <Typography
                    variant="caption"
                    sx={{
                        display: 'block',
                        mt: 0.25,
                        color: colors.subtext,
                        fontSize: 9,
                        lineHeight: 1.35,
                        fontStyle: 'italic',
                    }}
                >
                    {rhythmHint}
                </Typography>
            ) : null}
        </Box>
    );
}

type PipelineBeatQaLoopSectionProps = {
    view: BeatDivisionQaLoopView;
    variant?: Variant;
    compact?: boolean;
    divisionNode: React.ReactNode;
    qaNode: React.ReactNode;
};

export function PipelineBeatQaLoopSection({
    view,
    variant = 'light',
    compact = false,
    divisionNode,
    qaNode,
}: PipelineBeatQaLoopSectionProps) {
    if (!view.showLoopChrome) {
        return (
            <>
                {divisionNode}
                {qaNode}
            </>
        );
    }

    const colors = loopBoxColors(variant, view.isLoopActive);
    const phaseLabel = beatQaLoopPhaseLabel(view.phase, view);
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
            <BorderLabel label="Chia beat + visual" variant={variant} active={view.isLoopActive} />

            <Box sx={{ position: 'absolute', top: 0, right: 10, transform: 'translateY(-50%)', zIndex: 1 }}>
                <Tooltip title={phaseLabel} arrow placement="top">
                    <Chip
                        size="small"
                        icon={view.isLoopActive ? (
                            <AutorenewIcon
                                sx={{
                                    fontSize: '13px !important',
                                    animation: 'pipelineBeatQaSpin 1.2s linear infinite',
                                    '@keyframes pipelineBeatQaSpin': {
                                        from: { transform: 'rotate(0deg)' },
                                        to: { transform: 'rotate(360deg)' },
                                    },
                                }}
                            />
                        ) : (
                            <LoopIcon sx={{ fontSize: '13px !important' }} />
                        )}
                        label={`Lần ${view.attempt}/${view.maxAttempts}`}
                        color={view.isLoopActive ? 'secondary' : view.phase === 'passed' ? 'success' : 'default'}
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
                {divisionNode}
            </Box>

            <PipelineBeatQaLoopFeedback view={view} variant={variant} />

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
                label="Visual rhythm QA"
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

type PipelineBeatQaLoopMetaProps = {
    pipeline: FullAutoPipelineSummary | null | undefined;
};

export function PipelineBeatQaLoopMeta({ pipeline }: PipelineBeatQaLoopMetaProps) {
    const view = React.useMemo(() => resolveBeatDivisionQaLoopView(pipeline), [pipeline]);
    const hasQaActivity = view.isLoopActive
        || view.retryCount > 0
        || Boolean(pipeline?.qa_loops?.beat_division)
        || view.divisionStatus === 'running'
        || view.qaStatus === 'running';

    if (!hasQaActivity) {
        return null;
    }

    const phaseLabel = beatQaLoopPhaseLabel(view.phase, view);

    return (
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
            <Chip
                size="small"
                icon={view.isLoopActive ? <AutorenewIcon sx={{ fontSize: '14px !important' }} /> : <LoopIcon sx={{ fontSize: '14px !important' }} />}
                label={phaseLabel}
                color={view.isLoopActive ? 'secondary' : view.phase === 'passed' ? 'success' : 'default'}
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
