import React from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
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
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import YouTubeIcon from '@mui/icons-material/YouTube';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SortIcon from '@mui/icons-material/Sort';
import SearchIcon from '@mui/icons-material/Search';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import useAjax from 'hook/useApi';

type KeywordRecord = {
    id: number;
    keyword: string;
    last_crawled_at?: string | null;
    max_videos?: number;
    video_count?: number;
    total_views?: number;
    max_views?: number;
    avg_views?: number;
    avg_duration_sec?: number;
    avg_vph?: number;
    avg_lvr?: number;
    avg_lpd?: number;
};

type KeywordVideo = {
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
    channel_name?: string;
    channel_url?: string;
    channel_handle?: string;
    channel_avatar_url?: string;
};

type KeywordVideosResponse = {
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
    keyword?: {
        id?: number;
        keyword?: string;
        last_crawled_at?: string | null;
    };
    items?: KeywordVideo[];
    message?: { content?: string } | string;
};

type Props = {
    onChannelAdded?: () => void;
};

type VideoFilter = 'all' | 'hot' | 'explode';
type VideoSort = 'newest' | 'view' | 'like' | 'eps' | 'vph' | 'lpd' | 'lvr';
type DateRange = 'all' | '7d' | '1m' | '3m' | '6m';

const HOT_VPH_MULTIPLIER = 2;
const EXPLODE_TOP_LIMIT = 10;
const DEFAULT_MAX_VIDEOS = 30;
const MAX_MAX_VIDEOS = 200;

const DATE_RANGE_OPTIONS: Array<{ key: DateRange; label: string }> = [
    { key: 'all', label: 'Tất cả' },
    { key: '7d', label: '7 ngày gần đây' },
    { key: '1m', label: '1 tháng gần đây' },
    { key: '3m', label: '3 tháng gần đây' },
    { key: '6m', label: '6 tháng gần đây' },
];

const VIDEO_SORT_OPTIONS: Array<{ key: VideoSort; label: string }> = [
    { key: 'view', label: 'View' },
    { key: 'newest', label: 'Mới nhất' },
    { key: 'like', label: 'Like' },
    { key: 'eps', label: 'Bùng nổ (EPS)' },
    { key: 'vph', label: 'Nổi bật (VPH)' },
    { key: 'lpd', label: 'LPD' },
    { key: 'lvr', label: 'LVR' },
];

const VIDEO_FILTER_LABELS: Record<VideoFilter, string> = {
    all: 'Tất cả',
    hot: 'Nổi bật',
    explode: 'Bùng nổ',
};

const CRAWL_STEPS = [
    { key: 'open', label: 'Mở trang tìm kiếm YouTube' },
    { key: 'recent', label: 'Lọc tab "Tải lên gần đây"' },
    { key: 'scroll', label: 'Cuộn tải danh sách video (tối đa 10 lần)' },
    { key: 'details', label: 'Lấy chi tiết video + thông tin kênh' },
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

function formatVideoCopyLine(video: KeywordVideo): string {
    const view = Number(video.view_count || 0).toLocaleString('vi-VN');
    const like = Number(video.like_count || 0).toLocaleString('vi-VN');
    const comment = Number(video.comment_count || 0).toLocaleString('vi-VN');
    let date = video.publish_date || '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [y, m, d] = date.split('-');
        date = `${d}/${m}/${y}`;
    } else {
        date = video.published_at || '';
    }
    return `${video.title} - View ${view} - Like ${like} - Comment ${comment} - ngày đăng ${date}`;
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

export default function MarketingCompetitorKeywordPanel({ onChannelAdded }: Props): JSX.Element {
    const api = useAjax();
    const apiAjaxRef = React.useRef(api.ajax);
    apiAjaxRef.current = api.ajax;

    const [view, setView] = React.useState<'list' | 'detail'>('list');
    const [keywords, setKeywords] = React.useState<KeywordRecord[]>([]);
    const [loadingKeywords, setLoadingKeywords] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [info, setInfo] = React.useState<string | null>(null);

    const [keywordInput, setKeywordInput] = React.useState('');
    const [maxVideos, setMaxVideos] = React.useState<number>(DEFAULT_MAX_VIDEOS);
    const [dateRange, setDateRange] = React.useState<DateRange>('all');

    const [current, setCurrent] = React.useState<KeywordRecord | null>(null);
    const [videos, setVideos] = React.useState<KeywordVideo[]>([]);
    const [videoStats, setVideoStats] = React.useState<KeywordVideosResponse['stats'] | undefined>(undefined);
    const [loadingVideos, setLoadingVideos] = React.useState(false);
    const [crawling, setCrawling] = React.useState(false);
    const [crawlStep, setCrawlStep] = React.useState(0);
    const [deletingId, setDeletingId] = React.useState<number | null>(null);
    const [addingChannelId, setAddingChannelId] = React.useState<number | null>(null);
    const [addedChannelIds, setAddedChannelIds] = React.useState<Set<number>>(new Set());
    const [videoFilter, setVideoFilter] = React.useState<VideoFilter>('all');
    const [videoSort, setVideoSort] = React.useState<VideoSort>('newest');
    const [expandedVideoId, setExpandedVideoId] = React.useState<number | null>(null);
    const [copyMenuAnchor, setCopyMenuAnchor] = React.useState<HTMLElement | null>(null);
    const [sortMenuAnchor, setSortMenuAnchor] = React.useState<HTMLElement | null>(null);

    const loadKeywords = React.useCallback((opts?: { silent?: boolean }) => {
        if (!opts?.silent) {
            setLoadingKeywords(true);
        }

        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/competitor-keyword/list',
            method: 'POST',
            data: {},
            loading: false,
            success: (res: { success?: boolean; items?: KeywordRecord[] }) => {
                if (!opts?.silent) {
                    setLoadingKeywords(false);
                }
                if (!res?.success) {
                    setError(parseApiMessage(res));
                    return;
                }
                setKeywords(Array.isArray(res.items) ? res.items : []);
            },
            error: (err: unknown) => {
                if (!opts?.silent) {
                    setLoadingKeywords(false);
                }
                setError(parseApiMessage(err));
            },
        });
    }, []);

    const loadVideos = React.useCallback((keywordId: number, opts?: { silent?: boolean }) => {
        if (!opts?.silent) {
            setLoadingVideos(true);
        }

        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/competitor-keyword/videos',
            method: 'POST',
            data: { keyword_id: keywordId },
            loading: false,
            success: (res: KeywordVideosResponse) => {
                if (!opts?.silent) {
                    setLoadingVideos(false);
                }
                if (!res?.success) {
                    setError(parseApiMessage(res));
                    return;
                }
                setVideos(Array.isArray(res.items) ? res.items : []);
                setVideoStats(res.stats);
                if (res.keyword?.keyword) {
                    setCurrent((prev) => (prev ? { ...prev, keyword: res.keyword?.keyword || prev.keyword } : prev));
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
        loadKeywords();
    }, [loadKeywords]);

    React.useEffect(() => {
        if (!crawling) return undefined;
        setCrawlStep(0);
        const timers = [
            window.setTimeout(() => setCrawlStep(1), 5000),
            window.setTimeout(() => setCrawlStep(2), 10000),
            window.setTimeout(() => setCrawlStep(3), 30000),
            window.setTimeout(() => setCrawlStep(4), 60000),
        ];
        return () => timers.forEach((t) => window.clearTimeout(t));
    }, [crawling]);

    const runSearch = (keyword: string, amount: number, range: DateRange, opts?: { openDetail?: boolean }) => {
        const trimmed = keyword.trim();
        if (!trimmed) {
            setError('Nhập keyword cần tìm');
            return;
        }
        const safeAmount = Math.max(1, Math.min(MAX_MAX_VIDEOS, Math.round(amount) || DEFAULT_MAX_VIDEOS));

        setCrawling(true);
        setError(null);
        setInfo(null);

        api.ajax({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/competitor-keyword/search',
            method: 'POST',
            data: { keyword: trimmed, max_videos: safeAmount, date_range: range },
            loading: false,
            success: (res: {
                success?: boolean;
                keyword_id?: number;
                keyword?: string;
                total?: number;
                requested?: number;
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
                const total = Number(res.total || added + updated);
                setInfo(`Đã lấy ${total} video cho keyword "${res.keyword || trimmed}" (${added} mới, ${updated} cập nhật)`);
                loadKeywords({ silent: true });
                if (opts?.openDetail && res.keyword_id) {
                    setVideoFilter('all');
                    setExpandedVideoId(null);
                    setCurrent({
                        id: res.keyword_id,
                        keyword: res.keyword || trimmed,
                    });
                    setVideos([]);
                    setVideoStats(undefined);
                    setView('detail');
                    loadVideos(res.keyword_id, { silent: true });
                } else if (current && res.keyword_id && current.id === res.keyword_id) {
                    loadVideos(res.keyword_id, { silent: true });
                }
            },
            error: (err: unknown) => {
                setCrawling(false);
                setCrawlStep(0);
                setError(parseApiMessage(err));
            },
        });
    };

    const handleSubmit = () => {
        if (crawling) return;
        runSearch(keywordInput, maxVideos, dateRange, { openDetail: true });
    };

    const handleOpenDetail = (record: KeywordRecord) => {
        setCurrent(record);
        setVideos([]);
        setVideoStats(undefined);
        setError(null);
        setInfo(null);
        setVideoFilter('all');
        setExpandedVideoId(null);
        setDateRange('all');
        setMaxVideos(record.max_videos && record.max_videos > 0 ? record.max_videos : DEFAULT_MAX_VIDEOS);
        setView('detail');
        loadVideos(record.id);
    };

    const handleBackToList = () => {
        setView('list');
        setCurrent(null);
        setVideos([]);
        setVideoStats(undefined);
        setError(null);
        setInfo(null);
        loadKeywords({ silent: true });
    };

    const handleReCrawl = () => {
        if (!current || crawling) return;
        runSearch(current.keyword, maxVideos, dateRange);
    };

    const handleDelete = (record: KeywordRecord) => {
        if (!window.confirm(`Xoá keyword "${record.keyword}"?`)) return;
        setDeletingId(record.id);
        setError(null);
        setInfo(null);

        api.ajax({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/competitor-keyword/delete',
            method: 'POST',
            data: { keyword_id: record.id },
            loading: false,
            success: (res: { success?: boolean }) => {
                setDeletingId(null);
                if (!res?.success) {
                    setError(parseApiMessage(res));
                    return;
                }
                setInfo('Đã xoá keyword');
                loadKeywords({ silent: true });
            },
            error: (err: unknown) => {
                setDeletingId(null);
                setError(parseApiMessage(err));
            },
        });
    };

    const handleAddChannel = (video: KeywordVideo) => {
        if (addingChannelId === video.id) return;
        setAddingChannelId(video.id);
        setError(null);

        api.ajax({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/competitor-keyword/add-channel',
            method: 'POST',
            data: { video_id: video.id },
            loading: false,
            success: (res: { success?: boolean; message?: { content?: string } | string; already_exists?: boolean }) => {
                setAddingChannelId(null);
                if (!res?.success) {
                    setError(parseApiMessage(res));
                    return;
                }
                setAddedChannelIds((prev) => {
                    const next = new Set(prev);
                    next.add(video.id);
                    return next;
                });
                setInfo(parseApiMessage(res));
                if (onChannelAdded) {
                    onChannelAdded();
                }
            },
            error: (err: unknown) => {
                setAddingChannelId(null);
                setError(parseApiMessage(err));
            },
        });
    };

    const renderList = () => (
        <Stack spacing={2}>
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
                    Tìm video theo keyword
                </Typography>
                <Stack spacing={1.5}>
                    <TextField
                        fullWidth
                        size="small"
                        label="Từ khóa"
                        placeholder="vd: Early Humans"
                        value={keywordInput}
                        onChange={(e) => setKeywordInput(e.target.value)}
                        disabled={crawling}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !crawling) {
                                handleSubmit();
                            }
                        }}
                    />
                    <Stack direction="row" spacing={1.5} alignItems="flex-start" flexWrap="wrap" useFlexGap>
                        <TextField
                            size="small"
                            type="number"
                            label="Số lượng video"
                            value={maxVideos}
                            onChange={(e) => setMaxVideos(Number(e.target.value))}
                            disabled={crawling}
                            inputProps={{ min: 1, max: MAX_MAX_VIDEOS }}
                            sx={{ width: 160, flexShrink: 0 }}
                        />
                        <TextField
                            size="small"
                            select
                            label="Khoảng thời gian"
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value as DateRange)}
                            disabled={crawling}
                            sx={{ width: 190, flexShrink: 0 }}
                        >
                            {DATE_RANGE_OPTIONS.map((option) => (
                                <MenuItem key={option.key} value={option.key}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </TextField>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<SearchIcon fontSize="small" />}
                            onClick={handleSubmit}
                            disabled={crawling}
                            sx={{ textTransform: 'none', height: 40 }}
                        >
                            {crawling ? 'Đang lấy data…' : 'Get data'}
                        </Button>
                    </Stack>
                    <Typography variant="caption" color="text.disabled">
                        Hệ thống mở YouTube, lọc tab &quot;Tải lên gần đây&quot;, cuộn tối đa 10 lần để lấy đủ số video
                        (chỉ lấy video thường, bỏ Shorts). Nếu không đủ sẽ lấy tối đa những video hiện có.
                    </Typography>
                </Stack>
            </Box>

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

            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle2">Keyword đã lưu ({keywords.length})</Typography>
                <Button
                    size="small"
                    variant="outlined"
                    startIcon={<RefreshIcon fontSize="small" />}
                    onClick={() => loadKeywords()}
                    sx={{ textTransform: 'none' }}
                >
                    Làm mới
                </Button>
            </Stack>

            {loadingKeywords && <LinearProgress sx={{ borderRadius: 1 }} />}

            {keywords.length === 0 && !loadingKeywords ? (
                <Alert severity="info">Chưa có keyword nào. Nhập từ khóa và bấm &quot;Get data&quot; để bắt đầu.</Alert>
            ) : (
                <Stack spacing={1}>
                    {keywords.map((record) => (
                        <Box
                            key={record.id}
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
                            <Box sx={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => handleOpenDetail(record)}>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }} noWrap>
                                    {record.keyword}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    sx={{ display: 'block', mt: 0.25, fontWeight: 500, color: 'text.secondary' }}
                                    noWrap
                                >
                                    {[
                                        `${record.video_count ?? 0} video`,
                                        record.max_videos ? `muốn lấy ${record.max_videos}` : '',
                                        `${formatViews(record.total_views)} view`,
                                        record.avg_vph ? `VPH TB ${formatVph(record.avg_vph)}` : '',
                                    ].filter(Boolean).join(' · ')}
                                </Typography>
                                <Typography variant="caption" sx={{ display: 'block', mt: 0.25, color: 'text.disabled' }} noWrap>
                                    {record.last_crawled_at ? `Lấy data: ${formatCrawlDate(record.last_crawled_at)}` : 'Chưa lấy data'}
                                </Typography>
                            </Box>
                            <Tooltip title="Lấy data lại">
                                <span>
                                    <IconButton
                                        size="small"
                                        onClick={() => runSearch(record.keyword, maxVideos, dateRange, { openDetail: true })}
                                        disabled={crawling}
                                    >
                                        <RefreshIcon fontSize="small" />
                                    </IconButton>
                                </span>
                            </Tooltip>
                            <Tooltip title="Xoá keyword">
                                <span>
                                    <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => handleDelete(record)}
                                        disabled={deletingId === record.id}
                                    >
                                        {deletingId === record.id ? (
                                            <CircularProgress size={18} />
                                        ) : (
                                            <DeleteOutlineIcon fontSize="small" />
                                        )}
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Box>
                    ))}
                </Stack>
            )}
        </Stack>
    );

    const renderDetail = () => {
        const hotThreshold = (videoStats?.avg_vph || 0) * HOT_VPH_MULTIPLIER;
        const hotVideos = videos.filter((video) => (video.vph || 0) > 0 && (video.vph || 0) >= hotThreshold);
        const durationLabel = formatDurationSec(videoStats?.avg_duration_sec);

        const epsOf = (video: KeywordVideo): number => ((video.eps || 0) > 0 ? (video.eps as number) : computeEps(video));
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

        const publishMsOf = (video: KeywordVideo): number => {
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
            const lines = explodeVideos.slice(0, limit).map(formatVideoCopyLine);
            if (lines.length === 0) {
                setError('Chưa có video nào có điểm bùng nổ');
                return;
            }
            navigator.clipboard.writeText(lines.join('\n'))
                .then(() => setInfo(`Đã copy ${lines.length} video bùng nổ nhất (title, view, ngày đăng)`))
                .catch(() => setError('Không copy được vào clipboard'));
        };

        const handleCopyCurrentView = () => {
            setCopyMenuAnchor(null);
            const lines = sortedVideos.map(formatVideoCopyLine);
            if (lines.length === 0) {
                setError('Danh sách đang xem không có video nào');
                return;
            }
            const sortLabel = VIDEO_SORT_OPTIONS.find((option) => option.key === videoSort)?.label || 'View';
            navigator.clipboard.writeText(lines.join('\n'))
                .then(() => setInfo(`Đã copy ${lines.length} video (${VIDEO_FILTER_LABELS[videoFilter]} · sắp xếp ${sortLabel})`))
                .catch(() => setError('Không copy được vào clipboard'));
        };

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

        const hashtagCountMap: Record<string, number> = {};
        videos.forEach((video) => {
            extractHashtags(video.description).forEach((tag) => {
                const key = normalizeTag(tag);
                hashtagCountMap[key] = (hashtagCountMap[key] || 0) + 1;
            });
        });

        return (
            <Stack spacing={2}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <IconButton size="small" onClick={handleBackToList}>
                        <ArrowBackIcon fontSize="small" />
                    </IconButton>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }} noWrap>
                            {current?.keyword || 'Keyword'}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, color: 'text.secondary' }} noWrap>
                            {videoStats?.video_count ? `${videoStats.video_count} video` : '—'}
                            {current?.last_crawled_at ? ` · Lấy data: ${formatCrawlDate(current.last_crawled_at)}` : ''}
                        </Typography>
                    </Box>
                </Stack>

                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                    <TextField
                        size="small"
                        type="number"
                        label="Số lượng video"
                        value={maxVideos}
                        onChange={(e) => setMaxVideos(Number(e.target.value))}
                        disabled={crawling}
                        inputProps={{ min: 1, max: MAX_MAX_VIDEOS }}
                        sx={{ width: 160, flexShrink: 0 }}
                    />
                    <TextField
                        size="small"
                        select
                        label="Khoảng thời gian"
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value as DateRange)}
                        disabled={crawling}
                        sx={{ width: 190, flexShrink: 0 }}
                    >
                        {DATE_RANGE_OPTIONS.map((option) => (
                            <MenuItem key={option.key} value={option.key}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </TextField>
                    <Button
                        size="small"
                        variant="contained"
                        startIcon={<RefreshIcon fontSize="small" />}
                        onClick={handleReCrawl}
                        disabled={crawling}
                        sx={{ textTransform: 'none', flexShrink: 0 }}
                    >
                        {crawling ? 'Đang lấy data…' : 'Get data'}
                    </Button>
                </Stack>

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
                            Thống kê keyword
                        </Typography>

                        <Box sx={STAT_GROUP_SX}>
                            <Typography variant="caption" sx={STAT_GROUP_LABEL_SX}>
                                Quy mô
                            </Typography>
                            <Box sx={STAT_GRID_SX}>
                                <StatItem label="Video" value={`${videoStats.video_count || 0}`} />
                                <StatItem label="View tổng" value={formatViews(videoStats.total_views)} />
                                <StatItem label="Max view" value={formatViews(videoStats.max_views)} />
                            </Box>
                        </Box>

                        {videoStats.avg_views || durationLabel ? (
                            <Box sx={{ ...STAT_GROUP_SX, mt: 1.25 }}>
                                <Typography variant="caption" sx={STAT_GROUP_LABEL_SX}>
                                    Trung bình mỗi video
                                </Typography>
                                <Box sx={STAT_GRID_SX}>
                                    <StatItem label="View TB" value={formatViews(videoStats.avg_views)} />
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
                                        <Tooltip title="VPH trung bình — lượt xem trung bình mỗi giờ (views / (số ngày từ khi đăng × 24))">
                                            <Box>
                                                <StatItem label="VPH TB" value={formatVph(videoStats.avg_vph)} highlight />
                                            </Box>
                                        </Tooltip>
                                    ) : null}
                                    {videoStats.avg_lpd ? (
                                        <Tooltip title="LPD trung bình — lượt like trung bình mỗi ngày">
                                            <Box>
                                                <StatItem label="LPD TB" value={formatVph(videoStats.avg_lpd, 'day')} />
                                            </Box>
                                        </Tooltip>
                                    ) : null}
                                    {videoStats.avg_lvr ? (
                                        <Tooltip title="LVR trung bình — tỷ lệ like/view trung bình">
                                            <Box>
                                                <StatItem label="LVR TB" value={formatPercent(videoStats.avg_lvr)} />
                                            </Box>
                                        </Tooltip>
                                    ) : null}
                                </Box>
                            </Box>
                        ) : null}
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
                                <Tooltip title={`Video có VPH ≥ ${HOT_VPH_MULTIPLIER}× VPH trung bình — nội dung đang được đẩy mạnh`}>
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
                            ) : null}
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<ContentCopyIcon fontSize="small" />}
                                onClick={(e) => setCopyMenuAnchor(e.currentTarget)}
                                sx={{ textTransform: 'none', flexShrink: 0, ml: 'auto' }}
                            >
                                Copy title
                            </Button>
                            <Menu
                                anchorEl={copyMenuAnchor}
                                open={Boolean(copyMenuAnchor)}
                                onClose={() => setCopyMenuAnchor(null)}
                            >
                                <MenuItem onClick={handleCopyCurrentView}>
                                    {`Danh sách đang xem (${sortedVideos.length}) — ${VIDEO_FILTER_LABELS[videoFilter]} · ${VIDEO_SORT_OPTIONS.find((option) => option.key === videoSort)?.label || 'View'}`}
                                </MenuItem>
                                <Divider />
                                <MenuItem onClick={() => handleCopyTopEps(5)}>Top 5 EPS</MenuItem>
                                <MenuItem onClick={() => handleCopyTopEps(10)}>Top 10 EPS</MenuItem>
                            </Menu>
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
                        Chưa có dữ liệu video. Bấm &quot;Get data&quot; để mở headless browser lấy video theo keyword.
                    </Alert>
                ) : (
                    <Stack spacing={1}>
                        {sortedVideos.map((video, index) => {
                            const isHot = (video.vph || 0) > 0 && (video.vph || 0) >= hotThreshold;
                            const isExpanded = expandedVideoId === video.id;
                            const isAdded = addedChannelIds.has(video.id);
                            const videoTags = Array.from(new Set((video.tags || '')
                                .split(',')
                                .map(normalizeTag)
                                .filter(Boolean)))
                                .sort((a, b) => (tagCountMap[b] || 0) - (tagCountMap[a] || 0));
                            const videoHashtags = Array.from(new Set(extractHashtags(video.description)
                                .map(normalizeTag)
                                .filter(Boolean)))
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
                                                <Tooltip title={`EPS — Điểm bùng nổ = VPH×0.4 + LPD×0.3 + LVR×10×0.3${explodeIds.has(video.id || video.video_id) ? ' — Top bùng nổ' : ''}`}>
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
                                                <Tooltip title="LPD — lượt like trung bình mỗi ngày">
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
                                                    <Tooltip title="Nổi bật: VPH cao gấp nhiều lần trung bình">
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
                                                    <Chip
                                                        size="small"
                                                        label={`LER ${formatPercent(video.ler)}`}
                                                        color={(video.ler || 0) >= 90 ? 'success' : (video.ler || 0) < 70 ? 'error' : 'default'}
                                                        variant={(video.ler || 0) >= 90 ? 'filled' : 'outlined'}
                                                        sx={{ height: 18, fontSize: 10, flexShrink: 0, '& .MuiChip-label': { px: 0.5 } }}
                                                    />
                                                ) : null}
                                            </Stack>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                                                {[
                                                    formatDurationSec(video.duration_sec),
                                                    video.published_at || video.publish_date || '—',
                                            `${formatViews(video.view_count)} view`,
                                            (video.like_count || 0) > 0 ? `${formatViews(video.like_count)} like` : '',
                                            (video.comment_count || 0) > 0 ? `${formatViews(video.comment_count)} comment` : '',
                                        ].filter(Boolean).join(' · ')}
                                            </Typography>
                                            {video.channel_name || video.channel_url ? (
                                                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.5 }}>
                                                    {video.channel_avatar_url ? (
                                                        <Box
                                                            component="img"
                                                            src={video.channel_avatar_url}
                                                            alt=""
                                                            loading="lazy"
                                                            sx={{
                                                                width: 20,
                                                                height: 20,
                                                                borderRadius: '50%',
                                                                objectFit: 'cover',
                                                                bgcolor: 'action.hover',
                                                                flexShrink: 0,
                                                            }}
                                                        />
                                                    ) : (
                                                        <YouTubeIcon color="error" sx={{ fontSize: 20, flexShrink: 0 }} />
                                                    )}
                                                    {video.channel_url ? (
                                                        <Link
                                                            href={video.channel_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            variant="caption"
                                                            sx={{ fontWeight: 600, maxWidth: 220 }}
                                                            noWrap
                                                        >
                                                            {video.channel_name || video.channel_handle || video.channel_url}
                                                        </Link>
                                                    ) : (
                                                        <Typography variant="caption" sx={{ fontWeight: 600 }} noWrap>
                                                            {video.channel_name}
                                                        </Typography>
                                                    )}
                                                    {video.channel_handle && video.channel_handle !== video.channel_name ? (
                                                        <Typography variant="caption" color="text.disabled" noWrap>
                                                            {video.channel_handle}
                                                        </Typography>
                                                    ) : null}
                                                    <Tooltip title={isAdded ? 'Đã có trong danh sách kênh đối thủ' : 'Thêm kênh này vào danh sách kênh đối thủ'}>
                                                        <span>
                                                            <Button
                                                                size="small"
                                                                variant="outlined"
                                                                startIcon={addingChannelId === video.id
                                                                    ? <CircularProgress size={12} />
                                                                    : <PersonAddIcon sx={{ fontSize: 14 }} />}
                                                                onClick={() => handleAddChannel(video)}
                                                                disabled={!video.channel_url || addingChannelId === video.id || isAdded}
                                                                sx={{
                                                                    textTransform: 'none',
                                                                    height: 22,
                                                                    minWidth: 0,
                                                                    px: 0.75,
                                                                    fontSize: 11,
                                                                    ml: 'auto',
                                                                }}
                                                            >
                                                                {isAdded ? 'Đã thêm kênh' : 'Thêm kênh'}
                                                            </Button>
                                                        </span>
                                                    </Tooltip>
                                                </Stack>
                                            ) : null}
                                            {videoTags.length > 0 && (
                                                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                                                    {videoTags.slice(0, 12).map((tag) => (
                                                        <Tooltip key={tag} title={`Tag xuất hiện ở ${tagCountMap[tag] || 1} video trong keyword`}>
                                                            <Chip
                                                                size="small"
                                                                label={`${tag} × ${tagCountMap[tag] || 1}`}
                                                                variant="outlined"
                                                                sx={{
                                                                    height: 20,
                                                                    fontSize: 11,
                                                                    '& .MuiChip-label': { px: 0.75 },
                                                                }}
                                                            />
                                                        </Tooltip>
                                                    ))}
                                                </Stack>
                                            )}
                                            {videoHashtags.length > 0 && (
                                                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                                                    {videoHashtags.slice(0, 12).map((tag) => (
                                                        <Tooltip key={tag} title={`Hashtag xuất hiện ở ${hashtagCountMap[tag] || 1} video trong keyword`}>
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
        <Stack spacing={2}>
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
    );
}
