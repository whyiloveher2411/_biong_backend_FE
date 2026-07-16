import React from 'react';
import {
    Alert,
    Box,
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
    Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ErrorIcon from '@mui/icons-material/Error';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import Button from 'components/atoms/Button';
import LoadingButton from 'components/atoms/LoadingButton';
import {
    FULL_AUTO_PIPELINE_STEP_LABELS,
    FULL_AUTO_PIPELINE_STEP_ORDER,
    type FullAutoPipelineStepKey,
} from './agentVideoApi';
import { formatTtsChain, phaseLabel, platformLabel, visualStyleLabel } from './agentVideoUi';
import { formatOmnivoiceVoiceDesignVi } from './omnivoiceVoiceDesignLabels';
import { useAgentVideoOpenGeminiScriptActions } from './agentVideoOpenGeminiScript';
import type { useAgentVideoContent } from './useAgentVideoContent';

type AgentVideoState = ReturnType<typeof useAgentVideoContent>;

type Props = {
    state: AgentVideoState;
};

type StatusTone = 'default' | 'success' | 'info' | 'warning' | 'error';

/** Sidebar 300px — theme Button có whiteSpace: nowrap nên cần cho phép wrap. */
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

function pipelineStepLabel(step: string): string {
    if (step in FULL_AUTO_PIPELINE_STEP_LABELS) {
        return FULL_AUTO_PIPELINE_STEP_LABELS[step as FullAutoPipelineStepKey];
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
            });
        } finally {
            setOpeningImproveScriptGemini(false);
        }
    };

    const chainDisplay = state.ttsChain.length > 0
        ? formatTtsChain(state.ttsChain)
        : state.chainLabel;

    return (
        <Box
            sx={{
                height: '100%',
                overflow: 'auto',
                p: 2,
            }}
        >
            <Stack spacing={2}>
                <Typography variant="subtitle2" fontWeight={600}>
                    Workflow HyperFrames
                </Typography>

                {state.ttsFailed && state.lastError ? (
                    <Alert severity="error">
                        {state.lastError}
                    </Alert>
                ) : null}

                <Box>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        Thông tin chung
                    </Typography>
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
                    <MetaRow
                        label="Giọng OmniVoice"
                        value={
                            state.omnivoiceVoiceMode === 'design'
                                ? `Thiết kế giọng · ${formatOmnivoiceVoiceDesignVi(state.omnivoiceVoiceDesign || '') || '—'}`
                                : (state.omnivoiceVoice || 'minh_quân')
                        }
                    />
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
                </Box>

                {state.fullAutoPipeline && (state.fullAutoPipeline.enabled || state.fullAutoPipeline.status !== 'idle') ? (
                    <>
                        <Divider />
                        <Box>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                Pipeline A→Z
                            </Typography>
                            <MetaRow label="Status" status={state.fullAutoPipeline.status || 'idle'} />
                            <MetaRow
                                label="Bước hiện tại"
                                status={
                                    state.fullAutoPipeline.current_step
                                        ? pipelineStepLabel(state.fullAutoPipeline.current_step)
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
                            {FULL_AUTO_PIPELINE_STEP_ORDER.map((step) => {
                                const info = state.fullAutoPipeline?.steps?.[step];
                                return (
                                    <MetaRow
                                        key={step}
                                        label={pipelineStepLabel(step)}
                                        status={String(info?.status || 'pending')}
                                    />
                                );
                            })}
                            {state.fullAutoPipeline.steps
                                ? Object.entries(state.fullAutoPipeline.steps)
                                    .filter(([step]) => !(FULL_AUTO_PIPELINE_STEP_ORDER as readonly string[]).includes(step))
                                    .map(([step, info]) => (
                                        <MetaRow
                                            key={step}
                                            label={pipelineStepLabel(step)}
                                            status={String(info?.status || 'pending')}
                                        />
                                    ))
                                : null}
                            {state.fullAutoPipeline.last_error?.message ? (
                                <Alert severity="error" sx={{ mt: 1, py: 0.5 }}>
                                    {state.fullAutoPipeline.last_error.message}
                                </Alert>
                            ) : null}
                        </Box>
                    </>
                ) : null}

                {state.agentVideoSummary ? (
                    <>
                        <Divider />
                        <Box>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                Metadata script
                            </Typography>
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
                        </Box>
                    </>
                ) : null}

                <Divider />

                <Box>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        Phong cách visual
                    </Typography>
                    <FormControl fullWidth size="small" disabled={state.savingVisualStyle}>
                        <InputLabel id="visual-style-select-label">Phong cách</InputLabel>
                        <Select
                            labelId="visual-style-select-label"
                            label="Phong cách"
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
                    <MetaRow
                        label="Phong cách render"
                        value={
                            state.visualStyleResolved
                                ? `${visualStyleLabel(state.visualStyleResolved, state.visualStyleCatalog)}${state.visualStyleSource ? ` (${state.visualStyleSource})` : ''}`
                                : '—'
                        }
                    />
                </Box>

                <Divider />

                <Stack spacing={1}>
                    <Typography variant="caption" color="text.secondary">
                        Hành động
                    </Typography>

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
                            <Typography variant="caption" color="text.secondary" sx={{ pt: 0.5 }}>
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
                            <Button
                                size="small"
                                variant="text"
                                color="inherit"
                                fullWidth
                                sx={workflowActionButtonSx}
                                startIcon={<ContentCopyIcon />}
                                onClick={() => { void state.handleCopyPrompt('1'); }}
                            >
                                Copy prompt agent Cursor
                            </Button>
                        </>
                    ) : null}

                    {state.renderMode === 'creative' && state.readyForPhase2 && state.scriptApproved && !state.hasAgentVideo && (
                        <>
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
                            <Button
                                size="small"
                                variant="outlined"
                                color="primary"
                                fullWidth
                                sx={workflowActionButtonSx}
                                startIcon={<ContentCopyIcon />}
                                onClick={() => { void state.handleCopyPrompt('2'); }}
                            >
                                Copy prompt bước 2
                            </Button>
                        </>
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

                <Divider />

                <Box>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        Đăng social
                    </Typography>
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
                </Box>

                {state.selectedPlatforms.length > 0 ? (
                    <Box>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                            Nền tảng đang chọn
                        </Typography>
                        <Typography variant="caption">
                            {state.selectedPlatforms.map(platformLabel).join(', ')}
                        </Typography>
                    </Box>
                ) : null}
            </Stack>
        </Box>
    );
}
