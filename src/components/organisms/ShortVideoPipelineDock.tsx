import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Paper, Tooltip, Typography } from '@mui/material';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import {
    openShortVideoAgentInSearchParams,
    parseShortVideoAgentIdFromSearch,
} from 'helpers/shortVideoAgentVideoDrawerUrl';
import {
    readQuickPreviewList,
    subscribeQuickPreview,
    type QuickPreviewItem,
} from 'helpers/shortVideoQuickPreview';
import {
    listActiveFullAutoPipelines,
    type ActiveFullAutoPipelineItem,
} from 'plugins/Vn4ELearning/AddOn/CreateData/Tabs/AppMobile/Marketing/AgentVideo/agentVideoApi';
import { resolveFullAutoPipelineStepLabel } from 'plugins/Vn4ELearning/AddOn/CreateData/Tabs/AppMobile/Marketing/AgentVideo/agentVideoPipelineStepLabels';

const POLL_MS = 4000;

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

function itemStatusLabel(item: DockItem): string {
    if (item.pinnedOnly) {
        return 'Video ghim · không chạy pipeline';
    }
    if (isWorkerProcessing(item)) {
        return `Đang chạy · ${stepLabel(item, item.current_step)}`;
    }
    if (String(item.status || '') === 'failed') {
        return `Lỗi · ${stepLabel(item, item.current_step)}`;
    }
    return `Đang đợi · ${stepLabel(item, item.current_step)}`;
}

/**
 * Link "View" giống thao tác user: mở trang danh sách short video của app_mobile
 * (tab marketing, view short_video) + `short_video_agent_id` để drawer agent tự mở.
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

type DockItemChipProps = {
    item: DockItem;
    active: boolean;
    onView: (item: DockItem) => void;
};

function DockItemChip({ item, active, onView }: DockItemChipProps) {
    const processing = isWorkerProcessing(item);
    const tooltip = `${displayTitle(item)}\n${itemStatusLabel(item)}`;

    return (
        <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{tooltip}</span>} placement="top">
            <Box
                role="button"
                tabIndex={0}
                onClick={() => onView(item)}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onView(item);
                    }
                }}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.6,
                    flex: '0 0 auto',
                    px: 0.9,
                    py: 0.4,
                    borderRadius: 1,
                    cursor: 'pointer',
                    bgcolor: active ? 'rgba(41,182,246,0.2)' : 'rgba(255,255,255,0.06)',
                    border: '1px solid',
                    borderColor: active ? '#29b6f6' : 'rgba(255,255,255,0.14)',
                    color: '#ffffff',
                    transition: 'background-color 120ms ease, border-color 120ms ease',
                    '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.14)',
                    },
                }}
            >
                {processing ? (
                    <CircularProgress size={12} thickness={6} sx={{ color: '#29b6f6', flex: '0 0 auto' }} />
                ) : (
                    <Box
                        component="span"
                        sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            flex: '0 0 auto',
                            bgcolor: statusDotColor(item),
                        }}
                    />
                )}
                <Typography
                    component="span"
                    sx={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2, whiteSpace: 'nowrap', color: '#ffffff' }}
                >
                    {item.id}
                </Typography>
            </Box>
        </Tooltip>
    );
}

/**
 * Dock "Pipeline short video" — 1 HÀNG item gọn: mỗi item là ID + trạng thái
 * (loading khi worker đang chạy, chấm màu khi đang đợi). Click item → mở đúng video.
 * Không có mở rộng/thu gọn.
 */
export default function ShortVideoPipelineDock() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    // Short video đang mở workspace (từ URL) — highlight item tương ứng.
    const activeShortVideoId = parseShortVideoAgentIdFromSearch(searchParams.toString());
    const [runningItems, setRunningItems] = React.useState<ActiveFullAutoPipelineItem[]>([]);
    const [pinnedItems, setPinnedItems] = React.useState<QuickPreviewItem[]>(() => readQuickPreviewList());
    // Worker chuyển giữa job con có thể khiến 1 nhịp poll trả rỗng — chỉ ẩn pipeline
    // đang chạy sau 2 nhịp liên tiếp để box không bị nhấp nháy.
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
        // Sắp xếp CỐ ĐỊNH theo id (tăng dần) — không đổi chỗ theo thời điểm vào/cập nhật.
        return list.sort((a, b) => Number(a.id) - Number(b.id));
    }, [runningItems, pinnedItems]);

    const handleView = React.useCallback((item: DockItem) => {
        navigate(openAgentVideoUrl(item));
    }, [navigate]);

    if (merged.length === 0) {
        return null;
    }

    return (
        <Paper
            elevation={8}
            sx={{
                position: 'fixed',
                left: 0,
                bottom: 0,
                zIndex: 1400,
                maxWidth: '100vw',
                bgcolor: 'rgba(9,12,16,0.97)',
                color: 'common.white',
                border: '1px solid rgba(255,255,255,0.16)',
                borderRight: 'none',
                borderBottom: 'none',
                borderRadius: '0 10px 0 0',
                overflow: 'hidden',
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 1,
                    py: 0.5,
                }}
            >
                <AccountTreeOutlinedIcon sx={{ fontSize: 16, color: '#29b6f6', flex: '0 0 auto' }} />
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.6,
                        flex: 1,
                        minWidth: 0,
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        py: 0.25,
                        '&::-webkit-scrollbar': { height: 6 },
                        '&::-webkit-scrollbar-thumb': {
                            bgcolor: 'rgba(255,255,255,0.25)',
                            borderRadius: 3,
                        },
                    }}
                >
                    {merged.map((item) => (
                        <DockItemChip
                            key={item.id}
                            item={item}
                            active={activeShortVideoId !== null && item.id === activeShortVideoId}
                            onView={handleView}
                        />
                    ))}
                </Box>
            </Box>
        </Paper>
    );
}
