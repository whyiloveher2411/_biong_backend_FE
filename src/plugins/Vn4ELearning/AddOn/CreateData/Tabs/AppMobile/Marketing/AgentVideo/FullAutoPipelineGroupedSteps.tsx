import React from 'react';
import { Box, Chip, CircularProgress, ListSubheader, MenuItem, Stack, Tooltip, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import {
    FULL_AUTO_PIPELINE_AI_STEPS,
    FULL_AUTO_PIPELINE_HEADLESS_STEPS,
    FULL_AUTO_PIPELINE_STEP_GROUPS,
    FULL_AUTO_PIPELINE_STEP_LABELS,
    FULL_AUTO_PIPELINE_STEP_ORDER,
    getFullAutoPipelineStepIndex,
    isFullAutoPipelineAiStep,
    isFullAutoPipelineHeadlessStep,
    type FullAutoPipelineStepKey,
    type FullAutoPipelineSummary,
} from './agentVideoApi';
import {
    getPipelineGroupSurface,
    PIPELINE_STEP_STATUS_LABEL,
    pipelineAiBadgeSx,
    pipelineHeadlessBadgeSx,
    pipelineHeadlessLegendSx,
    pipelineStepStatusColor,
} from './agentVideoPipelineUi';

const PIPELINE_HEADLESS_TOOLTIP = 'Bước này dùng trình duyệt nền (Puppeteer / headless Chrome)';
const PIPELINE_AI_TOOLTIP = 'Bước này dùng AI (Gemini, Whisper, ChatGPT TTS…)';

function resolveHeadlessStepSet(headlessSteps?: FullAutoPipelineStepKey[]): Set<string> {
    const source = headlessSteps && headlessSteps.length > 0
        ? headlessSteps
        : FULL_AUTO_PIPELINE_HEADLESS_STEPS;
    return new Set(source);
}

function resolveAiStepSet(aiSteps?: FullAutoPipelineStepKey[]): Set<string> {
    const source = aiSteps && aiSteps.length > 0
        ? aiSteps
        : FULL_AUTO_PIPELINE_AI_STEPS;
    return new Set(source);
}

function PipelineStepLegend({ variant = 'dark' }: { variant?: 'light' | 'dark' }) {
    return (
        <Typography component="span" sx={pipelineHeadlessLegendSx(variant)}>
            Headless = trình duyệt nền · AI = Gemini / Whisper / TTS AI
        </Typography>
    );
}

function PipelineHeadlessBadge({ variant = 'dark', compact = false }: { variant?: 'light' | 'dark'; compact?: boolean }) {
    return (
        <Tooltip title={PIPELINE_HEADLESS_TOOLTIP} arrow placement="top">
            <Chip
                size="small"
                label="Headless"
                variant="outlined"
                sx={{
                    ...pipelineHeadlessBadgeSx(variant),
                    flexShrink: 0,
                    ...(compact ? {
                        height: 16,
                        '& .MuiChip-label': {
                            px: 0.45,
                            fontSize: 9,
                            fontWeight: 700,
                            lineHeight: 1.1,
                        },
                    } : {}),
                }}
            />
        </Tooltip>
    );
}

function PipelineAiBadge({ variant = 'dark', compact = false }: { variant?: 'light' | 'dark'; compact?: boolean }) {
    return (
        <Tooltip title={PIPELINE_AI_TOOLTIP} arrow placement="top">
            <Chip
                size="small"
                label="AI"
                variant="outlined"
                sx={{
                    ...pipelineAiBadgeSx(variant),
                    flexShrink: 0,
                    ...(compact ? {
                        height: 16,
                        '& .MuiChip-label': {
                            px: 0.45,
                            fontSize: 9,
                            fontWeight: 700,
                            lineHeight: 1.1,
                        },
                    } : {}),
                }}
            />
        </Tooltip>
    );
}

type PipelineStepTitleProps = {
    stepKey: FullAutoPipelineStepKey;
    variant?: 'light' | 'dark';
    headlessStepSet: Set<string>;
    aiStepSet: Set<string>;
    typographyVariant?: 'body2' | 'caption';
    typographySx?: Record<string, unknown>;
    compact?: boolean;
};

function PipelineStepTitle({
    stepKey,
    variant = 'dark',
    headlessStepSet,
    aiStepSet,
    typographyVariant = 'caption',
    typographySx,
    compact = false,
}: PipelineStepTitleProps) {
    const showHeadless = headlessStepSet.has(stepKey) || isFullAutoPipelineHeadlessStep(stepKey);
    const showAi = aiStepSet.has(stepKey) || isFullAutoPipelineAiStep(stepKey);
    const label = `${getFullAutoPipelineStepIndex(stepKey)}. ${FULL_AUTO_PIPELINE_STEP_LABELS[stepKey]}`;

    if (compact) {
        return (
            <Box
                sx={{
                    minWidth: 0,
                    flex: 1,
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    columnGap: 0.45,
                    rowGap: 0.2,
                }}
            >
                <Typography
                    component="span"
                    sx={{
                        fontSize: 11,
                        lineHeight: 1.25,
                        fontWeight: 500,
                        color: 'text.primary',
                        ...typographySx,
                    }}
                >
                    {label}
                </Typography>
                {showAi ? <PipelineAiBadge variant={variant} compact /> : null}
                {showHeadless ? <PipelineHeadlessBadge variant={variant} compact /> : null}
            </Box>
        );
    }

    return (
        <Stack
            direction="row"
            alignItems="center"
            gap={0.5}
            sx={{ minWidth: 0, flex: 1 }}
        >
            <Typography
                component="span"
                variant={typographyVariant}
                noWrap={variant === 'dark'}
                sx={typographySx}
            >
                {label}
            </Typography>
            {showAi ? <PipelineAiBadge variant={variant} /> : null}
            {showHeadless ? <PipelineHeadlessBadge variant={variant} /> : null}
        </Stack>
    );
}

type PipelineStatusTone = 'default' | 'success' | 'info' | 'warning' | 'error';

function pipelineStatusTone(status: string): PipelineStatusTone {
    switch (String(status || 'pending').trim().toLowerCase()) {
        case 'done':
            return 'success';
        case 'running':
            return 'info';
        case 'failed':
            return 'error';
        case 'skipped':
            return 'warning';
        default:
            return 'default';
    }
}

function pipelineStatusChipIcon(tone: PipelineStatusTone): React.ReactElement | undefined {
    if (tone === 'success') {
        return <CheckCircleIcon />;
    }
    if (tone === 'info') {
        return <CircularProgress size={12} color="inherit" thickness={5} />;
    }
    if (tone === 'error') {
        return <ErrorIcon />;
    }
    return undefined;
}

function PipelineStepStatusChip({ status, compact = false }: { status: string; compact?: boolean }) {
    const normalized = String(status || 'pending').trim().toLowerCase();
    const label = PIPELINE_STEP_STATUS_LABEL[normalized] || status || '—';
    const tone = pipelineStatusTone(normalized);
    return (
        <Chip
            size="small"
            label={label}
            color={tone}
            variant={tone === 'default' ? 'outlined' : 'filled'}
            icon={pipelineStatusChipIcon(tone)}
            sx={{
                height: compact ? 18 : 20,
                maxWidth: '100%',
                flexShrink: 0,
                '& .MuiChip-icon': {
                    ml: 0.5,
                    mr: -0.25,
                    fontSize: compact ? 12 : 14,
                    color: 'inherit',
                },
                '& .MuiChip-label': {
                    px: compact ? 0.55 : 0.75,
                    fontSize: compact ? 10 : 11,
                    fontWeight: 600,
                    lineHeight: 1.2,
                },
            }}
        />
    );
}

type PipelineGroupedMenuItemsProps = {
    steps?: FullAutoPipelineSummary['steps'];
    headlessSteps?: FullAutoPipelineSummary['headless_steps'];
    aiSteps?: FullAutoPipelineSummary['ai_steps'];
    restartableSet: Set<FullAutoPipelineStepKey>;
    disabled?: boolean;
    onSelectStep: (stepKey: FullAutoPipelineStepKey) => void;
};

export function PipelineGroupedMenuItems({
    steps,
    headlessSteps,
    aiSteps,
    restartableSet,
    disabled = false,
    onSelectStep,
}: PipelineGroupedMenuItemsProps) {
    const headlessStepSet = React.useMemo(
        () => resolveHeadlessStepSet(headlessSteps),
        [headlessSteps],
    );
    const aiStepSet = React.useMemo(
        () => resolveAiStepSet(aiSteps),
        [aiSteps],
    );

    return (
        <>
            <Box sx={{ px: 2, pt: 0.5, pb: 0.25 }}>
                <PipelineStepLegend variant="light" />
            </Box>
            {FULL_AUTO_PIPELINE_STEP_GROUPS.map((group, groupIndex) => {
                const surface = getPipelineGroupSurface(group.key, 'light');
                return (
                    <Box
                        key={group.key}
                        sx={{
                            mx: 1,
                            mt: groupIndex === 0 ? 0.5 : 1,
                            mb: groupIndex === FULL_AUTO_PIPELINE_STEP_GROUPS.length - 1 ? 0.5 : 0,
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: surface.borderColor,
                            bgcolor: surface.bgcolor,
                            overflow: 'hidden',
                        }}
                    >
                        <ListSubheader
                            disableSticky
                            component="div"
                            sx={{
                                bgcolor: 'transparent',
                                color: surface.headerColor,
                                fontSize: 13,
                                fontWeight: 800,
                                lineHeight: 1.6,
                                letterSpacing: 0.2,
                                px: 2,
                                py: 0.9,
                            }}
                        >
                            {group.label}
                        </ListSubheader>
                        {group.steps.map((stepKey) => {
                            const enabled = restartableSet.has(stepKey);
                            const stepInfo = steps?.[stepKey];
                            const status = String(stepInfo?.status || 'pending');
                            const statusLabel = PIPELINE_STEP_STATUS_LABEL[status] || status;
                            return (
                                <MenuItem
                                    key={stepKey}
                                    disabled={!enabled || disabled}
                                    onClick={() => onSelectStep(stepKey)}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 2,
                                        minWidth: 300,
                                        py: 0.85,
                                        pl: 3.25,
                                        pr: 1.75,
                                        bgcolor: 'transparent',
                                        borderTop: '1px solid',
                                        borderColor: surface.borderColor,
                                        '&:hover': {
                                            bgcolor: 'rgba(255,255,255,0.55)',
                                        },
                                        '&.Mui-disabled': {
                                            opacity: 0.72,
                                        },
                                    }}
                                >
                                    <PipelineStepTitle
                                        stepKey={stepKey}
                                        variant="light"
                                        typographyVariant="body2"
                                        headlessStepSet={headlessStepSet}
                                        aiStepSet={aiStepSet}
                                        typographySx={{
                                            color: enabled ? 'text.primary' : 'text.disabled',
                                            fontWeight: status === 'running' ? 600 : 400,
                                        }}
                                    />
                                    <Typography
                                        component="span"
                                        variant="caption"
                                        sx={{
                                            color: enabled
                                                ? pipelineStepStatusColor(status, 'dark')
                                                : 'text.disabled',
                                            fontWeight: 600,
                                            flexShrink: 0,
                                        }}
                                    >
                                        {statusLabel}
                                    </Typography>
                                </MenuItem>
                            );
                        })}
                    </Box>
                );
            })}
        </>
    );
}

type PipelineGroupedStepListProps = {
    steps?: FullAutoPipelineSummary['steps'];
    headlessSteps?: FullAutoPipelineSummary['headless_steps'];
    aiSteps?: FullAutoPipelineSummary['ai_steps'];
    currentStep?: string;
};

export function PipelineGroupedStepList({
    steps,
    headlessSteps,
    aiSteps,
    currentStep = '',
}: PipelineGroupedStepListProps) {
    const headlessStepSet = React.useMemo(
        () => resolveHeadlessStepSet(headlessSteps),
        [headlessSteps],
    );
    const aiStepSet = React.useMemo(
        () => resolveAiStepSet(aiSteps),
        [aiSteps],
    );

    return (
        <>
            <PipelineStepLegend variant="dark" />
            {FULL_AUTO_PIPELINE_STEP_GROUPS.map((group, groupIndex) => {
                const surface = getPipelineGroupSurface(group.key, 'dark');
                return (
                    <Box
                        key={group.key}
                        sx={{
                            mt: groupIndex === 0 ? 0 : 0.75,
                            px: 1,
                            py: 0.75,
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: surface.borderColor,
                            bgcolor: surface.bgcolor,
                        }}
                    >
                        <Typography
                            variant="subtitle2"
                            sx={{
                                display: 'block',
                                pb: 0.55,
                                fontSize: 12,
                                fontWeight: 800,
                                color: surface.headerColor,
                                letterSpacing: 0.2,
                                px: 0.5,
                            }}
                        >
                            {group.label}
                        </Typography>
                        {group.steps.map((stepKey) => {
                            const status = String(steps?.[stepKey]?.status || 'pending');
                            const isCurrent = stepKey === currentStep;
                            return (
                                <Box
                                    key={stepKey}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 1,
                                        py: 0.35,
                                        pl: 1.75,
                                        pr: 0.5,
                                        opacity: status === 'pending' && !isCurrent ? 0.55 : 1,
                                    }}
                                >
                                    <PipelineStepTitle
                                        stepKey={stepKey}
                                        variant="dark"
                                        headlessStepSet={headlessStepSet}
                                        aiStepSet={aiStepSet}
                                        typographySx={{
                                            flex: 1,
                                            fontWeight: isCurrent || status === 'running' ? 700 : 400,
                                            color: isCurrent ? 'common.white' : 'rgba(255,255,255,0.82)',
                                            fontSize: 'inherit',
                                        }}
                                    />
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            flexShrink: 0,
                                            fontWeight: 600,
                                            color: pipelineStepStatusColor(status, 'light'),
                                            fontSize: 10,
                                        }}
                                    >
                                        {PIPELINE_STEP_STATUS_LABEL[status] || status}
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Box>
                );
            })}
        </>
    );
}

type PipelineGroupedWorkflowListProps = {
    steps?: FullAutoPipelineSummary['steps'];
    headlessSteps?: FullAutoPipelineSummary['headless_steps'];
    aiSteps?: FullAutoPipelineSummary['ai_steps'];
    currentStep?: string;
    pipelineStatus?: string;
};

export function PipelineGroupedWorkflowList({
    steps,
    headlessSteps,
    aiSteps,
    currentStep = '',
    pipelineStatus = '',
}: PipelineGroupedWorkflowListProps) {
    const headlessStepSet = React.useMemo(
        () => resolveHeadlessStepSet(headlessSteps),
        [headlessSteps],
    );
    const aiStepSet = React.useMemo(
        () => resolveAiStepSet(aiSteps),
        [aiSteps],
    );

    const extraSteps = steps
        ? Object.entries(steps).filter(
            ([stepKey]) => !(FULL_AUTO_PIPELINE_STEP_ORDER as readonly string[]).includes(stepKey),
        )
        : [];

    return (
        <Stack spacing={0.75} sx={{ mt: 0.5 }}>
            <Typography component="span" sx={{ ...pipelineHeadlessLegendSx('light'), fontSize: 9, pb: 0 }}>
                Headless = trình duyệt nền · AI = Gemini / Whisper / TTS AI
            </Typography>
            {FULL_AUTO_PIPELINE_STEP_GROUPS.map((group) => {
                const surface = getPipelineGroupSurface(group.key, 'light');
                return (
                    <Box
                        key={group.key}
                        sx={{
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: surface.borderColor,
                            bgcolor: surface.bgcolor,
                            overflow: 'hidden',
                        }}
                    >
                        <Typography
                            variant="subtitle2"
                            sx={{
                                display: 'block',
                                px: 1.15,
                                py: 0.55,
                                fontSize: 11,
                                fontWeight: 800,
                                color: surface.headerColor,
                                letterSpacing: 0.15,
                            }}
                        >
                            {group.label}
                        </Typography>
                        {group.steps.map((stepKey) => {
                            const status = String(steps?.[stepKey]?.status || 'pending');
                            const isCurrent = stepKey === currentStep
                                && String(pipelineStatus || '').trim().toLowerCase() === 'running';
                            return (
                                <Box
                                    key={stepKey}
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: 'minmax(0, 1fr) auto',
                                        alignItems: 'start',
                                        columnGap: 0.5,
                                        py: 0.4,
                                        pl: 1.35,
                                        pr: 0.85,
                                        borderTop: '1px solid',
                                        borderColor: surface.borderColor,
                                        bgcolor: isCurrent ? 'rgba(255,255,255,0.45)' : 'transparent',
                                    }}
                                >
                                    <PipelineStepTitle
                                        stepKey={stepKey}
                                        variant="light"
                                        headlessStepSet={headlessStepSet}
                                        aiStepSet={aiStepSet}
                                        compact
                                        typographySx={{
                                            fontWeight: isCurrent || status === 'running' ? 700 : 500,
                                        }}
                                    />
                                    <PipelineStepStatusChip status={status} compact />
                                </Box>
                            );
                        })}
                    </Box>
                );
            })}
            {extraSteps.length > 0 ? (
                <Box
                    sx={{
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        overflow: 'hidden',
                    }}
                >
                    <Typography
                        variant="subtitle2"
                        sx={{
                            display: 'block',
                            px: 1.5,
                            py: 0.85,
                            fontSize: 13,
                            fontWeight: 800,
                            color: 'text.secondary',
                        }}
                    >
                        Khác
                    </Typography>
                    {extraSteps.map(([stepKey, info]) => (
                        <Box
                            key={stepKey}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 1,
                                py: 0.55,
                                pl: 2.25,
                                pr: 1.25,
                                borderTop: '1px solid',
                                borderColor: 'divider',
                            }}
                        >
                            <Typography variant="caption" sx={{ flex: 1, minWidth: 0, fontWeight: 500 }}>
                                {stepKey in FULL_AUTO_PIPELINE_STEP_LABELS
                                    ? FULL_AUTO_PIPELINE_STEP_LABELS[stepKey as FullAutoPipelineStepKey]
                                    : stepKey}
                            </Typography>
                            <PipelineStepStatusChip status={String(info?.status || 'pending')} />
                        </Box>
                    ))}
                </Box>
            ) : null}
        </Stack>
    );
}
