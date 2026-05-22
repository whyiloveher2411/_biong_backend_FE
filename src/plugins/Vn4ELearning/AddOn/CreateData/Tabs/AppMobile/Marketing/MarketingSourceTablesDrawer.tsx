import React from 'react';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    FormControlLabel,
    Typography,
} from '@mui/material';
import DrawerCustom from 'components/molecules/DrawerCustom';
import FieldForm from 'components/atoms/fields/relationship_onetomany_show/Form';
import useAjax from 'hook/useApi';
import { DataResultApiProps } from 'components/atoms/fields/relationship_onetomany_show/Form';

type Props = {
    open: boolean;
    onClose: () => void;
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

export default function MarketingSourceTablesDrawer({ open, onClose, appMobileId }: Props) {
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
        if (!open) return;
        loadData();
    }, [open, loadData]);

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

    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title="Crawl Source"
            width={1200}
            action={<Button onClick={onClose}>Đóng</Button>}
        >
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {loading && (
                <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
                    <CircularProgress />
                </Box>
            )}

            {!loading && appMobileDetail?.post && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {schedulerConfig && schedulerConfig.scheduler_enabled === false && (
                        <Alert severity="warning">
                            Scheduler crawl toàn hệ thống đang tắt (MARKETING_CRAWL_SCHEDULER_ENABLED=0).
                            Cron sẽ không enqueue job cho đến khi bật trong .env.
                        </Alert>
                    )}

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
                                />
                            }
                            label={`Tự động crawl sau ${intervalMinutes} phút`}
                        />
                        {savingToggle && <CircularProgress size={20} />}
                    </Box>

                    <Typography variant="caption" color="text.secondary">
                        Bật công tắc trên app mobile; từng source vẫn cần bật &quot;Tự động crawl&quot; và đủ chu kỳ
                        riêng. Cron quét mỗi {intervalMinutes} phút (MARKETING_CRAWL_SCHEDULER_INTERVAL_MINUTES).
                    </Typography>

                    <Typography variant="subtitle2">Danh sách source theo mobile app</Typography>
                    <FieldForm
                        component="relationship_onetomany_show"
                        config={{
                            title: 'Marketing Source',
                            object: 'spacedev_app_marketing_source',
                            field: 'mobile_app',
                            view: 'relationship_onetomany_show',
                            paginate: {
                                rowsPerPage: 20,
                            },
                        }}
                        post={appMobileDetail.post}
                        name="mobile_app"
                        onReview={() => { }} // eslint-disable-line @typescript-eslint/no-empty-function
                    />

                    <Typography variant="subtitle2">Danh sách source item theo mobile app</Typography>
                    <FieldForm
                        component="relationship_onetomany_show"
                        config={{
                            title: 'Marketing Source Item',
                            object: 'spacedev_app_marketing_source_item',
                            field: 'app_mobile',
                            view: 'relationship_onetomany_show',
                            paginate: {
                                rowsPerPage: 20,
                            },
                        }}
                        post={appMobileDetail.post}
                        name="app_mobile"
                        onReview={() => { }} // eslint-disable-line @typescript-eslint/no-empty-function
                    />
                </Box>
            )}
        </DrawerCustom>
    );
}
