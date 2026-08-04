import React from 'react';
import {
    Alert,
    Box,
    Chip,
    CircularProgress,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import {
    HEADLESS_GEMINI_LOGIN_CMD,
    HEADLESS_PREVIEW_RELAY_CMD,
    HEADLESS_WORKER_CMD,
} from './agentVideoHeadlessPrerequisites';
import {
    getHeadlessPrerequisitesStatus,
    type HeadlessPrerequisitesStatusResponse,
} from './agentVideoApi';

type Props = {
    compact?: boolean;
    dense?: boolean;
};

type RowStatus = 'ok' | 'warn' | 'bad' | 'unknown';

type CheckRow = {
    key: string;
    required: boolean;
    title: string;
    status: RowStatus;
    statusLabel: string;
    detail?: string;
    hint?: string;
    command: string;
    cwdHint?: string;
};

function rowAccent(status: RowStatus): string {
    switch (status) {
        case 'ok':
            return '#16a34a';
        case 'warn':
            return '#d97706';
        case 'bad':
            return '#dc2626';
        default:
            return '#94a3b8';
    }
}

function rowBg(status: RowStatus): string {
    switch (status) {
        case 'ok':
            return 'rgba(22, 163, 74, 0.08)';
        case 'warn':
            return 'rgba(217, 119, 6, 0.08)';
        case 'bad':
            return 'rgba(220, 38, 38, 0.08)';
        default:
            return 'rgba(148, 163, 184, 0.1)';
    }
}

function StatusIcon({ status }: { status: RowStatus }) {
    const sx = { fontSize: 18, color: rowAccent(status) };
    if (status === 'ok') {
        return <CheckCircleOutlineIcon sx={sx} />;
    }
    if (status === 'bad') {
        return <ErrorOutlineIcon sx={sx} />;
    }
    return <WarningAmberOutlinedIcon sx={sx} />;
}

function CommandBlock({ command }: { command: string }) {
    return (
        <Box
            component="code"
            sx={{
                display: 'block',
                mt: 0.6,
                px: 0.85,
                py: 0.55,
                borderRadius: 1,
                bgcolor: 'rgba(15, 23, 42, 0.06)',
                border: '1px solid rgba(15, 23, 42, 0.08)',
                fontSize: 10,
                lineHeight: 1.4,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                color: 'text.primary',
            }}
        >
            {command}
        </Box>
    );
}

function PrerequisiteCard({ row }: { row: CheckRow }) {
    return (
        <Box
            sx={{
                display: 'flex',
                gap: 1,
                p: 1,
                borderRadius: 1.25,
                bgcolor: rowBg(row.status),
                border: '1px solid',
                borderColor: 'rgba(15, 23, 42, 0.08)',
                borderLeft: `3px solid ${rowAccent(row.status)}`,
            }}
        >
            <Box sx={{ pt: 0.1, flexShrink: 0 }}>
                <StatusIcon status={row.status} />
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
                <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={1}
                    sx={{ mb: 0.25 }}
                >
                    <Typography
                        sx={{
                            fontSize: 12,
                            fontWeight: 700,
                            lineHeight: 1.3,
                            color: 'text.primary',
                        }}
                    >
                        {row.title}
                        <Typography
                            component="span"
                            sx={{
                                ml: 0.75,
                                fontSize: 10,
                                fontWeight: 600,
                                color: 'text.secondary',
                            }}
                        >
                            {row.required ? 'Bắt buộc' : 'Tuỳ chọn'}
                        </Typography>
                    </Typography>
                    <Chip
                        size="small"
                        label={row.statusLabel}
                        sx={{
                            height: 20,
                            flexShrink: 0,
                            fontSize: 10,
                            fontWeight: 700,
                            bgcolor: rowAccent(row.status),
                            color: '#fff',
                            '& .MuiChip-label': { px: 0.8 },
                        }}
                    />
                </Stack>
                {row.detail ? (
                    <Typography sx={{ fontSize: 10.5, color: 'text.secondary', lineHeight: 1.4 }}>
                        {row.detail}
                    </Typography>
                ) : null}
                {row.hint ? (
                    <Typography sx={{ mt: 0.25, fontSize: 10, color: 'text.secondary', lineHeight: 1.4 }}>
                        {row.hint}
                    </Typography>
                ) : null}
                {row.cwdHint ? (
                    <Typography sx={{ mt: 0.45, fontSize: 10, color: 'text.secondary' }}>
                        Thư mục:
                        {' '}
                        <Box component="span" sx={{ fontFamily: 'ui-monospace, monospace', fontWeight: 600 }}>
                            {row.cwdHint}
                        </Box>
                    </Typography>
                ) : null}
                <CommandBlock command={row.command} />
            </Box>
        </Box>
    );
}

/**
 * Gemini Web không có daemon riêng — worker spawn Chrome mỗi job.
 * Card trạng thái + lệnh cần chạy, dễ quét mắt.
 */
export function PipelineHeadlessPrerequisitesHint({ compact = false, dense = false }: Props) {
    const [loading, setLoading] = React.useState(true);
    const [status, setStatus] = React.useState<HeadlessPrerequisitesStatusResponse | null>(null);
    const [error, setError] = React.useState('');

    const refresh = React.useCallback(async (opts?: { silent?: boolean }) => {
        if (!opts?.silent) {
            setLoading(true);
        }
        setError('');
        try {
            const res = await getHeadlessPrerequisitesStatus();
            if (!res?.success) {
                setStatus(null);
                setError(String(
                    (typeof res?.message === 'string' ? res.message : '')
                    || 'Không kiểm tra được trạng thái Headless',
                ));
                return;
            }
            setStatus(res);
        } catch (e) {
            setStatus(null);
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        void refresh();
        const timer = window.setInterval(() => {
            void refresh({ silent: true });
        }, 12000);
        return () => {
            window.clearInterval(timer);
        };
    }, [refresh]);

    const workerOk = Boolean(status?.worker?.ok);
    const relayOk = Boolean(status?.preview_relay?.ok);
    const geminiOk = Boolean(status?.gemini_profile?.ok);
    const ready = Boolean(status?.ready_for_headless);
    const probing = loading && !status;

    const workerStatus: RowStatus = probing ? 'unknown' : (workerOk ? 'ok' : 'bad');
    const relayStatus: RowStatus = probing ? 'unknown' : (relayOk ? 'ok' : 'warn');
    const geminiStatus: RowStatus = probing ? 'unknown' : (geminiOk ? 'ok' : 'warn');

    const rows: CheckRow[] = [
        {
            key: 'worker',
            required: true,
            title: 'Queue worker',
            status: workerStatus,
            statusLabel: probing ? '…' : (workerOk ? 'Đang chạy' : 'Chưa chạy'),
            detail: status?.worker?.detail,
            cwdHint: '_biong_backend',
            command: HEADLESS_WORKER_CMD,
        },
        {
            key: 'relay',
            required: false,
            title: 'Preview live Chrome',
            status: relayStatus,
            statusLabel: probing ? '…' : (relayOk ? 'Đang chạy' : 'Chưa bật'),
            detail: status?.preview_relay?.detail
                || 'Chỉ cần khi muốn xem Chrome live trong CMS',
            cwdHint: 'marketing-ai',
            command: HEADLESS_PREVIEW_RELAY_CMD,
        },
        {
            key: 'gemini',
            required: false,
            title: 'Cookie / profile Google',
            status: geminiStatus,
            statusLabel: probing ? '…' : (geminiOk ? 'Có profile' : 'Cần login'),
            detail: status?.gemini_profile?.detail,
            hint: 'Lần đầu hoặc hết hạn cookie: mở Chrome headed → đăng nhập → tắt headed.',
            cwdHint: 'marketing-ai',
            command: HEADLESS_GEMINI_LOGIN_CMD,
        },
    ];

    return (
        <Alert
            icon={false}
            severity={ready ? 'success' : 'info'}
            sx={{
                mt: dense ? 0.5 : 1,
                py: compact ? 0.75 : 1,
                px: compact ? 1 : 1.25,
                bgcolor: ready ? 'rgba(22, 163, 74, 0.06)' : 'rgba(2, 132, 199, 0.06)',
                border: '1px solid',
                borderColor: ready ? 'rgba(22, 163, 74, 0.25)' : 'rgba(2, 132, 199, 0.2)',
                '& .MuiAlert-message': { width: '100%', p: 0 },
            }}
        >
            <Stack spacing={1}>
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 800, lineHeight: 1.3 }}>
                            Headless / AI (Gemini)
                        </Typography>
                        <Typography sx={{ mt: 0.2, fontSize: 10.5, color: 'text.secondary', lineHeight: 1.4 }}>
                            Không có Gemini server riêng — job chạy qua queue worker (spawn Chrome).
                        </Typography>
                    </Box>
                    <Tooltip title="Kiểm tra lại">
                        <span>
                            <IconButton
                                size="small"
                                onClick={() => { void refresh(); }}
                                disabled={loading}
                                sx={{ p: 0.4 }}
                            >
                                {loading ? (
                                    <CircularProgress size={14} />
                                ) : (
                                    <RefreshIcon sx={{ fontSize: 16 }} />
                                )}
                            </IconButton>
                        </span>
                    </Tooltip>
                </Stack>

                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                        px: 1,
                        py: 0.7,
                        borderRadius: 1.25,
                        bgcolor: ready ? 'rgba(22, 163, 74, 0.14)' : 'rgba(220, 38, 38, 0.1)',
                        border: '1px solid',
                        borderColor: ready ? 'rgba(22, 163, 74, 0.35)' : 'rgba(220, 38, 38, 0.28)',
                    }}
                >
                    <StatusIcon status={ready ? 'ok' : 'bad'} />
                    <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 800, lineHeight: 1.25 }}>
                            {probing
                                ? 'Đang kiểm tra…'
                                : (ready ? 'Đủ để chạy Headless' : 'Chưa đủ — thiếu queue worker')}
                        </Typography>
                        <Typography sx={{ fontSize: 10, color: 'text.secondary', lineHeight: 1.35 }}>
                            {status?.summary
                                || (ready
                                    ? 'Worker đang chạy — có thể enqueue bước Gemini'
                                    : 'Bật ./run_worker.sh trong _biong_backend trước')}
                        </Typography>
                    </Box>
                </Box>

                {error ? (
                    <Typography sx={{ fontSize: 11, color: 'error.main' }}>
                        {error}
                    </Typography>
                ) : null}

                <Stack spacing={0.75}>
                    {rows.map((row) => (
                        <PrerequisiteCard key={row.key} row={row} />
                    ))}
                </Stack>
            </Stack>
        </Alert>
    );
}
