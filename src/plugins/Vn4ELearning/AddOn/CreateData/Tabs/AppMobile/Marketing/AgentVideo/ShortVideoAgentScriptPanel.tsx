import React from 'react';
import {
    Alert,
    Avatar,
    Box,
    Chip,
    Collapse,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SaveIcon from '@mui/icons-material/Save';
import ReplayIcon from '@mui/icons-material/Replay';
import RefreshIcon from '@mui/icons-material/Refresh';
import TuneIcon from '@mui/icons-material/Tune';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import GraphicEqOutlinedIcon from '@mui/icons-material/GraphicEqOutlined';
import RecordVoiceOverOutlinedIcon from '@mui/icons-material/RecordVoiceOverOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Button from 'components/atoms/Button';
import LoadingButton from 'components/atoms/LoadingButton';
import { isKaraokeSyncPoor } from './agentVideoApi';
import {
    resolveOmnivoiceDisplaySummary,
    whisperStatusLabel,
} from './agentVideoUi';
import { useAgentVideoOpenGeminiScriptActions } from './agentVideoOpenGeminiScript';
import ShortVideoAgentAudioSettingsDrawer from './ShortVideoAgentAudioSettingsDrawer';
import ShortVideoAgentWhisperCompareDrawer from './ShortVideoAgentWhisperCompareDrawer';
import ShortVideoAgentWhisperCompareSummary from './ShortVideoAgentWhisperCompareSummary';
import type { useAgentVideoContent } from './useAgentVideoContent';

type AgentVideoState = ReturnType<typeof useAgentVideoContent>;

type Props = {
    state: AgentVideoState;
};

type PipelineStepState = 'idle' | 'active' | 'done' | 'warning' | 'locked';

type SectionTheme = {
    accent: string;
    border: string;
    headerBg: string;
    surfaceLight: string;
    surfaceDark: string;
    innerLight: string;
    innerDark: string;
};

const SECTION_THEMES = {
    script: {
        accent: '#1565c0',
        border: '#64b5f6',
        headerBg: '#1565c0',
        surfaceLight: '#e3f2fd',
        surfaceDark: 'rgba(21, 101, 192, 0.2)',
        innerLight: '#ffffff',
        innerDark: 'rgba(0, 0, 0, 0.22)',
    },
    audio: {
        accent: '#2e7d32',
        border: '#66bb6a',
        headerBg: '#2e7d32',
        surfaceLight: '#e8f5e9',
        surfaceDark: 'rgba(46, 125, 50, 0.2)',
        innerLight: '#ffffff',
        innerDark: 'rgba(0, 0, 0, 0.22)',
    },
    whisper: {
        accent: '#6a1b9a',
        border: '#ab47bc',
        headerBg: '#6a1b9a',
        surfaceLight: '#f3e5f5',
        surfaceDark: 'rgba(106, 27, 154, 0.22)',
        innerLight: '#ffffff',
        innerDark: 'rgba(0, 0, 0, 0.22)',
    },
} as const;

function sectionCardSx(theme: SectionTheme, muted = false) {
    return {
        border: '2px solid',
        borderColor: theme.border,
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: (t: { palette: { mode: string } }) => (
            t.palette.mode === 'dark' ? theme.surfaceDark : theme.surfaceLight
        ),
        opacity: muted ? 0.78 : 1,
        transition: 'opacity 0.15s ease',
        boxShadow: (t: { palette: { mode: string } }) => (
            t.palette.mode === 'dark'
                ? 'none'
                : `0 1px 3px ${theme.accent}22`
        ),
    } as const;
}

function sectionHeaderSx(theme: SectionTheme) {
    return {
        px: 1.5,
        py: 1.25,
        bgcolor: theme.headerBg,
        color: '#fff',
    } as const;
}

function subPanelSx(theme: SectionTheme) {
    return {
        p: 1.5,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: (t: { palette: { mode: string } }) => (
            t.palette.mode === 'dark' ? `${theme.border}55` : `${theme.border}99`
        ),
        bgcolor: (t: { palette: { mode: string } }) => (
            t.palette.mode === 'dark' ? theme.innerDark : theme.innerLight
        ),
    } as const;
}

function SectionShell({
    step,
    title,
    icon,
    theme,
    muted,
    trailing,
    children,
}: {
    step: number;
    title: string;
    icon: React.ReactNode;
    theme: SectionTheme;
    muted?: boolean;
    trailing?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <Box sx={sectionCardSx(theme, muted)}>
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={1}
                sx={sectionHeaderSx(theme)}
            >
                <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', color: '#fff' }}>
                        {icon}
                    </Box>
                    <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ color: '#fff' }}>
                        {step}. {title}
                    </Typography>
                </Stack>
                {trailing}
            </Stack>
            <Box sx={{ p: 1.5 }}>
                {children}
            </Box>
        </Box>
    );
}

function resolveScriptPipelineState(state: AgentVideoState): {
    step: PipelineStepState;
    label: string;
    chip: React.ReactNode;
} {
    if (!state.hasScript) {
        return {
            step: 'active',
            label: 'Chưa có script',
            chip: <Chip label="Chưa có script" size="small" variant="outlined" />,
        };
    }
    if (state.scriptDirty) {
        return {
            step: 'warning',
            label: 'Chưa lưu',
            chip: <Chip label="Chưa lưu" size="small" color="warning" variant="outlined" />,
        };
    }
    if (state.scriptApproved) {
        return {
            step: 'done',
            label: 'Đã duyệt',
            chip: <Chip label="Đã duyệt" size="small" color="success" variant="outlined" />,
        };
    }
    return {
        step: 'active',
        label: 'Chờ duyệt',
        chip: <Chip label="Chờ duyệt" size="small" color="info" variant="outlined" />,
    };
}

function resolveAudioPipelineState(state: AgentVideoState): { step: PipelineStepState; label: string } {
    if (!state.scriptApproved && !state.hasAudio) {
        return { step: 'locked', label: 'Cần duyệt script' };
    }
    if (state.ttsPending) {
        return { step: 'active', label: 'Đang sinh TTS…' };
    }
    if (state.hasAudio) {
        return { step: 'done', label: `MP3 · ${state.audioDurationSec?.toFixed(1) ?? '?'}s` };
    }
    return { step: 'active', label: 'Chờ MP3' };
}

function resolveWhisperPipelineState(state: AgentVideoState): { step: PipelineStepState; label: string } {
    if (!state.scriptApproved) {
        return { step: 'locked', label: 'Khóa' };
    }
    if (!state.hasAudio) {
        return { step: 'locked', label: 'Cần MP3' };
    }
    if (state.whisperStatus === 'processing' || state.transcribingWhisper) {
        return { step: 'active', label: 'Đang chạy…' };
    }
    if (state.whisperStatus === 'completed' && !state.whisperStale) {
        return { step: 'done', label: 'Sẵn sàng' };
    }
    if (state.whisperStatus === 'failed') {
        return { step: 'warning', label: 'Lỗi' };
    }
    return { step: 'active', label: 'Chưa chạy' };
}

export default function ShortVideoAgentScriptPanel({ state }: Props) {
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const scriptFieldRef = React.useRef<HTMLInputElement | null>(null);
    const [audioSettingsOpen, setAudioSettingsOpen] = React.useState(false);
    const [guideOpen, setGuideOpen] = React.useState(false);
    const { openCreateScriptGemini, openImproveScriptGemini } = useAgentVideoOpenGeminiScriptActions();
    const [openingCreateScriptGemini, setOpeningCreateScriptGemini] = React.useState(false);
    const [openingImproveScriptGemini, setOpeningImproveScriptGemini] = React.useState(false);

    const voiceSummary = resolveOmnivoiceDisplaySummary({
        voiceKey: state.omnivoiceVoice || 'minh_quân',
        voiceMode: state.omnivoiceVoiceMode,
        voiceDesign: state.omnivoiceVoiceDesign,
        catalog: state.omnivoiceVoiceCatalog,
    });

    const scriptPipeline = resolveScriptPipelineState(state);
    const audioPipeline = resolveAudioPipelineState(state);
    const whisperPipeline = resolveWhisperPipelineState(state);

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

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) {
            return;
        }
        void state.handleUploadMp3(file);
    };

    const handleCloseAudioSettings = () => {
        state.stopVoicePreview();
        setAudioSettingsOpen(false);
    };

    return (
        <Box sx={{ height: '100%', overflow: 'auto', p: 2 }}>
            <Stack spacing={2}>
                <SectionShell
                    step={1}
                    title="Kịch bản"
                    icon={<DescriptionOutlinedIcon fontSize="small" />}
                    theme={SECTION_THEMES.script}
                    trailing={state.hasScript ? (
                        <Box
                            sx={{
                                '& .MuiChip-root': {
                                    bgcolor: 'rgba(255,255,255,0.95)',
                                    fontWeight: 600,
                                },
                            }}
                        >
                            {scriptPipeline.chip}
                        </Box>
                    ) : null}
                >
                    <Stack spacing={1.25}>
                        <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            flexWrap="wrap"
                            useFlexGap
                            spacing={1}
                        >
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <LoadingButton
                                    size="small"
                                    variant="contained"
                                    loading={openingCreateScriptGemini}
                                    startIcon={<OpenInNewIcon />}
                                    onClick={() => { void handleOpenCreateScriptGemini(); }}
                                >
                                    Gemini sinh script
                                </LoadingButton>
                                <LoadingButton
                                    size="small"
                                    variant="outlined"
                                    startIcon={<OpenInNewIcon />}
                                    disabled={!state.hasScript}
                                    loading={openingImproveScriptGemini}
                                    onClick={() => { void handleOpenImproveScriptGemini(); }}
                                >
                                    Cải thiện
                                </LoadingButton>
                                <Button
                                    size="small"
                                    variant="text"
                                    disabled={!state.hasScript}
                                    onClick={() => { void state.handleCopyScript(); }}
                                >
                                    Copy
                                </Button>
                            </Stack>
                            <Button
                                size="small"
                                variant="text"
                                color="inherit"
                                endIcon={(
                                    <ExpandMoreIcon
                                        sx={{
                                            transform: guideOpen ? 'rotate(180deg)' : 'none',
                                            transition: 'transform 0.2s',
                                        }}
                                    />
                                )}
                                onClick={() => setGuideOpen((prev) => !prev)}
                                sx={{ color: 'text.secondary', minWidth: 'auto' }}
                            >
                                Hướng dẫn
                            </Button>
                        </Stack>

                        <Collapse in={guideOpen}>
                            <Alert severity="info" sx={{ py: 0.5 }}>
                                Mở Gemini → copy script → dán vào ô dưới → Lưu → Duyệt để queue TTS.
                            </Alert>
                        </Collapse>

                        <TextField
                            inputRef={scriptFieldRef}
                            multiline
                            minRows={6}
                            maxRows={14}
                            fullWidth
                            size="small"
                            placeholder="Dán audio script từ chatbot vào đây…"
                            value={state.audioScript}
                            onChange={(e) => state.setAudioScript(e.target.value)}
                            sx={{
                                '& .MuiInputBase-root': {
                                    fontSize: 13,
                                    lineHeight: 1.55,
                                },
                            }}
                        />

                        {!state.hasScript ? (
                            <Typography variant="caption" color="text.secondary">
                                Chưa có nội dung — bấm Gemini sinh script để bắt đầu.
                            </Typography>
                        ) : (
                            <Stack
                                direction="row"
                                spacing={1}
                                flexWrap="wrap"
                                useFlexGap
                                sx={{
                                    pt: 0.5,
                                    borderTop: '1px solid',
                                    borderColor: 'divider',
                                }}
                            >
                                <LoadingButton
                                    size="small"
                                    loading={state.savingScript}
                                    variant="outlined"
                                    startIcon={<SaveIcon />}
                                    onClick={() => { void state.handleSaveScript(); }}
                                >
                                    Lưu script
                                </LoadingButton>
                                <LoadingButton
                                    size="small"
                                    loading={state.approvingScript}
                                    variant="contained"
                                    color="success"
                                    disabled={state.scriptDirty || !state.hasScript}
                                    startIcon={<CheckCircleOutlineIcon />}
                                    onClick={() => { void state.handleApproveScript(); }}
                                >
                                    {state.scriptDirty
                                        ? 'Lưu trước khi duyệt'
                                        : state.scriptApproved
                                            ? 'Duyệt lại & queue TTS'
                                            : 'Duyệt script'}
                                </LoadingButton>
                            </Stack>
                        )}
                    </Stack>
                </SectionShell>

                <SectionShell
                    step={2}
                    title="Audio"
                    icon={<GraphicEqOutlinedIcon fontSize="small" />}
                    theme={SECTION_THEMES.audio}
                    muted={audioPipeline.step === 'locked'}
                    trailing={(
                        <Chip
                            size="small"
                            label={audioPipeline.label}
                            sx={{
                                bgcolor: 'rgba(255,255,255,0.95)',
                                color: audioPipeline.step === 'done' ? 'success.dark' : 'text.primary',
                                fontWeight: 600,
                            }}
                        />
                    )}
                >
                    <Stack spacing={1.25}>
                        <Box sx={subPanelSx(SECTION_THEMES.audio)}>
                            <Stack
                                direction="row"
                                alignItems="center"
                                justifyContent="space-between"
                                spacing={1}
                                flexWrap="wrap"
                                useFlexGap
                                sx={{ mb: 1 }}
                            >
                                <Typography variant="caption" fontWeight={700} color="text.secondary">
                                    Cấu hình TTS
                                </Typography>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<TuneIcon />}
                                    onClick={() => setAudioSettingsOpen(true)}
                                >
                                    Cài đặt
                                </Button>
                            </Stack>
                            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                                <Chip
                                    size="small"
                                    label={state.agentTtsAuto ? 'TTS bật' : 'TTS tắt'}
                                    color={state.agentTtsAuto ? 'success' : 'default'}
                                    variant="outlined"
                                />
                                {state.agentTtsAuto ? (
                                    <Chip size="small" label={state.chainLabel} variant="outlined" />
                                ) : null}
                                <Chip
                                    size="small"
                                    avatar={(
                                        <Avatar
                                            sx={{
                                                width: 20,
                                                height: 20,
                                                fontSize: 9,
                                                fontWeight: 700,
                                                bgcolor: voiceSummary.avatarColor,
                                                color: '#fff',
                                            }}
                                        >
                                            {voiceSummary.initials}
                                        </Avatar>
                                    )}
                                    label={voiceSummary.displayName}
                                    variant="outlined"
                                />
                            </Stack>
                        </Box>

                        <Box sx={subPanelSx(SECTION_THEMES.audio)}>
                            <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" sx={{ mb: 1 }}>
                                File MP3
                            </Typography>
                            {state.hasAudio ? (
                                <Stack spacing={1}>
                                    <audio controls src={state.audioFileUrl} style={{ width: '100%', height: 36 }}>
                                        <track kind="captions" />
                                    </audio>
                                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                                        {state.audioDurationSec != null ? (
                                            <Typography variant="caption" color="text.secondary">
                                                {state.audioDurationSec.toFixed(1)}s
                                            </Typography>
                                        ) : null}
                                        {state.scriptApproved && !state.ttsPending ? (
                                            <LoadingButton
                                                size="small"
                                                variant="text"
                                                color="secondary"
                                                loading={state.regeneratingTts}
                                                startIcon={<ReplayIcon />}
                                                onClick={() => { void state.handleRegenerateTts(); }}
                                            >
                                                Tạo lại TTS
                                            </LoadingButton>
                                        ) : null}
                                    </Stack>
                                </Stack>
                            ) : (
                                <Alert severity={state.ttsPending ? 'info' : 'warning'} sx={{ py: 0.25 }}>
                                    {state.ttsPending
                                        ? 'CMS đang sinh MP3 — chờ vài phút.'
                                        : state.scriptApproved
                                            ? 'Chưa có MP3 — chờ TTS hoặc upload thủ công.'
                                            : 'Duyệt script trước để queue TTS.'}
                                </Alert>
                            )}

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="audio/mpeg,.mp3"
                                hidden
                                onChange={handleFileChange}
                            />
                            <LoadingButton
                                size="small"
                                loading={state.uploading}
                                variant="contained"
                                disabled={state.hasScript && !state.scriptApproved && !state.hasAudio}
                                startIcon={<UploadFileIcon />}
                                sx={{ mt: 1 }}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {state.hasAudio ? 'Upload lại MP3' : 'Upload MP3'}
                            </LoadingButton>
                        </Box>
                    </Stack>
                </SectionShell>

                <SectionShell
                    step={3}
                    title="Whisper"
                    icon={state.scriptApproved ? <RecordVoiceOverOutlinedIcon fontSize="small" /> : <LockOutlinedIcon fontSize="small" />}
                    theme={SECTION_THEMES.whisper}
                    muted={whisperPipeline.step === 'locked'}
                    trailing={(
                        <Chip
                            size="small"
                            label={whisperStatusLabel(state.whisperStatus)}
                            sx={{
                                bgcolor: 'rgba(255,255,255,0.95)',
                                color: `${SECTION_THEMES.whisper.headerBg}`,
                                fontWeight: 600,
                            }}
                        />
                    )}
                >
                    {!state.scriptApproved ? (
                        <Alert severity="info" icon={<LockOutlinedIcon fontSize="small" />}>
                            Duyệt script trước — Whisper chạy tự động sau khi có MP3.
                        </Alert>
                    ) : (
                        <Stack spacing={1}>
                            <Typography variant="caption" color="text.secondary">
                                Timing karaoke & chia beat — tự chạy khi audio mới sẵn sàng.
                            </Typography>
                            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
                                {state.whisperStale && state.whisperStatus === 'completed' ? (
                                    <Chip size="small" label="Cần chạy lại" color="warning" variant="outlined" />
                                ) : null}
                                {isKaraokeSyncPoor(state.composition?.caption_sync) ? (
                                    <Chip size="small" label="Karaoke có thể lệch" color="warning" />
                                ) : null}
                                {(state.transcribingWhisper || state.whisperStatus === 'processing') ? (
                                    <Typography variant="caption" color="text.secondary">
                                        Đang transcribe trên server…
                                    </Typography>
                                ) : null}
                                {state.hasAudio && state.whisperStatus !== 'processing' && !state.transcribingWhisper ? (
                                    <LoadingButton
                                        size="small"
                                        variant="outlined"
                                        color={state.whisperStatus === 'failed' ? 'error' : 'primary'}
                                        loading={state.transcribingWhisper}
                                        startIcon={<RefreshIcon />}
                                        onClick={() => { void state.runWhisperTranscribe({ force: true }); }}
                                    >
                                        {state.whisperStatus === 'failed' ? 'Chạy lại' : 'Whisper lại'}
                                    </LoadingButton>
                                ) : null}
                            </Stack>
                            {!state.hasAudio ? (
                                <Alert severity="info">
                                    Cần MP3 ở bước 2 trước.
                                </Alert>
                            ) : null}
                            {state.whisperError ? (
                                <Alert severity="error">{state.whisperError}</Alert>
                            ) : null}
                            {isKaraokeSyncPoor(state.composition?.caption_sync) ? (
                                <Alert severity="warning">
                                    Karaoke lệch — chạy Whisper lại rồi ghép lại video.
                                </Alert>
                            ) : null}
                            {state.whisperStatus === 'completed' && state.whisperWords.length > 0 ? (
                                <ShortVideoAgentWhisperCompareSummary
                                    audioScript={state.audioScript}
                                    alignResult={state.whisperScriptAlign}
                                    whisperWords={state.whisperWords}
                                    issuesOnly={state.whisperCompareIssuesOnly}
                                    onToggleIssuesOnly={() => {
                                        state.setWhisperCompareIssuesOnly((prev) => !prev);
                                    }}
                                    onOpenCompare={state.openWhisperCompare}
                                    dimmed={state.whisperStale}
                                />
                            ) : null}
                        </Stack>
                    )}
                </SectionShell>
            </Stack>

            <ShortVideoAgentWhisperCompareDrawer
                open={state.compareDrawerOpen}
                onClose={() => {
                    state.setCompareDrawerOpen(false);
                    state.setCompareFocusIndex(null);
                }}
                audioScript={state.audioScript}
                alignResult={state.whisperScriptAlign}
                whisperWords={state.whisperWords}
                audioFileUrl={state.audioFileUrl}
                focusIndex={state.compareFocusIndex}
                filter={state.compareFilter}
                onFilterChange={state.setCompareFilter}
                onFocusScript={() => {
                    scriptFieldRef.current?.focus();
                    scriptFieldRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                onSave={async () => { await state.saveCaptionAlignments(); }}
                saving={state.savingCaptionAlignments}
                hasUnsavedChanges={state.hasCaptionOverrideChanges}
            />

            <ShortVideoAgentAudioSettingsDrawer
                open={audioSettingsOpen}
                onClose={handleCloseAudioSettings}
                agentTtsAuto={state.agentTtsAuto}
                savingTtsMode={state.savingTtsMode}
                selectedPlatforms={state.selectedPlatforms}
                chainLabel={state.chainLabel}
                onTtsAutoChange={state.handleTtsAutoChange}
                onPlatformToggle={state.handlePlatformToggle}
                catalog={state.omnivoiceVoiceCatalog}
                selectedVoice={state.omnivoiceVoice || 'minh_quân'}
                selectedVoiceMode={state.omnivoiceVoiceMode}
                selectedVoiceDesign={state.omnivoiceVoiceDesign}
                designTokenGroups={state.omnivoiceVoiceDesignTokens}
                savingVoice={state.savingOmnivoiceVoice}
                regeneratingTts={state.regeneratingTts}
                previewingDesign={state.previewingVoiceDesign}
                playingUrl={state.playingVoiceUrl}
                onSelectClone={async (voiceKey) => {
                    if (
                        voiceKey === (state.omnivoiceVoice || 'minh_quân')
                        && state.omnivoiceVoiceMode === 'clone'
                    ) {
                        return false;
                    }
                    return state.handleOmnivoiceVoiceChange({
                        mode: 'clone',
                        voice: voiceKey,
                    });
                }}
                onApplyDesign={(design) => state.handleOmnivoiceVoiceChange({
                    mode: 'design',
                    design,
                })}
                onPlayPreview={state.handleOmnivoiceVoicePreview}
                onPlayDesignPreview={state.handleOmnivoiceVoiceDesignPreview}
            />
        </Box>
    );
}
