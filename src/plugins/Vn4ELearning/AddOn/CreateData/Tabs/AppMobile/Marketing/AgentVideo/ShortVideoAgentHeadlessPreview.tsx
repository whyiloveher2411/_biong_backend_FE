import React from 'react';
import {
    Box,
    Chip,
    CircularProgress,
    IconButton,
    Paper,
    Tooltip,
    Typography,
} from '@mui/material';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import RemoveIcon from '@mui/icons-material/Remove';
import StopIcon from '@mui/icons-material/Stop';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import LoadingButton from 'components/atoms/LoadingButton';
import {
    FULL_AUTO_PIPELINE_STEP_LABELS,
    FULL_AUTO_PIPELINE_STEP_ORDER,
    type FullAutoPipelineStepKey,
    type FullAutoPipelineSummary,
} from './agentVideoApi';
import { useAgentHeadlessPreview } from './useAgentHeadlessPreview';

type Props = {
    open: boolean;
    shortVideoId: number;
    pipeline: FullAutoPipelineSummary | null;
    geminiFillProgress?: {
        beatId?: string;
    } | null;
    /** Backend: true khi có job Puppeteer/headless đang chạy — bật preview realtime tự động. */
    headlessBrowserActive?: boolean;
    /** Chỉ dùng để hiện headed Chrome — không chặn preview realtime. */
    agentGeminiOpenBrowser?: boolean;
    geminiScriptStatus?: string;
    geminiScriptPhoneticStatus?: string;
    geminiDivisionStatus?: string;
    geminiFillStatus?: string;
    geminiThumbnailFillStatus?: string;
    geminiThumbnailIdeaStatus?: string;
    ttsPending?: boolean;
    selectedTtsPlatforms?: string[];
    cancelling: boolean;
    requestingNewChat: boolean;
    onStop: () => void | Promise<void>;
    onNewChat: (sessionId?: string) => void | Promise<void>;
};

const RESULT_VISIBLE_MS = 3500;
const PREVIEW_WIDTH_STORAGE_KEY = 'short-video-agent-headless-preview-width';
const DEFAULT_PREVIEW_WIDTH = 480;
const MIN_PREVIEW_WIDTH = 320;
const VIEWPORT_MARGIN = 40;
const PREVIEW_HEADER_HEIGHT = 44;

function maxPreviewWidth(): number {
    if (typeof window === 'undefined') {
        return DEFAULT_PREVIEW_WIDTH;
    }
    const maxByWidth = Math.max(0, window.innerWidth - VIEWPORT_MARGIN);
    const maxByHeight = Math.max(
        0,
        (window.innerHeight - VIEWPORT_MARGIN - PREVIEW_HEADER_HEIGHT) * (16 / 9),
    );
    return Math.min(maxByWidth, maxByHeight);
}

function clampPreviewWidth(width: number): number {
    const viewportMax = maxPreviewWidth();
    if (viewportMax < MIN_PREVIEW_WIDTH) {
        return viewportMax;
    }
    return Math.min(viewportMax, Math.max(MIN_PREVIEW_WIDTH, width));
}

function storedPreviewWidth(): number {
    if (typeof window === 'undefined') {
        return DEFAULT_PREVIEW_WIDTH;
    }
    try {
        const stored = Number(window.localStorage.getItem(PREVIEW_WIDTH_STORAGE_KEY));
        return clampPreviewWidth(
            Number.isFinite(stored) && stored > 0 ? stored : DEFAULT_PREVIEW_WIDTH,
        );
    } catch {
        return clampPreviewWidth(DEFAULT_PREVIEW_WIDTH);
    }
}

function stepLabel(step: string): string {
    if (step in FULL_AUTO_PIPELINE_STEP_LABELS) {
        return FULL_AUTO_PIPELINE_STEP_LABELS[step as FullAutoPipelineStepKey];
    }
    return step || 'Đang chuẩn bị pipeline';
}

const PIPELINE_STEP_STATUS_LABEL: Record<string, string> = {
    done: 'Xong',
    skipped: 'Bỏ qua',
    running: 'Đang chạy',
    failed: 'Lỗi',
    pending: 'Chưa làm',
};

function pipelineStepStatusColor(status: string): string {
    switch (status) {
        case 'done':
            return 'success.light';
        case 'running':
            return 'info.light';
        case 'failed':
            return 'error.light';
        case 'skipped':
            return 'rgba(255,255,255,0.45)';
        default:
            return 'rgba(255,255,255,0.35)';
    }
}

function pipelineProgressLabel(step: string): string {
    const index = FULL_AUTO_PIPELINE_STEP_ORDER.indexOf(step as FullAutoPipelineStepKey);
    return index >= 0
        ? `Bước ${index + 1}/${FULL_AUTO_PIPELINE_STEP_ORDER.length}`
        : 'Pipeline A→Z';
}

function resultLabel(status: string): string {
    if (status === 'completed') {
        return 'Pipeline đã hoàn tất';
    }
    if (status === 'failed') {
        return 'Pipeline đã dừng do lỗi';
    }
    return 'Pipeline đã dừng';
}

function usesChatgptWebTts(platforms: string[] | undefined): boolean {
    return Array.isArray(platforms) && platforms.includes('chatgpt_web');
}

function isActiveJobStatus(status: string): boolean {
    const normalized = String(status || '').trim().toLowerCase();
    return normalized === 'queued' || normalized === 'processing';
}

export default function ShortVideoAgentHeadlessPreview({
    open,
    shortVideoId,
    pipeline,
    geminiFillProgress,
    headlessBrowserActive = false,
    agentGeminiOpenBrowser = false,
    geminiScriptStatus = 'none',
    geminiScriptPhoneticStatus = 'none',
    geminiDivisionStatus = 'none',
    geminiFillStatus = 'none',
    geminiThumbnailFillStatus = 'none',
    geminiThumbnailIdeaStatus = 'none',
    ttsPending = false,
    selectedTtsPlatforms = [],
    cancelling,
    requestingNewChat,
    onStop,
    onNewChat,
}: Props) {
    void agentGeminiOpenBrowser; // headed Chrome do backend xử lý; không chặn WS preview
    void geminiDivisionStatus;
    void geminiFillStatus;
    const [minimized, setMinimized] = React.useState(false);
    const [showResult, setShowResult] = React.useState(false);
    const [panelWidth, setPanelWidth] = React.useState(storedPreviewWidth);
    const [resizing, setResizing] = React.useState(false);
    const wasRunningRef = React.useRef(false);
    const resizeCleanupRef = React.useRef<(() => void) | null>(null);
    const status = String(pipeline?.status || 'idle').trim().toLowerCase();
    const currentStep = String(pipeline?.current_step || '').trim();
    const pipelineRunning = open && status === 'running';

    const chatgptInChain = usesChatgptWebTts(selectedTtsPlatforms);
    const chatgptTtsActive = chatgptInChain && (
        ttsPending
        || (pipelineRunning && currentStep === 'approve_tts')
    );

    const geminiJobActive = isActiveJobStatus(geminiScriptStatus)
        || isActiveJobStatus(geminiScriptPhoneticStatus)
        || isActiveJobStatus(geminiThumbnailFillStatus);

    const effectiveHeadlessActive = headlessBrowserActive
        || Boolean(pipeline?.headless_browser_active)
        || geminiJobActive;

    // Preview realtime: headless đang chạy (backend flag + mirror gemini block / pipeline).
    const browserStep = open && (effectiveHeadlessActive || chatgptTtsActive);

    const running = open && (pipelineRunning || effectiveHeadlessActive || chatgptTtsActive);

    const showNewChat = browserStep && !chatgptTtsActive && effectiveHeadlessActive;

    React.useEffect(() => {
        if (!open) {
            wasRunningRef.current = false;
            setShowResult(false);
            return undefined;
        }
        if (running) {
            wasRunningRef.current = true;
            setShowResult(false);
            return undefined;
        }
        if (!wasRunningRef.current) {
            return undefined;
        }
        wasRunningRef.current = false;
        setShowResult(true);
        const timer = window.setTimeout(() => setShowResult(false), RESULT_VISIBLE_MS);
        return () => window.clearTimeout(timer);
    }, [open, running, shortVideoId]);

    React.useEffect(() => {
        setMinimized(false);
    }, [shortVideoId]);

    React.useEffect(() => {
        try {
            window.localStorage.setItem(PREVIEW_WIDTH_STORAGE_KEY, String(Math.round(panelWidth)));
        } catch {
            // Preview vẫn hoạt động khi trình duyệt chặn localStorage.
        }
    }, [panelWidth]);

    React.useEffect(() => {
        const handleViewportResize = () => {
            setPanelWidth((current) => clampPreviewWidth(current));
        };
        window.addEventListener('resize', handleViewportResize);
        return () => window.removeEventListener('resize', handleViewportResize);
    }, []);

    React.useEffect(() => () => {
        resizeCleanupRef.current?.();
    }, []);

    React.useEffect(() => {
        if (!open) {
            resizeCleanupRef.current?.();
        }
    }, [open]);

    const resizeBy = React.useCallback((delta: number) => {
        setPanelWidth((current) => clampPreviewWidth(current + delta));
    }, []);

    const handleResizePointerDown = React.useCallback((
        event: React.PointerEvent<HTMLDivElement>,
    ) => {
        if (event.button !== 0) {
            return;
        }
        event.preventDefault();
        resizeCleanupRef.current?.();

        const startX = event.clientX;
        const startWidth = panelWidth;
        const previousUserSelect = document.body.style.userSelect;
        document.body.style.userSelect = 'none';
        setResizing(true);

        const handlePointerMove = (pointerEvent: PointerEvent) => {
            setPanelWidth(clampPreviewWidth(startWidth + startX - pointerEvent.clientX));
        };
        const cleanup = () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', cleanup);
            window.removeEventListener('pointercancel', cleanup);
            window.removeEventListener('blur', cleanup);
            document.body.style.userSelect = previousUserSelect;
            setResizing(false);
            resizeCleanupRef.current = null;
        };

        resizeCleanupRef.current = cleanup;
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', cleanup);
        window.addEventListener('pointercancel', cleanup);
        window.addEventListener('blur', cleanup);
    }, [panelWidth]);

    const handleResizeKeyDown = React.useCallback((
        event: React.KeyboardEvent<HTMLDivElement>,
    ) => {
        const increment = event.shiftKey ? 50 : 10;
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            resizeBy(increment);
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            resizeBy(-increment);
        }
    }, [resizeBy]);

    const preview = useAgentHeadlessPreview({
        enabled: browserStep,
        shortVideoId,
    });

    if (!open || (!running && !showResult)) {
        return null;
    }

    const title = pipelineRunning
        ? stepLabel(currentStep)
        : (isActiveJobStatus(geminiScriptPhoneticStatus)
            ? stepLabel('script_phonetic_normalize')
            : (chatgptTtsActive
                ? 'Duyệt / TTS (ChatGPT)'
                : (geminiJobActive ? 'Gemini headless' : resultLabel(status))));
    const beatId = String(
        preview.metadata?.beat_id
        || geminiFillProgress?.beatId
        || '',
    ).trim();
    const previewSessionId = String(
        preview.metadata?.session_id
        || preview.metadata?.preview_session_id
        || '',
    ).trim();
    const previewDisconnected = preview.connectionStatus !== 'connected';
    const previewWarning = preview.stale || previewDisconnected;
    const liveLabel = preview.stale
        ? 'Frame cũ'
        : (
            preview.connectionStatus === 'connecting'
                ? 'Đang nối'
                : preview.connectionStatus === 'reconnecting'
                    ? 'Kết nối lại'
                    : (previewDisconnected ? 'Mất kết nối' : 'TRỰC TIẾP')
        );

    return (
        <Paper
            elevation={12}
            sx={{
                position: 'fixed',
                right: 20,
                bottom: 20,
                zIndex: 1400,
                width: minimized ? MIN_PREVIEW_WIDTH : panelWidth,
                maxWidth: 'calc(100vw - 40px)',
                overflow: 'hidden',
                borderRadius: 2,
                bgcolor: '#090c10',
                color: 'common.white',
                border: '1px solid rgba(255,255,255,0.18)',
                transition: resizing ? 'none' : 'width 160ms ease',
            }}
        >
            {!minimized ? (
                <Box
                    role="separator"
                    aria-label="Thay đổi chiều rộng preview trực tiếp"
                    aria-orientation="vertical"
                    aria-valuemin={Math.min(MIN_PREVIEW_WIDTH, Math.round(maxPreviewWidth()))}
                    aria-valuemax={Math.round(maxPreviewWidth())}
                    aria-valuenow={Math.round(panelWidth)}
                    tabIndex={0}
                    onPointerDown={handleResizePointerDown}
                    onKeyDown={handleResizeKeyDown}
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        zIndex: 3,
                        width: 22,
                        height: 22,
                        cursor: 'nwse-resize',
                        opacity: resizing ? 1 : 0,
                        transition: 'opacity 120ms ease',
                        touchAction: 'none',
                        '&:hover, &:focus-visible': {
                            opacity: 1,
                            bgcolor: 'rgba(255,255,255,0.08)',
                        },
                        '&::after': {
                            content: '""',
                            position: 'absolute',
                            top: 4,
                            left: 4,
                            width: 9,
                            height: 9,
                            borderTop: '2px solid rgba(255,255,255,0.9)',
                            borderLeft: '2px solid rgba(255,255,255,0.9)',
                            borderTopLeftRadius: 1,
                        },
                    }}
                />
            ) : null}
            <Box
                sx={{
                    minHeight: 44,
                    pl: 3.5,
                    pr: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    bgcolor: 'rgba(15,23,42,0.96)',
                }}
            >
                {running ? <CircularProgress size={14} color="inherit" thickness={5} /> : null}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" fontWeight={700} noWrap sx={{ display: 'block' }}>
                        {title}
                    </Typography>
                    <Typography
                        variant="caption"
                        noWrap
                        sx={{ display: 'block', color: 'rgba(255,255,255,0.65)', fontSize: 10 }}
                    >
                        {pipelineRunning ? pipelineProgressLabel(currentStep) : (
                            isActiveJobStatus(geminiScriptPhoneticStatus)
                                ? pipelineProgressLabel('script_phonetic_normalize')
                                : (chatgptTtsActive
                                    ? 'ChatGPT Web TTS'
                                    : `Short video #${shortVideoId}`)
                        )}
                        {beatId ? ` · ${beatId}` : ''}
                    </Typography>
                </Box>
                {browserStep && !minimized ? (
                    <Tooltip title={previewWarning ? (preview.error || liveLabel) : 'Preview đang trực tiếp'}>
                        <Chip
                            size="small"
                            label={(
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                                    <Box
                                        component="span"
                                        sx={{
                                            width: 6,
                                            height: 6,
                                            borderRadius: '50%',
                                            bgcolor: 'common.white',
                                        }}
                                    />
                                    <Box component="span">{liveLabel}</Box>
                                </Box>
                            )}
                            sx={{
                                height: 22,
                                bgcolor: previewWarning ? 'warning.dark' : '#f00',
                                color: 'common.white',
                                fontWeight: 800,
                                '& .MuiChip-label': { px: 0.8, fontSize: 10 },
                            }}
                        />
                    </Tooltip>
                ) : null}
                {showNewChat && !minimized ? (
                    <LoadingButton
                        size="small"
                        variant="outlined"
                        color="inherit"
                        startIcon={<ChatBubbleOutlineIcon />}
                        loading={requestingNewChat}
                        disabled={requestingNewChat || cancelling || !previewSessionId}
                        onClick={() => { void onNewChat(previewSessionId); }}
                        aria-label="Bỏ lần chat hiện tại và tạo chat Gemini mới"
                        sx={{
                            minWidth: 94,
                            height: 26,
                            px: 1,
                            color: 'common.white',
                            borderColor: 'rgba(255,255,255,0.45)',
                        }}
                    >
                        New chat
                    </LoadingButton>
                ) : null}
                {running && !minimized ? (
                    <LoadingButton
                        size="small"
                        variant="contained"
                        color="error"
                        startIcon={<StopIcon />}
                        loading={cancelling}
                        disabled={cancelling || requestingNewChat}
                        onClick={() => { void onStop(); }}
                        aria-label="Dừng pipeline A đến Z"
                        sx={{
                            minWidth: 68,
                            height: 26,
                            px: 1,
                            color: 'common.white',
                            bgcolor: 'error.main',
                        }}
                    >
                        Dừng
                    </LoadingButton>
                ) : null}
                <Tooltip title={minimized ? 'Mở rộng preview' : 'Thu nhỏ preview'}>
                    <IconButton
                        size="small"
                        color="inherit"
                        onClick={() => setMinimized((value) => !value)}
                        aria-label={minimized ? 'Mở rộng preview' : 'Thu nhỏ preview'}
                    >
                        {minimized ? <OpenInFullIcon fontSize="small" /> : <RemoveIcon fontSize="small" />}
                    </IconButton>
                </Tooltip>
            </Box>

            {!minimized && running && pipeline?.steps && pipelineRunning ? (
                <Box
                    sx={{
                        maxHeight: 168,
                        overflowY: 'auto',
                        px: 1.5,
                        py: 1,
                        borderTop: '1px solid rgba(255,255,255,0.08)',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                    }}
                >
                    {FULL_AUTO_PIPELINE_STEP_ORDER.map((stepKey, index) => {
                        const status = String(pipeline.steps?.[stepKey]?.status || 'pending');
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
                                    opacity: status === 'pending' && !isCurrent ? 0.55 : 1,
                                }}
                            >
                                <Typography
                                    variant="caption"
                                    noWrap
                                    sx={{
                                        flex: 1,
                                        fontWeight: isCurrent || status === 'running' ? 700 : 400,
                                        color: isCurrent ? 'common.white' : 'rgba(255,255,255,0.82)',
                                    }}
                                >
                                    {index + 1}. {stepLabel(stepKey)}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        flexShrink: 0,
                                        fontWeight: 600,
                                        color: pipelineStepStatusColor(status),
                                        fontSize: 10,
                                    }}
                                >
                                    {PIPELINE_STEP_STATUS_LABEL[status] || status}
                                </Typography>
                            </Box>
                        );
                    })}
                </Box>
            ) : null}

            {!minimized ? (
                <Box
                    sx={{
                        position: 'relative',
                        width: '100%',
                        aspectRatio: '16 / 9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: '#05070a',
                    }}
                >
                    {browserStep && preview.frameUrl ? (
                        <Box
                            component="img"
                            src={preview.frameUrl}
                            alt="Preview realtime headless browser"
                            sx={{
                                width: '100%',
                                height: '100%',
                                display: 'block',
                                objectFit: 'contain',
                            }}
                        />
                    ) : (
                        <Box sx={{ px: 4, textAlign: 'center' }}>
                            {running ? <CircularProgress size={30} color="inherit" sx={{ mb: 1.5 }} /> : null}
                            <Typography variant="body2" fontWeight={600}>
                                {browserStep
                                    ? 'Đang khởi tạo preview trực tiếp'
                                    : (running ? title : resultLabel(status))}
                            </Typography>
                            <Typography
                                variant="caption"
                                sx={{ display: 'block', mt: 0.75, color: 'rgba(255,255,255,0.62)' }}
                            >
                                {browserStep
                                    ? (preview.error || 'Frame sẽ xuất hiện khi browser sẵn sàng')
                                    : (running
                                        ? 'Đang chờ bước dùng headless browser'
                                        : 'Preview sẽ tự ẩn sau giây lát')}
                            </Typography>
                        </Box>
                    )}

                    {browserStep && preview.frameUrl && previewWarning ? (
                        <Box
                            sx={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: 'rgba(0,0,0,0.52)',
                            }}
                        >
                            <Typography variant="body2" fontWeight={600}>
                                {preview.stale ? 'Đang chờ frame mới' : 'Đã mất kết nối preview'}
                            </Typography>
                        </Box>
                    ) : null}
                </Box>
            ) : null}
        </Paper>
    );
}
