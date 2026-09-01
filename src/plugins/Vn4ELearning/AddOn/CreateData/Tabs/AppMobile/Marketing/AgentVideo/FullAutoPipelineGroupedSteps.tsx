import React from 'react';
import { Box, Button, Chip, CircularProgress, MenuItem, Stack, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CreateIcon from '@mui/icons-material/Create';
import ErrorIcon from '@mui/icons-material/Error';
import {
    FULL_AUTO_PIPELINE_AI_STEPS,
    FULL_AUTO_PIPELINE_HEADLESS_STEPS,
    FULL_AUTO_PIPELINE_STEP_ORDER,
    fullAutoStepToggleKeyForStep,
    isFullAutoPipelineAiStep,
    isFullAutoPipelineHeadlessStep,
    type BeatImageFillMode,
    type FullAutoPipelineStep,
    type FullAutoPipelineStepKey,
    type FullAutoPipelineSummary,
    type FullAutoStepToggleKey,
    type FullAutoStepToggles,
} from './agentVideoApi';
import {
    getPipelineGroupSurface,
    PIPELINE_STEP_STATUS_LABEL,
    pipelineAiBadgeSx,
    pipelineHeadlessBadgeSx,
    pipelineHeadlessLegendSx,
} from './agentVideoPipelineUi';
import { PipelineRenderRunButton } from './PipelineRenderRunButton';
import { PipelineHeadlessPrerequisitesHint } from './PipelineHeadlessPrerequisitesHint';
import {
    isScriptImproveQaLoopStep,
    scriptQaLoopStepStatusLabel,
    splitScriptGroupSteps,
    useScriptImproveQaLoopView,
    type ScriptImproveQaLoopView,
} from './agentVideoPipelineQaLoopUi';
import {
    PipelineScriptQaLoopSection,
} from './PipelineScriptQaLoopUi';
import { PipelineStepToggleCheckbox } from './PipelineStepToggleCheckbox';

function resolvePipelineGroupToggleKey(groupKey: string): FullAutoStepToggleKey | null {
    if (groupKey === 'render') {
        return 'render';
    }
    if (groupKey === 'thumbnail') {
        return 'thumbnail';
    }
    if (groupKey === 'audio_background') {
        return 'bgm';
    }
    return null;
}
import { PipelineBeatImageFillModeToggle } from './PipelineBeatImageFillModeToggle';
import {
    getVisibleFullAutoPipelineStepGroups,
    getVisibleFullAutoPipelineStepIndex,
    isFullAutoPipelineStepRelevantForMode,
    resolveFullAutoPipelineStepLabel,
    type VisibleFullAutoPipelineStepGroup,
} from './agentVideoPipelineStepLabels';

const PIPELINE_HEADLESS_TOOLTIP = [
    'Bước này dùng trình duyệt nền (Puppeteer / headless Chrome).',
    'Cần: ./run_worker.sh trong _biong_backend.',
    'Preview live (tuỳ chọn): npm run headless-preview:relay:local trong marketing-ai.',
    'Login Google lần đầu: GEMINI_WEB_OPEN_BROWSER=1 GEMINI_WEB_HEADLESS=false node scripts/run-gemini-web-beat.mjs',
].join(' ');
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

/** Các bước được phép restart (API restartable_steps hoặc fallback theo tiến độ). */
export function resolveRestartableSet(
    restartable?: string[] | null,
    steps?: Record<string, { status?: string }> | null,
    currentStep?: string,
): Set<FullAutoPipelineStepKey> {
    if (Array.isArray(restartable) && restartable.length > 0) {
        return new Set(
            restartable.filter((step): step is FullAutoPipelineStepKey => (
                (FULL_AUTO_PIPELINE_STEP_ORDER as readonly string[]).includes(step)
            )),
        );
    }
    let maxIdx = 0;
    FULL_AUTO_PIPELINE_STEP_ORDER.forEach((key, idx) => {
        const status = String(steps?.[key]?.status || 'pending');
        if (['done', 'skipped', 'running', 'failed'].includes(status)) {
            maxIdx = idx;
        }
    });
    if (currentStep) {
        const cur = FULL_AUTO_PIPELINE_STEP_ORDER.indexOf(
            currentStep as FullAutoPipelineStepKey,
        );
        if (cur > maxIdx) maxIdx = cur;
    }
    const lastIdx = FULL_AUTO_PIPELINE_STEP_ORDER.length - 1;
    if (maxIdx < lastIdx) {
        const topKey = FULL_AUTO_PIPELINE_STEP_ORDER[maxIdx];
        const topStatus = String(steps?.[topKey]?.status || 'pending');
        if (topStatus === 'done' || topStatus === 'skipped') {
            maxIdx += 1;
        }
    }
    return new Set(FULL_AUTO_PIPELINE_STEP_ORDER.slice(0, maxIdx + 1));
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
    agentVisualMode?: string;
    beatImageFillMode?: BeatImageFillMode;
    variant?: 'light' | 'dark';
    headlessStepSet: Set<string>;
    aiStepSet: Set<string>;
    typographyVariant?: 'body2' | 'caption';
    typographySx?: Record<string, unknown>;
    compact?: boolean;
};

function PipelineStepTitle({
    stepKey,
    agentVisualMode,
    beatImageFillMode = 'auto',
    variant = 'dark',
    headlessStepSet,
    aiStepSet,
    typographyVariant = 'caption',
    typographySx,
    compact = false,
}: PipelineStepTitleProps) {
    const showHeadless = headlessStepSet.has(stepKey)
        || isFullAutoPipelineHeadlessStep(stepKey)
        || (stepKey === 'beat_image_fill' && beatImageFillMode === 'auto');
    const showAi = aiStepSet.has(stepKey) || isFullAutoPipelineAiStep(stepKey);
    const stepIndex = getVisibleFullAutoPipelineStepIndex(stepKey, agentVisualMode);
    const label = `${stepIndex > 0 ? `${stepIndex}. ` : ''}${resolveFullAutoPipelineStepLabel(stepKey, agentVisualMode)}`;

    if (compact) {
        return (
            <Box
                sx={{
                    minWidth: 0,
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    columnGap: 0.45,
                }}
            >
                <Typography
                    component="span"
                    noWrap
                    sx={{
                        fontSize: 11,
                        lineHeight: 1.25,
                        fontWeight: 500,
                        color: 'text.primary',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
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

function resolveStepStatusLabel(
    stepKey: FullAutoPipelineStepKey,
    status: string,
    loopView: ScriptImproveQaLoopView,
): string {
    if (isScriptImproveQaLoopStep(stepKey)) {
        return scriptQaLoopStepStatusLabel(stepKey, status, loopView);
    }
    return PIPELINE_STEP_STATUS_LABEL[status] || status;
}

/** Nút "Thủ công" — nổi bật vừa đủ, tách khỏi nút Run xanh. */
function PipelineManualStepButton({
    title,
    disabled = false,
    onClick,
    children,
}: {
    title: string;
    disabled?: boolean;
    onClick: (event: React.MouseEvent) => void;
    children: React.ReactNode;
}) {
    return (
        <Button
            size="small"
            variant="outlined"
            color="inherit"
            startIcon={<CreateIcon sx={{ fontSize: 11 }} />}
            sx={(theme) => ({
                minWidth: 0,
                px: 0.75,
                py: 0.15,
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'none',
                lineHeight: 1.5,
                whiteSpace: 'nowrap',
                color: theme.palette.primary.main,
                borderColor: alpha(theme.palette.primary.main, 0.45),
                bgcolor: alpha(theme.palette.primary.main, 0.06),
                '& .MuiButton-startIcon': {
                    mr: 0.4,
                    ml: 0,
                },
                '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.14),
                    borderColor: theme.palette.primary.main,
                },
            })}
            disabled={disabled}
            title={title}
            onClick={(e) => {
                e.stopPropagation();
                onClick(e);
            }}
        >
            {children}
        </Button>
    );
}

type PipelineGroupedCommonProps = {
    steps?: FullAutoPipelineSummary['steps'];
    headlessSteps?: FullAutoPipelineSummary['headless_steps'];
    aiSteps?: FullAutoPipelineSummary['ai_steps'];
    qaLoops?: FullAutoPipelineSummary['qa_loops'];
    agentVisualMode?: string;
    pipelineStatus?: string;
    currentStep?: string;
    /** Checkbox Chạy — mặc định true; tắt = full-auto skip. */
    stepToggles?: FullAutoStepToggles;
    stepToggleDisabled?: boolean;
    onStepToggleChange: (toggleKey: FullAutoStepToggleKey, checked: boolean) => void;
    beatImageFillMode?: BeatImageFillMode;
    beatImageFillModeDisabled?: boolean;
    onBeatImageFillModeChange?: (mode: BeatImageFillMode) => void;
    /** Chỉ chạy beat còn thiếu ảnh khi fill ảnh beat. */
    beatImageFillOnlyMissing?: boolean;
    beatImageFillOnlyMissingDisabled?: boolean;
    onBeatImageFillOnlyMissingChange?: (checked: boolean) => void;
};

type PipelineGroupedMenuItemsProps = PipelineGroupedCommonProps & {
    restartableSet: Set<FullAutoPipelineStepKey>;
    disabled?: boolean;
    onSelectStep: (stepKey: FullAutoPipelineStepKey) => void;
    onRerunRenderUpload?: () => void;
    rerunRenderUploadDisabled?: boolean;
    rerunningRenderUpload?: boolean;
    /** Chỉ chạy đúng 1 bước (invalidate bước sau, không auto tiếp). */
    onRunSingleStep?: (stepKey: FullAutoPipelineStepKey) => void;
    runSingleStepDisabled?: boolean;
    runningSingleStep?: boolean;
    /** Mở drawer chia beat thủ công (chỉ hiển thị trên bước beat_division). */
    onManualBeatDivision?: () => void;
    manualBeatDivisionDisabled?: boolean;
    /** Mở drawer tạo script thủ công (chỉ hiển thị trên bước script_create). */
    onManualScriptCreate?: () => void;
    manualScriptCreateDisabled?: boolean;
    /** Mở drawer chuẩn hóa giọng đọc thủ công (chỉ hiển thị trên bước script_phonetic_normalize). */
    onManualScriptPhonetic?: () => void;
    manualScriptPhoneticDisabled?: boolean;
    /** Mở drawer audio background thủ công (chỉ hiển thị trên bước bgm). */
    onManualBgm?: () => void;
    manualBgmDisabled?: boolean;
};

export function PipelineGroupedMenuItems({
    steps,
    headlessSteps,
    aiSteps,
    qaLoops,
    agentVisualMode,
    pipelineStatus,
    currentStep = '',
    stepToggles,
    stepToggleDisabled = false,
    onStepToggleChange,
    beatImageFillMode = 'auto',
    beatImageFillModeDisabled = false,
    onBeatImageFillModeChange,
    beatImageFillOnlyMissing = true,
    beatImageFillOnlyMissingDisabled = false,
    onBeatImageFillOnlyMissingChange,
    restartableSet,
    disabled = false,
    onSelectStep,
    onRerunRenderUpload,
    rerunRenderUploadDisabled = false,
    rerunningRenderUpload = false,
    onRunSingleStep,
    runSingleStepDisabled = false,
    runningSingleStep = false,
    onManualBeatDivision,
    manualBeatDivisionDisabled = false,
    onManualScriptCreate,
    manualScriptCreateDisabled = false,
    onManualScriptPhonetic,
    manualScriptPhoneticDisabled = false,
    onManualBgm,
    manualBgmDisabled = false,
}: PipelineGroupedMenuItemsProps) {
    const headlessStepSet = React.useMemo(
        () => resolveHeadlessStepSet(headlessSteps),
        [headlessSteps],
    );
    const aiStepSet = React.useMemo(
        () => resolveAiStepSet(aiSteps),
        [aiSteps],
    );
    const loopView = useScriptImproveQaLoopView({
        steps,
        qa_loops: qaLoops,
        current_step: currentStep,
        status: pipelineStatus,
    } as FullAutoPipelineSummary);
    const visibleGroups: VisibleFullAutoPipelineStepGroup[] = React.useMemo(
        () => getVisibleFullAutoPipelineStepGroups(agentVisualMode),
        [agentVisualMode],
    );

    const renderMenuStep = (stepKey: string, inLoop = false) => {
        const key = stepKey as FullAutoPipelineStepKey;
        const enabled = restartableSet.has(key);
        const stepInfo = steps?.[key];
        const status = String(stepInfo?.status || 'pending');
        const statusLabel = resolveStepStatusLabel(key, status, loopView);
        const isCurrent = key === currentStep && String(pipelineStatus || '').toLowerCase() === 'running';
        const canRunSingle = Boolean(
            onRunSingleStep
            && enabled
            && !disabled
            && !runSingleStepDisabled,
        );
        const stepLabel = resolveFullAutoPipelineStepLabel(key, agentVisualMode);
        const rowToggleKey = !inLoop && !isScriptImproveQaLoopStep(key)
            ? fullAutoStepToggleKeyForStep(key)
            : null;
        const showRowToggle = Boolean(
            rowToggleKey
            && onStepToggleChange
            && rowToggleKey === 'script_phonetic_normalize',
        );

        return (
            <MenuItem
                key={key}
                disabled={!enabled || disabled}
                onClick={() => onSelectStep(key)}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    rowGap: 0.5,
                    gap: 1.25,
                    minWidth: 340,
                    py: inLoop ? 0.65 : 0.85,
                    pl: inLoop ? 1.5 : 3.25,
                    pr: inLoop ? 1.25 : 1.75,
                    bgcolor: isCurrent ? 'rgba(2, 136, 209, 0.08)' : 'transparent',
                    borderTop: inLoop ? 'none' : '1px solid',
                    borderColor: 'rgba(25, 118, 210, 0.12)',
                    '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.55)',
                    },
                    '&.Mui-disabled': {
                        opacity: 0.72,
                    },
                }}
            >
                <PipelineStepTitle
                    stepKey={key}
                    agentVisualMode={agentVisualMode}
                    beatImageFillMode={beatImageFillMode}
                    variant="light"
                    typographyVariant="body2"
                    headlessStepSet={headlessStepSet}
                    aiStepSet={aiStepSet}
                    typographySx={{
                        color: enabled ? 'text.primary' : 'text.disabled',
                        fontWeight: isCurrent || status === 'running' ? 700 : 400,
                    }}
                />
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        flexWrap: 'wrap',
                        rowGap: 0.5,
                        gap: 0.75,
                        flexShrink: 1,
                        minWidth: 0,
                        maxWidth: '100%',
                    }}
                >
                    {isScriptImproveQaLoopStep(key) && loopView.isLoopActive ? (
                        <Chip
                            size="small"
                            color="info"
                            label={statusLabel}
                            sx={{
                                height: 18,
                                maxWidth: '100%',
                                '& .MuiChip-label': {
                                    px: 0.55,
                                    fontSize: 10,
                                    fontWeight: 700,
                                },
                            }}
                        />
                    ) : (
                        <PipelineStepStatusChip status={status} compact />
                    )}
                    {onRunSingleStep ? (
                        <PipelineRenderRunButton
                            size="compact"
                            label="Run"
                            testId={`pipeline-menu-run-single-${key}`}
                            title={`Chỉ chạy bước này (các bước sau phải chạy lại): ${stepLabel}`}
                            disabled={!canRunSingle}
                            loading={runningSingleStep && isCurrent}
                            onClick={() => {
                                onRunSingleStep(key);
                            }}
                        />
                    ) : null}
                    {key === 'beat_division' && onManualBeatDivision ? (
                        <PipelineManualStepButton
                            title={`Chia beat thủ công: copy prompt → dán AI trả về → phân tích → lưu (bỏ qua bước headless bị treo)`}
                            disabled={disabled || manualBeatDivisionDisabled}
                            onClick={() => onManualBeatDivision()}
                        >
                            Thủ công
                        </PipelineManualStepButton>
                    ) : null}
                    {key === 'script_create' && onManualScriptCreate ? (
                        <PipelineManualStepButton
                            title={`Tạo script thủ công: copy prompt → dán script AI trả về → lưu (bỏ qua bước headless bị treo)`}
                            disabled={disabled || manualScriptCreateDisabled}
                            onClick={() => onManualScriptCreate()}
                        >
                            Thủ công
                        </PipelineManualStepButton>
                    ) : null}
                    {key === 'script_phonetic_normalize' && onManualScriptPhonetic ? (
                        <PipelineManualStepButton
                            title={`Chuẩn hóa giọng đọc thủ công: copy prompt → dán kết quả AI → lưu bản đọc TTS (bỏ qua bước headless bị treo)`}
                            disabled={disabled || manualScriptPhoneticDisabled}
                            onClick={() => onManualScriptPhonetic()}
                        >
                            Thủ công
                        </PipelineManualStepButton>
                    ) : null}
                    {key === 'bgm' && onManualBgm ? (
                        <PipelineManualStepButton
                            title={`Audio background thủ công: copy prompt tạo nhạc AI → upload MP3 → quản lý audio nền (lặp lại khi không đủ dài)`}
                            disabled={disabled || manualBgmDisabled}
                            onClick={() => onManualBgm()}
                        >
                            Thủ công
                        </PipelineManualStepButton>
                    ) : null}
                    {showRowToggle && rowToggleKey && onStepToggleChange ? (
                        <PipelineStepToggleCheckbox
                            toggleKey={rowToggleKey}
                            checked={stepToggles?.[rowToggleKey] !== false}
                            disabled={disabled || stepToggleDisabled}
                            onChange={onStepToggleChange}
                        />
                    ) : null}
                    {key === 'beat_image_fill' && onBeatImageFillModeChange ? (
                        <PipelineBeatImageFillModeToggle
                            value={beatImageFillMode}
                            disabled={disabled || beatImageFillModeDisabled}
                            onChange={onBeatImageFillModeChange}
                            onlyMissing={beatImageFillOnlyMissing}
                            onlyMissingDisabled={disabled || beatImageFillOnlyMissingDisabled}
                            onOnlyMissingChange={onBeatImageFillOnlyMissingChange}
                        />
                    ) : null}
                </Box>
            </MenuItem>
        );
    };

    return (
        <>
            <Box sx={{ px: 2, pt: 0.5, pb: 0.25 }}>
                <PipelineStepLegend variant="light" />
            </Box>
            <Box sx={{ px: 1, pb: 0.5 }}>
                <PipelineHeadlessPrerequisitesHint compact dense />
            </Box>
            {visibleGroups.map((group, groupIndex) => {
                const surface = getPipelineGroupSurface(group.key, 'light');
                const isRenderGroup = group.key === 'render';
                return (
                    <Box
                        key={group.key}
                        sx={{
                            mx: 1,
                            mt: groupIndex === 0 ? 0.5 : 1,
                            mb: groupIndex === visibleGroups.length - 1 ? 0.5 : 0,
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: surface.borderColor,
                            bgcolor: surface.bgcolor,
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 1,
                                px: 2,
                                py: 0.75,
                                minHeight: 36,
                            }}
                        >
                            <Typography
                                variant="subtitle2"
                                sx={{
                                    flex: 1,
                                    minWidth: 0,
                                    color: surface.headerColor,
                                    fontSize: 13,
                                    fontWeight: 800,
                                    lineHeight: 1.4,
                                    letterSpacing: 0.2,
                                }}
                            >
                                {group.label}
                            </Typography>
                            {(() => {
                                const groupToggleKey = resolvePipelineGroupToggleKey(group.key);
                                return groupToggleKey ? (
                                    <PipelineStepToggleCheckbox
                                        toggleKey={groupToggleKey}
                                        checked={stepToggles?.[groupToggleKey] !== false}
                                        disabled={stepToggleDisabled}
                                        onChange={onStepToggleChange}
                                        size="section"
                                        tooltip={groupToggleKey === 'bgm'
                                            ? 'Chạy bước audio background trong pipeline A→Z. Bỏ check = bỏ qua BGM, không ghép audio nền vào video.'
                                            : undefined}
                                    />
                                ) : null;
                            })()}
                            {group.key === 'audio_background' && onManualBgm ? (
                                <PipelineManualStepButton
                                    title="Audio background thủ công: copy prompt tạo nhạc AI → upload MP3 → quản lý audio nền (lặp lại khi không đủ dài)"
                                    disabled={disabled || manualBgmDisabled}
                                    onClick={() => onManualBgm()}
                                >
                                    Thủ công
                                </PipelineManualStepButton>
                            ) : null}
                            {isRenderGroup ? (
                                <PipelineRenderRunButton
                                    onClick={onRerunRenderUpload}
                                    disabled={disabled || rerunRenderUploadDisabled}
                                    loading={rerunningRenderUpload}
                                    testId="pipeline-menu-rerun-render-upload"
                                />
                            ) : null}
                        </Box>
                        {group.key === 'script' ? (() => {
                            const split = splitScriptGroupSteps(group.steps);
                            return (
                                <>
                                    {split.before.map((stepKey) => renderMenuStep(stepKey))}
                                    <Box sx={{ borderTop: '1px solid', borderColor: surface.borderColor }}>
                                        <PipelineScriptQaLoopSection
                                            view={loopView}
                                            variant="light"
                                            compact
                                            improveNode={renderMenuStep('script_improve', true)}
                                            qaNode={renderMenuStep('script_improve_qa', true)}
                                            runEnabled={stepToggles?.script_improve !== false}
                                            runToggleDisabled={disabled || stepToggleDisabled}
                                            onRunEnabledChange={onStepToggleChange
                                                ? (checked) => onStepToggleChange('script_improve', checked)
                                                : undefined}
                                        />
                                    </Box>
                                    {split.after.map((stepKey) => renderMenuStep(stepKey))}
                                </>
                            );
                        })() : group.steps.map((stepKey) => renderMenuStep(stepKey))}
                    </Box>
                );
            })}
        </>
    );
}

type PipelineGroupedStepListProps = PipelineGroupedCommonProps;

export function PipelineGroupedStepList({
    steps,
    headlessSteps,
    aiSteps,
    qaLoops,
    agentVisualMode,
    beatImageFillMode = 'auto',
    pipelineStatus,
    currentStep = '',
    stepToggles,
    stepToggleDisabled = false,
    onStepToggleChange,
}: PipelineGroupedStepListProps) {
    const headlessStepSet = React.useMemo(
        () => resolveHeadlessStepSet(headlessSteps),
        [headlessSteps],
    );
    const aiStepSet = React.useMemo(
        () => resolveAiStepSet(aiSteps),
        [aiSteps],
    );
    const loopView = useScriptImproveQaLoopView({
        steps,
        qa_loops: qaLoops,
        current_step: currentStep,
        status: pipelineStatus,
    } as FullAutoPipelineSummary);
    const visibleGroups: VisibleFullAutoPipelineStepGroup[] = React.useMemo(
        () => getVisibleFullAutoPipelineStepGroups(agentVisualMode),
        [agentVisualMode],
    );

    const renderDarkStep = (stepKey: string, inLoop = false) => {
        const key = stepKey as FullAutoPipelineStepKey;
        const status = String(steps?.[key]?.status || 'pending');
        const isCurrent = key === currentStep;
        const statusLabel = resolveStepStatusLabel(key, status, loopView);
        const rowToggleKey = !inLoop && !isScriptImproveQaLoopStep(key)
            ? fullAutoStepToggleKeyForStep(key)
            : null;
        const showRowToggle = Boolean(
            rowToggleKey
            && onStepToggleChange
            && rowToggleKey === 'script_phonetic_normalize',
        );

        return (
            <Box
                key={key}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    rowGap: 0.5,
                    gap: 1,
                    py: inLoop ? 0.3 : 0.35,
                    pl: inLoop ? 0.65 : 1.75,
                    pr: inLoop ? 0.35 : 0.5,
                    opacity: status === 'pending' && !isCurrent ? 0.55 : 1,
                    bgcolor: isCurrent && loopView.isLoopActive ? 'rgba(129, 212, 250, 0.12)' : 'transparent',
                    borderRadius: 0.75,
                }}
            >
                <PipelineStepTitle
                    stepKey={key}
                    agentVisualMode={agentVisualMode}
                    beatImageFillMode={beatImageFillMode}
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
                {isScriptImproveQaLoopStep(key) && loopView.isLoopActive ? (
                    <Chip
                        size="small"
                        color="info"
                        label={statusLabel}
                        sx={{
                            height: 18,
                            flexShrink: 0,
                            '& .MuiChip-label': {
                                px: 0.55,
                                fontSize: 10,
                                fontWeight: 700,
                            },
                        }}
                    />
                ) : (
                    <PipelineStepStatusChip status={status} compact />
                )}
                {showRowToggle && rowToggleKey ? (
                    <PipelineStepToggleCheckbox
                        toggleKey={rowToggleKey}
                        checked={stepToggles?.[rowToggleKey] !== false}
                        disabled={stepToggleDisabled}
                        onChange={onStepToggleChange}
                    />
                ) : null}
            </Box>
        );
    };

    return (
        <>
            <PipelineStepLegend variant="dark" />
            {visibleGroups.map((group, groupIndex) => {
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
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 1,
                                pb: 0.55,
                                px: 0.5,
                            }}
                        >
                            <Typography
                                variant="subtitle2"
                                sx={{
                                    flex: 1,
                                    minWidth: 0,
                                    fontSize: 12,
                                    fontWeight: 800,
                                    color: surface.headerColor,
                                    letterSpacing: 0.2,
                                }}
                            >
                                {group.label}
                            </Typography>
                            {(() => {
                                const groupToggleKey = resolvePipelineGroupToggleKey(group.key);
                                return groupToggleKey ? (
                                    <PipelineStepToggleCheckbox
                                        toggleKey={groupToggleKey}
                                        checked={stepToggles?.[groupToggleKey] !== false}
                                        disabled={stepToggleDisabled}
                                        onChange={onStepToggleChange}
                                        size="section"
                                        tooltip={groupToggleKey === 'bgm'
                                            ? 'Chạy bước audio background trong pipeline A→Z. Bỏ check = bỏ qua BGM, không ghép audio nền vào video.'
                                            : undefined}
                                    />
                                ) : null;
                            })()}
                        </Box>
                        {group.key === 'script' ? (() => {
                            const split = splitScriptGroupSteps(group.steps);
                            return (
                                <>
                                    {split.before.map((stepKey) => renderDarkStep(stepKey))}
                                    <PipelineScriptQaLoopSection
                                        view={loopView}
                                        variant="dark"
                                        compact
                                        improveNode={renderDarkStep('script_improve', true)}
                                        qaNode={renderDarkStep('script_improve_qa', true)}
                                    />
                                    {split.after.map((stepKey) => renderDarkStep(stepKey))}
                                </>
                            );
                        })() : group.steps.map((stepKey) => renderDarkStep(stepKey))}
                    </Box>
                );
            })}
        </>
    );
}

type PipelineGroupedWorkflowListProps = PipelineGroupedCommonProps & {
    onRerunRenderUpload?: () => void;
    rerunRenderUploadDisabled?: boolean;
    rerunningRenderUpload?: boolean;
    /** Bước được phép click để restart pipeline từ bước đó. */
    restartableSet?: Set<FullAutoPipelineStepKey>;
    onSelectStep?: (stepKey: FullAutoPipelineStepKey) => void;
    selectStepDisabled?: boolean;
    /** Chỉ chạy đúng 1 bước (invalidate bước sau, không auto tiếp). */
    onRunSingleStep?: (stepKey: FullAutoPipelineStepKey) => void;
    runSingleStepDisabled?: boolean;
    runningSingleStep?: boolean;
    /** Mở drawer chia beat thủ công (chỉ hiển thị trên bước beat_division). */
    onManualBeatDivision?: () => void;
    manualBeatDivisionDisabled?: boolean;
    /** Mở drawer tạo script thủ công (chỉ hiển thị trên bước script_create). */
    onManualScriptCreate?: () => void;
    manualScriptCreateDisabled?: boolean;
    /** Mở drawer chuẩn hóa giọng đọc thủ công (chỉ hiển thị trên bước script_phonetic_normalize). */
    onManualScriptPhonetic?: () => void;
    manualScriptPhoneticDisabled?: boolean;
    /** Mở drawer audio background thủ công (chỉ hiển thị trên bước bgm). */
    onManualBgm?: () => void;
    manualBgmDisabled?: boolean;
    /** Chỉ chạy beat còn thiếu ảnh khi fill ảnh beat. */
    beatImageFillOnlyMissing?: boolean;
    beatImageFillOnlyMissingDisabled?: boolean;
    onBeatImageFillOnlyMissingChange?: (checked: boolean) => void;
};

/** V3: nút Run từng bước sau status — đổi tên để Fast Refresh remount. */
export function PipelineGroupedWorkflowListV3({
    steps,
    headlessSteps,
    aiSteps,
    qaLoops,
    agentVisualMode,
    currentStep = '',
    pipelineStatus = '',
    stepToggles,
    stepToggleDisabled = false,
    onStepToggleChange,
    beatImageFillMode = 'auto',
    beatImageFillModeDisabled = false,
    onBeatImageFillModeChange,
    beatImageFillOnlyMissing = true,
    beatImageFillOnlyMissingDisabled = false,
    onBeatImageFillOnlyMissingChange,
    onRerunRenderUpload,
    rerunRenderUploadDisabled = false,
    rerunningRenderUpload = false,
    restartableSet,
    onSelectStep,
    selectStepDisabled = false,
    onRunSingleStep,
    runSingleStepDisabled = false,
    runningSingleStep = false,
    onManualBeatDivision,
    manualBeatDivisionDisabled = false,
    onManualScriptCreate,
    manualScriptCreateDisabled = false,
    onManualScriptPhonetic,
    manualScriptPhoneticDisabled = false,
    onManualBgm,
    manualBgmDisabled = false,
}: PipelineGroupedWorkflowListProps) {
    const headlessStepSet = React.useMemo(
        () => resolveHeadlessStepSet(headlessSteps),
        [headlessSteps],
    );
    const aiStepSet = React.useMemo(
        () => resolveAiStepSet(aiSteps),
        [aiSteps],
    );
    const loopView = useScriptImproveQaLoopView({
        steps,
        qa_loops: qaLoops,
        current_step: currentStep,
        status: pipelineStatus,
    } as FullAutoPipelineSummary);
    const visibleGroups: VisibleFullAutoPipelineStepGroup[] = React.useMemo(
        () => getVisibleFullAutoPipelineStepGroups(agentVisualMode),
        [agentVisualMode],
    );

    const renderWorkflowStep = (
        stepKey: string,
        borderColor: string,
        inLoop = false,
    ) => {
        const key = stepKey as FullAutoPipelineStepKey;
        const status = String(steps?.[key]?.status || 'pending');
        const isCurrent = key === currentStep
            && String(pipelineStatus || '').trim().toLowerCase() === 'running';
        const statusLabel = resolveStepStatusLabel(key, status, loopView);
        const canRestart = Boolean(
            onSelectStep
            && restartableSet?.has(key)
            && !selectStepDisabled,
        );
        const canRunSingle = Boolean(
            onRunSingleStep
            && restartableSet?.has(key)
            && !runSingleStepDisabled,
        );
        const stepLabel = resolveFullAutoPipelineStepLabel(key, agentVisualMode);
        const rowToggleKey = !inLoop && !isScriptImproveQaLoopStep(key)
            ? fullAutoStepToggleKeyForStep(key)
            : null;
        const showRowToggle = Boolean(
            rowToggleKey
            && onStepToggleChange
            && rowToggleKey === 'script_phonetic_normalize',
        );

        return (
            <Box
                key={key}
                role={canRestart ? 'button' : undefined}
                tabIndex={canRestart ? 0 : undefined}
                onClick={canRestart ? () => onSelectStep?.(key) : undefined}
                onKeyDown={canRestart ? (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelectStep?.(key);
                    }
                } : undefined}
                title={canRestart ? `Chạy pipeline từ bước: ${stepLabel}` : undefined}
                sx={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    alignItems: 'start',
                    columnGap: 0.5,
                    py: inLoop ? 0.25 : 0.4,
                    pl: inLoop ? 0.35 : 1.35,
                    pr: inLoop ? 0.35 : 0.85,
                    borderTop: inLoop ? 'none' : '1px solid',
                    borderColor: inLoop ? 'rgba(2, 136, 209, 0.14)' : borderColor,
                    bgcolor: isCurrent ? 'rgba(2, 136, 209, 0.1)' : 'transparent',
                    cursor: canRestart ? 'pointer' : 'default',
                    transition: 'background-color 0.12s ease',
                    ...(canRestart ? {
                        '&:hover': {
                            bgcolor: isCurrent
                                ? 'rgba(2, 136, 209, 0.16)'
                                : 'rgba(15, 23, 42, 0.04)',
                        },
                    } : {}),
                }}
            >
                <PipelineStepTitle
                    stepKey={key}
                    agentVisualMode={agentVisualMode}
                    beatImageFillMode={beatImageFillMode}
                    variant="light"
                    headlessStepSet={headlessStepSet}
                    aiStepSet={aiStepSet}
                    compact
                    typographySx={{
                        fontWeight: isCurrent || status === 'running' ? 700 : 500,
                    }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifySelf: 'start' }}>
                    {isScriptImproveQaLoopStep(key) && loopView.isLoopActive ? (
                        <Chip
                            size="small"
                            color="info"
                            label={statusLabel}
                            sx={{
                                height: 18,
                                maxWidth: '100%',
                                '& .MuiChip-label': {
                                    px: 0.55,
                                    fontSize: 10,
                                    fontWeight: 700,
                                },
                            }}
                        />
                    ) : (
                        <PipelineStepStatusChip status={status} compact />
                    )}
                    {onRunSingleStep ? (
                        <PipelineRenderRunButton
                            size="compact"
                            label="Run"
                            testId={`pipeline-run-single-${key}`}
                            title={`Chỉ chạy bước này (các bước sau phải chạy lại): ${stepLabel}`}
                            disabled={!canRunSingle}
                            loading={runningSingleStep && isCurrent}
                            onClick={() => onRunSingleStep(key)}
                        />
                    ) : null}
                    {key === 'beat_division' && onManualBeatDivision ? (
                        <PipelineManualStepButton
                            title={`Chia beat thủ công: copy prompt → dán AI trả về → phân tích → lưu (bỏ qua bước headless bị treo)`}
                            disabled={manualBeatDivisionDisabled}
                            onClick={() => onManualBeatDivision()}
                        >
                            Thủ công
                        </PipelineManualStepButton>
                    ) : null}
                    {key === 'script_create' && onManualScriptCreate ? (
                        <PipelineManualStepButton
                            title={`Tạo script thủ công: copy prompt → dán script AI trả về → lưu (bỏ qua bước headless bị treo)`}
                            disabled={manualScriptCreateDisabled}
                            onClick={() => onManualScriptCreate()}
                        >
                            Thủ công
                        </PipelineManualStepButton>
                    ) : null}
                    {key === 'script_phonetic_normalize' && onManualScriptPhonetic ? (
                        <PipelineManualStepButton
                            title={`Chuẩn hóa giọng đọc thủ công: copy prompt → dán kết quả AI → lưu bản đọc TTS (bỏ qua bước headless bị treo)`}
                            disabled={manualScriptPhoneticDisabled}
                            onClick={() => onManualScriptPhonetic()}
                        >
                            Thủ công
                        </PipelineManualStepButton>
                    ) : null}
                    {key === 'bgm' && onManualBgm ? (
                        <PipelineManualStepButton
                            title={`Audio background thủ công: copy prompt tạo nhạc AI → upload MP3 → quản lý audio nền (lặp lại khi không đủ dài)`}
                            disabled={manualBgmDisabled}
                            onClick={() => onManualBgm()}
                        >
                            Thủ công
                        </PipelineManualStepButton>
                    ) : null}
                    {showRowToggle && rowToggleKey && onStepToggleChange ? (
                        <PipelineStepToggleCheckbox
                            toggleKey={rowToggleKey}
                            checked={stepToggles?.[rowToggleKey] !== false}
                            disabled={selectStepDisabled || stepToggleDisabled}
                            onChange={onStepToggleChange}
                        />
                    ) : null}
                    {key === 'beat_image_fill' && onBeatImageFillModeChange ? (
                        <PipelineBeatImageFillModeToggle
                            value={beatImageFillMode}
                            disabled={selectStepDisabled || beatImageFillModeDisabled}
                            onChange={onBeatImageFillModeChange}
                            onlyMissing={beatImageFillOnlyMissing}
                            onlyMissingDisabled={selectStepDisabled || beatImageFillOnlyMissingDisabled}
                            onOnlyMissingChange={onBeatImageFillOnlyMissingChange}
                        />
                    ) : null}
                </Box>
            </Box>
        );
    };

    const extraSteps = steps
        ? Object.entries(steps).filter(([stepKey]) => (
            !(FULL_AUTO_PIPELINE_STEP_ORDER as readonly string[]).includes(stepKey)
            && isFullAutoPipelineStepRelevantForMode(stepKey, agentVisualMode)
        ))
        : [];

    return (
        <Stack spacing={0.75} sx={{ mt: 0.5 }}>
            <Typography component="span" sx={{ ...pipelineHeadlessLegendSx('light'), fontSize: 9, pb: 0 }}>
                Headless = trình duyệt nền · AI = Gemini / Whisper / TTS AI
            </Typography>
            <PipelineHeadlessPrerequisitesHint compact dense />
            {visibleGroups.map((group) => {
                const surface = getPipelineGroupSurface(group.key, 'light');
                const isRenderGroup = group.key === 'render';
                return (
                    <Box
                        key={group.key}
                        sx={{
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: surface.borderColor,
                            bgcolor: surface.bgcolor,
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 0.75,
                                px: 1.15,
                                py: 0.45,
                                minHeight: 28,
                            }}
                        >
                            <Typography
                                variant="subtitle2"
                                sx={{
                                    flex: 1,
                                    minWidth: 0,
                                    fontSize: 11,
                                    fontWeight: 800,
                                    color: surface.headerColor,
                                    letterSpacing: 0.15,
                                }}
                            >
                                {group.label}
                            </Typography>
                            {(() => {
                                const groupToggleKey = resolvePipelineGroupToggleKey(group.key);
                                return groupToggleKey ? (
                                    <PipelineStepToggleCheckbox
                                        toggleKey={groupToggleKey}
                                        checked={stepToggles?.[groupToggleKey] !== false}
                                        disabled={stepToggleDisabled}
                                        onChange={onStepToggleChange}
                                        size="section"
                                        tooltip={groupToggleKey === 'bgm'
                                            ? 'Chạy bước audio background trong pipeline A→Z. Bỏ check = bỏ qua BGM, không ghép audio nền vào video.'
                                            : undefined}
                                    />
                                ) : null;
                            })()}
                            {isRenderGroup ? (
                                <PipelineRenderRunButton
                                    onClick={onRerunRenderUpload}
                                    disabled={rerunRenderUploadDisabled}
                                    loading={rerunningRenderUpload}
                                    testId="pipeline-group-rerun-render-upload"
                                />
                            ) : null}
                        </Box>
                        {group.key === 'script' ? (() => {
                            const split = splitScriptGroupSteps(group.steps);
                            return (
                                <>
                                    {split.before.map((stepKey) => renderWorkflowStep(stepKey, surface.borderColor))}
                                    <PipelineScriptQaLoopSection
                                        view={loopView}
                                        variant="light"
                                        compact
                                        improveNode={renderWorkflowStep('script_improve', surface.borderColor, true)}
                                        qaNode={renderWorkflowStep('script_improve_qa', surface.borderColor, true)}
                                        runEnabled={stepToggles?.script_improve !== false}
                                        runToggleDisabled={selectStepDisabled || stepToggleDisabled}
                                        onRunEnabledChange={onStepToggleChange
                                            ? (checked) => onStepToggleChange('script_improve', checked)
                                            : undefined}
                                    />
                                    {split.after.map((stepKey) => renderWorkflowStep(stepKey, surface.borderColor))}
                                </>
                            );
                        })() : group.steps.map((stepKey) => renderWorkflowStep(stepKey, surface.borderColor))}
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
                    {extraSteps.map(([stepKey, info]: [string, FullAutoPipelineStep | undefined]) => (
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
                                {resolveFullAutoPipelineStepLabel(stepKey, agentVisualMode)}
                            </Typography>
                            <PipelineStepStatusChip status={String(info?.status || 'pending')} />
                        </Box>
                    ))}
                </Box>
            ) : null}
        </Stack>
    );
}

export { PipelineGroupedWorkflowListV3 as PipelineGroupedWorkflowList };
export { PipelineGroupedWorkflowListV3 as PipelineGroupedWorkflowListV2 };
