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
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Switch,
    TextField,
    Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ErrorIcon from '@mui/icons-material/Error';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GraphicEqOutlinedIcon from '@mui/icons-material/GraphicEqOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopOutlinedIcon from '@mui/icons-material/StopOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import LoadingButton from 'components/atoms/LoadingButton';
import { AgentOptionToggleGroup } from './AgentOptionToggleGroup';
import { convertToURL, validURL } from 'helpers/url';
import {
    DEFAULT_WHITEBOARD_TRANSITIONS,
    fetchWhiteboardTransitions,
    type WhiteboardTransitionOption,
} from './agentVideoApi';
import { formatTtsChain, phaseLabel, visualStyleLabel } from './agentVideoUi';
import { appendHeadlessHowtoToError } from './agentVideoHeadlessPrerequisites';
import { PipelineScriptQaLoopMeta } from './PipelineScriptQaLoopUi';
import { formatOmnivoiceVoiceDesignVi } from './omnivoiceVoiceDesignLabels';
import { useAgentVideoOpenGeminiScriptActions } from './agentVideoOpenGeminiScript';
import ShortVideoAgentPromptLibrary from './ShortVideoAgentPromptLibrary';
import ShortVideoAgentAvatarDrawer, {
    AVATAR_PIP_ANCHORS,
} from './ShortVideoAgentAvatarDrawer';
import { WorkflowSection, workflowFieldSurfaceSx } from './workflowPanelSection';
import { AGENT_BEAT_FREQUENCY_OPTIONS, type AgentBeatFrequency } from './agentVideoBeatFrequency';
import type { useAgentVideoContent } from './useAgentVideoContent';

type AgentVideoState = ReturnType<typeof useAgentVideoContent>;

type Props = {
    state: AgentVideoState;
};

type StatusTone = 'default' | 'success' | 'info' | 'warning' | 'error';

/** Bật/tắt section Pipeline A→Z trong sidebar workflow. */
const WORKFLOW_SHOW_PIPELINE_AZ = false;
/** Bật/tắt section Metadata script trong sidebar workflow. */
const WORKFLOW_SHOW_METADATA_SCRIPT = false;

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

/** Section ít quan tâm ở column phải — thu gọn mặc định (chỉ title + chevron); click để mở rộng nội dung. */
function CollapsibleWorkflowSection({
    title,
    description,
    tone,
    headerAction,
    children,
}: {
    title: string;
    description?: string;
    tone?: 'neutral' | 'info' | 'visual' | 'pipeline' | 'prompt' | 'meta' | 'action' | 'social';
    headerAction?: React.ReactNode;
    children: React.ReactNode;
}) {
    const [open, setOpen] = React.useState(false);
    return (
        <WorkflowSection
            title={title}
            description={description}
            tone={tone}
            headerAction={(
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {open && headerAction ? headerAction : null}
                    <IconButton
                        size="small"
                        aria-label={open ? `Ẩn ${title}` : `Hiện ${title}`}
                        onClick={() => setOpen((value) => !value)}
                        sx={{ p: 0.25 }}
                    >
                        {open
                            ? <ExpandLessIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                            : <ExpandMoreIcon fontSize="small" sx={{ color: 'text.secondary' }} />}
                    </IconButton>
                </Box>
            )}
        >
            {open ? children : null}
        </WorkflowSection>
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
}) {    const resolvedStatus = String(status || '').trim().toLowerCase() === 'paused'
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
                agentBeatFrequency: state.agentBeatFrequency,
                isWhiteboard: state.isWhiteboardMode,
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

    const [whiteboardTransitions, setWhiteboardTransitions] = React.useState<WhiteboardTransitionOption[]>(
        DEFAULT_WHITEBOARD_TRANSITIONS,
    );

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

    const whiteboardTransitionSelected = React.useMemo(
        () => whiteboardTransitions.find((t) => t.id === whiteboardTransitionId),
        [whiteboardTransitions, whiteboardTransitionId],
    );

    const transitionSfxAudioRef = React.useRef<HTMLAudioElement | null>(null);
    const transitionSfxPlayingRef = React.useRef<string | null>(null);
    const [transitionSfxPlaying, setTransitionSfxPlaying] = React.useState(false);

    const toggleTransitionSfxPreview = React.useCallback((t: WhiteboardTransitionOption | undefined) => {
        if (!t?.sfx_url) {
            return;
        }
        if (transitionSfxAudioRef.current) {
            transitionSfxAudioRef.current.pause();
            transitionSfxAudioRef.current = null;
            setTransitionSfxPlaying(false);
            if (transitionSfxPlayingRef.current === t.sfx_url) {
                transitionSfxPlayingRef.current = null;
                return;
            }
        }
        transitionSfxPlayingRef.current = t.sfx_url;
        const audio = new Audio(t.sfx_url);
        transitionSfxAudioRef.current = audio;
        const start = Math.max(0, Number(t.sfx_start_sec) || 0);
        const end = Number(t.sfx_end_sec) || 0;
        audio.currentTime = start;
        audio.addEventListener('timeupdate', () => {
            if (end > 0 && audio.currentTime >= end) {
                audio.pause();
                audio.currentTime = start;
            }
        });
        audio.addEventListener('ended', () => {
            setTransitionSfxPlaying(false);
            transitionSfxAudioRef.current = null;
            transitionSfxPlayingRef.current = null;
        });
        audio.addEventListener('error', () => {
            setTransitionSfxPlaying(false);
            transitionSfxAudioRef.current = null;
            transitionSfxPlayingRef.current = null;
        });
        audio.play().catch(() => {
            setTransitionSfxPlaying(false);
            transitionSfxAudioRef.current = null;
            transitionSfxPlayingRef.current = null;
        });
        setTransitionSfxPlaying(true);
    }, []);

    React.useEffect(() => () => {
        if (transitionSfxAudioRef.current) {
            transitionSfxAudioRef.current.pause();
            transitionSfxAudioRef.current = null;
        }
    }, []);

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
                                    checked={state.agentBeatAudio}
                                    disabled={state.savingBeatAudio}
                                    onChange={(e) => {
                                        void state.handleAgentBeatAudioChange(e.target.checked);
                                    }}
                                    inputProps={{ 'aria-label': 'Audio từng beat' }}
                                />
                            )}
                            label={(
                                <Box sx={{ pt: 0.25 }}>
                                    <Typography variant="caption" color="text.primary" display="block" fontWeight={600}>
                                        Audio từng beat
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.35 }}>
                                        Mỗi beat đọc audio RIÊNG theo đúng content (ảnh khớp 100% audio), ghép lại với
                                        ngắt nghỉ theo dấu câu. Chia beat TRƯỚC, rồi tạo audio từng beat trong panel video 2s.
                                        Whisper chỉ dùng cho caption/QA từng beat — không cần cho timing.
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
                                    checked={state.agentRenderDebug}
                                    disabled={state.savingRenderDebug}
                                    onChange={(e) => {
                                        void state.handleAgentRenderDebugChange(e.target.checked);
                                    }}
                                    inputProps={{ 'aria-label': 'Debug render 3 beat đầu' }}
                                />
                            )}
                            label={(
                                <Box sx={{ pt: 0.25 }}>
                                    <Typography variant="caption" color="text.primary" display="block" fontWeight={600}>
                                        Debug render (3 beat đầu)
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.35 }}>
                                        Bật: chỉ render 3 beat đầu để test nhanh — MP4 ngắn, audio cắt theo video. Tắt đi rồi restart từ render để có bản đầy đủ.
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
                            <AgentOptionToggleGroup
                                value={state.agentClipAspect}
                                disabled={state.savingClipAspect}
                                onChange={(value) => { void state.handleAgentClipAspectChange(value as '9:16' | '16:9'); }}
                                ariaLabel="Tỉ lệ clip"
                                options={[
                                    { value: '9:16', label: '9:16 dọc' },
                                    { value: '16:9', label: '16:9 ngang' },
                                ]}
                            />
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
                            <AgentOptionToggleGroup
                                value={state.agentVisualMode}
                                disabled={state.savingVisualMode}
                                onChange={(value) => { void state.handleAgentVisualModeChange(value as 'hyperframes' | 'whiteboard'); }}
                                ariaLabel="Chế độ visual clip"
                                options={[
                                    { value: 'hyperframes', label: 'Motion HTML' },
                                    { value: 'whiteboard', label: 'Image' },
                                ]}
                            />
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75, lineHeight: 1.35 }}>
                                {state.isWhiteboardMode
                                    ? 'Image: ảnh beat theo phong cách (Whiteboard/Collage/Vox/Courtroom) + render. Cấu hình riêng ở khối Image bên dưới.'
                                    : 'Motion HTML: HyperFrames HTML theo beat. Cấu hình riêng ở khối Motion HTML bên dưới.'}
                            </Typography>
                        </Box>
                        {state.isWhiteboardMode ? (
                            <Box sx={{ px: 1.25, py: 1 }}>
                                <Typography variant="caption" color="text.primary" display="block" fontWeight={600} sx={{ mb: 0.75 }}>
                                    Ngôn ngữ chữ trên ảnh beat
                                </Typography>
                                <AgentOptionToggleGroup
                                    value={state.agentImageTextLang}
                                    disabled={state.savingImageTextLang}
                                    onChange={(value) => { void state.handleAgentImageTextLangChange(value as 'vi' | 'en'); }}
                                    ariaLabel="Ngôn ngữ chữ trên ảnh beat"
                                    options={[
                                        { value: 'vi', label: 'Tiếng Việt' },
                                        { value: 'en', label: 'English' },
                                    ]}
                                />
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75, lineHeight: 1.35 }}>
                                    Chữ hiển thị trên ảnh beat (Meta.ai / Duck.ai) phải đúng ngôn ngữ này. Ảnh đã sinh giữ nguyên; chỉ ảnh sinh sau áp dụng.
                                </Typography>
                            </Box>
                        ) : null}
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
                                    Image nhịp nhanh: nên chọn "Không vẽ tay" ở Cách đưa ảnh vào khung để ảnh hiện đầy đủ từ frame đầu.
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
                                    <AgentOptionToggleGroup
                                        value={whiteboardPhotoPlaceMode}
                                        disabled={state.savingWhiteboardConfig}
                                        onChange={(value) => {
                                            void state.handleAgentWhiteboardConfigChange({
                                                photo_place_mode: value as 'instant' | 'draw' | 'drag',
                                            });
                                        }}
                                        ariaLabel="Cách đưa ảnh vào khung whiteboard"
                                        options={[
                                            { value: 'instant', label: 'Không vẽ tay' },
                                            { value: 'drag', label: 'Kéo ảnh vào' },
                                            { value: 'draw', label: 'Vẽ tô ảnh' },
                                        ]}
                                    />
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
                                    <Stack direction="row" spacing={0.75} alignItems="center">
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
                                        {whiteboardTransitionSelected?.sfx_url && (
                                            <IconButton
                                                size="small"
                                                color={transitionSfxPlaying ? 'primary' : 'default'}
                                                title={transitionSfxPlaying ? 'Dừng nghe thử' : 'Nghe thử âm thanh hiệu ứng'}
                                                onClick={() => toggleTransitionSfxPreview(whiteboardTransitionSelected)}
                                            >
                                                {transitionSfxPlaying ? <StopOutlinedIcon fontSize="small" /> : <GraphicEqOutlinedIcon fontSize="small" />}
                                            </IconButton>
                                        )}
                                    </Stack>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75, lineHeight: 1.35 }}>
                                        {whiteboardPhotoPlaceMode === 'instant'
                                            ? (
                                                whiteboardTransitionId === 'none'
                                                    ? 'Cắt thẳng: beat sau hiện ngay, không hiệu ứng — không nằm trong Ngẫu nhiên.'
                                                    : whiteboardTransitionId === 'random'
                                                        ? 'Ngẫu nhiên mỗi beat: rút hết danh sách không lặp, hết thì xáo lại (không bao gồm Không hiệu ứng). Mọi hiệu ứng lộ ảnh 2.'
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
                                                                                    : (whiteboardTransitionSelected?.chroma_key === 'blue_green'
                                                                                        ? `Hiệu ứng "${whiteboardTransitionSelected?.label || whiteboardTransitionId}": clip dual-chroma blue→cảnh 1, green→cảnh 2 — hiệu ứng ở giữa video.`
                                                                                        : 'Lật trang: ảnh 2 sẵn trên mặt trang khi lật. Beat cuối không transition.')
                                            )
                                            : 'Áp dụng cuối beat 1…n−1 (thường sang bảng trống). Beat cuối không có transition. Chọn Không hiệu ứng để cắt thẳng; Ngẫu nhiên không bao gồm Không hiệu ứng.'}
                                    </Typography>
                                    <Box sx={{ px: 1.25, pt: 1, pb: 0.5 }}>
                                        <Typography variant="caption" color="text.primary" display="block" fontWeight={600} sx={{ mb: 0.5 }}>
                                            Số beat mỗi job render
                                        </Typography>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <TextField
                                                size="small"
                                                type="number"
                                                value={String(state.agentWhiteboardConfig?.beats_per_job ?? 1)}
                                                disabled={state.savingWhiteboardConfig}
                                                onChange={(e) => {
                                                    const num = Math.max(1, Math.min(6, parseInt(e.target.value, 10) || 1));
                                                    void state.handleAgentWhiteboardConfigChange({ beats_per_job: num });
                                                }}
                                                inputProps={{ min: 1, max: 6, style: { width: 64 } }}
                                            />
                                            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35 }}>
                                                Gom N beat vào 1 job và render song song để nhanh hơn (1 = mỗi beat 1 job như cũ).
                                            </Typography>
                                        </Stack>
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
                                                checked={Boolean(state.agentWhiteboardConfig?.assets_mode)}
                                                disabled={state.savingWhiteboardConfig}
                                                onChange={(e) => {
                                                    void state.handleAgentWhiteboardConfigChange({
                                                        assets_mode: e.target.checked,
                                                    });
                                                }}
                                                inputProps={{ 'aria-label': 'Tài nguyên riêng lẻ cho CapCut' }}
                                            />
                                        )}
                                        label={(
                                            <Box sx={{ pt: 0.25 }}>
                                                <Typography variant="caption" color="text.primary" display="block" fontWeight={600}>
                                                    Tài nguyên riêng lẻ (chuẩn bị cho CapCut)
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.35 }}>
                                                    Bật: chỉ giữ ảnh beat + prompt làm asset — bỏ qua render video beat, ghép video final, upload store, BGM và thumbnail.
                                                </Typography>
                                            </Box>
                                        )}
                                    />
                                    <Box sx={{ px: 1.25, py: 1 }}>
                                        <LoadingButton
                                            fullWidth
                                            size="small"
                                            variant="contained"
                                            color="primary"
                                            loading={state.uploadingAllToCapcut}
                                            disabled={state.addingAudioToCapcut
                                                || (state.uploadingBeatVideoToCapcutIds?.length ?? 0) > 0}
                                            startIcon={<UploadFileOutlinedIcon fontSize="small" />}
                                            onClick={() => { void state.handleUploadAllToCapcut(); }}
                                            sx={{ textTransform: 'none', py: 0.5 }}
                                        >
                                            {state.agentWhiteboardConfig?.assets_mode
                                                ? 'Upload CapCut (audio + ảnh beat)'
                                                : 'Upload CapCut (audio + video beat)'}
                                        </LoadingButton>
                                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75, lineHeight: 1.35 }}>
                                            Upload toàn bộ audio + media từng beat đúng khung thời gian vào project CapCut.
                                            {state.agentWhiteboardConfig?.assets_mode
                                                ? ' Beat chưa có ảnh sẽ bị bỏ qua và báo lỗi.'
                                                : ' Beat chưa render video sẽ bị bỏ qua và báo lỗi.'}
                                        </Typography>
                                    </Box>
                                    <Typography variant="caption" color="text.primary" display="block" fontWeight={600} sx={{ mt: 1.25, mb: 0.75 }}>
                                        Phong cách hình ảnh
                                    </Typography>
                                    <Stack spacing={0.75}>
                                        {[
                                            { key: 'hybrid', label: 'Whiteboard (Hybrid)', color: '#1976d2', desc: 'Phong cách whiteboard: outline + hình ảnh thật trên nền bảng.' },
                                            { key: 'collage_art', label: 'Collage Art', color: '#e65100', desc: 'Giấy cắt tay, mép giấy rách, nền cream/kraft, halftone dots, washi tape, chữ báo vintage, accent đỏ.' },
                                            { key: 'vox', label: 'Vox', color: '#d32f2f', desc: 'Editorial documentary collage: cutout minh họa chủ đề, layered composition, hierarchy, scale contrast; annotation marker tối thiểu.' },
                                            { key: 'courtroom_sketch', label: 'Courtroom Sketch', color: '#6a1b9a', desc: 'Phác thảo tòa án vẽ tay: bút chì màu/phấn màu/nước trên giấy vân nhám, nét nhanh thô, màu trầm.' },
                                        ].map((option) => {
                                            const active = whiteboardGenStyle === option.key;
                                            return (
                                                <Box
                                                    key={option.key}
                                                    role="button"
                                                    tabIndex={0}
                                                    aria-pressed={active}
                                                    aria-label={`Phong cách hình ảnh ${option.label}`}
                                                    onClick={() => {
                                                        if (!state.savingWhiteboardConfig) {
                                                            void state.handleAgentWhiteboardConfigChange({
                                                                gen_style: option.key,
                                                            });
                                                        }
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if ((e.key === 'Enter' || e.key === ' ') && !state.savingWhiteboardConfig) {
                                                            e.preventDefault();
                                                            void state.handleAgentWhiteboardConfigChange({
                                                                gen_style: option.key,
                                                            });
                                                        }
                                                    }}
                                                    sx={{
                                                        cursor: state.savingWhiteboardConfig ? 'default' : 'pointer',
                                                        borderRadius: 1,
                                                        border: '1px solid',
                                                        borderColor: active ? option.color : 'rgba(25, 118, 210, 0.15)',
                                                        bgcolor: active ? `${option.color}1A` : 'transparent',
                                                        px: 1.25,
                                                        py: 0.75,
                                                        '&:hover': {
                                                            borderColor: active ? option.color : 'rgba(25, 118, 210, 0.45)',
                                                            bgcolor: active ? `${option.color}26` : 'rgba(25, 118, 210, 0.05)',
                                                        },
                                                    }}
                                                >
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                                        {active ? (
                                                            <CheckCircleIcon sx={{ color: option.color, fontSize: 15, flexShrink: 0 }} />
                                                        ) : (
                                                            <Box
                                                                sx={{
                                                                    width: 9,
                                                                    height: 9,
                                                                    borderRadius: '50%',
                                                                    border: '1px solid',
                                                                    borderColor: option.color,
                                                                    bgcolor: 'transparent',
                                                                    flexShrink: 0,
                                                                }}
                                                            />
                                                        )}
                                                        <Typography
                                                            variant="caption"
                                                            display="block"
                                                            sx={{
                                                                fontWeight: 700,
                                                                color: active ? option.color : 'text.primary',
                                                                lineHeight: 1.3,
                                                            }}
                                                        >
                                                            {option.label}
                                                        </Typography>
                                                    </Box>
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                        display="block"
                                                        sx={{ lineHeight: 1.35, mt: 0.25, pl: 1.75 }}
                                                    >
                                                        {option.desc}
                                                    </Typography>
                                                </Box>
                                            );
                                        })}
                                    </Stack>
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
                {
                    // eslint-disable-next-line no-constant-condition
                    false &&
                    <CollapsibleWorkflowSection title="Thông tin chung" tone="info">
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
                    </CollapsibleWorkflowSection>
                }

                {(() => {
                    if (!showPipeline || !state.fullAutoPipeline) return null;
                    const pipeline = state.fullAutoPipeline;
                    const lastError = pipeline.last_error;
                    const errMessage = lastError?.message;
                    if (!WORKFLOW_SHOW_PIPELINE_AZ) return null;
                    return (
                    <CollapsibleWorkflowSection title="Pipeline A→Z" tone="pipeline">
                        <MetaRow label="Status" status={pipeline.status || 'idle'} />
                        <PipelineScriptQaLoopMeta pipeline={pipeline} />
                        {errMessage ? (
                            <Alert severity="error" sx={{ mt: 1, py: 0.5, whiteSpace: 'pre-wrap' }}>
                                {appendHeadlessHowtoToError(String(errMessage))}
                                {Array.isArray(
                                    (lastError?.detail as { diagnosis?: { issues?: unknown[] } } | undefined)?.diagnosis?.issues,
                                ) && ((lastError?.detail as { diagnosis?: { issues?: Array<{ code?: string; message?: string }> } }).diagnosis?.issues?.length ?? 0) > 0 ? (
                                    <Box component="ul" sx={{ mt: 0.75, mb: 0, pl: 2 }}>
                                        {((lastError?.detail as { diagnosis?: { issues?: Array<{ code?: string; message?: string }> } }).diagnosis?.issues ?? []).slice(0, 6).map((issue, idx) => (
                                            <Typography component="li" variant="caption" key={`${issue.code || 'issue'}-${idx}`}>
                                                [{issue.code || '?'}] {issue.message || ''}
                                            </Typography>
                                        ))}
                                    </Box>
                                ) : null}
                            </Alert>
                        ) : null}
                    </CollapsibleWorkflowSection>
                    );
                })()}

                {
                // eslint-disable-next-line no-constant-condition
                false &&
                <CollapsibleWorkflowSection title="Danh sách Prompt" tone="prompt">
                    <ShortVideoAgentPromptLibrary state={state} />
                </CollapsibleWorkflowSection>
                }

                {(() => {
                    const summary = state.agentVideoSummary;
                    if (!summary) return null;
                    const meta = summary;
                    if (!WORKFLOW_SHOW_METADATA_SCRIPT) return null;
                    return (
                    <CollapsibleWorkflowSection title="Metadata script" tone="meta">
                        <MetaRow
                            label="Ước tính"
                            value={
                                meta.estimated_duration_sec != null
                                    ? `${meta.estimated_duration_sec}s`
                                    : '—'
                            }
                        />
                        <MetaRow
                            label="CTA mode"
                            value={meta.cta_mode || '—'}
                        />
                        <MetaRow
                            label="Markers"
                            value={String(meta.marker_count ?? 0)}
                        />
                    </CollapsibleWorkflowSection>
                    );
                })()}
                
                {
                // eslint-disable-next-line no-constant-condition   
                false &&
                <CollapsibleWorkflowSection title="Hành động" tone="action">
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
                </CollapsibleWorkflowSection>
                }

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
