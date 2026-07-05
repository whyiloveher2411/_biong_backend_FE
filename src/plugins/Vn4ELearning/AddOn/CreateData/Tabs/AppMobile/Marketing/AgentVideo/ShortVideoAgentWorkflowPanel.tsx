import React from 'react';
import {
    Alert,
    Box,
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
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import Button from 'components/atoms/Button';
import LoadingButton from 'components/atoms/LoadingButton';
import { formatTtsChain, hfThemeLabel, phaseLabel, platformLabel } from './agentVideoUi';
import { useAgentVideoOpenGeminiScriptActions } from './agentVideoOpenGeminiScript';
import type { useAgentVideoContent } from './useAgentVideoContent';

type AgentVideoState = ReturnType<typeof useAgentVideoContent>;

type Props = {
    state: AgentVideoState;
};

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

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, py: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
                {label}
            </Typography>
            <Typography variant="caption" fontWeight={500} sx={{ textAlign: 'right' }}>
                {value}
            </Typography>
        </Box>
    );
}

export default function ShortVideoAgentWorkflowPanel({ state }: Props) {
    const { openCreateScriptGemini, openImproveScriptGemini } = useAgentVideoOpenGeminiScriptActions();
    const [openingCreateScriptGemini, setOpeningCreateScriptGemini] = React.useState(false);
    const [openingImproveScriptGemini, setOpeningImproveScriptGemini] = React.useState(false);

    const handleOpenCreateScriptGemini = async () => {
        setOpeningCreateScriptGemini(true);
        try {
            await openCreateScriptGemini({
                shortVideoId: state.shortVideoId,
                title: state.title,
                audioScript: state.audioScript,
                hasScript: state.hasScript,
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
                        Trạng thái
                    </Typography>
                    <MetaRow label="Phase" value={phaseLabel(state.workflowPhase)} />
                    <MetaRow
                        label="Workflow mode"
                        value={state.workflowMode === 'auto_tts_full' ? 'TTS tự động' : '2 bước thủ công'}
                    />
                    <MetaRow label="TTS status" value={state.agentTtsStatus || '—'} />
                    <MetaRow
                        label="TTS job"
                        value={state.agentTtsJobId != null ? `#${state.agentTtsJobId}` : '—'}
                    />
                    <MetaRow label="TTS chain" value={chainDisplay} />
                    <MetaRow label="Video status" value={state.agentVideoStatus || 'none'} />
                    <MetaRow
                        label="Render mode"
                        value={state.renderMode === 'import_html' ? 'HTML chatbot' : 'Agent sáng tạo'}
                    />
                    {state.renderMode === 'import_html' ? (
                        <>
                            <MetaRow label="Whisper" value={state.whisperStatus || 'none'} />
                            <MetaRow
                                label="Beat map"
                                value={state.beatMapReady ? `${state.beatMap?.sections.length ?? 0} beat` : 'Chưa chia'}
                            />
                            <MetaRow
                                label="HTML beats"
                                value={`${state.beatsHtmlCompleted}/${state.beatsHtmlTotal || 0}`}
                            />
                            <MetaRow
                                label="HTML chatbot"
                                value={state.importHtmlReady ? 'Sẵn sàng ghép' : 'Chưa đủ'}
                            />
                        </>
                    ) : null}
                    <MetaRow
                        label="Rendered at"
                        value={state.agentVideoRenderedAt || '—'}
                    />
                </Box>

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
                        Theme HyperFrames
                    </Typography>
                    <FormControl fullWidth size="small" disabled={state.savingHfTheme}>
                        <InputLabel id="hf-theme-select-label">Theme</InputLabel>
                        <Select
                            labelId="hf-theme-select-label"
                            label="Theme"
                            value={state.hfTheme || 'auto'}
                            onChange={(e) => { void state.handleHfThemeChange(String(e.target.value)); }}
                        >
                            {(state.hfThemeCatalog.length > 0
                                ? state.hfThemeCatalog
                                : [{ key: 'auto', label: 'Tự động (agent)' }]
                            ).map((item) => (
                                <MenuItem key={item.key} value={item.key}>
                                    {item.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <MetaRow
                        label="Theme render"
                        value={
                            state.hfThemeResolved
                                ? `${hfThemeLabel(state.hfThemeResolved, state.hfThemeCatalog)}${state.hfThemeSource ? ` (${state.hfThemeSource})` : ''}`
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
                        <LoadingButton
                            size="small"
                            variant="contained"
                            color="primary"
                            fullWidth
                            sx={workflowActionButtonSx}
                            loading={openingCreateScriptGemini}
                            startIcon={<OpenInNewIcon />}
                            onClick={() => { void handleOpenCreateScriptGemini(); }}
                        >
                            Mở Gemini sinh script
                        </LoadingButton>
                    )}

                    {state.hasScript && !state.scriptApproved && (
                        <LoadingButton
                            size="small"
                            variant="outlined"
                            color="primary"
                            fullWidth
                            sx={workflowActionButtonSx}
                            loading={openingImproveScriptGemini}
                            startIcon={<OpenInNewIcon />}
                            onClick={() => { void handleOpenImproveScriptGemini(); }}
                        >
                            Mở Gemini cải thiện script
                        </LoadingButton>
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

                    {state.renderMode === 'import_html' && state.scriptApproved && state.hasAudio && (
                        <>
                            <Typography variant="caption" color="text.secondary" sx={{ pt: 0.5 }}>
                                {state.beatsHtmlCompleted < state.beatsHtmlTotal
                                    ? `Agent sẽ sinh ${state.beatsHtmlTotal - state.beatsHtmlCompleted} beat HTML thiếu, rồi ghép video`
                                    : state.hasAgentVideo
                                        ? 'Đủ HTML — agent ghép lại rồi render video'
                                        : 'Đủ HTML — agent ghép và render video'}
                            </Typography>
                            <LoadingButton
                                size="small"
                                variant="contained"
                                color="secondary"
                                fullWidth
                                sx={workflowActionButtonSx}
                                loading={state.launchingImportHtmlFull}
                                disabled={
                                    !state.beatMapReady
                                    || state.whisperStatus !== 'completed'
                                    || state.agentVideoStatus === 'processing'
                                }
                                startIcon={<PlayArrowIcon />}
                                onClick={() => { void state.handleLaunchAgentImportHtmlFull(); }}
                            >
                                Tự động HTML beat + ghép video
                            </LoadingButton>
                            {!state.beatMapReady ? (
                                <Typography variant="caption" color="warning.main" display="block">
                                    Cần beat-map hợp lệ — chia beat trong panel HTML trước
                                </Typography>
                            ) : null}
                            {state.beatMapReady && state.whisperStatus !== 'completed' ? (
                                <Typography variant="caption" color="warning.main" display="block">
                                    Cần Whisper hoàn tất — chạy transcribe trong panel HTML trước
                                </Typography>
                            ) : null}
                            <Button
                                size="small"
                                variant="outlined"
                                color="primary"
                                fullWidth
                                sx={workflowActionButtonSx}
                                disabled={!state.importHtmlReady}
                                startIcon={<ContentCopyIcon />}
                                onClick={() => { void state.handleCopyPrompt('import_assemble'); }}
                            >
                                Copy prompt ghép
                            </Button>
                        </>
                    )}

                    {state.hasAgentVideo && (
                        <>
                            {state.renderMode === 'import_html' ? (
                                <Typography variant="caption" color="text.secondary" sx={{ pt: 0.5 }}>
                                    Render creative mới (phase 2 — không dùng HTML chatbot)
                                </Typography>
                            ) : null}
                            <LoadingButton
                                size="small"
                                variant="contained"
                                color="primary"
                                fullWidth
                                sx={workflowActionButtonSx}
                                loading={state.launchingContinue}
                                disabled={state.agentVideoStatus === 'processing'}
                                startIcon={<PlayArrowIcon />}
                                onClick={() => { void state.handleLaunchAgentContinue(); }}
                            >
                                Chạy agent tiếp tục
                            </LoadingButton>
                            <Button
                                size="small"
                                variant="outlined"
                                color="primary"
                                fullWidth
                                sx={workflowActionButtonSx}
                                startIcon={<ContentCopyIcon />}
                                onClick={() => { void state.handleCopyPrompt('continue'); }}
                            >
                                Copy prompt tiếp tục
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
