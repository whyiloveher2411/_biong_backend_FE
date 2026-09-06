import React from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    IconButton,
    LinearProgress,
    Link,
    Menu,
    MenuItem,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import YouTubeIcon from '@mui/icons-material/YouTube';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SortIcon from '@mui/icons-material/Sort';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import DrawerCustom from 'components/molecules/DrawerCustom';
import useAjax from 'hook/useApi';

type CompetitorChannel = {
    id: number;
    title: string;
    channel_url: string;
    channel_handle?: string;
    avatar_url?: string;
    description?: string;
    last_crawled_at?: string | null;
    subscriber_count?: number;
    keywords?: string;
    avg_duration_sec?: number;
    avg_vph?: number;
    avg_lvr?: number;
    avg_lpd?: number;
    video_count?: number;
    total_views?: number;
    max_views?: number;
    avg_views?: number;
};

type CompetitorVideo = {
    id: number;
    title: string;
    video_url: string;
    video_id: string;
    published_at: string;
    publish_date?: string;
    duration_sec?: number;
    age_days?: number;
    vph?: number;
    like_count?: number;
    comment_count?: number;
    lvr?: number;
    ler?: number;
    lpd?: number;
    eps?: number;
    view_count: number;
    thumbnail_url: string;
    tags?: string;
    description?: string;
};

type ChannelVideosResponse = {
    success?: boolean;
    count?: number;
    stats?: {
        video_count?: number;
        total_views?: number;
        max_views?: number;
        avg_views?: number;
        avg_duration_sec?: number;
        avg_vph?: number;
        avg_lvr?: number;
        avg_lpd?: number;
    };
    channel?: {
        title?: string;
        channel_url?: string;
        channel_handle?: string;
        avatar_url?: string;
        subscriber_count?: number;
        keywords?: string;
        avg_duration_sec?: number;
        avg_vph?: number;
        avg_lvr?: number;
        avg_lpd?: number;
        last_crawled_at?: string | null;
    };
    items?: CompetitorVideo[];
    message?: { content?: string } | string;
};

type Props = {
    open: boolean;
    onClose: () => void;
};

type VideoFilter = 'all' | 'hot' | 'explode';

type VideoSort = 'newest' | 'view' | 'like' | 'eps' | 'vph' | 'lpd' | 'lvr';

const HOT_VPH_MULTIPLIER = 2;
const EXPLODE_TOP_LIMIT = 10;

const VIDEO_SORT_OPTIONS: Array<{ key: VideoSort; label: string }> = [
    { key: 'view', label: 'View' },
    { key: 'newest', label: 'Mới nhất' },
    { key: 'like', label: 'Like' },
    { key: 'eps', label: 'Bùng nổ (EPS)' },
    { key: 'vph', label: 'Nổi bật (VPH)' },
    { key: 'lpd', label: 'LPD' },
    { key: 'lvr', label: 'LVR' },
];

const CRAWL_STEPS = [
    { key: 'open', label: 'Mở kênh YouTube (tab Videos)' },
    { key: 'scroll', label: 'Cuộn tải toàn bộ video' },
    { key: 'dates', label: 'Lấy ngày đăng chính xác từng video' },
    { key: 'save', label: 'Lưu dữ liệu video' },
];

function parseApiMessage(res: unknown): string {
    if (!res || typeof res !== 'object') return 'Yêu cầu thất bại';
    const r = res as { message?: { content?: string } | string };
    if (typeof r.message === 'string') return r.message;
    if (r.message && typeof r.message === 'object' && r.message.content) {
        return r.message.content;
    }
    return 'Yêu cầu thất bại';
}

function formatViews(value: number | undefined | null): string {
    const v = Number(value || 0);
    if (!Number.isFinite(v) || v <= 0) return '0';
    if (v >= 1e9) return `${(v / 1e9).toFixed(1).replace('.0', '')} Tỷ`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(1).replace('.0', '')} Tr`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(1).replace('.0', '')} N`;
    return v.toLocaleString('vi-VN');
}

function formatDurationSec(value: number | undefined | null): string {
    const total = Math.round(Number(value || 0));
    if (!Number.isFinite(total) || total <= 0) return '';
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const ss = String(s).padStart(2, '0');
    if (h > 0) {
        return `${h}:${String(m).padStart(2, '0')}:${ss}`;
    }
    return `${m}:${ss}`;
}

function formatVph(value: number | undefined | null, unit: 'hour' | 'day' = 'hour'): string {
    const v = Number(value || 0);
    if (!Number.isFinite(v) || v <= 0) return '0';
    const suffix = unit === 'hour' ? '/giờ' : '/ngày';
    if (v >= 1e6) return `${(v / 1e6).toFixed(1).replace('.0', '')}Tr${suffix}`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(1).replace('.0', '')}N${suffix}`;
    if (v >= 10) return `${Math.round(v).toLocaleString('vi-VN')}${suffix}`;
    return v.toFixed(1);
}

function formatPercent(value: number | undefined | null): string {
    const v = Number(value || 0);
    if (!Number.isFinite(v) || v <= 0) return '0%';
    return `${v.toFixed(v < 10 ? 1 : 0).replace('.0', '')}%`;
}

function formatScore(value: number | undefined | null): string {
    const v = Number(value || 0);
    if (!Number.isFinite(v) || v <= 0) return '0';
    if (v >= 1e9) return `${(v / 1e9).toFixed(1).replace('.0', '')}Tỷ`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(1).replace('.0', '')}Tr`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(1).replace('.0', '')}N`;
    if (v >= 100) return Math.round(v).toLocaleString('vi-VN');
    return v.toFixed(1).replace('.0', '');
}

function computeEps(video: { vph?: number; lpd?: number; lvr?: number }): number {
    return Math.round(
        ((video.vph || 0) * 0.4 + (video.lpd || 0) * 0.3 + (video.lvr || 0) * 10 * 0.3) * 100,
    ) / 100;
}

function formatCrawlDate(value: string | null | undefined): string {
    return String(value || '').slice(5, 16).replace('-', '/');
}

function StatItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }): JSX.Element {
    return (
        <Box sx={{ minWidth: 0 }}>
            <Typography
                variant="caption"
                sx={{
                    display: 'block',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.4,
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                    color: 'text.disabled',
                }}
            >
                {label}
            </Typography>
            <Typography
                sx={{
                    fontWeight: 700,
                    fontSize: '1rem',
                    lineHeight: 1.3,
                    fontVariantNumeric: 'tabular-nums',
                    color: highlight ? 'primary.main' : 'text.primary',
                }}
                noWrap
            >
                {value}
            </Typography>
        </Box>
    );
}

const STAT_GRID_SX = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
    gap: 1.5,
} as const;

const STAT_GROUP_SX = {
    p: 1.25,
    borderRadius: 1,
    bgcolor: 'action.hover',
} as const;

const STAT_GROUP_LABEL_SX = {
    display: 'block',
    mb: 1,
    fontWeight: 700,
    fontSize: '0.65rem',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: 'text.secondary',
} as const;

function isValidYouTubeChannelUrl(raw: string): boolean {
    const url = raw.trim();
    if (!url) return false;
    try {
        const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;
        const parsed = new URL(withProtocol);
        const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
        if (host !== 'youtube.com' && !host.endsWith('.youtube.com')) return false;
        const path = parsed.pathname.replace(/\/+$/, '');
        return /\/(@|channel\/|c\/|user\/)/.test(path) || /^@/.test(url.trim());
    } catch {
        return /youtube\.com\/(@|channel\/|c\/|user\/)/i.test(url) || /^@[^\s/]+$/.test(url.trim());
    }
}

function normalizeTag(value: string): string {
    return String(value || '').trim().toLowerCase();
}

function extractHashtags(description: string | undefined | null): string[] {
    const matches = String(description || '').match(/#[^\s#,.\n]{1,60}/g) || [];
    return matches
        .map((raw) => raw.slice(1).replace(/[!?:;.,)"'…]+$/g, '').trim())
        .filter((tag) => tag.length > 1);
}

export default function MarketingCompetitorChannelDrawer({ open, onClose }: Props) {
    const api = useAjax();
    const apiAjaxRef = React.useRef(api.ajax);
    apiAjaxRef.current = api.ajax;

    const [view, setView] = React.useState<'list' | 'detail'>('list');
    const [channels, setChannels] = React.useState<CompetitorChannel[]>([]);
    const [loadingChannels, setLoadingChannels] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [info, setInfo] = React.useState<string | null>(null);

    const [showAddForm, setShowAddForm] = React.useState(false);
    const [newTitle, setNewTitle] = React.useState('');
    const [newUrl, setNewUrl] = React.useState('');
    const [creating, setCreating] = React.useState(false);

    const [currentChannel, setCurrentChannel] = React.useState<CompetitorChannel | null>(null);
    const [videos, setVideos] = React.useState<CompetitorVideo[]>([]);
    const [videoStats, setVideoStats] = React.useState<ChannelVideosResponse['stats'] | undefined>(undefined);
    const [loadingVideos, setLoadingVideos] = React.useState(false);
    const [crawling, setCrawling] = React.useState(false);
    const [crawlStep, setCrawlStep] = React.useState(0);
    const [deletingId, setDeletingId] = React.useState<number | null>(null);
    const [videoFilter, setVideoFilter] = React.useState<VideoFilter>('all');
    const [videoSort, setVideoSort] = React.useState<VideoSort>('view');
    const [expandedVideoId, setExpandedVideoId] = React.useState<number | null>(null);
    const [copyMenuAnchor, setCopyMenuAnchor] = React.useState<HTMLElement | null>(null);
    const [sortMenuAnchor, setSortMenuAnchor] = React.useState<HTMLElement | null>(null);

    React.useEffect(() => {
        if (!open) {
            setView('list');
            setChannels([]);
            setError(null);
            setInfo(null);
            setShowAddForm(false);
            setNewTitle('');
            setNewUrl('');
            setCurrentChannel(null);
            setVideos([]);
            setVideoStats(undefined);
            setCrawling(false);
            setCrawlStep(0);
            setVideoFilter('all');
            setVideoSort('view');
            setExpandedVideoId(null);
            setCopyMenuAnchor(null);
            setSortMenuAnchor(null);
        }
    }, [open]);

    const loadChannels = React.useCallback((opts?: { silent?: boolean }) => {
        if (!opts?.silent) {
            setLoadingChannels(true);
        }
        setError(null);

        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/competitor-channel/list',
            method: 'POST',
            data: {},
            loading: false,
            success: (res: { success?: boolean; items?: CompetitorChannel[] }) => {
                if (!opts?.silent) {
                    setLoadingChannels(false);
                }
                if (!res?.success) {
                    setError(parseApiMessage(res));
                    return;
                }
                setChannels(Array.isArray(res.items) ? res.items : []);
            },
            error: (err: unknown) => {
                if (!opts?.silent) {
                    setLoadingChannels(false);
                }
                setError(parseApiMessage(err));
            },
        });
    }, []);

    const loadVideos = React.useCallback((channelId: number, opts?: { silent?: boolean }) => {
        if (!opts?.silent) {
            setLoadingVideos(true);
        }

        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/competitor-channel/videos',
            method: 'POST',
            data: { channel_id: channelId },
            loading: false,
            success: (res: ChannelVideosResponse) => {
                if (!opts?.silent) {
                    setLoadingVideos(false);
                }
                if (!res?.success) {
                    setError(parseApiMessage(res));
                    return;
                }
                setVideos(Array.isArray(res.items) ? res.items : []);
                setVideoStats(res.stats);
                if (res.channel) {
                    setCurrentChannel((prev) => (prev ? {
                        ...prev,
                        title: res.channel?.title || prev.title,
                        avatar_url: res.channel?.avatar_url || prev.avatar_url,
                        subscriber_count: res.channel?.subscriber_count || prev.subscriber_count,
                        keywords: res.channel?.keywords || prev.keywords,
                        avg_duration_sec: res.channel?.avg_duration_sec || prev.avg_duration_sec,
                        avg_vph: res.channel?.avg_vph || prev.avg_vph,
                        avg_lvr: res.channel?.avg_lvr || prev.avg_lvr,
                        avg_lpd: res.channel?.avg_lpd || prev.avg_lpd,
                        last_crawled_at: res.channel?.last_crawled_at ?? prev.last_crawled_at,
                    } : prev));
                }
            },
            error: (err: unknown) => {
                if (!opts?.silent) {
                    setLoadingVideos(false);
                }
                setError(parseApiMessage(err));
            },
        });
    }, []);

    React.useEffect(() => {
        if (open) {
            loadChannels();
        }
    }, [open, loadChannels]);

    React.useEffect(() => {
        if (!crawling) return undefined;
        setCrawlStep(0);
        const timers = [
            window.setTimeout(() => setCrawlStep(1), 6000),
            window.setTimeout(() => setCrawlStep(2), 30000),
            window.setTimeout(() => setCrawlStep(3), 60000),
        ];
        return () => timers.forEach((t) => window.clearTimeout(t));
    }, [crawling]);

    const handleOpenDetail = (channel: CompetitorChannel) => {
        setCurrentChannel(channel);
        setVideos([]);
        setVideoStats(undefined);
        setError(null);
        setInfo(null);
        setVideoFilter('all');
        setExpandedVideoId(null);
        setView('detail');
        loadVideos(channel.id);
    };

    const handleBackToList = () => {
        setView('list');
        setCurrentChannel(null);
        setVideos([]);
        setVideoStats(undefined);
        setError(null);
        setInfo(null);
        loadChannels({ silent: true });
    };

    const handleCrawl = () => {
        if (!currentChannel || crawling) return;
        setCrawling(true);
        setError(null);
        setInfo(null);

        api.ajax({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/competitor-channel/crawl',
            method: 'POST',
            data: { channel_id: currentChannel.id },
            loading: false,
            success: (res: {
                success?: boolean;
                persist?: { added?: number; updated?: number; failed?: number; total?: number };
            }) => {
                setCrawling(false);
                setCrawlStep(CRAWL_STEPS.length);
                if (!res?.success) {
                    setError(parseApiMessage(res));
                    return;
                }
                const added = Number(res.persist?.added || 0);
                const updated = Number(res.persist?.updated || 0);
                setInfo(`Lấy data xong: ${added} video mới, ${updated} video cập nhật`);
                loadVideos(currentChannel.id, { silent: true });
                loadChannels({ silent: true });
            },
            error: (err: unknown) => {
                setCrawling(false);
                setCrawlStep(0);
                setError(parseApiMessage(err));
            },
        });
    };

    const handleCreate = () => {
        const title = newTitle.trim();
        const url = newUrl.trim();
        if (!title) {
            setError('Nhập tên kênh');
            return;
        }
        if (!isValidYouTubeChannelUrl(url)) {
            setError('URL không phải link kênh YouTube hợp lệ (/@handle hoặc /channel/UC...)');
            return;
        }

        setCreating(true);
        setError(null);
        setInfo(null);

        api.ajax({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/competitor-channel/create',
            method: 'POST',
            data: { title, channel_url: url },
            loading: false,
            success: (res: { success?: boolean; channel_id?: number }) => {
                setCreating(false);
                if (!res?.success) {
                    setError(parseApiMessage(res));
                    return;
                }
                setInfo('Đã thêm kênh');
                setShowAddForm(false);
                setNewTitle('');
                setNewUrl('');
                loadChannels({ silent: true });
            },
            error: (err: unknown) => {
                setCreating(false);
                setError(parseApiMessage(err));
            },
        });
    };

    const handleDelete = (channel: CompetitorChannel) => {
        if (!window.confirm(`Xoá kênh "${channel.title}"?`)) return;
        setDeletingId(channel.id);
        setError(null);
        setInfo(null);

        api.ajax({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/competitor-channel/delete',
            method: 'POST',
            data: { channel_id: channel.id },
            loading: false,
            success: (res: { success?: boolean }) => {
                setDeletingId(null);
                if (!res?.success) {
                    setError(parseApiMessage(res));
                    return;
                }
                setInfo('Đã xoá kênh');
                loadChannels({ silent: true });
            },
            error: (err: unknown) => {
                setDeletingId(null);
                setError(parseApiMessage(err));
            },
        });
    };

    const renderChannelRow = (channel: CompetitorChannel) => (
        <Box
            key={channel.id}
            sx={{
                p: 1.5,
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
            }}
        >
            {channel.avatar_url ? (
                <Box
                    component="img"
                    src={channel.avatar_url}
                    alt={channel.title}
                    onClick={() => handleOpenDetail(channel)}
                    sx={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        bgcolor: 'action.hover',
                        flexShrink: 0,
                        cursor: 'pointer',
                    }}
                />
            ) : (
                <YouTubeIcon color="error" sx={{ flexShrink: 0, cursor: 'pointer' }} onClick={() => handleOpenDetail(channel)} />
            )}
            <Box sx={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => handleOpenDetail(channel)}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }} noWrap>
                    {channel.title}
                </Typography>
                <Typography
                    variant="caption"
                    sx={{ display: 'block', mt: 0.25, fontWeight: 500, color: 'text.secondary' }}
                    noWrap
                >
                    {[
                        channel.channel_handle || '',
                        channel.subscriber_count ? `${formatViews(channel.subscriber_count)} sub` : '',
                        `${channel.video_count ?? 0} video`,
                    ].filter(Boolean).join(' · ')}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', mt: 0.25, color: 'text.disabled' }} noWrap>
                    {formatViews(channel.total_views)} view
                    {channel.avg_vph ? (
                        <Box component="span" sx={{ color: 'primary.main', fontWeight: 600 }}>
                            {' · '}
                            {`VPH TB ${formatVph(channel.avg_vph)}`}
                        </Box>
                    ) : null}
                    {channel.last_crawled_at
                        ? ` · Lấy data: ${formatCrawlDate(channel.last_crawled_at)}`
                        : ' · Chưa lấy data'}
                </Typography>
            </Box>
            <Tooltip title="Mở trang chủ kênh">
                <span>
                    <IconButton
                        size="small"
                        href={channel.channel_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        disabled={!channel.channel_url}
                    >
                        <OpenInNewIcon fontSize="small" />
                    </IconButton>
                </span>
            </Tooltip>
            <Tooltip title="Xoá kênh">
                <span>
                    <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(channel)}
                        disabled={deletingId === channel.id}
                    >
                        {deletingId === channel.id ? (
                            <CircularProgress size={18} />
                        ) : (
                            <DeleteOutlineIcon fontSize="small" />
                        )}
                    </IconButton>
                </span>
            </Tooltip>
        </Box>
    );

    const renderList = () => (
        <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle2">Danh sách kênh ({channels.length})</Typography>
                <Stack direction="row" spacing={0.75}>
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<AddIcon fontSize="small" />}
                        onClick={() => setShowAddForm((v) => !v)}
                        sx={{ textTransform: 'none' }}
                    >
                        Thêm kênh
                    </Button>
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<RefreshIcon fontSize="small" />}
                        onClick={() => loadChannels()}
                        sx={{ textTransform: 'none' }}
                    >
                        Làm mới
                    </Button>
                </Stack>
            </Stack>

            {showAddForm && (
                <Box
                    sx={{
                        p: 1.5,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                    }}
                >
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                        Thêm kênh đối thủ
                    </Typography>
                    <Stack spacing={1.5}>
                        <TextField
                            fullWidth
                            size="small"
                            label="Tên kênh"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            disabled={creating}
                        />
                        <TextField
                            fullWidth
                            size="small"
                            label="Trang chủ kênh (YouTube)"
                            placeholder="https://www.youtube.com/@handle hoặc /channel/UC..."
                            value={newUrl}
                            onChange={(e) => setNewUrl(e.target.value)}
                            disabled={creating}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !creating) {
                                    handleCreate();
                                }
                            }}
                        />
                        <Stack direction="row" justifyContent="flex-end" spacing={1}>
                            <Button
                                size="small"
                                onClick={() => {
                                    setShowAddForm(false);
                                    setNewTitle('');
                                    setNewUrl('');
                                }}
                                sx={{ textTransform: 'none' }}
                            >
                                Huỷ
                            </Button>
                            <Button
                                variant="contained"
                                size="small"
                                onClick={handleCreate}
                                disabled={creating}
                                sx={{ textTransform: 'none' }}
                            >
                                {creating ? 'Đang thêm…' : 'Thêm kênh'}
                            </Button>
                        </Stack>
                    </Stack>
                </Box>
            )}

            {loadingChannels && <LinearProgress sx={{ borderRadius: 1 }} />}

            {channels.length === 0 && !loadingChannels ? (
                <Alert severity="info">Chưa có kênh đối thủ nào. Bấm &quot;Thêm kênh&quot; để thêm kênh YouTube.</Alert>
            ) : (
                <Stack spacing={1}>
                    {channels.map((channel) => renderChannelRow(channel))}
                </Stack>
            )}
        </Stack>
    );

    const renderDetail = () => {
        const hotThreshold = (videoStats?.avg_vph || 0) * HOT_VPH_MULTIPLIER;
        const hotVideos = videos.filter((video) => (video.vph || 0) > 0 && (video.vph || 0) >= hotThreshold);
        const durationLabel = formatDurationSec(videoStats?.avg_duration_sec);

        const epsOf = (video: CompetitorVideo): number => ((video.eps || 0) > 0 ? (video.eps as number) : computeEps(video));
        const explodeVideos = videos
            .map((video) => ({ video, eps: epsOf(video) }))
            .filter((item) => item.eps > 0)
            .sort((a, b) => b.eps - a.eps)
            .slice(0, EXPLODE_TOP_LIMIT)
            .map((item) => item.video);
        const explodeIds = new Set(explodeVideos.map((video) => video.id || video.video_id));
        const displayVideos = videoFilter === 'hot'
            ? hotVideos
            : videoFilter === 'explode'
                ? explodeVideos
                : videos;

        const publishMsOf = (video: CompetitorVideo): number => {
            if (video.publish_date) {
                const ms = Date.parse(`${video.publish_date}T00:00:00Z`);
                if (Number.isFinite(ms)) return ms;
            }
            return Date.now() - (video.age_days || 0) * 86400000;
        };
        const sortedVideos = (() => {
            const arr = [...displayVideos];
            switch (videoSort) {
                case 'newest':
                    return arr.sort((a, b) => publishMsOf(b) - publishMsOf(a));
                case 'like':
                    return arr.sort((a, b) => (b.like_count || 0) - (a.like_count || 0));
                case 'eps':
                    return arr.sort((a, b) => epsOf(b) - epsOf(a));
                case 'vph':
                    return arr.sort((a, b) => (b.vph || 0) - (a.vph || 0));
                case 'lpd':
                    return arr.sort((a, b) => (b.lpd || 0) - (a.lpd || 0));
                case 'lvr':
                    return arr.sort((a, b) => (b.lvr || 0) - (a.lvr || 0));
                default:
                    return arr.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
            }
        })();

        const handleCopyTopEps = (limit: number) => {
            setCopyMenuAnchor(null);
            const titles = explodeVideos.slice(0, limit).map((video) => video.title).join('\n');
            if (!titles) {
                setError('Chưa có video nào có điểm bùng nổ');
                return;
            }
            navigator.clipboard.writeText(titles)
                .then(() => setInfo(`Đã copy title ${Math.min(limit, explodeVideos.length)} video bùng nổ nhất`))
                .catch(() => setError('Không copy được vào clipboard'));
        };

        // Thống kê: keyword kênh × số lần xuất hiện trong tags video
        const channelKeywordList = (currentChannel?.keywords || '')
            .split(',')
            .map(normalizeTag)
            .filter(Boolean)
            .slice(0, 40);

        // Thống kê: mỗi video tag xuất hiện ở bao nhiêu video của kênh
        const tagCountMap: Record<string, number> = {};
        videos.forEach((video) => {
            (video.tags || '')
                .split(',')
                .map(normalizeTag)
                .filter(Boolean)
                .forEach((tag) => {
                    tagCountMap[tag] = (tagCountMap[tag] || 0) + 1;
                });
        });

        // Thống kê: mỗi hashtag (từ description) xuất hiện ở bao nhiêu video
        const hashtagCountMap: Record<string, number> = {};
        videos.forEach((video) => {
            extractHashtags(video.description).forEach((tag) => {
                const key = normalizeTag(tag);
                hashtagCountMap[key] = (hashtagCountMap[key] || 0) + 1;
            });
        });

        const keywordCountList = channelKeywordList
            .map((keyword) => ({
                keyword,
                count: videos.reduce((acc, video) => {
                    const videoTags = (video.tags || '')
                        .split(',')
                        .map(normalizeTag)
                        .filter(Boolean);
                    return acc + (videoTags.some((tag) => tag.includes(keyword)) ? 1 : 0);
                }, 0),
            }))
            .sort((a, b) => b.count - a.count);

        return (
        <Stack spacing={2}>
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
                    <IconButton size="small" onClick={handleBackToList}>
                        <ArrowBackIcon fontSize="small" />
                    </IconButton>
                    {currentChannel?.avatar_url ? (
                        <Box
                            component="img"
                            src={currentChannel.avatar_url}
                            alt={currentChannel.title}
                            sx={{
                                width: 48,
                                height: 48,
                                borderRadius: '50%',
                                objectFit: 'cover',
                                bgcolor: 'action.hover',
                                flexShrink: 0,
                            }}
                        />
                    ) : (
                        <YouTubeIcon color="error" sx={{ flexShrink: 0, fontSize: 48 }} />
                    )}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }} noWrap>
                            {currentChannel?.title || 'Kênh'}
                        </Typography>
                        <Typography
                            variant="caption"
                            sx={{ display: 'block', fontWeight: 600, color: 'text.secondary' }}
                            noWrap
                        >
                            {[
                                currentChannel?.channel_handle || '',
                                currentChannel?.subscriber_count ? `${formatViews(currentChannel.subscriber_count)} sub` : '',
                                videoStats?.video_count ? `${videoStats.video_count} video` : '',
                            ].filter(Boolean).join(' · ') || '—'}
                        </Typography>
                    </Box>
                </Stack>
                <Button
                    size="small"
                    variant="contained"
                    startIcon={<RefreshIcon fontSize="small" />}
                    onClick={handleCrawl}
                    disabled={crawling}
                    sx={{ textTransform: 'none', flexShrink: 0 }}
                >
                    {crawling ? 'Đang lấy data…' : 'Lấy data'}
                </Button>
            </Stack>
            {currentChannel?.channel_url ? (
                <Link
                    href={currentChannel.channel_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="caption"
                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: -1.5 }}
                >
                    {currentChannel.channel_url}
                    <OpenInNewIcon sx={{ fontSize: 12 }} />
                </Link>
            ) : null}

            {crawling && (
                <Box>
                    <LinearProgress sx={{ mb: 1.5, borderRadius: 1 }} />
                    <Stack spacing={0.75}>
                        {CRAWL_STEPS.map((step, idx) => {
                            const done = crawlStep > idx;
                            const active = crawlStep === idx;
                            return (
                                <Stack key={step.key} direction="row" spacing={1} alignItems="center">
                                    {done ? (
                                        <CheckCircleOutlineIcon fontSize="small" color="success" />
                                    ) : (
                                        <RadioButtonUncheckedIcon fontSize="small" color={active ? 'primary' : 'disabled'} />
                                    )}
                                    <Typography
                                        variant="body2"
                                        color={done || active ? 'text.primary' : 'text.secondary'}
                                        sx={{ fontWeight: active ? 600 : 400 }}
                                    >
                                        {step.label}
                                        {active ? '…' : ''}
                                    </Typography>
                                </Stack>
                            );
                        })}
                    </Stack>
                </Box>
            )}

            {videoStats && (
                <Box
                    sx={{
                        p: 1.5,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                    }}
                >
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'block', mb: 1.25 }}>
                        Thống kê kênh
                    </Typography>

                    <Box sx={STAT_GROUP_SX}>
                        <Typography variant="caption" sx={STAT_GROUP_LABEL_SX}>
                            Quy mô
                        </Typography>
                        <Box sx={STAT_GRID_SX}>
                            {currentChannel?.subscriber_count ? (
                                <StatItem label="Subscribers" value={formatViews(currentChannel.subscriber_count)} />
                            ) : null}
                            <StatItem label="Video" value={`${videoStats.video_count || 0}`} />
                            <StatItem label="View tổng" value={formatViews(videoStats.total_views)} />
                        </Box>
                    </Box>

                    {videoStats.avg_views || videoStats.max_views || durationLabel ? (
                        <Box sx={{ ...STAT_GROUP_SX, mt: 1.25 }}>
                            <Typography variant="caption" sx={STAT_GROUP_LABEL_SX}>
                                Trung bình mỗi video
                            </Typography>
                            <Box sx={STAT_GRID_SX}>
                                <StatItem label="View TB" value={formatViews(videoStats.avg_views)} />
                                <StatItem label="Max view" value={formatViews(videoStats.max_views)} />
                                {durationLabel ? (
                                    <StatItem label="Dài TB" value={durationLabel} />
                                ) : null}
                            </Box>
                        </Box>
                    ) : null}

                    {videoStats.avg_vph || videoStats.avg_lpd || videoStats.avg_lvr ? (
                        <Box sx={{ ...STAT_GROUP_SX, mt: 1.25 }}>
                            <Typography variant="caption" sx={STAT_GROUP_LABEL_SX}>
                                Tăng trưởng theo thời gian
                            </Typography>
                            <Box sx={STAT_GRID_SX}>
                                {videoStats.avg_vph ? (
                                    <Tooltip title="VPH trung bình — lượt xem trung bình mỗi giờ của video kênh (views / (ngày đăng × 24))">
                                        <Box>
                                            <StatItem label="VPH TB" value={formatVph(videoStats.avg_vph)} highlight />
                                        </Box>
                                    </Tooltip>
                                ) : null}
                                {videoStats.avg_lpd ? (
                                    <Tooltip title="LPD trung bình — lượt like trung bình mỗi ngày của video kênh">
                                        <Box>
                                            <StatItem label="LPD TB" value={formatVph(videoStats.avg_lpd, 'day')} />
                                        </Box>
                                    </Tooltip>
                                ) : null}
                                {videoStats.avg_lvr ? (
                                    <Tooltip title="LVR trung bình — tỷ lệ like/view trung bình của video kênh">
                                        <Box>
                                            <StatItem label="LVR TB" value={formatPercent(videoStats.avg_lvr)} />
                                        </Box>
                                    </Tooltip>
                                ) : null}
                            </Box>
                        </Box>
                    ) : null}

                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1.25 }}>
                        {currentChannel?.last_crawled_at
                            ? `Lấy data gần nhất: ${currentChannel.last_crawled_at}`
                            : 'Chưa lấy data'}
                    </Typography>
                </Box>
            )}

            {keywordCountList.length > 0 ? (
                <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                        Keyword kênh ({keywordCountList.length}) — số video có tags chứa keyword
                    </Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {keywordCountList.map(({ keyword, count }) => (
                            <Tooltip key={keyword} title={`Xuất hiện trong tags của ${count} video của kênh`}>
                                <Chip
                                    size="small"
                                    label={`${keyword} × ${count}`}
                                    variant="outlined"
                                    sx={count > 0
                                        ? { borderColor: 'primary.main', color: 'primary.main', fontWeight: 600 }
                                        : { opacity: 0.55 }}
                                />
                            </Tooltip>
                        ))}
                    </Stack>
                </Box>
            ) : (
                <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                        Keyword kênh
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                        Kênh chưa đặt keyword trên YouTube (channel keywords trong cài đặt kênh) — các chỉ số khác vẫn hoạt động bình thường.
                    </Typography>
                </Box>
            )}

            {loadingVideos && <LinearProgress sx={{ borderRadius: 1 }} />}

            {videos.length > 0 && (
                <Stack
                    direction="row"
                    spacing={0.75}
                    flexWrap="wrap"
                    useFlexGap
                    alignItems="center"
                    justifyContent="space-between"
                >
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
                        {hotVideos.length > 0 || explodeVideos.length > 0 ? (
                            <Chip
                                size="small"
                                label={`Tất cả (${videos.length})`}
                                color={videoFilter === 'all' ? 'primary' : 'default'}
                                variant={videoFilter === 'all' ? 'filled' : 'outlined'}
                                onClick={() => setVideoFilter('all')}
                                sx={{ textTransform: 'none' }}
                            />
                        ) : null}
                        {hotVideos.length > 0 ? (
                            <Tooltip title={`Video có VPH ≥ ${HOT_VPH_MULTIPLIER}× VPH trung bình kênh — nội dung đang được đẩy mạnh`}>
                                <Chip
                                    size="small"
                                    icon={<WhatshotIcon fontSize="small" />}
                                    label={`Nổi bật (${hotVideos.length})`}
                                    color={videoFilter === 'hot' ? 'warning' : 'default'}
                                    variant={videoFilter === 'hot' ? 'filled' : 'outlined'}
                                    onClick={() => setVideoFilter('hot')}
                                    sx={{ textTransform: 'none' }}
                                />
                            </Tooltip>
                        ) : null}
                        {explodeVideos.length > 0 ? (
                            <React.Fragment>
                                <Tooltip title={`Top ${EXPLODE_TOP_LIMIT} video có Điểm bùng nổ (EPS) cao nhất`}>
                                    <Chip
                                        size="small"
                                        icon={<RocketLaunchIcon fontSize="small" />}
                                        label={`Bùng nổ (${explodeVideos.length})`}
                                        color={videoFilter === 'explode' ? 'primary' : 'default'}
                                        variant={videoFilter === 'explode' ? 'filled' : 'outlined'}
                                        onClick={() => setVideoFilter('explode')}
                                        sx={{ textTransform: 'none' }}
                                    />
                                </Tooltip>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<ContentCopyIcon fontSize="small" />}
                                    onClick={(e) => setCopyMenuAnchor(e.currentTarget)}
                                    sx={{ textTransform: 'none', flexShrink: 0 }}
                                >
                                    Copy title top
                                </Button>
                                <Menu
                                    anchorEl={copyMenuAnchor}
                                    open={Boolean(copyMenuAnchor)}
                                    onClose={() => setCopyMenuAnchor(null)}
                                >
                                    <MenuItem onClick={() => handleCopyTopEps(5)}>Top 5 EPS</MenuItem>
                                    <MenuItem onClick={() => handleCopyTopEps(10)}>Top 10 EPS</MenuItem>
                                </Menu>
                            </React.Fragment>
                        ) : null}
                    </Stack>

                    <Tooltip title="Sắp xếp video giảm dần theo chỉ số">
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<SortIcon fontSize="small" />}
                            onClick={(e) => setSortMenuAnchor(e.currentTarget)}
                            sx={{ textTransform: 'none', flexShrink: 0, ml: 'auto' }}
                        >
                            {`Sắp xếp: ${VIDEO_SORT_OPTIONS.find((option) => option.key === videoSort)?.label || 'View'}`}
                        </Button>
                    </Tooltip>
                    <Menu
                        anchorEl={sortMenuAnchor}
                        open={Boolean(sortMenuAnchor)}
                        onClose={() => setSortMenuAnchor(null)}
                    >
                        {VIDEO_SORT_OPTIONS.map((option) => (
                            <MenuItem
                                key={option.key}
                                selected={videoSort === option.key}
                                onClick={() => {
                                    setVideoSort(option.key);
                                    setSortMenuAnchor(null);
                                }}
                            >
                                {option.label}
                            </MenuItem>
                        ))}
                    </Menu>
                </Stack>
            )}

            {videos.length === 0 && !loadingVideos && !crawling ? (
                <Alert severity="info">
                    Chưa có dữ liệu video. Bấm &quot;Lấy data&quot; để mở headless browser lấy toàn bộ video của kênh.
                </Alert>
            ) : (
                <Stack spacing={1}>
                    {sortedVideos.map((video, index) => {
                        const isHot = (video.vph || 0) > 0 && (video.vph || 0) >= hotThreshold;
                        const isExpanded = expandedVideoId === video.id;
                        const videoTags = [...new Set((video.tags || '')
                            .split(',')
                            .map(normalizeTag)
                            .filter(Boolean))]
                            .sort((a, b) => (tagCountMap[b] || 0) - (tagCountMap[a] || 0));
                        const videoHashtags = [...new Set(extractHashtags(video.description)
                            .map(normalizeTag)
                            .filter(Boolean))]
                            .sort((a, b) => (hashtagCountMap[b] || 0) - (hashtagCountMap[a] || 0));
                        return (
                        <Box
                            key={video.id || video.video_id}
                            sx={{
                                p: 1,
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: isHot ? 'warning.main' : 'divider',
                                bgcolor: 'background.paper',
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ width: 22, textAlign: 'right', flexShrink: 0, fontWeight: 600, pt: 0.25 }}
                                >
                                    {index + 1}
                                </Typography>
                                <Box
                                    sx={{
                                        flexShrink: 0,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 0.5,
                                    }}
                                >
                                    <Box
                                        component="img"
                                        src={video.thumbnail_url}
                                        alt=""
                                        loading="lazy"
                                        sx={{
                                            width: 80,
                                            height: 45,
                                            borderRadius: 0.5,
                                            objectFit: 'cover',
                                            bgcolor: 'action.hover',
                                        }}
                                    />
                                    {epsOf(video) > 0 ? (
                                        <Tooltip title={`EPS — Điểm bùng nổ = VPH×0.4 + LPD×0.3 + LVR×10×0.3${explodeIds.has(video.id || video.video_id) ? ' — Top bùng nổ của kênh' : ''}`}>
                                            <Chip
                                                size="small"
                                                label={`EPS ${formatScore(epsOf(video))}`}
                                                color={explodeIds.has(video.id || video.video_id) ? 'primary' : 'default'}
                                                variant={explodeIds.has(video.id || video.video_id) ? 'filled' : 'outlined'}
                                                sx={{
                                                    width: 80,
                                                    height: 18,
                                                    fontSize: 10,
                                                    '& .MuiChip-label': { px: 0.5 },
                                                }}
                                            />
                                        </Tooltip>
                                    ) : null}
                                    <Tooltip title="VPH — lượt xem trung bình mỗi giờ (views / (số ngày từ khi đăng × 24))">
                                        <Chip
                                            size="small"
                                            label={formatVph(video.vph)}
                                            color={isHot ? 'warning' : 'default'}
                                            variant={isHot ? 'filled' : 'outlined'}
                                            sx={{
                                                width: 80,
                                                height: 18,
                                                fontSize: 10,
                                                '& .MuiChip-label': { px: 0.5 },
                                            }}
                                        />
                                    </Tooltip>
                                    {(video.lpd || 0) > 0 ? (
                                        <Tooltip title="LPD — lượt like trung bình mỗi ngày (likes / số ngày từ khi đăng)">
                                            <Chip
                                                size="small"
                                                label={formatVph(video.lpd, 'day')}
                                                variant="outlined"
                                                sx={{
                                                    width: 80,
                                                    height: 18,
                                                    fontSize: 10,
                                                    color: 'success.main',
                                                    borderColor: 'success.main',
                                                    '& .MuiChip-label': { px: 0.5 },
                                                }}
                                            />
                                        </Tooltip>
                                    ) : null}
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
                                        {isHot ? (
                                            <Tooltip title="Nổi bật: VPH cao gấp nhiều lần trung bình kênh">
                                                <WhatshotIcon sx={{ fontSize: 16, color: 'warning.main', flexShrink: 0 }} />
                                            </Tooltip>
                                        ) : null}
                                        <Link
                                            href={video.video_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            variant="body2"
                                            sx={{ fontWeight: 500, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                                        >
                                            {video.title}
                                        </Link>
                                        {(video.lvr || 0) > 0 ? (
                                            <Tooltip
                                                title={(video.lvr || 0) < 1
                                                    ? `LVR ${formatPercent(video.lvr)} <1%: nghi clickbait hoặc view từ quảng cáo`
                                                    : (video.lvr || 0) < 2
                                                        ? `LVR ${formatPercent(video.lvr)}: trung bình (tốt từ 2–4%)`
                                                        : `LVR ${formatPercent(video.lvr)} ≥2%: mức tốt (định mức 2–4%)`}
                                            >
                                                <Chip
                                                    size="small"
                                                    label={`LVR ${formatPercent(video.lvr)}`}
                                                    color={(video.lvr || 0) >= 2 ? 'success' : (video.lvr || 0) < 1 ? 'error' : 'default'}
                                                    variant={(video.lvr || 0) >= 2 ? 'filled' : 'outlined'}
                                                    sx={{ height: 18, fontSize: 10, flexShrink: 0, '& .MuiChip-label': { px: 0.5 } }}
                                                />
                                            </Tooltip>
                                        ) : null}
                                        {(video.ler || 0) > 0 ? (
                                            <Tooltip
                                                title={(video.ler || 0) < 70
                                                    ? `LER ${formatPercent(video.ler)} <70%: nội dung gây tranh cãi mạnh`
                                                    : (video.ler || 0) < 90
                                                        ? `LER ${formatPercent(video.ler)}: 70–90%`
                                                        : `LER ${formatPercent(video.ler)} ≥90%: đồng thuận cao`}
                                            >
                                                <Chip
                                                    size="small"
                                                    label={`LER ${formatPercent(video.ler)}`}
                                                    color={(video.ler || 0) >= 90 ? 'success' : (video.ler || 0) < 70 ? 'error' : 'default'}
                                                    variant={(video.ler || 0) >= 90 ? 'filled' : 'outlined'}
                                                    sx={{ height: 18, fontSize: 10, flexShrink: 0, '& .MuiChip-label': { px: 0.5 } }}
                                                />
                                            </Tooltip>
                                        ) : null}
                                    </Stack>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                                        {[
                                            formatDurationSec(video.duration_sec),
                                            video.published_at || video.publish_date || '—',
                                            `${formatViews(video.view_count)} view`,
                                            (video.like_count || 0) > 0 ? `${formatViews(video.like_count)} like` : '',
                                        ].filter(Boolean).join(' · ')}
                                    </Typography>
                                    {videoTags.length > 0 && (
                                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                                            {videoTags.map((tag) => {
                                                const isKeywordTag = channelKeywordList.some((keyword) => tag.includes(keyword));
                                                return (
                                                    <Tooltip key={tag} title={`Tag xuất hiện ở ${tagCountMap[tag] || 1} video của kênh`}>
                                                        <Chip
                                                            size="small"
                                                            label={`${tag} × ${tagCountMap[tag] || 1}`}
                                                            color={isKeywordTag ? 'primary' : 'default'}
                                                            variant={isKeywordTag ? 'filled' : 'outlined'}
                                                            sx={{
                                                                height: 20,
                                                                fontSize: 11,
                                                                '& .MuiChip-label': { px: 0.75 },
                                                            }}
                                                        />
                                                    </Tooltip>
                                                );
                                            })}
                                        </Stack>
                                    )}
                                    {videoHashtags.length > 0 && (
                                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                                            {videoHashtags.map((tag) => (
                                                <Tooltip key={tag} title={`Hashtag xuất hiện ở ${hashtagCountMap[tag] || 1} video của kênh`}>
                                                    <Chip
                                                        size="small"
                                                        label={`#${tag} × ${hashtagCountMap[tag] || 1}`}
                                                        variant="outlined"
                                                        sx={{
                                                            height: 20,
                                                            fontSize: 11,
                                                            borderColor: 'info.main',
                                                            color: 'info.main',
                                                            '& .MuiChip-label': { px: 0.75 },
                                                        }}
                                                    />
                                                </Tooltip>
                                            ))}
                                        </Stack>
                                    )}
                                </Box>
                                <Tooltip title={isExpanded ? 'Thu gọn' : 'Xem mô tả'}>
                                    <span>
                                        <IconButton
                                            size="small"
                                            onClick={() => setExpandedVideoId(isExpanded ? null : video.id)}
                                            disabled={!video.description}
                                            sx={{ flexShrink: 0 }}
                                        >
                                            {isExpanded ? (
                                                <ExpandLessIcon fontSize="small" />
                                            ) : (
                                                <ExpandMoreIcon fontSize="small" />
                                            )}
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            </Box>

                            {isExpanded && video.description ? (
                                <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed', borderColor: 'divider' }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                        Mô tả
                                    </Typography>
                                    <Box
                                        sx={{
                                            maxHeight: 200,
                                            overflow: 'auto',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                            p: 1,
                                            borderRadius: 1,
                                            bgcolor: 'action.hover',
                                        }}
                                    >
                                        <Typography variant="caption" component="div">
                                            {video.description}
                                        </Typography>
                                    </Box>
                                </Box>
                            ) : null}
                        </Box>
                        );
                    })}
                </Stack>
            )}
        </Stack>
        );
    };

    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title="Phân tích kênh đối thủ"
            width={760}
            activeOnClose
            restDialogContent={{
                sx: {
                    pt: 2.5,
                    px: 3,
                    pb: 2,
                    backgroundColor: 'body.background',
                },
            }}
        >
            <Stack spacing={2} sx={{ pt: 2.5, pb: 1 }}>
                {error && (
                    <Alert severity="error" onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}
                {info && !error && (
                    <Alert severity="success" onClose={() => setInfo(null)}>
                        {info}
                    </Alert>
                )}

                {view === 'list' ? renderList() : renderDetail()}
            </Stack>
        </DrawerCustom>
    );
}
