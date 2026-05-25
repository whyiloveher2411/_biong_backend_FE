import React from 'react';
import {
    Alert,
    Box,
    Checkbox,
    CircularProgress,
    FormControlLabel,
    Typography,
} from '@mui/material';
import useAjax from 'hook/useApi';
import { DataResultApiProps } from 'components/atoms/fields/relationship_onetomany_show/Form';

type Props = {
    appMobileId?: number;
};

type CrawlSchedulerConfig = {
    scheduler_enabled?: boolean;
    interval_minutes?: number;
    auto_crawl_marketing_source?: boolean;
};

function parseApiMessage(res: unknown): string {
    if (!res || typeof res !== 'object') return 'Yêu cầu thất bại';
    const r = res as { message?: { content?: string } | string };
    if (typeof r.message === 'string') return r.message;
    if (r.message && typeof r.message === 'object' && r.message.content) return r.message.content;
    return 'Yêu cầu thất bại';
}

function parseJobCrawl(raw: unknown): Record<string, unknown> {
    if (!raw) return {};
    if (typeof raw === 'object' && !Array.isArray(raw)) {
        return raw as Record<string, unknown>;
    }
    if (typeof raw === 'string' && raw.trim() !== '') {
        try {
            const parsed = JSON.parse(raw);
            return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
                ? (parsed as Record<string, unknown>)
                : {};
        } catch {
            return {};
        }
    }
    return {};
}

function isJobCrawlAutoEnabled(jobCrawl: Record<string, unknown>): boolean {
    const v = jobCrawl.auto_crawl_marketing_source;
    return v === true || v === 1 || v === '1';
}

export default function MarketingCrawlAutoToggle({ appMobileId }: Props) {
    const api = useAjax();
    const apiAjaxRef = React.useRef(api.ajax);
    apiAjaxRef.current = api.ajax;
    const [loading, setLoading] = React.useState(false);
    const [savingToggle, setSavingToggle] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [appMobileDetail, setAppMobileDetail] = React.useState<DataResultApiProps | null>(null);
    const [schedulerConfig, setSchedulerConfig] = React.useState<CrawlSchedulerConfig | null>(null);
    const [autoCrawlEnabled, setAutoCrawlEnabled] = React.useState(false);

    const loadData = React.useCallback(() => {
        if (!appMobileId) {
            setError('Chưa xác định mobile_app');
            setAppMobileDetail(null);
            setSchedulerConfig(null);
            return;
        }

        setLoading(true);
        setError(null);

        apiAjaxRef.current({
            url: `post-type/detail/app_mobile/${appMobileId}`,
            method: 'POST',
            loading: false,
            success: (result: DataResultApiProps) => {
                setAppMobileDetail(result);
                apiAjaxRef.current({
                    url: 'plugin/vn4-e-learning/app-mobile/marketing/crawl-scheduler-config',
                    method: 'POST',
                    data: { app_mobile_id: appMobileId },
                    loading: false,
                    success: (configRes: CrawlSchedulerConfig) => {
                        setLoading(false);
                        setSchedulerConfig(configRes);
                        const jobCrawl = parseJobCrawl(result.post?.job_crawl);
                        const enabled =
                            configRes.auto_crawl_marketing_source !== undefined
                                ? Boolean(configRes.auto_crawl_marketing_source)
                                : isJobCrawlAutoEnabled(jobCrawl);
                        setAutoCrawlEnabled(enabled);
                    },
                    error: (err: unknown) => {
                        setLoading(false);
                        setError(parseApiMessage(err));
                    },
                });
            },
            error: (err: unknown) => {
                setLoading(false);
                setError(parseApiMessage(err));
            },
        });
    }, [appMobileId]);

    React.useEffect(() => {
        loadData();
    }, [loadData]);

    const handleToggleAutoCrawl = (checked: boolean) => {
        if (!appMobileId || !appMobileDetail?.post) return;

        const jobCrawl = parseJobCrawl(appMobileDetail.post.job_crawl);
        const nextJobCrawl = {
            ...jobCrawl,
            auto_crawl_marketing_source: checked ? 1 : 0,
        };

        setSavingToggle(true);
        setError(null);

        apiAjaxRef.current({
            url: 'post-type/post/app_mobile',
            method: 'POST',
            data: {
                ...appMobileDetail.post,
                job_crawl: JSON.stringify(nextJobCrawl),
                _action: 'update',
            },
            loading: false,
            success: (result: DataResultApiProps) => {
                setSavingToggle(false);
                setAutoCrawlEnabled(checked);
                if (result?.post) {
                    setAppMobileDetail((prev) =>
                        prev
                            ? {
                                  ...prev,
                                  post: result.post,
                                  author: result.author ?? prev.author,
                                  editor: result.editor ?? prev.editor,
                              }
                            : prev
                    );
                }
                setSchedulerConfig((prev) =>
                    prev ? { ...prev, auto_crawl_marketing_source: checked } : prev
                );
            },
            error: (err: unknown) => {
                setSavingToggle(false);
                setError(parseApiMessage(err));
            },
        });
    };

    const intervalMinutes = schedulerConfig?.interval_minutes ?? 10;

    if (loading) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                <CircularProgress size={20} />
                <Typography variant="caption" color="text.secondary">
                    Đang tải cài đặt crawl...
                </Typography>
            </Box>
        );
    }

    if (!appMobileDetail?.post) {
        return error ? (
            <Alert severity="error" sx={{ py: 0 }}>
                {error}
            </Alert>
        ) : null;
    }

    return (
        <Box>
            {error && (
                <Alert severity="error" sx={{ mb: 1 }}>
                    {error}
                </Alert>
            )}

            {schedulerConfig && schedulerConfig.scheduler_enabled === false && (
                <Alert severity="warning" sx={{ mb: 1 }}>
                    Scheduler crawl toàn hệ thống đang tắt (MARKETING_CRAWL_SCHEDULER_ENABLED=0).
                    Cron sẽ không enqueue job cho đến khi bật trong .env.
                </Alert>
            )}

            <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 600, display: 'block', mb: 0.75 }}
            >
                Tự động crawl
            </Typography>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    flexWrap: 'wrap',
                }}
            >
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={autoCrawlEnabled}
                            disabled={savingToggle}
                            onChange={(e) => handleToggleAutoCrawl(e.target.checked)}
                            size="small"
                        />
                    }
                    label={`Tự động crawl sau ${intervalMinutes} phút`}
                    sx={{ m: 0 }}
                />
                {savingToggle && <CircularProgress size={20} />}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Bật công tắc trên app mobile; từng source vẫn cần bật &quot;Tự động crawl&quot; và đủ chu kỳ
                riêng. Cron quét mỗi {intervalMinutes} phút (MARKETING_CRAWL_SCHEDULER_INTERVAL_MINUTES).
            </Typography>
        </Box>
    );
}
