import React from 'react';
import {
    Alert,
    Box,
    Chip,
    CircularProgress,
    Collapse,
    Divider,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import BlockIcon from '@mui/icons-material/Block';
import KeyIcon from '@mui/icons-material/Key';
import CookieIcon from '@mui/icons-material/Cookie';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DrawerCustom from 'components/molecules/DrawerCustom';
import Button from 'components/atoms/Button';
import LoadingButton from 'components/atoms/LoadingButton';
import { useFloatingMessages } from 'hook/useFloatingMessages';
import useConfirmDialog from 'hook/useConfirmDialog';
import {
    deleteSaydiAccount,
    fetchSaydiAccounts,
    registerSaydiAccount,
    seedSaydiAccountsFromEnv,
    updateSaydiAccountStatus,
    type SaydiAccountItem,
    type SaydiAccountStatus,
} from 'helpers/saydiAccountsApi';

type Props = {
    open: boolean;
    onClose: () => void;
};

const STATUS_META: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'default' }> = {
    active: { label: 'Đang dùng', color: 'success' },
    exhausted: { label: 'Hết quota hôm nay', color: 'warning' },
    error: { label: 'Lỗi đăng nhập', color: 'error' },
    disabled: { label: 'Đã tắt', color: 'default' },
};

function formatNumber(value: number): string {
    return Number(value || 0).toLocaleString('vi-VN');
}

function formatDateTime(value: string): string {
    const trimmed = (value || '').trim();
    if (!trimmed || trimmed.startsWith('0000-00-00')) {
        return '—';
    }
    return trimmed;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Typography
                variant="caption"
                color="text.secondary"
                sx={{ minWidth: 118, flexShrink: 0 }}
            >
                {label}
            </Typography>
            <Typography variant="caption" sx={{ wordBreak: 'break-word', flex: 1 }}>
                {value}
            </Typography>
        </Stack>
    );
}

export default function SaydiAccountsDrawer({ open, onClose }: Props) {
    const { showMessage } = useFloatingMessages();
    const confirmDialog = useConfirmDialog();

    const [loading, setLoading] = React.useState(false);
    const [registering, setRegistering] = React.useState(false);
    const [seeding, setSeeding] = React.useState(false);
    const [busyId, setBusyId] = React.useState(0);
    const [accounts, setAccounts] = React.useState<SaydiAccountItem[]>([]);
    const [currentId, setCurrentId] = React.useState(0);
    const [expandedId, setExpandedId] = React.useState(0);
    const [error, setError] = React.useState('');

    const load = React.useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const result = await fetchSaydiAccounts();
            setAccounts(Array.isArray(result.accounts) ? result.accounts : []);
            setCurrentId(Number(result.current_id || 0));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không tải được danh sách tài khoản Saydi');
            setAccounts([]);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        if (open) {
            void load();
        }
    }, [open, load]);

    const applyResult = (result: { accounts?: SaydiAccountItem[]; current_id?: number }) => {
        setAccounts(Array.isArray(result.accounts) ? result.accounts : accounts);
        setCurrentId(Number(result.current_id || 0));
    };

    const toggleExpanded = (accountId: number) => {
        setExpandedId((prev) => (prev === accountId ? 0 : accountId));
    };

    const handleStatus = async (account: SaydiAccountItem, status: SaydiAccountStatus) => {
        if (busyId > 0) {
            return;
        }
        setBusyId(account.id);
        try {
            applyResult(await updateSaydiAccountStatus(account.id, status));
            showMessage('Đã cập nhật trạng thái tài khoản', 'success');
        } catch (err) {
            showMessage(err instanceof Error ? err.message : 'Không cập nhật được trạng thái', 'error');
        } finally {
            setBusyId(0);
        }
    };

    const handleDelete = (account: SaydiAccountItem) => {
        confirmDialog.onConfirm(async () => {
            setBusyId(account.id);
            try {
                applyResult(await deleteSaydiAccount(account.id));
                showMessage('Đã xoá tài khoản', 'success');
            } catch (err) {
                showMessage(err instanceof Error ? err.message : 'Không xoá được tài khoản', 'error');
            } finally {
                setBusyId(0);
            }
        }, {
            title: 'Xoá tài khoản Saydi',
            message: `Xoá tài khoản ${account.email}? Hành động này không thể hoàn tác.`,
        });
    };

    const handleRegister = async () => {
        if (registering) {
            return;
        }
        setRegistering(true);
        try {
            applyResult(await registerSaydiAccount());
            showMessage('Đã đăng ký tài khoản Saydi mới', 'success');
        } catch (err) {
            showMessage(err instanceof Error ? err.message : 'Đăng ký tài khoản thất bại', 'error');
        } finally {
            setRegistering(false);
        }
    };

    const handleSeed = async () => {
        if (seeding) {
            return;
        }
        setSeeding(true);
        try {
            applyResult(await seedSaydiAccountsFromEnv());
            showMessage('Đã nạp tài khoản từ .env', 'success');
        } catch (err) {
            showMessage(err instanceof Error ? err.message : 'Không nạp được tài khoản từ .env', 'error');
        } finally {
            setSeeding(false);
        }
    };

    return (
        <>
            <DrawerCustom
                open={open}
                onClose={onClose}
                title="Tài khoản Saydi API"
                width={560}
                ModalProps={{ sx: { zIndex: 1500 } }}
                headerAction={(
                    <Tooltip title="Tải lại">
                        <span>
                            <IconButton onClick={() => { void load(); }} disabled={loading} sx={{ color: 'inherit' }}>
                                {loading ? <CircularProgress size={18} color="inherit" /> : <RefreshIcon />}
                            </IconButton>
                        </span>
                    </Tooltip>
                )}
                restDialogContent={{
                    sx: {
                        height: 'calc(100vh - 64px)',
                        display: 'flex',
                        flexDirection: 'column',
                        pt: 2,
                        px: 2,
                        pb: 2,
                        gap: 2,
                        overflow: 'hidden',
                    },
                }}
            >
                <Alert severity="info" sx={{ py: 0.75 }}>
                    Mỗi tài khoản Saydi có giới hạn ký tự/ngày. Khi hết quota hệ thống tự xoay sang
                    tài khoản khác; hết tài khoản thì tự đăng ký mới bằng browser.
                </Alert>

                <Box>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        Thao tác nhanh
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <LoadingButton
                            size="small"
                            variant="contained"
                            loading={registering}
                            startIcon={<AddCircleOutlineIcon />}
                            onClick={() => { void handleRegister(); }}
                        >
                            Đăng ký tài khoản mới
                        </LoadingButton>
                        <Button
                            size="small"
                            variant="outlined"
                            disabled={seeding || registering}
                            startIcon={<PlayCircleOutlineIcon />}
                            onClick={() => { void handleSeed(); }}
                        >
                            Nạp từ .env
                        </Button>
                    </Stack>
                </Box>

                <Divider />

                <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        spacing={1}
                        sx={{ mb: 1.5 }}
                    >
                        <Typography variant="caption" fontWeight={700} color="text.secondary">
                            Danh sách tài khoản
                        </Typography>
                        <Chip size="small" variant="outlined" label={`${accounts.length} tài khoản`} />
                    </Stack>

                    <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 0.5 }} className="custom_scroll">
                        {loading && accounts.length === 0 ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                <CircularProgress size={28} />
                            </Box>
                        ) : error ? (
                            <Alert severity="error">{error}</Alert>
                        ) : accounts.length === 0 ? (
                            <Alert severity="warning">
                                Chưa có tài khoản Saydi nào. Bấm “Đăng ký tài khoản mới” hoặc “Nạp từ .env”.
                            </Alert>
                        ) : (
                            <Stack spacing={2}>
                                {accounts.map((account) => {
                                    const meta = STATUS_META[account.status]
                                        || { label: account.status, color: 'default' as const };
                                    const isBusy = busyId === account.id;
                                    const isCurrent = currentId === account.id;
                                    const isExpanded = expandedId === account.id;
                                    return (
                                        <Box
                                            key={account.id}
                                            sx={{
                                                border: 1,
                                                borderColor: isCurrent ? 'primary.main' : 'divider',
                                                borderRadius: 2,
                                                overflow: 'hidden',
                                                bgcolor: 'background.paper',
                                                transition: 'border-color 0.2s',
                                            }}
                                        >
                                            <Box
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => toggleExpanded(account.id)}
                                                onKeyDown={(event) => {
                                                    if (event.key === 'Enter' || event.key === ' ') {
                                                        event.preventDefault();
                                                        toggleExpanded(account.id);
                                                    }
                                                }}
                                                sx={{
                                                    px: 2,
                                                    py: 1.5,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                    '&:hover': { bgcolor: 'action.hover' },
                                                }}
                                            >
                                                <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
                                                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                                        <Typography variant="subtitle2" fontWeight={700} sx={{ wordBreak: 'break-all' }}>
                                                            {account.email}
                                                        </Typography>
                                                        <Chip size="small" color={meta.color} label={meta.label} />
                                                        {isCurrent ? (
                                                            <Chip size="small" color="primary" variant="outlined" label="Đang chọn" />
                                                        ) : null}
                                                        {account.is_primary ? (
                                                            <Chip size="small" variant="outlined" label=".env" />
                                                        ) : null}
                                                    </Stack>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Ký tự hôm nay: <b>{formatNumber(account.chars_used_today)}</b>
                                                        {account.daily_char_limit > 0
                                                            ? ` / ${formatNumber(account.daily_char_limit)}`
                                                            : ''}
                                                        {' · '}Tổng: {formatNumber(account.total_chars_used)}
                                                        {' · '}Dùng cuối: {formatDateTime(account.last_used_at)}
                                                    </Typography>
                                                </Stack>
                                                <ExpandMoreIcon
                                                    sx={{
                                                        color: 'text.secondary',
                                                        transform: isExpanded ? 'rotate(180deg)' : 'none',
                                                        transition: 'transform 0.2s',
                                                    }}
                                                />
                                            </Box>

                                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                                <Divider />
                                                <Box sx={{ px: 2, py: 1.75, bgcolor: 'grey.50' }}>
                                                    <Stack spacing={1}>
                                                        <DetailRow label="Saydi UID" value={account.user_uid || '—'} />
                                                        <DetailRow
                                                            label="Ký tự hôm nay"
                                                            value={
                                                                <>
                                                                    <b>{formatNumber(account.chars_used_today)}</b>
                                                                    {account.daily_char_limit > 0
                                                                        ? ` / ${formatNumber(account.daily_char_limit)}`
                                                                        : ''}
                                                                </>
                                                            }
                                                        />
                                                        <DetailRow label="Tổng ký tự" value={formatNumber(account.total_chars_used)} />
                                                        <DetailRow label="Ngày đếm" value={account.chars_used_date || '—'} />
                                                        <DetailRow label="Hết quota lúc" value={formatDateTime(account.quota_exhausted_at)} />
                                                        <DetailRow label="Dùng cuối" value={formatDateTime(account.last_used_at)} />
                                                        <DetailRow label="Đăng ký lúc" value={formatDateTime(account.registered_at)} />
                                                        <DetailRow
                                                            label="Token"
                                                            value={(
                                                                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                                                                    <Chip
                                                                        size="small"
                                                                        variant="outlined"
                                                                        icon={<KeyIcon fontSize="small" />}
                                                                        label={account.has_access_token ? 'Có access token' : 'Không access token'}
                                                                        color={account.has_access_token ? 'default' : 'warning'}
                                                                    />
                                                                    <Chip
                                                                        size="small"
                                                                        variant="outlined"
                                                                        label={account.has_refresh_token ? 'Có refresh token' : 'Không refresh token'}
                                                                        color={account.has_refresh_token ? 'default' : 'warning'}
                                                                    />
                                                                </Stack>
                                                            )}
                                                        />
                                                        <DetailRow
                                                            label="Cookie"
                                                            value={(
                                                                <Chip
                                                                    size="small"
                                                                    variant="outlined"
                                                                    icon={<CookieIcon fontSize="small" />}
                                                                    label={account.has_cookie ? 'Có cookie' : 'Không cookie'}
                                                                    color={account.has_cookie ? 'default' : 'warning'}
                                                                />
                                                            )}
                                                        />
                                                    </Stack>

                                                    {account.last_error ? (
                                                        <Alert severity="error" sx={{ mt: 1.5, py: 0.25, wordBreak: 'break-word' }}>
                                                            <Typography variant="caption">{account.last_error}</Typography>
                                                        </Alert>
                                                    ) : null}
                                                </Box>

                                                <Divider />
                                                <Stack
                                                    direction="row"
                                                    spacing={1}
                                                    flexWrap="wrap"
                                                    useFlexGap
                                                    sx={{ px: 2, py: 1.25 }}
                                                >
                                                    {account.status !== 'active' ? (
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            color="success"
                                                            disabled={isBusy}
                                                            onClick={() => { void handleStatus(account, 'active'); }}
                                                        >
                                                            Kích hoạt lại
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            color="inherit"
                                                            disabled={isBusy}
                                                            startIcon={<BlockIcon fontSize="small" />}
                                                            onClick={() => { void handleStatus(account, 'disabled'); }}
                                                        >
                                                            Tắt
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        color="error"
                                                        disabled={isBusy}
                                                        startIcon={<DeleteOutlineIcon fontSize="small" />}
                                                        onClick={() => handleDelete(account)}
                                                    >
                                                        Xoá
                                                    </Button>
                                                </Stack>
                                            </Collapse>
                                        </Box>
                                    );
                                })}
                            </Stack>
                        )}
                    </Box>
                </Box>
            </DrawerCustom>
            {confirmDialog.component}
        </>
    );
}
