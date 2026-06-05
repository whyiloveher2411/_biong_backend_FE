import React from 'react';
import {
    Alert,
    Box,
    CircularProgress,
    FormControl,
    FormControlLabel,
    FormLabel,
    MenuItem,
    Radio,
    RadioGroup,
    Select,
    Typography,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import DrawerCustom from 'components/molecules/DrawerCustom';
import useAjax from 'hook/useApi';
import { CreatePostTypeData } from 'components/pages/PostType/CreateData';

type StoreOption = {
    key: string;
    name: string;
};

type MigrateMode = 'full' | 'urls_only' | 'dry_run_urls';

type PhaseStatus = {
    job_id: number;
    handler: string;
    status: string;
    attempts: number;
    error_log: string;
    dry_run?: boolean;
    result_summary?: Record<string, unknown>;
};

type Props = {
    open: boolean;
    onClose: () => void;
    data: CreatePostTypeData;
};

function parseApiMessage(res: unknown): string {
    if (!res || typeof res !== 'object') return 'Yêu cầu thất bại';
    const r = res as { message?: { content?: string } | string };
    if (typeof r.message === 'string') return r.message;
    if (r.message && typeof r.message === 'object' && r.message.content) return r.message.content;
    return 'Yêu cầu thất bại';
}

export default function ObjectStoreMigrateDrawer({ open, onClose, data }: Props) {
    const api = useAjax();
    const apiAjaxRef = React.useRef(api.ajax);
    apiAjaxRef.current = api.ajax;

    const appMobileId = Number(data?.post?.id || 0);

    const [stores, setStores] = React.useState<StoreOption[]>([]);
    const [storesLoading, setStoresLoading] = React.useState(false);
    const [sourceKey, setSourceKey] = React.useState('');
    const [targetKey, setTargetKey] = React.useState('');
    const [mode, setMode] = React.useState<MigrateMode>('full');
    const [submitting, setSubmitting] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
    const [migrationId, setMigrationId] = React.useState<string | null>(null);
    const [phases, setPhases] = React.useState<PhaseStatus[]>([]);
    const [overallStatus, setOverallStatus] = React.useState<string | null>(null);

    const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

    const stopPolling = React.useCallback(() => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    }, []);

    const fetchStatus = React.useCallback((mid: string) => {
        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/object-store/migrate-status',
            method: 'POST',
            data: { migration_id: mid },
            loading: false,
            success: (res: { data?: { overall_status?: string; phases?: PhaseStatus[] } }) => {
                const d = res?.data;
                if (d?.overall_status) {
                    setOverallStatus(d.overall_status);
                }
                const phaseList = d?.phases;
                if (Array.isArray(phaseList)) {
                    setPhases(phaseList);
                }
                if (d?.overall_status === 'completed' || d?.overall_status === 'failed') {
                    stopPolling();
                }
            },
        });
    }, [stopPolling]);

    const startPolling = React.useCallback((mid: string) => {
        stopPolling();
        fetchStatus(mid);
        pollRef.current = setInterval(() => fetchStatus(mid), 5000);
    }, [fetchStatus, stopPolling]);

    React.useEffect(() => {
        if (!open) {
            stopPolling();
            return;
        }

        setError(null);
        setSuccessMsg(null);
        setMigrationId(null);
        setPhases([]);
        setOverallStatus(null);
        setStoresLoading(true);

        apiAjaxRef.current({
            url: 'file-manager/get_store',
            method: 'POST',
            loading: false,
            success: (res: { stores?: StoreOption[] }) => {
                setStoresLoading(false);
                const list = (res?.stores || []).filter((s) => s.key && s.key !== 'local');
                setStores(list);

                const prodKey = String(data?.post?.s3_bucket_name_prod || '').trim();
                const devKey = String(data?.post?.s3_bucket_name_dev || '').trim();
                const env = String(data?.post?.environment_current || 'production');
                const currentKey = env === 'development' ? devKey : prodKey;

                if (currentKey && list.some((s) => s.key === currentKey)) {
                    setTargetKey(currentKey);
                }
            },
            error: (err: unknown) => {
                setStoresLoading(false);
                setError(parseApiMessage(err));
            },
        });

        return () => stopPolling();
    }, [open, data?.post, stopPolling]);

    const handleSubmit = () => {
        if (!appMobileId) {
            setError('Thiếu id app mobile');
            return;
        }
        if (!sourceKey || !targetKey) {
            setError('Chọn store nguồn và store đích');
            return;
        }
        if (sourceKey === targetKey) {
            setError('Store nguồn và đích phải khác nhau');
            return;
        }

        setSubmitting(true);
        setError(null);
        setSuccessMsg(null);

        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/object-store/start-migrate',
            method: 'POST',
            data: {
                id: appMobileId,
                source_store_key: sourceKey,
                target_store_key: targetKey,
                mode,
            },
            loading: false,
            success: (res: { data?: { migration_id?: string; jobs?: Array<{ job_id: number }> } }) => {
                setSubmitting(false);
                const mid = res?.data?.migration_id || null;
                setMigrationId(mid);
                setSuccessMsg('Đã đưa migration vào queue. Theo dõi trạng thái bên dưới hoặc mở Queue Job.');
                if (mid) {
                    startPolling(mid);
                }
            },
            error: (err: unknown) => {
                setSubmitting(false);
                setError(parseApiMessage(err));
            },
        });
    };

    const statusLabel = (status: string) => {
        switch (status) {
            case 'pending': return 'Đang chờ';
            case 'processing': return 'Đang chạy';
            case 'completed': return 'Hoàn tất';
            case 'failed': return 'Thất bại';
            default: return status;
        }
    };

    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title="Migrate object store"
            width={640}
            activeOnClose
        >
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Copy toàn bucket bằng rclone, sau đó cập nhật URL trong database và JSON trên bucket đích.
                Worker phải đang chạy: <code>php worker.php</code>.
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}
            {successMsg && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    {successMsg}
                </Alert>
            )}

            {storesLoading ? (
                <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
                    <CircularProgress />
                </Box>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <FormControl fullWidth size="small">
                        <FormLabel sx={{ mb: 0.5 }}>Store from (nguồn)</FormLabel>
                        <Select
                            value={sourceKey}
                            onChange={(e) => setSourceKey(String(e.target.value))}
                            displayEmpty
                        >
                            <MenuItem value="" disabled>Chọn store nguồn</MenuItem>
                            {stores.map((s) => (
                                <MenuItem key={s.key} value={s.key}>
                                    {s.name} ({s.key})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl fullWidth size="small">
                        <FormLabel sx={{ mb: 0.5 }}>Store to (đích)</FormLabel>
                        <Select
                            value={targetKey}
                            onChange={(e) => setTargetKey(String(e.target.value))}
                            displayEmpty
                        >
                            <MenuItem value="" disabled>Chọn store đích</MenuItem>
                            {stores.map((s) => (
                                <MenuItem key={s.key} value={s.key}>
                                    {s.name} ({s.key})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl>
                        <FormLabel>Chế độ</FormLabel>
                        <RadioGroup
                            value={mode}
                            onChange={(e) => setMode(e.target.value as MigrateMode)}
                        >
                            <FormControlLabel
                                value="full"
                                control={<Radio />}
                                label="Đầy đủ — copy bucket + migrate URL"
                            />
                            <FormControlLabel
                                value="urls_only"
                                control={<Radio />}
                                label="Chỉ migrate URL (đã copy bucket thủ công)"
                            />
                            <FormControlLabel
                                value="dry_run_urls"
                                control={<Radio />}
                                label="Dry run — chỉ xem URL sẽ đổi, không ghi"
                            />
                        </RadioGroup>
                    </FormControl>

                    <LoadingButton
                        variant="contained"
                        loading={submitting}
                        onClick={handleSubmit}
                    >
                        Bắt đầu migration
                    </LoadingButton>
                </Box>
            )}

            {migrationId && (
                <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Migration ID: {migrationId}
                    </Typography>
                    {overallStatus && (
                        <Typography variant="body2" sx={{ mb: 1 }}>
                            Trạng thái tổng: {statusLabel(overallStatus)}
                        </Typography>
                    )}
                    {phases.map((phase) => (
                        <Alert
                            key={phase.job_id}
                            severity={
                                phase.status === 'failed'
                                    ? 'error'
                                    : phase.status === 'completed'
                                        ? 'success'
                                        : 'info'
                            }
                            sx={{ mb: 1 }}
                        >
                            <Typography variant="body2">
                                Job #{phase.job_id} — {phase.handler} — {statusLabel(phase.status)}
                            </Typography>
                            {phase.error_log ? (
                                <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
                                    {phase.error_log}
                                </Typography>
                            ) : null}
                        </Alert>
                    ))}
                </Box>
            )}
        </DrawerCustom>
    );
}
