import React from 'react';
import {
    Alert,
    Avatar,
    Box,
    ButtonGroup,
    Chip,
    Collapse,
    Divider,
    Stack,
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
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import CheckIcon from '@mui/icons-material/Check';
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
import ShortVideoAgentPhoneticQuickMenu from './ShortVideoAgentPhoneticQuickMenu';
import ShortVideoAgentPhoneticDictDrawer from './ShortVideoAgentPhoneticDictDrawer';
import ShortVideoAgentPhoneticScriptField from './ShortVideoAgentPhoneticScriptField';
import {
    buildDomSelectionAnchor,
    buildPhoneticAnchorFromTerm,
    buildSelectionAnchor,
    clearScriptTextSelection,
    findPhoneticDictEntry,
    type ScriptTextSelectionAnchor,
} from './agentVideoPhoneticDictUi';
import type { useAgentVideoContent } from './useAgentVideoContent';
import {
    SECTION_THEMES,
    SectionShell,
    subPanelSx,
} from './ShortVideoAgentSectionShell';

type AgentVideoState = ReturnType<typeof useAgentVideoContent>;

type Props = {
    state: AgentVideoState;
};

type PipelineStepState = 'idle' | 'active' | 'done' | 'warning' | 'locked';

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
    const scriptFieldRef = React.useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
    const phoneticZoneRef = React.useRef<HTMLDivElement | null>(null);
    const [audioSettingsOpen, setAudioSettingsOpen] = React.useState(false);
    const [guideOpen, setGuideOpen] = React.useState(false);
    const { openCreateScriptGemini, openImproveScriptGemini } = useAgentVideoOpenGeminiScriptActions();
    const [openingCreateScriptGemini, setOpeningCreateScriptGemini] = React.useState(false);
    const [openingImproveScriptGemini, setOpeningImproveScriptGemini] = React.useState(false);
    const [selectionAnchor, setSelectionAnchor] = React.useState<ScriptTextSelectionAnchor | null>(null);
    const [phoneticDrawerOpen, setPhoneticDrawerOpen] = React.useState(false);
    const [phoneticDrawerTerm, setPhoneticDrawerTerm] = React.useState('');
    const [scriptEditMode, setScriptEditMode] = React.useState(false);
    const lastPointerRef = React.useRef({ clientX: 0, clientY: 0 });

    const existingPhoneticEntry = React.useMemo(
        () => findPhoneticDictEntry(state.ttsPhoneticDict, phoneticDrawerTerm),
        [phoneticDrawerTerm, state.ttsPhoneticDict],
    );
    const quickMenuIsEdit = React.useMemo(
        () => Boolean(selectionAnchor && findPhoneticDictEntry(state.ttsPhoneticDict, selectionAnchor.text)),
        [selectionAnchor, state.ttsPhoneticDict],
    );

    const closePhoneticQuickMenu = React.useCallback(() => {
        setSelectionAnchor(null);
        clearScriptTextSelection(scriptFieldRef.current);
    }, []);

    const toggleScriptEditMode = React.useCallback(() => {
        setScriptEditMode((prev) => {
            const next = !prev;
            setSelectionAnchor(null);
            clearScriptTextSelection(scriptFieldRef.current);
            if (next) {
                window.setTimeout(() => {
                    scriptFieldRef.current?.focus();
                }, 0);
            }
            return next;
        });
    }, []);

    /** Selection từ box xem kịch bản — chỉ khi không ở chế độ sửa */
    const handleScriptTextSelection = React.useCallback((payload: {
        text: string;
        clientX: number;
        clientY: number;
    }) => {
        if (scriptEditMode) {
            setSelectionAnchor(null);
            return;
        }
        lastPointerRef.current = {
            clientX: payload.clientX,
            clientY: payload.clientY,
        };
        const term = payload.text.trim();
        if (!term) {
            setSelectionAnchor(null);
            return;
        }
        setSelectionAnchor({
            text: term,
            left: payload.clientX,
            top: payload.clientY,
        });
    }, [scriptEditMode]);

    const refreshScriptSelectionMenu = React.useCallback(() => {
        if (scriptEditMode) {
            setSelectionAnchor(null);
            return;
        }

        const fromField = scriptFieldRef.current
            ? buildSelectionAnchor(scriptFieldRef.current, lastPointerRef.current)
            : null;
        if (fromField) {
            setSelectionAnchor(fromField);
            return;
        }

        const active = typeof document !== 'undefined' ? document.activeElement : null;
        const scriptFocused = Boolean(
            scriptFieldRef.current
            && active
            && (active === scriptFieldRef.current || scriptFieldRef.current.contains(active as Node)),
        );
        if (scriptFocused) {
            setSelectionAnchor(null);
            return;
        }

        const fromDom = buildDomSelectionAnchor(phoneticZoneRef.current, lastPointerRef.current);
        setSelectionAnchor(fromDom);
    }, [scriptEditMode]);

    const handleScriptPointerDown = (event: React.MouseEvent<HTMLElement>) => {
        lastPointerRef.current = {
            clientX: event.clientX,
            clientY: event.clientY,
        };
    };

    const handleScriptPointerUp = (event: React.MouseEvent<HTMLElement>) => {
        lastPointerRef.current = {
            clientX: event.clientX,
            clientY: event.clientY,
        };
        // Bỏ qua nếu target nằm trong ô script — field tự emit onTextSelection
        const field = scriptFieldRef.current;
        const target = event.target as Node | null;
        if (field && target) {
            const fieldRoot = field.closest('.MuiFormControl-root') || field.parentElement;
            if (fieldRoot?.contains(target)) {
                return;
            }
        }
        window.requestAnimationFrame(() => {
            refreshScriptSelectionMenu();
        });
    };

    const handlePhoneticSelection = React.useCallback((payload: {
        text: string;
        clientX: number;
        clientY: number;
    }) => {
        lastPointerRef.current = {
            clientX: payload.clientX,
            clientY: payload.clientY,
        };
        const term = payload.text.trim();
        if (!term) {
            return;
        }

        // Đã có trong dict → mở thẳng drawer sửa
        if (findPhoneticDictEntry(state.ttsPhoneticDict, term)) {
            setSelectionAnchor(null);
            setPhoneticDrawerTerm(term);
            setPhoneticDrawerOpen(true);
            return;
        }

        // Chưa có → hiện menu tạo phiên âm
        const anchor = buildPhoneticAnchorFromTerm(term, payload);
        setSelectionAnchor(anchor);
    }, [state.ttsPhoneticDict]);

    const handleOpenPhoneticDrawer = React.useCallback((termFromMenu?: string) => {
        const term = String(termFromMenu || selectionAnchor?.text || phoneticDrawerTerm || '').trim();
        if (!term) {
            return;
        }
        setPhoneticDrawerTerm(term);
        setPhoneticDrawerOpen(true);
    }, [phoneticDrawerTerm, selectionAnchor?.text]);

    const handleClosePhoneticDrawer = () => {
        setPhoneticDrawerOpen(false);
    };

    const voiceSummary = resolveOmnivoiceDisplaySummary({
        voiceKey: state.omnivoiceVoice || 'minh_quân',
        voiceMode: state.omnivoiceVoiceMode,
        voiceDesign: state.omnivoiceVoiceDesign,
        catalog: state.omnivoiceVoiceCatalog,
    });

    const scriptPipeline = resolveScriptPipelineState(state);
    const audioPipeline = resolveAudioPipelineState(state);
    const whisperPipeline = resolveWhisperPipelineState(state);
    const geminiScriptStatus = String(state.geminiScriptStatus || 'none');
    const geminiScriptQueueActive = geminiScriptStatus === 'queued'
        || geminiScriptStatus === 'processing';
    const geminiScriptChipLabel = (() => {
        if (!geminiScriptQueueActive && geminiScriptStatus !== 'failed') {
            return '';
        }
        if (geminiScriptQueueActive) {
            return state.geminiScriptMode === 'improve' ? 'Queue cải thiện…' : 'Queue sinh…';
        }
        return 'Queue thất bại';
    })();

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
        <Box
            ref={phoneticZoneRef}
            onMouseDown={handleScriptPointerDown}
            onMouseUp={handleScriptPointerUp}
            sx={{ height: '100%', overflow: 'auto', p: 2 }}
        >
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
                            alignItems="flex-start"
                            justifyContent="space-between"
                            flexWrap="wrap"
                            useFlexGap
                            spacing={1.5}
                        >
                            <Stack
                                direction="row"
                                spacing={1.5}
                                flexWrap="wrap"
                                useFlexGap
                                alignItems="flex-end"
                            >
                                <Stack spacing={0.5}>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ lineHeight: 1.2, px: 0.25 }}
                                    >
                                        Sinh script
                                    </Typography>
                                    <ButtonGroup size="small" variant="outlined" color="primary">
                                        <LoadingButton
                                            loading={openingCreateScriptGemini}
                                            disabled={geminiScriptQueueActive}
                                            startIcon={<OpenInNewIcon />}
                                            onClick={() => { void handleOpenCreateScriptGemini(); }}
                                            sx={{
                                                whiteSpace: 'nowrap',
                                                bgcolor: 'primary.main',
                                                color: 'primary.contrastText',
                                                '&:hover': { bgcolor: 'primary.dark' },
                                                '&.Mui-disabled': {
                                                    bgcolor: 'action.disabledBackground',
                                                    color: 'action.disabled',
                                                },
                                            }}
                                        >
                                            Gemini
                                        </LoadingButton>
                                        <LoadingButton
                                            loading={
                                                state.openingCreateScriptGeminiHeadless
                                                || (
                                                    geminiScriptQueueActive
                                                    && state.geminiScriptMode !== 'improve'
                                                )
                                            }
                                            disabled={geminiScriptQueueActive}
                                            onClick={() => {
                                                void state.handleEnqueueCreateScriptGeminiHeadless();
                                            }}
                                            sx={{ whiteSpace: 'nowrap' }}
                                        >
                                            Queue
                                        </LoadingButton>
                                    </ButtonGroup>
                                </Stack>

                                <Divider
                                    orientation="vertical"
                                    flexItem
                                    sx={{ display: { xs: 'none', sm: 'block' }, my: 0.5 }}
                                />

                                <Stack spacing={0.5}>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ lineHeight: 1.2, px: 0.25 }}
                                    >
                                        Cải thiện
                                    </Typography>
                                    <ButtonGroup size="small" variant="outlined" color="primary">
                                        <LoadingButton
                                            disabled={!state.hasScript || geminiScriptQueueActive}
                                            loading={openingImproveScriptGemini}
                                            startIcon={<OpenInNewIcon />}
                                            onClick={() => { void handleOpenImproveScriptGemini(); }}
                                            sx={{ whiteSpace: 'nowrap' }}
                                        >
                                            Gemini
                                        </LoadingButton>
                                        <LoadingButton
                                            loading={
                                                state.openingImproveScriptGeminiHeadless
                                                || (
                                                    geminiScriptQueueActive
                                                    && state.geminiScriptMode === 'improve'
                                                )
                                            }
                                            disabled={!state.hasScript || geminiScriptQueueActive}
                                            onClick={() => {
                                                void state.handleEnqueueImproveScriptGeminiHeadless();
                                            }}
                                            sx={{ whiteSpace: 'nowrap' }}
                                        >
                                            Queue
                                        </LoadingButton>
                                    </ButtonGroup>
                                </Stack>

                                <Button
                                    size="small"
                                    variant="text"
                                    disabled={!state.hasScript}
                                    onClick={() => { void state.handleCopyScript(); }}
                                    sx={{ alignSelf: 'flex-end', mb: 0.15 }}
                                >
                                    Copy
                                </Button>

                                {geminiScriptChipLabel ? (
                                    <Chip
                                        size="small"
                                        label={geminiScriptChipLabel}
                                        color={geminiScriptStatus === 'failed' ? 'error' : 'info'}
                                        sx={{
                                            alignSelf: 'flex-end',
                                            mb: 0.25,
                                            height: 22,
                                            '& .MuiChip-label': { px: 0.75, fontSize: 11 },
                                        }}
                                    />
                                ) : null}
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
                                sx={{ color: 'text.secondary', minWidth: 'auto', mt: 0.5 }}
                            >
                                Hướng dẫn
                            </Button>
                        </Stack>

                        <Collapse in={guideOpen}>
                            <Alert severity="info" sx={{ py: 0.5 }}>
                                <strong>Gemini</strong>
                                {' '}
                                mở tab (extension) — copy rồi Lưu.
                                {' '}
                                <strong>Queue</strong>
                                {' '}
                                chạy Headless nền, tự lưu CMS (không tự duyệt).
                            </Alert>
                        </Collapse>

                        <Box>
                            <ShortVideoAgentPhoneticScriptField
                                inputRef={scriptFieldRef}
                                editMode={scriptEditMode}
                                minRows={6}
                                maxRows={14}
                                placeholder="Dán audio script từ chatbot vào đây…"
                                value={state.audioScript}
                                onChange={state.setAudioScript}
                                phoneticDict={state.ttsPhoneticDict}
                                onTextSelection={scriptEditMode ? undefined : handleScriptTextSelection}
                            />
                        </Box>

                        <ShortVideoAgentPhoneticQuickMenu
                            anchor={state.compareDrawerOpen || scriptEditMode ? null : selectionAnchor}
                            isEdit={quickMenuIsEdit}
                            onCreateOrEdit={handleOpenPhoneticDrawer}
                            onClose={closePhoneticQuickMenu}
                        />

                        <Stack
                            direction="row"
                            spacing={1}
                            flexWrap="wrap"
                            useFlexGap
                            alignItems="center"
                            sx={{
                                pt: 0.5,
                                borderTop: '1px solid',
                                borderColor: 'divider',
                            }}
                        >
                            {!state.hasScript ? (
                                <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                                    Chưa có nội dung — bấm Gemini sinh script để bắt đầu.
                                </Typography>
                            ) : (
                                <>
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
                                </>
                            )}
                            <Button
                                size="small"
                                variant={scriptEditMode ? 'contained' : 'outlined'}
                                color="primary"
                                startIcon={scriptEditMode ? <CheckIcon /> : <EditOutlinedIcon />}
                                onClick={toggleScriptEditMode}
                                sx={{ ml: 'auto', whiteSpace: 'nowrap' }}
                            >
                                {scriptEditMode ? 'Xong' : 'Sửa kịch bản'}
                            </Button>
                        </Stack>
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
                                <Chip
                                    size="small"
                                    label={`x${Number(state.omnivoiceSpeed || 1).toFixed(2)}`}
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
                                    phoneticDict={state.ttsPhoneticDict}
                                    issuesOnly={state.whisperCompareIssuesOnly}
                                    onToggleIssuesOnly={() => {
                                        state.setWhisperCompareIssuesOnly((prev) => !prev);
                                    }}
                                    onOpenCompare={state.openWhisperCompare}
                                    onPhoneticSelection={handlePhoneticSelection}
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
                    closePhoneticQuickMenu();
                }}
                audioScript={state.audioScript}
                alignResult={state.whisperScriptAlign}
                whisperWords={state.whisperWords}
                phoneticDict={state.ttsPhoneticDict}
                audioFileUrl={state.audioFileUrl}
                focusIndex={state.compareFocusIndex}
                filter={state.compareFilter}
                onFilterChange={state.setCompareFilter}
                onFocusScript={() => {
                    setScriptEditMode(true);
                    setSelectionAnchor(null);
                    window.setTimeout(() => {
                        scriptFieldRef.current?.focus();
                        scriptFieldRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 0);
                }}
                onSave={async () => { await state.saveCaptionAlignments(); }}
                saving={state.savingCaptionAlignments}
                hasUnsavedChanges={state.hasCaptionOverrideChanges}
                onPhoneticSelection={handlePhoneticSelection}
                phoneticQuickMenu={(
                    <ShortVideoAgentPhoneticQuickMenu
                        anchor={selectionAnchor}
                        isEdit={quickMenuIsEdit}
                        onCreateOrEdit={handleOpenPhoneticDrawer}
                        onClose={closePhoneticQuickMenu}
                    />
                )}
            />

            <ShortVideoAgentPhoneticDictDrawer
                open={phoneticDrawerOpen}
                onClose={handleClosePhoneticDrawer}
                shortVideoId={state.shortVideoId}
                sourceTerm={phoneticDrawerTerm}
                initialPhonetic={existingPhoneticEntry?.phonetic ?? ''}
                existingEntry={existingPhoneticEntry}
                saving={state.savingPhoneticDict}
                onSave={state.handleSavePhoneticDict}
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
                omnivoiceSpeed={state.omnivoiceSpeed}
                onOmnivoiceSpeedChange={state.handleOmnivoiceSpeedChange}
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
