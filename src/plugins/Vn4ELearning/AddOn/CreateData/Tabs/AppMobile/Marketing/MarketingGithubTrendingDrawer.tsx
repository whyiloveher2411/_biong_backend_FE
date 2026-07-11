import React from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    LinearProgress,
    Link,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import VideoLibraryOutlinedIcon from '@mui/icons-material/VideoLibraryOutlined';
import TranslateIcon from '@mui/icons-material/Translate';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DrawerCustom from 'components/molecules/DrawerCustom';
import useAjax from 'hook/useApi';
import { useSearchParams } from 'react-router-dom';
import { openShortVideoAgentInSearchParams } from 'helpers/shortVideoAgentVideoDrawerUrl';

type RecommendStatus = 'should_make' | 'maybe' | 'cooldown' | 'skip' | string;

type TrendingRepoItem = {
    id: number;
    full_name: string;
    title?: string;
    html_url?: string;
    description?: string;
    description_vi?: string;
    language?: string;
    stars_total?: number;
    stars_daily?: number;
    stars_weekly?: number;
    stars_monthly?: number;
    growth_label?: string;
    in_daily?: boolean;
    in_weekly?: boolean;
    in_monthly?: boolean;
    hot_score?: number;
    recommend_status?: RecommendStatus;
    last_posted_at?: string | null;
    last_short_video_id?: number;
    last_crawled_at?: string | null;
};

type ListResponse = {
    success?: boolean;
    count?: number;
    items?: TrendingRepoItem[];
    last_crawled_at?: string | null;
    cooldown_days?: number;
    has_active_crawl_job?: boolean;
    message?: { content?: string } | string;
};

type Props = {
    open: boolean;
    onClose: () => void;
    appMobileId?: number;
    onCreatedShortVideo?: (shortVideoId: number) => void;
};

type PeriodFilter = 'all' | 'daily' | 'weekly' | 'monthly';

const PERIOD_FILTERS: Array<{ value: PeriodFilter; label: string }> = [
    { value: 'all', label: 'Tất cả' },
    { value: 'daily', label: 'Ngày' },
    { value: 'weekly', label: 'Tuần' },
    { value: 'monthly', label: 'Tháng' },
];

function filterReposByPeriod(
    items: TrendingRepoItem[],
    period: PeriodFilter
): TrendingRepoItem[] {
    const filtered =
        period === 'all'
            ? [...items]
            : period === 'daily'
              ? items.filter((item) => Boolean(item.in_daily))
              : period === 'weekly'
                ? items.filter((item) => Boolean(item.in_weekly))
                : items.filter((item) => Boolean(item.in_monthly));

    if (period === 'all') {
        // Giữ thứ tự hot_score từ API
        return filtered;
    }

    const starKey =
        period === 'daily'
            ? 'stars_daily'
            : period === 'weekly'
              ? 'stars_weekly'
              : 'stars_monthly';

    return filtered.sort((a, b) => {
        const starDiff = Number(b[starKey] || 0) - Number(a[starKey] || 0);
        if (starDiff !== 0) return starDiff;
        // Tie-break: hot_score rồi id
        const hotDiff = Number(b.hot_score || 0) - Number(a.hot_score || 0);
        if (hotDiff !== 0) return hotDiff;
        return Number(a.id || 0) - Number(b.id || 0);
    });
}

function parseApiMessage(res: unknown): string {
    if (!res || typeof res !== 'object') return 'Yêu cầu thất bại';
    const r = res as { message?: { content?: string } | string };
    if (typeof r.message === 'string') return r.message;
    if (r.message && typeof r.message === 'object' && r.message.content) return r.message.content;
    return 'Yêu cầu thất bại';
}

function statusLabel(status: RecommendStatus | undefined): string {
    switch (status) {
        case 'should_make':
            return 'Nên làm';
        case 'maybe':
            return 'Cân nhắc';
        case 'cooldown':
            return 'Đã post';
        default:
            return 'Skip';
    }
}

function statusColor(
    status: RecommendStatus | undefined
): 'success' | 'warning' | 'default' | 'info' {
    switch (status) {
        case 'should_make':
            return 'success';
        case 'maybe':
            return 'warning';
        case 'cooldown':
            return 'info';
        default:
            return 'default';
    }
}

function hotBarColor(score: number): 'success' | 'warning' | 'error' | 'inherit' {
    if (score >= 70) return 'success';
    if (score >= 45) return 'warning';
    if (score > 0) return 'error';
    return 'inherit';
}

type DescriptionSection = {
    label?: string;
    body: string;
};

function parseDescriptionSections(text: string): DescriptionSection[] {
    const raw = String(text || '').trim();
    if (!raw) return [];

    // Tách khi Gemini trả 2 mục trên cùng một dòng
    const splitReady = raw
        .replace(/\s*\*\*\s*Khi nào dùng\s*[:：]?\s*\*\*/gi, '\n**Khi nào dùng:** ')
        .replace(/\s*\*\*\s*Khi nào dùng\s*\*\*\s*[:：]/gi, '\n**Khi nào dùng:** ')
        .replace(/\s+Khi nào dùng\s*[:：]/gi, '\n**Khi nào dùng:** ');

    const lines = splitReady
        .split(/\r\n|\n|\r/)
        .map((l) => l.trim())
        .filter(Boolean);
    const sections: DescriptionSection[] = [];

    for (const line of lines) {
        // **Công dụng:** body  (dấu : nằm trong hoặc ngoài **)
        const m = line.match(/^\*\*\s*([^*]+?)\s*\*\*\s*[:：]?\s*(.*)$/s);
        if (m) {
            const label = m[1].trim().replace(/[:：]\s*$/, '');
            const body = (m[2] || '').trim();
            sections.push({ label, body });
            continue;
        }
        const plainMatch = line.match(/^(Công dụng|Khi nào dùng)\s*[:：]\s*(.*)$/is);
        if (plainMatch) {
            sections.push({
                label: plainMatch[1].trim(),
                body: (plainMatch[2] || '').trim(),
            });
            continue;
        }
        sections.push({ body: line });
    }

    return sections.length > 0 ? sections : [{ body: raw }];
}

function RepoDescriptionText({
    text,
    isStructured,
}: {
    text: string;
    isStructured: boolean;
}) {
    if (!text) return null;

    if (!isStructured) {
        return (
            <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                    mb: 1,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                }}
            >
                {text}
            </Typography>
        );
    }

    const sections = parseDescriptionSections(text);

    return (
        <Stack spacing={0.75} sx={{ mb: 1 }}>
            {sections.map((section, idx) => (
                <Typography
                    key={`${section.label || 'line'}-${idx}`}
                    variant="body2"
                    color="text.secondary"
                    sx={{ lineHeight: 1.45 }}
                >
                    {section.label ? (
                        <>
                            <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                {section.label}:
                            </Box>
                            {section.body ? ` ${section.body}` : null}
                        </>
                    ) : (
                        section.body
                    )}
                </Typography>
            ))}
        </Stack>
    );
}

export default function MarketingGithubTrendingDrawer({
    open,
    onClose,
    appMobileId,
    onCreatedShortVideo,
}: Props) {
    const api = useAjax();
    const apiAjaxRef = React.useRef(api.ajax);
    apiAjaxRef.current = api.ajax;

    const [searchParams, setSearchParams] = useSearchParams();
    const [loading, setLoading] = React.useState(false);
    const [crawling, setCrawling] = React.useState(false);
    const [creatingId, setCreatingId] = React.useState<number | null>(null);
    const [describingId, setDescribingId] = React.useState<number | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [info, setInfo] = React.useState<string | null>(null);
    const [items, setItems] = React.useState<TrendingRepoItem[]>([]);
    const [lastCrawledAt, setLastCrawledAt] = React.useState<string | null>(null);
    const [cooldownDays, setCooldownDays] = React.useState(30);
    const [hasActiveJob, setHasActiveJob] = React.useState(false);
    const [periodFilter, setPeriodFilter] = React.useState<PeriodFilter>('all');

    const filteredItems = React.useMemo(
        () => filterReposByPeriod(items, periodFilter),
        [items, periodFilter]
    );

    const periodCounts = React.useMemo(
        () => ({
            all: items.length,
            daily: items.filter((item) => Boolean(item.in_daily)).length,
            weekly: items.filter((item) => Boolean(item.in_weekly)).length,
            monthly: items.filter((item) => Boolean(item.in_monthly)).length,
        }),
        [items]
    );

    const loadList = React.useCallback(
        (opts?: { silent?: boolean }) => {
            if (!appMobileId) {
                setError('Chưa xác định mobile_app');
                setItems([]);
                return;
            }

            if (!opts?.silent) {
                setLoading(true);
            }
            setError(null);

            apiAjaxRef.current({
                url: 'plugin/vn4-e-learning/app-mobile/marketing/github-trending/list',
                method: 'POST',
                data: {
                    app_mobile_id: appMobileId,
                    recalculate: true,
                },
                loading: false,
                success: (res: ListResponse) => {
                    if (!opts?.silent) {
                        setLoading(false);
                    }
                    if (!res?.success) {
                        setError(parseApiMessage(res));
                        return;
                    }
                    setItems(Array.isArray(res.items) ? res.items : []);
                    setLastCrawledAt(res.last_crawled_at ? String(res.last_crawled_at) : null);
                    setCooldownDays(Number(res.cooldown_days || 30));
                    setHasActiveJob(Boolean(res.has_active_crawl_job));
                },
                error: (err: unknown) => {
                    if (!opts?.silent) {
                        setLoading(false);
                    }
                    setError(parseApiMessage(err));
                },
            });
        },
        [appMobileId]
    );

    React.useEffect(() => {
        if (!open) {
            return;
        }
        loadList();
    }, [open, loadList]);

    React.useEffect(() => {
        if (!open || !hasActiveJob) {
            return undefined;
        }
        const timer = window.setInterval(() => {
            loadList({ silent: true });
        }, 5000);
        return () => window.clearInterval(timer);
    }, [open, hasActiveJob, loadList]);

    const handleCrawl = () => {
        if (!appMobileId) {
            setError('Chưa xác định mobile_app');
            return;
        }
        setCrawling(true);
        setError(null);
        setInfo(null);

        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/github-trending/crawl',
            method: 'POST',
            data: {
                app_mobile_id: appMobileId,
                force: true,
                sync: false,
            },
            loading: false,
            success: (res: { success?: boolean; message?: unknown; job_id?: number }) => {
                setCrawling(false);
                if (!res?.success) {
                    setError(parseApiMessage(res));
                    return;
                }
                setInfo(parseApiMessage(res) || 'Đã enqueue crawl GitHub Trending');
                setHasActiveJob(true);
                loadList({ silent: true });
            },
            error: (err: unknown) => {
                setCrawling(false);
                setError(parseApiMessage(err));
            },
        });
    };

    const handleCreate = (item: TrendingRepoItem) => {
        if (!appMobileId || !item.id) {
            return;
        }
        setCreatingId(item.id);
        setError(null);
        setInfo(null);

        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/github-trending/create-short-video',
            method: 'POST',
            data: {
                app_mobile_id: appMobileId,
                trending_repo_id: item.id,
                full_name: item.full_name,
            },
            loading: false,
            success: (res: {
                success?: boolean;
                message?: unknown;
                short_video_id?: number;
            }) => {
                setCreatingId(null);
                if (!res?.success) {
                    setError(parseApiMessage(res));
                    return;
                }
                const shortVideoId = Number(res.short_video_id || 0);
                setInfo(parseApiMessage(res) || 'Đã tạo short video');
                loadList({ silent: true });
                onCreatedShortVideo?.(shortVideoId);
                if (shortVideoId > 0) {
                    const next = openShortVideoAgentInSearchParams(
                        searchParams,
                        shortVideoId,
                        'content'
                    );
                    setSearchParams(next, { replace: true });
                    onClose();
                }
            },
            error: (err: unknown) => {
                setCreatingId(null);
                setError(parseApiMessage(err));
            },
        });
    };

    const handleGenerateDescriptionVi = (item: TrendingRepoItem) => {
        if (!appMobileId || !item.id) {
            return;
        }
        setDescribingId(item.id);
        setError(null);
        setInfo(null);

        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/github-trending/generate-description-vi',
            method: 'POST',
            data: {
                app_mobile_id: appMobileId,
                trending_repo_id: item.id,
            },
            loading: false,
            success: (res: {
                success?: boolean;
                message?: unknown;
                description_vi?: string;
                trending_repo_id?: number;
            }) => {
                setDescribingId(null);
                if (!res?.success) {
                    setError(parseApiMessage(res));
                    return;
                }
                const nextVi = String(res.description_vi || '').trim();
                const repoId = Number(res.trending_repo_id || item.id);
                if (nextVi && repoId > 0) {
                    setItems((prev) =>
                        prev.map((row) =>
                            row.id === repoId ? { ...row, description_vi: nextVi } : row
                        )
                    );
                } else {
                    loadList({ silent: true });
                }
                setInfo(parseApiMessage(res) || 'Đã sinh mô tả tiếng Việt');
            },
            error: (err: unknown) => {
                setDescribingId(null);
                setError(parseApiMessage(err));
            },
        });
    };

    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title="GitHub Trending"
            width={880}
            restDialogContent={{
                sx: {
                    pt: 2.5,
                    px: 3,
                    pb: 2,
                },
            }}
        >
            <Stack spacing={2} sx={{ pb: 1 }}>
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    alignItems={{ xs: 'stretch', sm: 'center' }}
                    justifyContent="space-between"
                >
                    <Box>
                        <Typography variant="body2" color="text.secondary">
                            Repo hot từ daily / weekly / monthly — sắp xếp theo độ hot.
                            Cooldown đăng lại: {cooldownDays} ngày.
                        </Typography>
                        {lastCrawledAt && (
                            <Typography variant="caption" color="text.secondary">
                                Crawl gần nhất: {lastCrawledAt}
                            </Typography>
                        )}
                        {hasActiveJob && (
                            <Typography variant="caption" color="primary.main" display="block">
                                Đang có job crawl — danh sách sẽ tự cập nhật.
                            </Typography>
                        )}
                    </Box>
                    <Stack direction="row" spacing={1} flexShrink={0}>
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<RefreshIcon fontSize="small" />}
                            onClick={() => loadList()}
                            disabled={loading || crawling}
                            sx={{ textTransform: 'none' }}
                        >
                            Làm mới
                        </Button>
                        <Button
                            size="small"
                            variant="contained"
                            startIcon={
                                crawling ? (
                                    <CircularProgress size={14} color="inherit" />
                                ) : (
                                    <TravelExploreIcon fontSize="small" />
                                )
                            }
                            onClick={handleCrawl}
                            disabled={loading || crawling || hasActiveJob}
                            sx={{ textTransform: 'none' }}
                        >
                            Crawl lại
                        </Button>
                    </Stack>
                </Stack>

                {error && <Alert severity="error">{error}</Alert>}
                {info && <Alert severity="success">{info}</Alert>}

                <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={periodFilter}
                    onChange={(_event, next: PeriodFilter | null) => {
                        if (next) setPeriodFilter(next);
                    }}
                    aria-label="Lọc theo kỳ trending"
                    sx={{
                        flexWrap: 'wrap',
                        '& .MuiToggleButton-root': {
                            textTransform: 'none',
                            px: 1.5,
                        },
                    }}
                >
                    {PERIOD_FILTERS.map((tab) => (
                        <ToggleButton key={tab.value} value={tab.value}>
                            {tab.label} ({periodCounts[tab.value]})
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>

                {loading && (
                    <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
                        <CircularProgress />
                    </Box>
                )}

                {!loading && items.length === 0 && (
                    <Alert severity="info">
                        Chưa có repo trending. Bấm «Crawl lại» để lấy danh sách từ GitHub.
                    </Alert>
                )}

                {!loading && items.length > 0 && filteredItems.length === 0 && (
                    <Alert severity="info">
                        Không có repo trong kỳ «{PERIOD_FILTERS.find((t) => t.value === periodFilter)?.label}».
                    </Alert>
                )}

                {!loading &&
                    filteredItems.map((item) => {
                        const score = Math.max(0, Math.min(100, Number(item.hot_score || 0)));
                        const creating = creatingId === item.id;
                        const describing = describingId === item.id;
                        const descriptionVi = String(item.description_vi || '').trim();
                        const displayDescription =
                            descriptionVi || String(item.description || '').trim();
                        const showingVi = descriptionVi !== '';
                        const isPosted =
                            item.recommend_status === 'cooldown' ||
                            Boolean(String(item.last_posted_at || '').trim());
                        // Ưu tiên: đã post > có mô tả VI > mặc định
                        const cardTone = isPosted
                            ? {
                                  borderColor: 'info.main',
                                  borderWidth: 1.5,
                                  bgcolor: 'rgba(2, 136, 209, 0.14)',
                              }
                            : showingVi
                              ? {
                                    borderColor: 'success.main',
                                    borderWidth: 1.5,
                                    bgcolor: 'rgba(46, 125, 50, 0.18)',
                                }
                              : {
                                    borderColor: 'divider',
                                    borderWidth: 1,
                                    bgcolor: 'rgba(0, 0, 0, 0.03)',
                                };
                        return (
                            <Box
                                key={item.id}
                                sx={{
                                    border: '1px solid',
                                    borderColor: cardTone.borderColor,
                                    borderWidth: cardTone.borderWidth,
                                    borderRadius: 2,
                                    p: 1.5,
                                    bgcolor: cardTone.bgcolor,
                                }}
                            >
                                <Stack
                                    direction={{ xs: 'column', md: 'row' }}
                                    spacing={1.5}
                                    alignItems={{ xs: 'stretch', md: 'flex-start' }}
                                    justifyContent="space-between"
                                >
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Stack
                                            direction="row"
                                            spacing={1}
                                            alignItems="center"
                                            flexWrap="wrap"
                                            useFlexGap
                                            sx={{ mb: 0.5 }}
                                        >
                                            <Link
                                                href={
                                                    item.html_url ||
                                                    `https://github.com/${item.full_name}`
                                                }
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                underline="hover"
                                                sx={{
                                                    fontWeight: 700,
                                                    fontSize: '0.95rem',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 0.5,
                                                }}
                                            >
                                                {item.full_name}
                                                <OpenInNewIcon sx={{ fontSize: 14 }} />
                                            </Link>
                                            {item.in_daily && (
                                                <Chip size="small" label="Daily" color="error" />
                                            )}
                                            {item.in_weekly && (
                                                <Chip size="small" label="Weekly" color="warning" />
                                            )}
                                            {item.in_monthly && (
                                                <Chip size="small" label="Monthly" color="info" />
                                            )}
                                            {item.language ? (
                                                <Chip size="small" label={item.language} variant="outlined" />
                                            ) : null}
                                            <Chip
                                                size="small"
                                                label={statusLabel(item.recommend_status)}
                                                color={statusColor(item.recommend_status)}
                                            />
                                        </Stack>

                                        {displayDescription ? (
                                            <RepoDescriptionText
                                                text={displayDescription}
                                                isStructured={showingVi}
                                            />
                                        ) : null}

                                        <Stack
                                            direction="row"
                                            spacing={2}
                                            alignItems="center"
                                            flexWrap="wrap"
                                            useFlexGap
                                            sx={{ mb: 0.75 }}
                                        >
                                            <Typography variant="caption" color="text.secondary">
                                                ★ {Number(item.stars_total || 0).toLocaleString()}
                                            </Typography>
                                            {item.growth_label ? (
                                                <Typography
                                                    variant="caption"
                                                    sx={{ fontWeight: 600, color: 'success.main' }}
                                                >
                                                    {item.growth_label}
                                                </Typography>
                                            ) : null}
                                            {item.last_posted_at ? (
                                                <Typography variant="caption" color="text.secondary">
                                                    Đã post: {item.last_posted_at}
                                                </Typography>
                                            ) : null}
                                        </Stack>

                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Typography
                                                variant="caption"
                                                sx={{ minWidth: 52, fontWeight: 600 }}
                                            >
                                                Hot {score}
                                            </Typography>
                                            <Box sx={{ flex: 1 }}>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={score}
                                                    color={hotBarColor(score)}
                                                    sx={{ height: 8, borderRadius: 4 }}
                                                />
                                            </Box>
                                        </Stack>
                                    </Box>

                                    <Stack
                                        spacing={1}
                                        sx={{ flexShrink: 0, minWidth: { md: 168 } }}
                                    >
                                        <Button
                                            size="small"
                                            variant="contained"
                                            color="secondary"
                                            fullWidth
                                            startIcon={
                                                creating ? (
                                                    <CircularProgress size={14} color="inherit" />
                                                ) : (
                                                    <VideoLibraryOutlinedIcon fontSize="small" />
                                                )
                                            }
                                            disabled={creating || describing || loading}
                                            onClick={() => handleCreate(item)}
                                            sx={{ textTransform: 'none' }}
                                        >
                                            Tạo short video
                                        </Button>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            fullWidth
                                            startIcon={
                                                describing ? (
                                                    <CircularProgress size={14} color="inherit" />
                                                ) : (
                                                    <TranslateIcon fontSize="small" />
                                                )
                                            }
                                            disabled={creating || describing || loading}
                                            onClick={() => handleGenerateDescriptionVi(item)}
                                            sx={{ textTransform: 'none' }}
                                        >
                                            {showingVi ? 'Làm lại mô tả VI' : 'Mô tả tiếng Việt'}
                                        </Button>
                                    </Stack>
                                </Stack>
                            </Box>
                        );
                    })}
            </Stack>
        </DrawerCustom>
    );
}
