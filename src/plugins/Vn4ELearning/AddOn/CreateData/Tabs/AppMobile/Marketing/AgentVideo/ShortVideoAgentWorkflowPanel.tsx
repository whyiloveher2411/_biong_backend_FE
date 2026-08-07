import React from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    FormControl,
    FormControlLabel,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Switch,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ErrorIcon from '@mui/icons-material/Error';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import LoadingButton from 'components/atoms/LoadingButton';
import { convertToURL, validURL } from 'helpers/url';
import {
    DEFAULT_WHITEBOARD_TRANSITIONS,
    FULL_AUTO_PIPELINE_STEP_LABELS,
    fetchWhiteboardTransitions,
    type FullAutoPipelineStepKey,
    type FullAutoPipelineSummary,
    type WhiteboardTransitionOption,
} from './agentVideoApi';
import {
    PipelineGroupedWorkflowListV3 as PipelineGroupedWorkflowList,
    resolveRestartableSet,
} from './FullAutoPipelineGroupedSteps';
import { PipelineRenderRunButton } from './PipelineRenderRunButton';
import { appendHeadlessHowtoToError } from './agentVideoHeadlessPrerequisites';
import { PipelineScriptQaLoopMeta } from './PipelineScriptQaLoopUi';
import { resolveScriptImproveQaLoopView, scriptQaLoopCurrentStepLabel } from './agentVideoPipelineQaLoopUi';
import { formatTtsChain, phaseLabel, visualStyleLabel } from './agentVideoUi';
import { formatOmnivoiceVoiceDesignVi } from './omnivoiceVoiceDesignLabels';
import { useAgentVideoOpenGeminiScriptActions } from './agentVideoOpenGeminiScript';
import ShortVideoAgentPromptLibrary from './ShortVideoAgentPromptLibrary';
import ShortVideoAgentAvatarDrawer, {
    AVATAR_PIP_ANCHORS,
} from './ShortVideoAgentAvatarDrawer';
import ShortVideoAgentBeatDivisionManualDrawer from './ShortVideoAgentBeatDivisionManualDrawer';
import ShortVideoAgentScriptManualDrawer from './ShortVideoAgentScriptManualDrawer';
import { WorkflowSection, workflowFieldSurfaceSx } from './workflowPanelSection';
import { AGENT_BEAT_FREQUENCY_OPTIONS, type AgentBeatFrequency } from './agentVideoBeatFrequency';
import type { useAgentVideoContent } from './useAgentVideoContent';

type AgentVideoState = ReturnType<typeof useAgentVideoContent>;

type Props = {
    state: AgentVideoState;
};

type StatusTone = 'default' | 'success' | 'info' | 'warning' | 'error';

/** Sidebar workflow — Button có whiteSpace: nowrap nên cần cho phép wrap. */
const workflowActionButtonSx = {
    whiteSpace: 'normal',
    lineHeight: 1.35,
    py: 0.75,
    minHeight: 'auto',
    textAlign: 'center',
    justifyContent: 'center',
    maxWidth: '100%',
    overflow: 'hidden',
    '& .MuiButton-startIcon': {
        marginRight: 0.75,
        marginLeft: 0,
    },
} as const;

const statusChipSx = {
    height: 20,
    maxWidth: '100%',
    '& .MuiChip-icon': {
        ml: 0.5,
        mr: -0.25,
        fontSize: 14,
        color: 'inherit',
    },
    '& .MuiChip-label': {
        px: 0.75,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.2,
    },
} as const;

function resolveStatusTone(raw: string): StatusTone {
    const value = String(raw || '').trim().toLowerCase();
    if (!value || value === '—' || value === 'none' || value === 'idle' || value === 'pending') {
        return 'default';
    }

    const progressMatch = value.match(/^(\d+)\s*\/\s*(\d+)$/);
    if (progressMatch) {
        const done = Number(progressMatch[1]);
        const total = Number(progressMatch[2]);
        if (total > 0 && done >= total) {
            return 'success';
        }
        if (done > 0) {
            return 'info';
        }
        return 'warning';
    }

    if (/^\d+\s*beat$/.test(value)) {
        return 'success';
    }

    if (
        value === 'done'
        || value === 'completed'
        || value === 'success'
        || value === 'ready'
        || value.includes('sẵn sàng')
        || value.includes('hoàn tất')
        || value.includes('hoàn thành')
    ) {
        return 'success';
    }
    if (
        value === 'running'
        || value === 'processing'
        || value === 'queued'
        || value === 'preparing'
        || value.includes('đang')
    ) {
        return 'info';
    }
    if (value === 'failed' || value === 'error' || value.includes('thất bại') || value.includes('lỗi')) {
        return 'error';
    }
    if (
        value === 'skipped'
        || value === 'paused'
        || value === 'stale'
        || value.includes('chưa')
        || value.includes('chờ')
    ) {
        return 'warning';
    }
    return 'default';
}

function statusChipIcon(tone: StatusTone): React.ReactElement | undefined {
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

function StatusChip({ label, tone }: { label: string; tone?: StatusTone }) {
    const resolvedTone = tone ?? resolveStatusTone(label);
    const icon = statusChipIcon(resolvedTone);
    return (
        <Chip
            size="small"
            label={label}
            color={resolvedTone}
            variant={resolvedTone === 'default' ? 'outlined' : 'filled'}
            icon={icon}
            sx={statusChipSx}
        />
    );
}

function MetaRow({
    label,
    value,
    status,
    statusTone,
}: {
    label: string;
    value?: React.ReactNode;
    status?: string | null;
    statusTone?: StatusTone;
}) {
    const resolvedStatus = String(status || '').trim().toLowerCase() === 'paused'
        ? 'Đã dừng'
        : (status || '—');
    const resolvedStatusTone = statusTone
        ?? (status != null ? resolveStatusTone(status) : undefined);

    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, py: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                {label}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', minWidth: 0 }}>
                {status != null ? (
                    <StatusChip label={resolvedStatus} tone={resolvedStatusTone} />
                ) : (
                    <Typography variant="caption" fontWeight={500} sx={{ textAlign: 'right' }}>
                        {value}
                    </Typography>
                )}
            </Box>
        </Box>
    );
}

function pipelineStepLabel(step: string, pipeline?: FullAutoPipelineSummary | null): string {
    const loopView = resolveScriptImproveQaLoopView(pipeline);
    if (step in FULL_AUTO_PIPELINE_STEP_LABELS) {
        return scriptQaLoopCurrentStepLabel(step, loopView);
    }
    return step;
}

export default function ShortVideoAgentWorkflowPanel({ state }: Props) {
    const { openCreateScriptGemini, openImproveScriptGemini } = useAgentVideoOpenGeminiScriptActions();
    const [openingCreateScriptGemini, setOpeningCreateScriptGemini] = React.useState(false);
    const [openingImproveScriptGemini, setOpeningImproveScriptGemini] = React.useState(false);
    const geminiScriptStatus = String(state.geminiScriptStatus || 'none');
    const geminiScriptQueueActive = geminiScriptStatus === 'queued'
        || geminiScriptStatus === 'processing';

    const handleOpenCreateScriptGemini = async () => {
        setOpeningCreateScriptGemini(true);
        try {
            await openCreateScriptGemini({
                shortVideoId: state.shortVideoId,
                title: state.title,
                audioScript: state.audioScript,
                hasScript: state.hasScript,
                marketingPostId: state.marketingPostId,
                sourceContent: state.contentPlainText || state.savedAgentSourceContent,
                additionalInfo: state.savedAgentAdditionalInfo,
            });
        } finally {
            setOpeningCreateScriptGemini(false);
        }
    };

    const handleOpenImproveScriptGemini = async () => {
        setOpeningImproveScriptGemini(true);
        try {
            await openImproveScriptGemini({
                shortVideoId: state.shortVideoId,
                title: state.title,
                audioScript: state.audioScript,
                hasScript: state.hasScript,
                appMobileTitle: state.appMobileTitle,
                marketingPostId: state.marketingPostId,
                sourceContent: state.contentPlainText || state.savedAgentSourceContent,
                additionalInfo: state.savedAgentAdditionalInfo,
                introduceApp: state.agentIntroduceApp,
                sourceFormat: state.agentSourceFormat,
                desiredScriptDurationSec: state.desiredScriptDurationSec,
            });
        } finally {
            setOpeningImproveScriptGemini(false);
        }
    };

    const chainDisplay = state.ttsChain.length > 0
        ? formatTtsChain(state.ttsChain)
        : state.chainLabel;

    const showPipeline = Boolean(
        state.fullAutoPipeline
        && (state.fullAutoPipeline.enabled || state.fullAutoPipeline.status !== 'idle'),
    );

    const restartableSet = React.useMemo(
        () => resolveRestartableSet(
            state.fullAutoPipeline?.restartable_steps,
            state.fullAutoPipeline?.steps,
            state.fullAutoPipeline?.current_step,
        ),
        [
            state.fullAutoPipeline?.restartable_steps,
            state.fullAutoPipeline?.steps,
            state.fullAutoPipeline?.current_step,
        ],
    );

    const pipelineBusy = state.startingFullAuto
        || String(state.fullAutoPipeline?.status || '').trim().toLowerCase() === 'running';

    const [whiteboardTransitions, setWhiteboardTransitions] = React.useState<WhiteboardTransitionOption[]>(
        DEFAULT_WHITEBOARD_TRANSITIONS,
    );

    const [beatDivisionManualOpen, setBeatDivisionManualOpen] = React.useState(false);

    const [scriptManualOpen, setScriptManualOpen] = React.useState(false);

    React.useEffect(() => {
        if (!state.isWhiteboardMode) {
            return undefined;
        }
        let cancelled = false;
        void fetchWhiteboardTransitions().then((res) => {
            if (cancelled || res.transitions.length === 0) {
                return;
            }
            setWhiteboardTransitions(res.transitions);
        });
        return () => {
            cancelled = true;
        };
    }, [state.isWhiteboardMode]);

    const whiteboardTransitionId = React.useMemo(() => {
        const raw = String(state.agentWhiteboardConfig?.transition || 'page_flip').trim() || 'page_flip';
        if (whiteboardTransitions.some((t) => t.id === raw)) {
            return raw;
        }
        return whiteboardTransitions[0]?.id || 'page_flip';
    }, [state.agentWhiteboardConfig?.transition, whiteboardTransitions]);

    const whiteboardPhotoPlaceMode = React.useMemo(() => {
        const raw = String(state.agentWhiteboardConfig?.photo_place_mode || 'drag').trim().toLowerCase();
        if (raw === 'draw' || raw === 'instant') {
            return raw as 'draw' | 'instant';
        }
        return 'drag' as const;
    }, [state.agentWhiteboardConfig?.photo_place_mode]);

    const whiteboardGenStyle = React.useMemo(() => {
        const raw = String(state.agentWhiteboardConfig?.gen_style || 'hybrid').trim();
        if (raw === 'collage_art' || raw === 'whiteboard' || raw === 'sketch' || raw === 'vox' || raw === 'courtroom_sketch') {
            return raw;
        }
        return 'hybrid';
    }, [state.agentWhiteboardConfig?.gen_style]);

    const clipOptionStackSx = {
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        overflow: 'hidden',
    } as const;

    return (
        <Box
            sx={{
                height: '100%',
                overflow: 'auto',
                p: 1.5,
                bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'background.default' : 'grey.50'),
            }}
        >
            <Stack spacing={1.5}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ px: 0.25 }}>
                    Workflow HyperFrames
                </Typography>

                {state.ttsFailed && state.lastError ? (
                    <Alert severity="error">
                        {state.lastError}
                    </Alert>
                ) : null}

                <WorkflowSection title="Tùy chọn clip" tone="visual">
                    <Stack spacing={1.25}>
                        <Stack divider={<Divider flexItem />} sx={clipOptionStackSx}>
                            <Box sx={{ px: 1.25, py: 0.75, bgcolor: 'action.hover' }}>
                                <Typography variant="caption" fontWeight={700} color="text.secondary">
                                    Cấu hình chung
                                </Typography>
                            </Box>
                        <FormControlLabel
                            sx={{
                                m: 0,
                                px: 1.25,
                                py: 1,
                                width: '100%',
                                alignItems: 'flex-start',
                                gap: 1,
                            }}
                            control={(
                                <Switch
                                    size="small"
                                    checked={state.agentIntroduceApp}
                                    disabled={state.savingIntroduceApp}
                                    onChange={(e) => {
                                        void state.handleIntroduceAppChange(e.target.checked);
                                    }}
                                    inputProps={{ 'aria-label': 'Giới thiệu app trong video' }}
                                />
                            )}
                            label={(
                                <Box sx={{ pt: 0.25 }}>
                                    <Typography variant="caption" color="text.primary" display="block" fontWeight={600}>
                                        Giới thiệu app trong video
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.35 }}>
                                        Bật: CTA cuối mời mở/tải app. Tắt: chỉ CTA engagement.
                                    </Typography>
                                </Box>
                            )}
                        />
                        <FormControlLabel
                            sx={{
                                m: 0,
                                px: 1.25,
                                py: 1,
                                width: '100%',
                                alignItems: 'flex-start',
                                gap: 1,
                            }}
                            control={(
                                <Switch
                                    size="small"
                                    checked={state.agentShowKaraoke}
                                    disabled={state.savingShowKaraoke}
                                    onChange={(e) => {
                                        void state.handleAgentShowKaraokeChange(e.target.checked);
                                    }}
                                    inputProps={{ 'aria-label': 'Hiện text karaoke' }}
                                />
                            )}
                            label={(
                                <Box sx={{ pt: 0.25 }}>
                                    <Typography variant="caption" color="text.primary" display="block" fontWeight={600}>
                                        Hiện text karaoke
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.35 }}>
                                        Tắt: không ghép caption layer. Band dưới beat vẫn chừa theo tỉ lệ clip (9:16 ~360px, 16:9 ~120px).
                                    </Typography>
                                </Box>
                            )}
                        />
                        <Box sx={{ px: 1.25, py: 1 }}>
                            <Typography variant="caption" color="text.primary" display="block" fontWeight={600} sx={{ mb: 0.75 }}>
                                Avatar lip-sync
                            </Typography>
                            {(() => {
                                const selected = state.verifiedAvatars.find(
                                    (item) => item.id === state.agentAvatarId,
                                );
                                const masterRaw = String(
                                    state.agentAvatarMasterUrl || selected?.master_url || '',
                                ).trim();
                                let thumbSrc = '';
                                if (masterRaw) {
                                    if (validURL(masterRaw) || masterRaw.startsWith('data:')) {
                                        thumbSrc = masterRaw;
                                    } else if (masterRaw.startsWith('//')) {
                                        thumbSrc = `https:${masterRaw}`;
                                    } else {
                                        thumbSrc = convertToURL(
                                            process.env.REACT_APP_BASE_URL,
                                            masterRaw.replace(/^\//, ''),
                                        );
                                    }
                                }
                                const anchorLabel = AVATAR_PIP_ANCHORS.find(
                                    (item) => item.id === state.agentAvatarAnchor,
                                )?.label || 'Dưới phải';
                                const hasAvatar = state.agentAvatarId > 0;
                                return (
                                    <Button
                                        fullWidth
                                        variant="outlined"
                                        color="inherit"
                                        disabled={state.savingAgentAvatar}
                                        onClick={() => state.setAvatarDrawerOpen(true)}
                                        endIcon={<ChevronRightIcon />}
                                        sx={{
                                            ...workflowFieldSurfaceSx,
                                            justifyContent: 'flex-start',
                                            textTransform: 'none',
                                            py: 1,
                                            px: 1.25,
                                        }}
                                    >
                                        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ width: '100%', minWidth: 0 }}>
                                            <Box
                                                sx={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: '50%',
                                                    overflow: 'hidden',
                                                    bgcolor: '#fff',
                                                    border: '1px solid',
                                                    borderColor: 'divider',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {thumbSrc ? (
                                                    <Box
                                                        component="img"
                                                        src={thumbSrc}
                                                        alt=""
                                                        sx={{
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'cover',
                                                            display: 'block',
                                                        }}
                                                    />
                                                ) : null}
                                            </Box>
                                            <Box sx={{ minWidth: 0, textAlign: 'left', flex: 1 }}>
                                                <Typography variant="body2" fontWeight={600} noWrap>
                                                    {selected?.title
                                                        || (hasAvatar
                                                            ? `Avatar #${state.agentAvatarId}`
                                                            : 'Chọn avatar')}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" noWrap display="block">
                                                    {hasAvatar
                                                        ? `PiP · ${anchorLabel} · whiteboard + motion HTML`
                                                        : 'Không dùng · mở drawer để chọn'}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </Button>
                                );
                            })()}
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75, lineHeight: 1.35 }}>
                                PiP góc clip, lip-sync theo Whisper. Áp dụng khi mux whiteboard / render HyperFrames.
                            </Typography>
                            <ShortVideoAgentAvatarDrawer
                                open={state.avatarDrawerOpen}
                                onClose={() => state.setAvatarDrawerOpen(false)}
                                avatars={state.verifiedAvatars}
                                selectedId={state.agentAvatarId}
                                selectedAnchor={state.agentAvatarAnchor}
                                clipAspect={state.agentClipAspect}
                                saving={state.savingAgentAvatar}
                                onApply={state.handleAgentAvatarApply}
                            />
                            <ShortVideoAgentBeatDivisionManualDrawer
                                open={beatDivisionManualOpen}
                                onClose={() => setBeatDivisionManualOpen(false)}
                                shortVideoId={state.shortVideoId}
                                audioDurationSec={state.audioDurationSec}
                                agentSourceFormat={state.agentSourceFormat}
                                isWhiteboard={state.isWhiteboardMode}
                                onSave={state.handleManualBeatDivisionSave}
                            />
                            <ShortVideoAgentScriptManualDrawer
                                open={scriptManualOpen}
                                onClose={() => setScriptManualOpen(false)}
                                shortVideoId={state.shortVideoId}
                                initialScript={state.audioScript}
                                onSave={state.handleManualScriptCreateSave}
                            />
                        </Box>
                        {state.audioScriptStyles.length > 0 ? (
                            <Box sx={{ px: 1.25, py: 1 }}>
                                <Typography variant="caption" color="text.primary" display="block" fontWeight={600} sx={{ mb: 0.75 }}>
                                    Phong cách giọng đọc
                                </Typography>
                                <FormControl fullWidth size="small">
                                    <Select
                                        value={state.agentAudioScriptStyleId}
                                        onChange={(e) => {
                                            void state.handleAgentAudioScriptStyleChange(Number(e.target.value));
                                        }}
                                        disabled={state.savingAudioScriptStyle}
                                        displayEmpty
                                        aria-label="Phong cách giọng đọc"
                                    >
                                        <MenuItem value={0}>
                                            <em>Mặc định</em>
                                        </MenuItem>
                                        {state.audioScriptStyles
                                            .filter((style) => style.status === 'ready')
                                            .map((style) => (
                                                <MenuItem key={style.id} value={style.id}>
                                                    {style.title || `Style #${style.id}`}
                                                    {style.channel ? ` (${style.channel})` : ''}
                                                </MenuItem>
                                            ))}
                                    </Select>
                                </FormControl>
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75, lineHeight: 1.35 }}>
                                    Áp dụng khi sinh hoặc cải thiện script qua Gemini. Mặc định giữ prompt hiện tại.
                                </Typography>
                            </Box>
                        ) : null}
                        <Box sx={{ px: 1.25, py: 1 }}>
                            <Typography variant="caption" color="text.primary" display="block" fontWeight={600} sx={{ mb: 0.75 }}>
                                Thời lượng script mong muốn
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <TextField
                                    size="small"
                                    type="number"
                                    value={state.desiredScriptDurationInput}
                                    onChange={(e) => {
                                        state.setDesiredScriptDurationInput(e.target.value);
                                    }}
                                    onBlur={() => {
                                        void state.commitDesiredScriptDuration(state.desiredScriptDurationInput);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            (e.target as HTMLInputElement).blur();
                                        }
                                    }}
                                    disabled={state.savingDesiredScriptDuration}
                                    placeholder="Để trống = tự chọn"
                                    inputProps={{
                                        min: 15,
                                        max: 3600,
                                        step: 1,
                                        'aria-label': 'Thời lượng script mong muốn (giây)',
                                    }}
                                    sx={{ width: 140 }}
                                />
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ fontVariantNumeric: 'tabular-nums', minWidth: 64 }}
                                >
                                    {(() => {
                                        const n = Number(String(state.desiredScriptDurationInput || '').trim());
                                        if (!Number.isFinite(n) || n <= 0) {
                                            return '—';
                                        }
                                        const s = Math.max(0, Math.floor(n));
                                        const h = Math.floor(s / 3600);
                                        const m = Math.floor((s % 3600) / 60);
                                        const sec = s % 60;
                                        return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
                                    })()}
                                </Typography>
                            </Stack>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75, lineHeight: 1.35 }}>
                                Nhập số giây (15–3600). Áp dụng khi sinh/cải thiện script. Để trống giữ behavior cũ.
                            </Typography>
                        </Box>
                        <Box sx={{ px: 1.25, py: 1 }}>
                            <Typography variant="caption" color="text.primary" display="block" fontWeight={600} sx={{ mb: 0.75 }}>
                                Tỉ lệ clip
                            </Typography>
                            <ToggleButtonGroup
                                exclusive
                                fullWidth
                                size="small"
                                value={state.agentClipAspect}
                                disabled={state.savingClipAspect}
                                onChange={(_event, value: '9:16' | '16:9' | null) => {
                                    if (value) {
                                        void state.handleAgentClipAspectChange(value);
                                    }
                                }}
                                aria-label="Tỉ lệ clip"
                            >
                                <ToggleButton value="9:16" aria-label="9:16 dọc">
                                    9:16 dọc
                                </ToggleButton>
                                <ToggleButton value="16:9" aria-label="16:9 ngang">
                                    16:9 ngang
                                </ToggleButton>
                            </ToggleButtonGroup>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75, lineHeight: 1.35 }}>
                                {state.agentClipAspect === '16:9'
                                    ? 'Canvas 1920×1080 — band caption ~120px.'
                                    : 'Canvas 1080×1920 — band caption ~360px (mặc định).'}
                            </Typography>
                        </Box>
                        <Box sx={{ px: 1.25, py: 1 }}>
                            <Typography variant="caption" color="text.primary" display="block" fontWeight={600} sx={{ mb: 0.75 }}>
                                Chế độ visual clip
                            </Typography>
                            <ToggleButtonGroup
                                exclusive
                                fullWidth
                                size="small"
                                value={state.agentVisualMode}
                                disabled={state.savingVisualMode}
                                onChange={(_event, value: 'hyperframes' | 'whiteboard' | null) => {
                                    if (value) {
                                        void state.handleAgentVisualModeChange(value);
                                    }
                                }}
                                aria-label="Chế độ visual clip"
                            >
                                <ToggleButton value="hyperframes" aria-label="Motion HTML">
                                    Motion HTML
                                </ToggleButton>
                                <ToggleButton value="whiteboard" aria-label="Whiteboard">
                                    Whiteboard
                                </ToggleButton>
                            </ToggleButtonGroup>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75, lineHeight: 1.35 }}>
                                {state.isWhiteboardMode
                                    ? 'Whiteboard: ảnh beat + render bảng. Cấu hình riêng ở khối Whiteboard bên dưới.'
                                    : 'Motion HTML: HyperFrames HTML theo beat. Cấu hình riêng ở khối Motion HTML bên dưới.'}
                            </Typography>
                        </Box>
                        <Box sx={{ px: 1.25, py: 1 }}>
                            <Typography variant="caption" color="text.primary" display="block" fontWeight={600} sx={{ mb: 0.75 }}>
                                Tần suất beat
                            </Typography>
                            <FormControl fullWidth size="small" disabled={state.savingBeatFrequency}>
                                <Select
                                    value={state.agentBeatFrequency}
                                    onChange={(e) => {
                                        const value = String(e.target.value || '').trim() as AgentBeatFrequency;
                                        if (value) {
                                            void state.handleAgentBeatFrequencyChange(value);
                                        }
                                    }}
                                    inputProps={{ 'aria-label': 'Tần suất beat' }}
                                >
                                    {AGENT_BEAT_FREQUENCY_OPTIONS.map((option) => (
                                        <MenuItem key={option.key} value={option.key}>
                                            {option.label} ({option.rangeLabel})
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75, lineHeight: 1.35 }}>
                                {(() => {
                                    const option = AGENT_BEAT_FREQUENCY_OPTIONS.find(
                                        (o) => o.key === state.agentBeatFrequency,
                                    );
                                    return option ? option.description : '';
                                })()}
                                {' '}Áp dụng khi sinh/cải thiện script (bước 1) và khi chia beat — cần sinh lại script hoặc chia lại để áp dụng.
                            </Typography>
                            {state.isWhiteboardMode && state.agentBeatFrequency === 'fast' && (
                                <Typography variant="caption" color="warning.main" display="block" sx={{ mt: 0.75, lineHeight: 1.35 }}>
                                    Whiteboard nhịp nhanh: nên chọn "Không vẽ tay" ở Cách đưa ảnh vào khung để ảnh hiện đầy đủ từ frame đầu.
                                </Typography>
                            )}
                        </Box>
                        <FormControlLabel
                            sx={{
                                m: 0,
                                px: 1.25,
                                py: 1,
                                width: '100%',
                                alignItems: 'flex-start',
                                gap: 1,
                            }}
                            control={(
                                <Switch
                                    size="small"
                                    checked={state.agentGeminiOpenBrowser}
                                    disabled={state.savingGeminiOpenBrowser}
                                    onChange={(e) => {
                                        void state.handleGeminiOpenBrowserChange(e.target.checked);
                                    }}
                                    inputProps={{ 'aria-label': 'Hiển thị browser debug' }}
                                />
                            )}
                            label={(
                                <Box sx={{ pt: 0.25 }}>
                                    <Typography variant="caption" color="text.primary" display="block" fontWeight={600}>
                                        Hiển thị browser debug
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.35 }}>
                                        Mở cửa sổ trình duyệt ở TẤT CẢ các bước dùng headless (Gemini, Meta.ai, Duck.ai, ChatGPT TTS, post…).
                                    </Typography>
                                </Box>
                            )}
                        />
                        </Stack>

                        {state.isWhiteboardMode ? (
                            <Stack divider={<Divider flexItem />} sx={clipOptionStackSx}>
                                <Box sx={{ px: 1.25, py: 0.75, bgcolor: 'action.hover' }}>
                                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                                        Whiteboard
                                    </Typography>
                                </Box>
                                <Box sx={{ px: 1.25, py: 1 }}>
                                    <Typography variant="caption" color="text.primary" display="block" fontWeight={600} sx={{ mb: 0.75 }}>
                                        Cách đưa ảnh vào khung
                                    </Typography>
                                    <ToggleButtonGroup
                                        exclusive
                                        fullWidth
                                        size="small"
                                        value={whiteboardPhotoPlaceMode}
                                        disabled={state.savingWhiteboardConfig}
                                        onChange={(_event, value: 'instant' | 'draw' | 'drag' | null) => {
                                            if (value) {
                                                void state.handleAgentWhiteboardConfigChange({
                                                    photo_place_mode: value,
                                                });
                                            }
                                        }}
                                        aria-label="Cách đưa ảnh vào khung whiteboard"
                                    >
                                        <ToggleButton value="instant" aria-label="Không vẽ tay">
                                            Không vẽ tay
                                        </ToggleButton>
                                        <ToggleButton value="drag" aria-label="Kéo ảnh vào">
                                            Kéo ảnh vào
                                        </ToggleButton>
                                        <ToggleButton value="draw" aria-label="Vẽ tô ảnh">
                                            Vẽ tô ảnh
                                        </ToggleButton>
                                    </ToggleButtonGroup>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75, lineHeight: 1.35 }}>
                                        {whiteboardPhotoPlaceMode === 'instant'
                                            ? 'Frame đầu = ảnh đầy đủ, không tay vẽ. Chuyển cảnh sang ảnh beat sau theo hiệu ứng bên dưới.'
                                            : (whiteboardPhotoPlaceMode === 'draw'
                                                ? 'Brush tô vùng ảnh thật sau outline.'
                                                : 'Tay kéo cutout ảnh thật vào trước, rồi mới vẽ doodle (mặc định).')}
                                    </Typography>
                                    <Typography variant="caption" color="text.primary" display="block" fontWeight={600} sx={{ mt: 1.25, mb: 0.75 }}>
                                        Cách chuyển cảnh
                                    </Typography>
                                    <FormControl fullWidth size="small" disabled={state.savingWhiteboardConfig}>
                                        <Select
                                            value={whiteboardTransitionId}
                                            onChange={(e) => {
                                                const value = String(e.target.value || '').trim();
                                                if (value) {
                                                    void state.handleAgentWhiteboardConfigChange({
                                                        transition: value,
                                                    });
                                                }
                                            }}
                                            inputProps={{ 'aria-label': 'Cách chuyển cảnh whiteboard' }}
                                        >
                                            {whiteboardTransitions.map((t) => (
                                                <MenuItem key={t.id} value={t.id}>
                                                    {t.label}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75, lineHeight: 1.35 }}>
                                        {whiteboardPhotoPlaceMode === 'instant'
                                            ? (
                                                whiteboardTransitionId === 'random'
                                                    ? 'Ngẫu nhiên mỗi beat: rút hết danh sách không lặp, hết thì xáo lại. Mọi hiệu ứng lộ ảnh 2.'
                                                    : whiteboardTransitionId === 'erase'
                                                        ? 'Xóa bảng: ảnh 1 đè lên ảnh 2; tay gôm lau dần lộ ảnh 2 phía dưới (không qua bảng trống).'
                                                        : whiteboardTransitionId === 'camera_pan'
                                                            ? 'Camera pan: máy ảo trượt/zoom từ ảnh 1 sang ảnh 2 trên bảng liên tục.'
                                                            : whiteboardTransitionId === 'slide'
                                                                ? 'Tay kéo: bàn tay đẩy ảnh 1 ra, kéo ảnh 2 vào.'
                                                                : whiteboardTransitionId === 'ink_pop'
                                                                    ? 'Loang màu nước: vết loang lộ dần ảnh 2 trên nền ảnh 1 (không phủ mực đen kín).'
                                                                    : whiteboardTransitionId === 'fade'
                                                                        ? 'Cắt / Fade: ảnh 1 mờ dần sang ảnh 2.'
                                                                        : whiteboardTransitionId === 'paper_tear'
                                                                            ? 'Xé giấy: green→ảnh 1, blue→ảnh 2; giữ cánh giấy trắng từ video asset.'
                                                                            : whiteboardTransitionId === 'paint_stroke'
                                                                                ? 'Quét cọ: green→ảnh 1, blue→ảnh 2; mép cọ lấy từ video asset quet_co_1.'
                                                                                : 'Lật trang: ảnh 2 sẵn trên mặt trang khi lật. Beat cuối không transition.'
                                            )
                                            : 'Áp dụng cuối beat 1…n−1 (thường sang bảng trống). Beat cuối không có transition. Chọn Ngẫu nhiên để rút hết danh sách không lặp, hết thì xáo lại.'}
                                    </Typography>
                                    <Typography variant="caption" color="text.primary" display="block" fontWeight={600} sx={{ mt: 1.25, mb: 0.75 }}>
                                        Phong cách hình ảnh
                                    </Typography>
                                    <FormControl fullWidth size="small" disabled={state.savingWhiteboardConfig}>
                                        <Select
                                            value={whiteboardGenStyle}
                                            onChange={(e) => {
                                                const value = String(e.target.value || '').trim();
                                                if (value) {
                                                    void state.handleAgentWhiteboardConfigChange({
                                                        gen_style: value,
                                                    });
                                                }
                                            }}
                                            inputProps={{ 'aria-label': 'Phong cách hình ảnh whiteboard' }}
                                        >
                                            <MenuItem value="hybrid">Hybrid</MenuItem>
                                            <MenuItem value="collage_art">Collage Art</MenuItem>
                                            <MenuItem value="vox">Vox</MenuItem>
                                            <MenuItem value="courtroom_sketch">Courtroom Sketch</MenuItem>
                                        </Select>
                                    </FormControl>
                                    <Box component="ul" sx={{ m: 0, pl: 1.5, mt: 0.75, color: 'text.secondary' }}>
                                        <Typography component="li" variant="caption" display="block" sx={{ lineHeight: 1.4, mb: 0.35 }}>
                                            <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>Hybrid</Box> — outline + hình ảnh thật trên nền bảng.
                                        </Typography>
                                        <Typography component="li" variant="caption" display="block" sx={{ lineHeight: 1.4, mb: 0.35 }}>
                                            <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>Collage Art</Box> — giấy cắt tay, mép giấy rách, nền cream/kraft, halftone dots, washi tape, chữ báo vintage, accent đỏ.
                                        </Typography>
                                        <Typography component="li" variant="caption" display="block" sx={{ lineHeight: 1.4, mb: 0.35 }}>
                                            <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>Vox</Box> — bảng tài liệu giải thích (documentary explainer): cutout minh họa chủ đề, nét marker đen/đỏ nối vật thể, mũi tên, dấu chấm hỏi, khoanh tròn nhấn dữ liệu, lưới tọa độ/biểu đồ ẩn nền.
                                        </Typography>
                                        <Typography component="li" variant="caption" display="block" sx={{ lineHeight: 1.4, mb: 0.35 }}>
                                            <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>Courtroom Sketch</Box> — phác thảo tòa án vẽ tay: bút chì màu/phấn màu/nước trên giấy vân nhám, nét nhanh thô, màu trầm.
                                        </Typography>
                                    </Box>
                                </Box>
                            </Stack>
                        ) : (
                            <Stack divider={<Divider flexItem />} sx={clipOptionStackSx}>
                                <Box sx={{ px: 1.25, py: 0.75, bgcolor: 'action.hover' }}>
                                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                                        Motion HTML
                                    </Typography>
                                </Box>
                                <Box sx={{ px: 1.25, py: 1 }}>
                                    <FormControl fullWidth size="small" disabled={state.savingVisualStyle}>
                                        <InputLabel id="visual-style-select-label">Phong cách visual</InputLabel>
                                        <Select
                                            labelId="visual-style-select-label"
                                            label="Phong cách visual"
                                            value={state.visualStyle || 'auto'}
                                            onChange={(e) => { void state.handleVisualStyleChange(String(e.target.value)); }}
                                        >
                                            {(state.visualStyleCatalog.length > 0
                                                ? state.visualStyleCatalog
                                                : [{ key: 'auto', label: 'Tự động (agent)' }]
                                            ).map((item) => (
                                                <MenuItem key={item.key} value={item.key}>
                                                    {item.label}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75, lineHeight: 1.35 }}>
                                        {state.visualStyleResolved
                                            ? `Render: ${visualStyleLabel(state.visualStyleResolved, state.visualStyleCatalog)}${state.visualStyleSource ? ` (${state.visualStyleSource})` : ''}`
                                            : 'Chỉ áp dụng khi chế độ Motion HTML.'}
                                    </Typography>
                                </Box>
                            </Stack>
                        )}
                    </Stack>
                </WorkflowSection>

                <WorkflowSection title="Thông tin chung" tone="info">
                    <MetaRow label="Phase" status={phaseLabel(state.workflowPhase)} />
                    <MetaRow
                        label="Workflow mode"
                        value={state.workflowMode === 'auto_tts_full' ? 'TTS tự động' : '2 bước thủ công'}
                    />
                    <MetaRow label="TTS status" status={state.agentTtsStatus || '—'} />
                    <MetaRow
                        label="TTS job"
                        value={state.agentTtsJobId != null ? `#${state.agentTtsJobId}` : '—'}
                    />
                    <MetaRow label="TTS chain" value={chainDisplay} />
                    {state.selectedPlatforms.includes('omnivoice_local')
                        || state.ttsChain.includes('omnivoice_local') ? (
                        <MetaRow
                            label="Giọng OmniVoice"
                            value={
                                state.omnivoiceVoiceMode === 'design'
                                    ? `Thiết kế giọng · ${formatOmnivoiceVoiceDesignVi(state.omnivoiceVoiceDesign || '') || '—'}`
                                    : (state.omnivoiceVoice || 'minh_quân')
                            }
                        />
                    ) : null}
                    {state.selectedPlatforms.includes('saydi')
                        || state.ttsChain.includes('saydi') ? (
                        <MetaRow
                            label="Giọng Saydi"
                            value={state.saydiVoice || 'adam-11labs-vi'}
                        />
                    ) : null}
                    <MetaRow label="Video status" status={state.agentVideoStatus || 'none'} />
                    <MetaRow
                        label="Render mode"
                        value={state.renderMode === 'import_html' ? 'HTML chatbot' : 'Agent sáng tạo'}
                    />
                    {state.renderMode === 'import_html' ? (
                        <>
                            <MetaRow label="Whisper" status={state.whisperStatus || 'none'} />
                            <MetaRow
                                label="Beat map"
                                status={state.beatMapReady ? `${state.beatMap?.sections.length ?? 0} beat` : 'Chưa chia'}
                            />
                            <MetaRow
                                label="HTML beats"
                                status={`${state.beatsHtmlCompleted}/${state.beatsHtmlTotal || 0}`}
                            />
                            <MetaRow
                                label="HTML chatbot"
                                status={state.importHtmlReady ? 'Sẵn sàng ghép' : 'Chưa đủ'}
                            />
                        </>
                    ) : null}
                    <MetaRow
                        label="Rendered at"
                        value={state.agentVideoRenderedAt || '—'}
                    />
                </WorkflowSection>

                {showPipeline && state.fullAutoPipeline ? (
                    <WorkflowSection
                        title="Pipeline A→Z"
                        tone="pipeline"
                        headerAction={(
                            <PipelineRenderRunButton
                                label="Run"
                                testId="pipeline-section-rerun-render-upload"
                                disabled={pipelineBusy}
                                loading={state.startingFullAuto}
                                onClick={() => {
                                    if (typeof state.handleRerunRenderUpload === 'function') {
                                        void state.handleRerunRenderUpload();
                                        return;
                                    }
                                    void state.handleStartFullAutoPipeline('restart', 'render', 'upload');
                                }}
                            />
                        )}
                    >
                        <MetaRow label="Status" status={state.fullAutoPipeline.status || 'idle'} />
                        <MetaRow
                            label="Bước hiện tại"
                            status={
                                state.fullAutoPipeline.current_step
                                    ? pipelineStepLabel(state.fullAutoPipeline.current_step, state.fullAutoPipeline)
                                    : '—'
                            }
                            statusTone={
                                state.fullAutoPipeline.status === 'running'
                                    ? 'info'
                                    : state.fullAutoPipeline.status === 'failed'
                                        ? 'error'
                                        : state.fullAutoPipeline.status === 'completed'
                                            ? 'success'
                                            : 'default'
                            }
                        />
                        <PipelineScriptQaLoopMeta pipeline={state.fullAutoPipeline} />
                        <PipelineGroupedWorkflowList
                            steps={state.fullAutoPipeline.steps}
                            headlessSteps={state.fullAutoPipeline.headless_steps}
                            aiSteps={state.fullAutoPipeline.ai_steps}
                            qaLoops={state.fullAutoPipeline.qa_loops}
                            agentVisualMode={state.agentVisualMode}
                            currentStep={state.fullAutoPipeline.current_step || ''}
                            pipelineStatus={state.fullAutoPipeline.status || 'idle'}
                            stepToggles={state.fullAutoStepToggles}
                            stepToggleDisabled={state.savingFullAutoStepToggles || pipelineBusy}
                            onStepToggleChange={(toggleKey, checked) => {
                                void state.handleFullAutoStepToggleChange(toggleKey, checked);
                            }}
                            beatImageFillMode={state.beatImageFillMode}
                            beatImageFillModeDisabled={state.savingBeatImageFillMode || pipelineBusy}
                            onBeatImageFillModeChange={(mode) => {
                                void state.handleBeatImageFillModeChange(mode);
                            }}
                            restartableSet={restartableSet}
                            selectStepDisabled={pipelineBusy}
                            onSelectStep={(stepKey: FullAutoPipelineStepKey) => {
                                void state.handleStartFullAutoPipeline('restart', stepKey);
                            }}
                            onRunSingleStep={(stepKey: FullAutoPipelineStepKey) => {
                                if (typeof state.handleRunSinglePipelineStep === 'function') {
                                    void state.handleRunSinglePipelineStep(stepKey);
                                    return;
                                }
                                void state.handleStartFullAutoPipeline(
                                    'restart',
                                    stepKey,
                                    undefined,
                                    { singleStep: true },
                                );
                            }}
                            runSingleStepDisabled={pipelineBusy}
                            runningSingleStep={state.startingFullAuto}
                            onRerunRenderUpload={() => {
                                if (typeof state.handleRerunRenderUpload === 'function') {
                                    void state.handleRerunRenderUpload();
                                    return;
                                }
                                void state.handleStartFullAutoPipeline('restart', 'render', 'upload');
                            }}
                            rerunningRenderUpload={state.startingFullAuto}
                            rerunRenderUploadDisabled={pipelineBusy}
                            onManualBeatDivision={() => setBeatDivisionManualOpen(true)}
                            manualBeatDivisionDisabled={pipelineBusy}
                            onManualScriptCreate={() => setScriptManualOpen(true)}
                            manualScriptCreateDisabled={pipelineBusy}
                        />
                        {state.fullAutoPipeline.last_error?.message ? (
                            <Alert severity="error" sx={{ mt: 1, py: 0.5, whiteSpace: 'pre-wrap' }}>
                                {appendHeadlessHowtoToError(state.fullAutoPipeline.last_error.message)}
                                {Array.isArray(
                                    (state.fullAutoPipeline.last_error.detail as { diagnosis?: { issues?: unknown[] } } | undefined)?.diagnosis?.issues,
                                ) && ((state.fullAutoPipeline.last_error.detail as { diagnosis?: { issues?: Array<{ code?: string; message?: string }> } }).diagnosis?.issues?.length ?? 0) > 0 ? (
                                    <Box component="ul" sx={{ mt: 0.75, mb: 0, pl: 2 }}>
                                        {((state.fullAutoPipeline.last_error.detail as { diagnosis?: { issues?: Array<{ code?: string; message?: string }> } }).diagnosis?.issues ?? []).slice(0, 6).map((issue, idx) => (
                                            <Typography component="li" variant="caption" key={`${issue.code || 'issue'}-${idx}`}>
                                                [{issue.code || '?'}] {issue.message || ''}
                                            </Typography>
                                        ))}
                                    </Box>
                                ) : null}
                            </Alert>
                        ) : null}
                    </WorkflowSection>
                ) : null}

                <WorkflowSection title="Danh sách Prompt" tone="prompt">
                    <ShortVideoAgentPromptLibrary state={state} />
                </WorkflowSection>

                {state.agentVideoSummary ? (
                    <WorkflowSection title="Metadata script" tone="meta">
                        <MetaRow
                            label="Ước tính"
                            value={
                                state.agentVideoSummary.estimated_duration_sec != null
                                    ? `${state.agentVideoSummary.estimated_duration_sec}s`
                                    : '—'
                            }
                        />
                        <MetaRow
                            label="CTA mode"
                            value={state.agentVideoSummary.cta_mode || '—'}
                        />
                        <MetaRow
                            label="Markers"
                            value={String(state.agentVideoSummary.marker_count ?? 0)}
                        />
                    </WorkflowSection>
                ) : null}

                <WorkflowSection title="Hành động" tone="action">
                    <Stack spacing={1}>
                        {!state.hasScript && (
                            <Stack spacing={1}>
                                <LoadingButton
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                    fullWidth
                                    sx={workflowActionButtonSx}
                                    loading={
                                        state.openingCreateScriptGeminiHeadless
                                        || geminiScriptQueueActive
                                    }
                                    disabled={geminiScriptQueueActive}
                                    onClick={() => {
                                        void state.handleEnqueueCreateScriptGeminiHeadless();
                                    }}
                                >
                                    {geminiScriptQueueActive ? 'Đang queue…' : 'Queue sinh script'}
                                </LoadingButton>
                                <LoadingButton
                                    size="small"
                                    variant="contained"
                                    color="primary"
                                    fullWidth
                                    sx={workflowActionButtonSx}
                                    loading={openingCreateScriptGemini}
                                    disabled={geminiScriptQueueActive}
                                    startIcon={<OpenInNewIcon />}
                                    onClick={() => { void handleOpenCreateScriptGemini(); }}
                                >
                                    Mở Gemini sinh script
                                </LoadingButton>
                            </Stack>
                        )}

                        {state.hasScript && !state.scriptApproved && (
                            <Stack spacing={1}>
                                <LoadingButton
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                    fullWidth
                                    sx={workflowActionButtonSx}
                                    loading={
                                        state.openingImproveScriptGeminiHeadless
                                        || geminiScriptQueueActive
                                    }
                                    disabled={geminiScriptQueueActive}
                                    onClick={() => {
                                        void state.handleEnqueueImproveScriptGeminiHeadless();
                                    }}
                                >
                                    {geminiScriptQueueActive ? 'Đang queue…' : 'Queue cải thiện'}
                                </LoadingButton>
                                <LoadingButton
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                    fullWidth
                                    sx={workflowActionButtonSx}
                                    loading={openingImproveScriptGemini}
                                    disabled={geminiScriptQueueActive}
                                    startIcon={<OpenInNewIcon />}
                                    onClick={() => { void handleOpenImproveScriptGemini(); }}
                                >
                                    Mở Gemini cải thiện script
                                </LoadingButton>
                            </Stack>
                        )}

                        {!state.scriptApproved ? (
                            <>
                                <Typography variant="caption" color="text.secondary" sx={{ pt: 0.25 }}>
                                    Nâng cao — agent local Cursor
                                </Typography>
                                <LoadingButton
                                    size="small"
                                    variant="outlined"
                                    color="inherit"
                                    fullWidth
                                    sx={workflowActionButtonSx}
                                    loading={state.launchingScript}
                                    disabled={state.hasScript}
                                    startIcon={<PlayArrowIcon />}
                                    onClick={() => { void state.handleLaunchAgentScript(); }}
                                >
                                    Chạy agent local bước 1
                                </LoadingButton>
                            </>
                        ) : null}

                        {state.renderMode === 'creative' && state.readyForPhase2 && state.scriptApproved && !state.hasAgentVideo && (
                            <LoadingButton
                                size="small"
                                variant="contained"
                                color="primary"
                                fullWidth
                                sx={workflowActionButtonSx}
                                loading={state.launchingRender}
                                disabled={state.agentVideoStatus === 'processing'}
                                startIcon={<PlayArrowIcon />}
                                onClick={() => { void state.handleLaunchAgentRender(); }}
                            >
                                Chạy render agent
                            </LoadingButton>
                        )}

                        {state.ttsFailed && state.scriptApproved && !state.hasAudio && (
                            <LoadingButton
                                size="small"
                                variant="outlined"
                                color="warning"
                                fullWidth
                                sx={workflowActionButtonSx}
                                loading={state.retryingTts}
                                onClick={() => { void state.handleRetryTts(); }}
                            >
                                Thử lại TTS
                            </LoadingButton>
                        )}

                        {state.needsTtsEnqueue && state.scriptApproved && !state.hasAudio && !state.ttsFailed && (
                            <LoadingButton
                                size="small"
                                variant="outlined"
                                color="primary"
                                fullWidth
                                sx={workflowActionButtonSx}
                                loading={state.retryingTts}
                                onClick={() => { void state.handleRetryTts('Đã queue TTS narration'); }}
                            >
                                Sinh TTS (queue)
                            </LoadingButton>
                        )}
                    </Stack>
                </WorkflowSection>

                <WorkflowSection title="Đăng social" tone="social">
                    <Stack spacing={0.5}>
                        <FormControlLabel
                            control={(
                                <Switch
                                    checked={state.postEligible}
                                    disabled={state.savingPublishFlags}
                                    onChange={(e) => { void state.handlePostEligibleChange(e.target.checked); }}
                                />
                            )}
                            label="Đủ điều kiện post"
                        />
                        <FormControlLabel
                            control={(
                                <Switch
                                    checked={state.socialPosted}
                                    disabled={state.savingPublishFlags}
                                    onChange={(e) => { void state.handleSocialPostedChange(e.target.checked); }}
                                />
                            )}
                            label="Đã post lên social"
                        />
                    </Stack>
                    <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
                            Tài khoản social
                        </Typography>
                        {state.socialAccounts.length === 0 ? (
                            <Typography variant="caption" color="text.secondary">
                                Chưa có tài khoản trong App Mobile → Social
                            </Typography>
                        ) : (
                            <Stack spacing={0.75}>
                                {state.socialAccounts.map((account) => {
                                    const socialType = String(account.social_type || '').toLowerCase() || 'social';
                                    const platformLabel = socialType === 'facebook'
                                        ? 'Facebook'
                                        : socialType === 'tiktok'
                                            ? 'TikTok'
                                            : socialType.charAt(0).toUpperCase() + socialType.slice(1);
                                    const title = account.title?.trim() || `${platformLabel} #${account.index}`;
                                    const isFacebook = socialType === 'facebook';
                                    const isTikTok = socialType === 'tiktok';
                                    const sessionOk = isFacebook
                                        ? Boolean(account.has_facebook_session)
                                        : isTikTok
                                            ? Boolean(account.has_tiktok_session)
                                            : Boolean(account.has_cookie);
                                    const canPost = (isFacebook || isTikTok)
                                        && sessionOk
                                        && state.postEligible
                                        && Boolean(state.agentVideoUrl);

                                    return (
                                        <Box
                                            key={`${socialType}-${account.index}`}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                py: 0.75,
                                                px: 1,
                                                borderRadius: 1,
                                                border: '1px solid',
                                                borderColor: 'divider',
                                                bgcolor: 'background.paper',
                                            }}
                                        >
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography
                                                    variant="body2"
                                                    sx={{ fontWeight: 600, lineHeight: 1.3 }}
                                                    noWrap
                                                    title={title}
                                                >
                                                    {platformLabel}
                                                    {' · '}
                                                    {title}
                                                </Typography>
                                                <Stack
                                                    direction="row"
                                                    spacing={0.5}
                                                    flexWrap="wrap"
                                                    useFlexGap
                                                    sx={{ mt: 0.5 }}
                                                >
                                                    <Chip
                                                        size="small"
                                                        label={sessionOk ? 'Cookie OK' : 'Thiếu cookie'}
                                                        color={sessionOk ? 'success' : 'warning'}
                                                        variant="outlined"
                                                    />
                                                    {account.url ? (
                                                        <Chip size="small" label="Có URL" variant="outlined" />
                                                    ) : (
                                                        <Chip size="small" label="Thiếu URL" variant="outlined" />
                                                    )}
                                                    {!isFacebook && !isTikTok ? (
                                                        <Chip size="small" label="Sắp hỗ trợ" variant="outlined" />
                                                    ) : null}
                                                </Stack>
                                            </Box>
                                            <LoadingButton
                                                size="small"
                                                variant="contained"
                                                color="primary"
                                                disabled={!canPost}
                                                onClick={() => {
                                                    void state.handlePostSocial(account.index);
                                                }}
                                                sx={{
                                                    ...workflowActionButtonSx,
                                                    flexShrink: 0,
                                                    minWidth: 88,
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {isFacebook ? 'Đăng Reels' : 'Đăng'}
                                            </LoadingButton>
                                        </Box>
                                    );
                                })}
                            </Stack>
                        )}
                    </Box>
                </WorkflowSection>
            </Stack>
        </Box>
    );
}
