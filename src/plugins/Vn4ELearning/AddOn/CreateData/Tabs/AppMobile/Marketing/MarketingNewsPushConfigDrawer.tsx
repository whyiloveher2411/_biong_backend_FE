import React from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    FormControlLabel,
    Stack,
    Switch,
    TextField,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DrawerCustom from 'components/molecules/DrawerCustom';
import useAjax from 'hook/useApi';
import { DataResultApiProps } from 'components/atoms/fields/relationship_onetomany_show/Form';

type NewsPushConfig = {
    configured?: boolean;
    enabled?: boolean;
    timezone?: string;
    dispatch_times?: string[];
    slot_tolerance_minutes?: number;
    scan_limit?: number;
};

type NewsPushConfigApiResponse = {
    success?: boolean;
    is_configured?: boolean;
    config?: NewsPushConfig;
    defaults?: NewsPushConfig;
    message?: { content?: string } | string;
};

type Props = {
    open: boolean;
    onClose: () => void;
    appMobileId?: number;
};

function parseApiMessage(res: unknown): string {
    if (!res || typeof res !== 'object') return 'Yêu cầu thất bại';
    const r = res as { message?: { content?: string } | string };
    if (typeof r.message === 'string') return r.message;
    if (r.message && typeof r.message === 'object' && r.message.content) return r.message.content;
    return 'Yêu cầu thất bại';
}

function parseConfigRaw(raw: unknown): NewsPushConfig {
    if (!raw) return {};
    if (typeof raw === 'object' && !Array.isArray(raw)) {
        return raw as NewsPushConfig;
    }
    if (typeof raw === 'string' && raw.trim() !== '') {
        try {
            const parsed = JSON.parse(raw);
            return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
                ? (parsed as NewsPushConfig)
                : {};
        } catch {
            return {};
        }
    }
    return {};
}

function normalizeTimeInput(value: string): string | null {
    const trimmed = value.trim();
    if (!/^\d{1,2}:\d{2}$/.test(trimmed)) {
        return null;
    }
    const [h, m] = trimmed.split(':');
    return `${String(Number(h)).padStart(2, '0')}:${String(Number(m)).padStart(2, '0')}`;
}

function mergeConfig(defaults: NewsPushConfig, current: NewsPushConfig): NewsPushConfig {
    return {
        configured: Boolean(current.configured),
        enabled: Boolean(current.enabled),
        timezone: (current.timezone || defaults.timezone || 'Asia/Ho_Chi_Minh').trim(),
        dispatch_times:
            Array.isArray(current.dispatch_times) && current.dispatch_times.length > 0
                ? [...current.dispatch_times]
                : [...(defaults.dispatch_times || ['08:00', '12:30', '20:30'])],
        slot_tolerance_minutes:
            current.slot_tolerance_minutes ?? defaults.slot_tolerance_minutes ?? 2,
        scan_limit: current.scan_limit ?? defaults.scan_limit ?? 500,
    };
}

export default function MarketingNewsPushConfigDrawer({ open, onClose, appMobileId }: Props) {
    const api = useAjax();
    const apiAjaxRef = React.useRef(api.ajax);
    apiAjaxRef.current = api.ajax;

    const [loading, setLoading] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [isConfigured, setIsConfigured] = React.useState(false);
    const [appMobileDetail, setAppMobileDetail] = React.useState<DataResultApiProps | null>(null);
    const [form, setForm] = React.useState<NewsPushConfig>({});
    const [newTime, setNewTime] = React.useState('');

    const loadData = React.useCallback(() => {
        if (!appMobileId) {
            setError('Chưa xác định mobile_app');
            setAppMobileDetail(null);
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
                    url: 'plugin/vn4-e-learning/app-mobile/marketing/news-push-config',
                    method: 'POST',
                    data: { app_mobile_id: appMobileId },
                    loading: false,
                    success: (configRes: NewsPushConfigApiResponse) => {
                        setLoading(false);
                        const defaults = configRes.defaults || {};
                        const current = configRes.config || parseConfigRaw(result.post?.marketing_news_push_config);
                        setIsConfigured(Boolean(configRes.is_configured));
                        setForm(mergeConfig(defaults, current));
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
        if (open) {
            loadData();
        }
    }, [open, loadData]);

    const handleAddTime = () => {
        const normalized = normalizeTimeInput(newTime);
        if (!normalized) {
            setError('Khung giờ không hợp lệ (định dạng H:i, ví dụ 08:00)');
            return;
        }
        setError(null);
        setForm((prev) => {
            const times = [...(prev.dispatch_times || [])];
            if (!times.includes(normalized)) {
                times.push(normalized);
                times.sort();
            }
            return { ...prev, dispatch_times: times };
        });
        setNewTime('');
    };

    const handleRemoveTime = (time: string) => {
        setForm((prev) => ({
            ...prev,
            dispatch_times: (prev.dispatch_times || []).filter((t) => t !== time),
        }));
    };

    const handleSave = () => {
        if (!appMobileId || !appMobileDetail?.post) return;

        const dispatchTimes = (form.dispatch_times || []).filter((t) => normalizeTimeInput(t));
        if (dispatchTimes.length === 0) {
            setError('Cần ít nhất một khung giờ gửi tin');
            return;
        }

        const payload: NewsPushConfig = {
            configured: true,
            enabled: Boolean(form.enabled),
            timezone: (form.timezone || 'Asia/Ho_Chi_Minh').trim(),
            dispatch_times: dispatchTimes,
            slot_tolerance_minutes: Math.max(0, Number(form.slot_tolerance_minutes ?? 2)),
            scan_limit: Math.max(50, Math.min(5000, Number(form.scan_limit ?? 500))),
        };

        setSaving(true);
        setError(null);

        apiAjaxRef.current({
            url: 'post-type/post/app_mobile',
            method: 'POST',
            data: {
                ...appMobileDetail.post,
                marketing_news_push_config: JSON.stringify(payload),
                _action: 'update',
            },
            loading: false,
            success: (result: DataResultApiProps) => {
                setSaving(false);
                setIsConfigured(true);
                setForm(mergeConfig({}, payload));
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
            },
            error: (err: unknown) => {
                setSaving(false);
                setError(parseApiMessage(err));
            },
        });
    };

    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title="Cấu hình gửi tin News"
            width={560}
            activeOnClose
            action={
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSave}
                    disabled={saving || loading || !appMobileDetail?.post}
                    sx={{ textTransform: 'none' }}
                >
                    {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
                </Button>
            }
        >
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {!isConfigured && !loading && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Chưa lưu cấu hình — scheduler sẽ không gửi tin cho app này cho đến khi bạn lưu lần đầu.
                </Alert>
            )}

            {loading && (
                <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
                    <CircularProgress />
                </Box>
            )}

            {!loading && appMobileDetail?.post && (
                <Stack spacing={2.5}>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={Boolean(form.enabled)}
                                onChange={(e) => setForm((prev) => ({ ...prev, enabled: e.target.checked }))}
                            />
                        }
                        label="Bật gửi tin tự động theo lịch"
                    />

                    <TextField
                        label="Timezone"
                        size="small"
                        fullWidth
                        value={form.timezone || 'Asia/Ho_Chi_Minh'}
                        onChange={(e) => setForm((prev) => ({ ...prev, timezone: e.target.value }))}
                        helperText="Ví dụ: Asia/Ho_Chi_Minh"
                    />

                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            Khung giờ gửi tin
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                            <TextField
                                size="small"
                                placeholder="08:00"
                                value={newTime}
                                onChange={(e) => setNewTime(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddTime();
                                    }
                                }}
                                sx={{ width: 120 }}
                            />
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<AddIcon />}
                                onClick={handleAddTime}
                                sx={{ textTransform: 'none' }}
                            >
                                Thêm
                            </Button>
                        </Stack>
                        <Stack direction="row" flexWrap="wrap" gap={0.75}>
                            {(form.dispatch_times || []).map((time) => (
                                <Chip
                                    key={time}
                                    label={time}
                                    onDelete={() => handleRemoveTime(time)}
                                    deleteIcon={<DeleteOutlineIcon />}
                                    size="small"
                                />
                            ))}
                        </Stack>
                    </Box>

                    <TextField
                        label="Độ lệch khung giờ (phút)"
                        size="small"
                        type="number"
                        fullWidth
                        inputProps={{ min: 0, max: 30 }}
                        value={form.slot_tolerance_minutes ?? 2}
                        onChange={(e) =>
                            setForm((prev) => ({
                                ...prev,
                                slot_tolerance_minutes: Number(e.target.value),
                            }))
                        }
                        helperText="Scheduler chạy mỗi phút — cho phép lệch ±N phút quanh mỗi khung giờ"
                    />

                    <TextField
                        label="Số bài quét tối đa"
                        size="small"
                        type="number"
                        fullWidth
                        inputProps={{ min: 50, max: 5000 }}
                        value={form.scan_limit ?? 500}
                        onChange={(e) =>
                            setForm((prev) => ({
                                ...prev,
                                scan_limit: Number(e.target.value),
                            }))
                        }
                        helperText="Quét bài publish gần đây trước khi chọn 1 bài không Pro, score cao, chưa gửi tin"
                    />

                    <Typography variant="caption" color="text.secondary">
                        Chọn bài: không Pro, điểm đánh giá cao, publish mới, chưa gửi đủ notification.
                    </Typography>
                </Stack>
            )}
        </DrawerCustom>
    );
}
