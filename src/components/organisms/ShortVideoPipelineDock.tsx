import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Box,
    Chip,
    CircularProgress,
    IconButton,
    LinearProgress,
    Paper,
    Tooltip,
    Typography,
} from '@mui/material';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import LaunchIcon from '@mui/icons-material/Launch';
import StopIcon from '@mui/icons-material/Stop';
import LoadingButton from 'components/atoms/LoadingButton';
import {
    openShortVideoAgentInSearchParams,
    parseShortVideoAgentIdFromSearch,
} from 'helpers/shortVideoAgentVideoDrawerUrl';
import {
    addQuickPreview,
    isQuickPreviewPinned,
    readQuickPreviewList,
    removeQuickPreview,
    subscribeQuickPreview,
    type QuickPreviewItem,
} from 'helpers/shortVideoQuickPreview';
import {
    getHeadlessPreviewLayout,
    subscribeHeadlessPreviewLayout,
    type HeadlessPreviewLayout,
} from 'helpers/shortVideoHeadlessPreviewBus';
import {
    cancelFullAutoPipeline,
    listActiveFullAutoPipelines,
    parseApiMessage,
    type ActiveFullAutoPipelineItem,
} from 'plugins/Vn4ELearning/AddOn/CreateData/Tabs/AppMobile/Marketing/AgentVideo/agentVideoApi';
import {
    getVisibleFullAutoPipelineStepGroups,
    getVisibleFullAutoPipelineStepIndex,
    getVisibleFullAutoPipelineStepOrder,
    resolveFullAutoPipelineStepLabel,
} from 'plugins/Vn4ELearning/AddOn/CreateData/Tabs/AppMobile/Marketing/AgentVideo/agentVideoPipelineStepLabels';
import {
    PIPELINE_STEP_STATUS_LABEL,
    pipelineStepStatusColor,
} from 'plugins/Vn4ELearning/AddOn/CreateData/Tabs/AppMobile/Marketing/AgentVideo/agentVideoPipelineUi';

const POLL_MS = 4000;
const LIST_COLUMN_WIDTH = 248;
const DETAIL_COLUMN_WIDTH = 480;
const BODY_MAX_HEIGHT = 400;
const DOCK_MAX_WIDTH = LIST_COLUMN_WIDTH + DETAIL_COLUMN_WIDTH + 16;
/** Khoảng cách dock với box preview headless khi nằm cạnh nhau. */
const PREVIEW_GAP = 12;

/** Item dock = pipeline đang chạy, hoặc video user ghim (không chạy pipeline). */
type DockItem = ActiveFullAutoPipelineItem & { pinnedOnly?: boolean };

function pipelineTitle(item: ActiveFullAutoPipelineItem): string {
    return String(item.title || '').trim() || `Short video #${item.id}`;
}

/** Tiêu đề hiển thị kèm [id] để dễ xác định video. */
function displayTitle(item: ActiveFullAutoPipelineItem): string {
    return `[${item.id}] ${pipelineTitle(item)}`;
}

function stepLabel(item: ActiveFullAutoPipelineItem, step: string): string {
    return resolveFullAutoPipelineStepLabel(step, item.agent_visual_mode) || step || 'Đang chuẩn bị';
}

function progressPercent(item: ActiveFullAutoPipelineItem): number {
    const order = getVisibleFullAutoPipelineStepOrder(item.agent_visual_mode, Boolean(item.beat_audio_mode));
    if (order.length === 0) {
        return 0;
    }
    const steps = item.steps || {};
    let done = 0;
    order.forEach((key) => {
        const status = String(steps[key]?.status || 'pending');
        if (status === 'done' || status === 'skipped') {
            done++;
        }
    });
    return Math.max(0, Math.min(100, Math.round((done / order.length) * 100)));
}

function progressLabel(item: ActiveFullAutoPipelineItem): string {
    const order = getVisibleFullAutoPipelineStepOrder(item.agent_visual_mode, Boolean(item.beat_audio_mode));
    const index = getVisibleFullAutoPipelineStepIndex(
        item.current_step,
        item.agent_visual_mode,
        Boolean(item.beat_audio_mode),
    );
    if (index > 0 && order.length > 0) {
        return `Bước ${index}/${order.length}`;
    }
    return order.length > 0 ? `0/${order.length}` : 'Pipeline A→Z';
}

function isWorkerProcessing(item: ActiveFullAutoPipelineItem): boolean {
    return String(item.job_status || '') === 'processing';
}

function statusDotColor(item: DockItem): string {
    if (item.pinnedOnly) {
        return '#90a4ae';
    }
    if (isWorkerProcessing(item)) {
        return '#29b6f6';
    }
    if (String(item.status || '') === 'failed') {
        return '#ef5350';
    }
    return '#ffb74d';
}

/**
 * Link "View" giống thao tác user: mở trang danh sách short video của app_mobile
 * (tab marketing, view short_video) + `short_video_agent_id` để drawer agent tự mở.
 * URL giữ nguyên state nên refresh vẫn mở lại đúng video.
 */
function openAgentVideoUrl(item: ActiveFullAutoPipelineItem): string {
    const agentParams = openShortVideoAgentInSearchParams(new URLSearchParams(), item.id, 'script');
    const appMobileId = Number(item.app_mobile_id || 0);
    if (appMobileId <= 0) {
        return `/post-type/spacedev_app_short_video/edit?post_id=${item.id}&${agentParams.toString()}`;
    }
    const listParams = new URLSearchParams();
    listParams.set('post_id', String(appMobileId));
    listParams.set('tab_create_data_app_mobile', 'vn4-e-learning_marketing');
    listParams.set('marketing_view', 'short_video');
    agentParams.forEach((value, key) => listParams.set(key, value));
    return `/post-type/app_mobile/edit?${listParams.toString()}`;
}

function PipelineStepsPreview({ item }: { item: ActiveFullAutoPipelineItem }) {
    const groups = getVisibleFullAutoPipelineStepGroups(
        item.agent_visual_mode,
        Boolean(item.beat_audio_mode),
    );
    const steps = item.steps || {};

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {groups.map((group) => (
                <Box key={group.key}>
                    <Typography
                        variant="caption"
                        sx={{
                            display: 'block',
                            mb: 0.25,
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: 0.3,
                            textTransform: 'uppercase',
                            color: 'rgba(255,255,255,0.45)',
                        }}
                    >
                        {group.label}
                    </Typography>
                    {group.steps.map((step) => {
                        const status = String(steps[step]?.status || 'pending');
                        const running = status === 'running';
                        return (
                            <Box
                                key={step}
                                sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.2 }}
                            >
                                {running ? (
                                    <CircularProgress size={10} thickness={6} sx={{ color: 'info.light' }} />
                                ) : (
                                    <Box
                                        component="span"
                                        sx={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: '50%',
                                            flex: '0 0 auto',
                                            bgcolor: pipelineStepStatusColor(status, 'dark'),
                                        }}
                                    />
                                )}
                                <Typography
                                    variant="caption"
                                    noWrap
                                    sx={{
                                        flex: 1,
                                        minWidth: 0,
                                        fontSize: 11.5,
                                        color: status === 'pending'
                                            ? 'rgba(255,255,255,0.55)'
                                            : 'rgba(255,255,255,0.9)',
                                        fontWeight: running ? 700 : 500,
                                    }}
                                >
                                    {stepLabel(item, step)}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    sx={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}
                                >
                                    {PIPELINE_STEP_STATUS_LABEL[status] || status}
                                </Typography>
                            </Box>
                        );
                    })}
                </Box>
            ))}
        </Box>
    );
}

export default function ShortVideoPipelineDock() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    // Short video đang mở workspace (từ URL) — đánh dấu trong danh sách để không xem nhầm.
    const activeShortVideoId = parseShortVideoAgentIdFromSearch(searchParams.toString());
    const [runningItems, setRunningItems] = React.useState<ActiveFullAutoPipelineItem[]>([]);
    const [pinnedItems, setPinnedItems] = React.useState<QuickPreviewItem[]>(() => readQuickPreviewList());
    const [selectedId, setSelectedId] = React.useState<number | null>(null);
    const [stoppingId, setStoppingId] = React.useState<number | null>(null);
    // Mặc định thu gọn — tránh dock che UI khi refresh/mở trang.
    const [dockCollapsed, setDockCollapsed] = React.useState(true);
    const [previewLayout, setPreviewLayout] = React.useState<HeadlessPreviewLayout>(
        () => getHeadlessPreviewLayout(),
    );
    // Worker chuyển giữa job con có thể khiến 1 nhịp poll trả rỗng — chỉ ẩn pipeline
    // đang chạy sau 2 nhịp liên tiếp để box không nhấp nháy.
    const emptyStreakRef = React.useRef(0);

    const load = React.useCallback(async () => {
        try {
            const res = await listActiveFullAutoPipelines();
            const list = Array.isArray(res?.pipelines) ? res.pipelines : [];
            if (list.length > 0) {
                emptyStreakRef.current = 0;
                setRunningItems(list);
                return;
            }
            emptyStreakRef.current += 1;
            if (emptyStreakRef.current >= 2) {
                setRunningItems([]);
            }
        } catch {
            // Giữ danh sách cũ khi lỗi mạng — không làm nhấp nháy dock.
        }
    }, []);

    React.useEffect(() => {
        void load();
        const timer = window.setInterval(() => {
            if (document.visibilityState === 'visible') {
                void load();
            }
        }, POLL_MS);
        return () => window.clearInterval(timer);
    }, [load]);

    React.useEffect(() => {
        const sync = () => setPinnedItems(readQuickPreviewList());
        sync();
        return subscribeQuickPreview(sync);
    }, []);

    React.useEffect(() => subscribeHeadlessPreviewLayout(setPreviewLayout), []);

    const merged = React.useMemo<DockItem[]>(() => {
        const runningIds = new Set(runningItems.map((item) => item.id));
        const list: DockItem[] = runningItems.map((item) => ({ ...item, pinnedOnly: false }));
        pinnedItems.forEach((item) => {
            if (runningIds.has(item.id)) {
                return;
            }
            list.push({
                id: item.id,
                title: item.title || `Short video #${item.id}`,
                app_mobile_id: item.app_mobile_id,
                status: 'idle',
                current_step: '',
                enabled: false,
                pinnedOnly: true,
            });
        });
        return list;
    }, [runningItems, pinnedItems]);

    React.useEffect(() => {
        setSelectedId((current) => (
            current !== null && merged.some((item) => item.id === current)
                ? current
                : (merged[0]?.id ?? null)
        ));
    }, [merged]);

    const handleStop = React.useCallback(async (item: DockItem) => {
        setStoppingId(item.id);
        try {
            const res = await cancelFullAutoPipeline(item.id);
            const message = parseApiMessage(res?.message) || `Đã dừng pipeline: ${pipelineTitle(item)}`;
            window.showMessage?.(message, res?.success === false ? 'error' : 'success');
        } catch {
            window.showMessage?.('Dừng pipeline thất bại', 'error');
        } finally {
            setStoppingId(null);
            // Xoá khỏi danh sách chạy ngay khi user bấm Dừng (không chờ grace).
            emptyStreakRef.current = 0;
            setRunningItems((prev) => prev.filter((pipeline) => pipeline.id !== item.id));
            void load();
        }
    }, [load]);

    const handleView = React.useCallback((item: DockItem) => {
        navigate(openAgentVideoUrl(item));
    }, [navigate]);

    const handleTogglePin = React.useCallback((item: DockItem) => {
        if (isQuickPreviewPinned(item.id)) {
            removeQuickPreview(item.id);
            return;
        }
        addQuickPreview({
            id: item.id,
            title: pipelineTitle(item),
            app_mobile_id: item.app_mobile_id,
        });
    }, []);

    if (merged.length === 0) {
        return null;
    }

    const selected = merged.find((item) => item.id === selectedId) || merged[0];
    const selectedPinned = selected ? isQuickPreviewPinned(selected.id) : false;

    // Neo sát phải; khi có box preview headless thì đặt ngay bên trái nó
    // (giống dock chat Facebook).
    const previewVisible = previewLayout.visible && previewLayout.width > 0;
    const dockRight = previewVisible
        ? previewLayout.right + previewLayout.width + PREVIEW_GAP
        : previewLayout.right;
    const dockBottom = previewLayout.bottom;
    const dockMaxWidth = `calc(100vw - ${Math.round(dockRight + 16)}px)`;

    return (
        <Paper
            elevation={dockCollapsed ? 6 : 12}
            sx={{
                position: 'fixed',
                right: dockCollapsed ? 0 : dockRight,
                bottom: dockCollapsed ? 0 : dockBottom,
                zIndex: 1400,
                width: dockCollapsed ? 'auto' : `min(${DOCK_MAX_WIDTH}px, ${dockMaxWidth})`,
                maxWidth: dockMaxWidth,
                bgcolor: 'rgba(9,12,16,0.97)',
                color: 'common.white',
                border: '1px solid rgba(255,255,255,0.16)',
                borderRadius: dockCollapsed ? '10px 0 0 0' : 2,
                borderBottom: dockCollapsed ? 'none' : undefined,
                borderRight: dockCollapsed ? 'none' : undefined,
                overflow: 'hidden',
                transition: 'width 160ms ease',
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: dockCollapsed ? 1 : 1.5,
                    py: dockCollapsed ? 0.25 : 0.75,
                    borderBottom: dockCollapsed ? 'none' : '1px solid rgba(255,255,255,0.08)',
                }}
            >
                {!dockCollapsed ? (
                    <AccountTreeOutlinedIcon fontSize="small" sx={{ color: '#29b6f6' }} />
                ) : null}
                {!dockCollapsed ? (
                    <Typography
                        variant="caption"
                        fontWeight={800}
                        noWrap
                        sx={{ flex: 1 }}
                    >
                        Pipeline short video
                    </Typography>
                ) : null}
                <Chip
                    size="small"
                    label={merged.length}
                    sx={{
                        height: dockCollapsed ? 16 : 20,
                        bgcolor: 'rgba(41,182,246,0.18)',
                        color: '#90caf9',
                        fontWeight: 800,
                        '& .MuiChip-label': { px: 1, fontSize: dockCollapsed ? 10 : 11 },
                    }}
                />
                <Tooltip title={dockCollapsed ? 'Mở dock pipeline' : 'Thu gọn dock pipeline'}>
                    <IconButton
                        size="small"
                        color="inherit"
                        onClick={() => setDockCollapsed((value) => !value)}
                        aria-label={dockCollapsed ? 'Mở dock pipeline' : 'Thu gọn dock pipeline'}
                        sx={{ p: dockCollapsed ? 0.125 : 0.5 }}
                    >
                        {dockCollapsed
                            ? <KeyboardArrowUpIcon sx={{ fontSize: dockCollapsed ? 18 : 20 }} />
                            : <KeyboardArrowDownIcon fontSize="small" />}
                    </IconButton>
                </Tooltip>
            </Box>

            {!dockCollapsed ? (
                <Box sx={{ display: 'flex', alignItems: 'stretch', maxHeight: BODY_MAX_HEIGHT }}>
                    <Box
                        sx={{
                            flex: `0 0 ${LIST_COLUMN_WIDTH}px`,
                            width: LIST_COLUMN_WIDTH,
                            overflowY: 'auto',
                            borderRight: '1px solid rgba(255,255,255,0.08)',
                            py: 0.5,
                        }}
                    >
                        {merged.map((item) => {
                            const active = selected?.id === item.id;
                            const processing = isWorkerProcessing(item);
                            const pinned = isQuickPreviewPinned(item.id);
                            const isCurrentVideo = activeShortVideoId !== null
                                && item.id === activeShortVideoId;
                            return (
                                <Box
                                    key={item.id}
                                    onClick={() => setSelectedId(item.id)}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: 0.75,
                                        px: 1.25,
                                        py: 0.75,
                                        cursor: 'pointer',
                                        bgcolor: active ? 'rgba(41,182,246,0.16)' : 'transparent',
                                        borderLeft: active
                                            ? '3px solid #29b6f6'
                                            : '3px solid transparent',
                                        boxShadow: isCurrentVideo
                                            ? 'inset 0 0 0 1px rgba(76,175,80,0.6)'
                                            : 'none',
                                        '&:hover': {
                                            bgcolor: active
                                                ? 'rgba(41,182,246,0.2)'
                                                : 'rgba(255,255,255,0.05)',
                                        },
                                    }}
                                >
                                    <Box
                                        component="span"
                                        sx={{
                                            mt: 0.6,
                                            width: 8,
                                            height: 8,
                                            borderRadius: '50%',
                                            flex: '0 0 auto',
                                            bgcolor: statusDotColor(item),
                                            boxShadow: processing
                                                ? '0 0 0 3px rgba(41,182,246,0.22)'
                                                : 'none',
                                        }}
                                    />
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography
                                            variant="caption"
                                            fontWeight={700}
                                            noWrap
                                            sx={{ display: 'block' }}
                                            title={displayTitle(item)}
                                        >
                                            {displayTitle(item)}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            noWrap
                                            sx={{
                                                display: 'block',
                                                fontSize: 10,
                                                color: processing ? '#90caf9' : 'rgba(255,255,255,0.6)',
                                            }}
                                        >
                                            {item.pinnedOnly
                                                ? 'Preview nhanh'
                                                : (processing ? 'Đang chạy · ' : 'Chờ worker · ')}
                                            {!item.pinnedOnly ? stepLabel(item, item.current_step) : ''}
                                        </Typography>
                                    </Box>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: 0.25,
                                            mt: 0.25,
                                            flex: '0 0 auto',
                                        }}
                                    >
                                        {isCurrentVideo ? (
                                            <Chip
                                                size="small"
                                                label="Đang mở"
                                                sx={{
                                                    height: 16,
                                                    bgcolor: 'rgba(76,175,80,0.22)',
                                                    color: '#a5d6a7',
                                                    fontWeight: 800,
                                                    '& .MuiChip-label': { px: 0.6, fontSize: 9.5 },
                                                }}
                                            />
                                        ) : null}
                                        {processing ? (
                                            <CircularProgress size={12} thickness={6} sx={{ color: '#29b6f6' }} />
                                        ) : pinned ? (
                                            <BookmarkIcon sx={{ fontSize: 14, color: '#ffb74d' }} />
                                        ) : null}
                                    </Box>
                                    <Tooltip title="View — mở workspace agent video">
                                        <IconButton
                                            size="small"
                                            color="inherit"
                                            aria-label={`View ${displayTitle(item)}`}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                handleView(item);
                                            }}
                                            sx={{
                                                mt: 0.1,
                                                p: 0.25,
                                                color: 'rgba(255,255,255,0.7)',
                                                '&:hover': { color: 'common.white' },
                                            }}
                                        >
                                            <LaunchIcon sx={{ fontSize: 15 }} />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            );
                        })}
                    </Box>

                    <Box
                        sx={{
                            flex: '1 1 auto',
                            minWidth: 0,
                            overflowY: 'auto',
                            p: 1.5,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1,
                        }}
                    >
                        {selected ? (
                            <>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography variant="subtitle2" fontWeight={800} noWrap title={displayTitle(selected)}>
                                            {displayTitle(selected)}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            noWrap
                                            sx={{
                                                display: 'block',
                                                fontSize: 10.5,
                                                color: selected.pinnedOnly
                                                    ? 'rgba(255,255,255,0.6)'
                                                    : (isWorkerProcessing(selected) ? '#90caf9' : 'rgba(255,255,255,0.6)'),
                                            }}
                                        >
                                            {selected.pinnedOnly
                                                ? 'Video ghim — không chạy pipeline'
                                                : `${isWorkerProcessing(selected) ? 'Đang chạy · ' : 'Chờ worker · '}${stepLabel(selected, selected.current_step)}`}
                                        </Typography>
                                    </Box>
                                    {activeShortVideoId !== null && selected.id === activeShortVideoId ? (
                                        <Chip
                                            size="small"
                                            label="Video đang mở"
                                            sx={{
                                                height: 20,
                                                bgcolor: 'rgba(76,175,80,0.22)',
                                                color: '#a5d6a7',
                                                fontWeight: 800,
                                                '& .MuiChip-label': { px: 0.9, fontSize: 10.5 },
                                            }}
                                        />
                                    ) : null}
                                    <Chip
                                        size="small"
                                        label={selected.pinnedOnly
                                            ? 'Ghim'
                                            : (isWorkerProcessing(selected) ? 'Đang chạy' : 'Chờ')}
                                        sx={{
                                            height: 20,
                                            bgcolor: selected.pinnedOnly
                                                ? 'rgba(144,164,174,0.2)'
                                                : (isWorkerProcessing(selected)
                                                    ? 'rgba(41,182,246,0.2)'
                                                    : 'rgba(255,183,77,0.18)'),
                                            color: selected.pinnedOnly
                                                ? '#b0bec5'
                                                : (isWorkerProcessing(selected) ? '#90caf9' : '#ffcc80'),
                                            fontWeight: 800,
                                            '& .MuiChip-label': { px: 0.9, fontSize: 10.5 },
                                        }}
                                    />
                                </Box>

                                <Box>
                                    <LinearProgress
                                        variant="determinate"
                                        value={selected.pinnedOnly ? 0 : progressPercent(selected)}
                                        sx={{
                                            height: 5,
                                            borderRadius: 1,
                                            bgcolor: 'rgba(255,255,255,0.12)',
                                            '& .MuiLinearProgress-bar': {
                                                bgcolor: selected.pinnedOnly
                                                    ? 'rgba(255,255,255,0.28)'
                                                    : (isWorkerProcessing(selected) ? '#29b6f6' : '#ffb74d'),
                                            },
                                        }}
                                    />
                                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
                                        {selected.pinnedOnly ? 'Chưa chạy pipeline' : progressLabel(selected)}
                                        {selected.error_count ? ` · ${selected.error_count} lỗi` : ''}
                                    </Typography>
                                </Box>

                                <PipelineStepsPreview item={selected} />

                                {selected.pinnedOnly ? (
                                    <Typography variant="caption" sx={{ fontSize: 10.5, color: 'rgba(255,255,255,0.55)' }}>
                                        Video ghim để truy cập nhanh — bấm “View” để mở workspace và tiếp tục làm.
                                    </Typography>
                                ) : selected.last_error?.message ? (
                                    <Typography variant="caption" sx={{ fontSize: 10.5, color: 'error.light' }}>
                                        Lỗi gần nhất: {selected.last_error.message}
                                    </Typography>
                                ) : null}

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 'auto', pt: 0.5, flexWrap: 'wrap' }}>
                                    {!selected.pinnedOnly ? (
                                        <LoadingButton
                                            size="small"
                                            variant="contained"
                                            color="error"
                                            startIcon={<StopIcon />}
                                            loading={stoppingId === selected.id}
                                            disabled={stoppingId !== null}
                                            onClick={() => { void handleStop(selected); }}
                                            aria-label={`Dừng pipeline ${pipelineTitle(selected)}`}
                                            sx={{ minWidth: 96, height: 30, px: 1.25 }}
                                        >
                                            Dừng
                                        </LoadingButton>
                                    ) : null}
                                    <Tooltip title={selectedPinned
                                        ? 'Bỏ khỏi danh sách preview nhanh'
                                        : 'Thêm vào danh sách preview nhanh'}>
                                        <LoadingButton
                                            size="small"
                                            variant="outlined"
                                            color="inherit"
                                            startIcon={selectedPinned
                                                ? <BookmarkIcon />
                                                : <BookmarkBorderIcon />}
                                            onClick={() => handleTogglePin(selected)}
                                            aria-label={selectedPinned
                                                ? `Bỏ ghim ${pipelineTitle(selected)}`
                                                : `Ghim ${pipelineTitle(selected)}`}
                                            sx={{
                                                height: 30,
                                                px: 1.25,
                                                color: selectedPinned ? '#ffb74d' : 'common.white',
                                                borderColor: selectedPinned
                                                    ? 'rgba(255,183,77,0.6)'
                                                    : 'rgba(255,255,255,0.35)',
                                            }}
                                        >
                                            {selectedPinned ? 'Bỏ ghim' : 'Ghim'}
                                        </LoadingButton>
                                    </Tooltip>
                                </Box>
                            </>
                        ) : null}
                    </Box>
                </Box>
            ) : null}
        </Paper>
    );
}
