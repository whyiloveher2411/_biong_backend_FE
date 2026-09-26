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
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import LoginIcon from '@mui/icons-material/Login';
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
    addQwenAccount,
    deleteQwenAccount,
    fetchQwenAccounts,
    loginTestQwenAccount,
    seedQwenAccountsFromEnv,
    updateQwenAccount,
    updateQwenAccountStatus,
    type QwenAccountItem,
    type QwenAccountStatus,
} from 'helpers/qwenAccountsApi';

type Props = {
    open: boolean;
    onClose: () => void;
};

const STATUS_META: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'default' }> = {
    active: { label: 'Đang dùng', color: 'success' },
    exhausted: { label: 'Đang chờ (cooldown)', color: 'warning' },
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

function formatRemaining(seconds: number): string {
    const sec = Math.max(0, Number(seconds) || 0);
    if (sec <= 0) {
        return '';
    }
    const min = Math.ceil(sec / 60);
    return `còn ~${min} phút`;
}

export function QwenAccountsContent({ active = true }: { active?: boolean }) {
    const { showMessage } = useFloatingMessages();
    const confirmDialog = useConfirmDialog();

    const [loading, setLoading] = React.useState(false);
    const [adding, setAdding] = React.useState(false);
    const [seeding, setSeeding] = React.useState(false);
    const [busyId, setBusyId] = React.useState(0);
    const [accounts, setAccounts] = React.useState<QwenAccountItem[]>([]);
    const [currentId, setCurrentId] = React.useState(0);
    const [expandedId, setExpandedId] = React.useState(0);
    const [error, setError] = React.useState('');
    const [loginTestingId, setLoginTestingId] = React.useState(0);

    const [showForm, setShowForm] = React.useState(false);
    const [editingId, setEditingId] = React.useState(0);
    const [formEmail, setFormEmail] = React.useState('');
    const [formPassword, setFormPassword] = React.useState('');
    const [formToken, setFormToken] = React.useState('');
    const [formCookie, setFormCookie] = React.useState('');

    const load = React.useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const result = await fetchQwenAccounts();
            setAccounts(Array.isArray(result.accounts) ? result.accounts : []);
            setCurrentId(Number(result.current_id || 0));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không tải được danh sách tài khoản Qwen');
            setAccounts([]);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        if (active) {
            void load();
        }
    }, [active, load]);

    const applyResult = (result: { accounts?: QwenAccountItem[]; current_id?: number }) => {
        setAccounts(Array.isArray(result.accounts) ? result.accounts : accounts);
        setCurrentId(Number(result.current_id || 0));
    };

    const resetForm = () => {
        setEditingId(0);
        setFormEmail('');
        setFormPassword('');
        setFormToken('');
        setFormCookie('');
    };

    const openAddForm = () => {
        resetForm();
        setShowForm(true);
    };

    const openEditForm = (account: QwenAccountItem) => {
        setEditingId(account.id);
        setFormEmail(account.email || '');
        setFormPassword('');
        setFormToken('');
        setFormCookie('');
        setShowForm(true);
    };

    const handleAdd = async () => {
        if (adding) {
            return;
        }
        if (formEmail.trim() === '') {
            showMessage('Nhập email tài khoản Qwen', 'error');
            return;
        }
        setAdding(true);
        try {
            if (editingId > 0) {
                applyResult(await updateQwenAccount(editingId, {
                    email: formEmail.trim(),
                    password: formPassword,
                    token: formToken.trim(),
                    cookie: formCookie.trim(),
                }));
                showMessage('Đã cập nhật tài khoản Qwen', 'success');
            } else {
                applyResult(await addQwenAccount({
                    email: formEmail.trim(),
                    password: formPassword,
                    token: formToken.trim(),
                    cookie: formCookie.trim(),
                }));
                showMessage('Đã thêm tài khoản Qwen', 'success');
            }
            resetForm();
            setShowForm(false);
        } catch (err) {
            showMessage(err instanceof Error ? err.message : 'Không lưu được tài khoản', 'error');
        } finally {
            setAdding(false);
        }
    };

    const handleStatus = async (account: QwenAccountItem, status: QwenAccountStatus) => {
        if (busyId > 0) {
            return;
        }
        setBusyId(account.id);
        try {
            applyResult(await updateQwenAccountStatus(account.id, status));
            showMessage('Đã cập nhật trạng thái tài khoản', 'success');
        } catch (err) {
            showMessage(err instanceof Error ? err.message : 'Không cập nhật được trạng thái', 'error');
        } finally {
            setBusyId(0);
        }
    };

    const handleLoginTest = async (account: QwenAccountItem) => {
        if (loginTestingId > 0) {
            return;
        }
        setLoginTestingId(account.id);
        try {
            const result = await loginTestQwenAccount(account.id);
            showMessage(
                result.logged_in
                    ? 'Login thành công — đã cập nhật cookie/token mới'
                    : 'Session hiện tại vẫn hợp lệ',
                'success',
            );
            await load();
        } catch (err) {
            showMessage(err instanceof Error ? err.message : 'Login test thất bại', 'error');
            await load();
        } finally {
            setLoginTestingId(0);
        }
    };

    const handleDelete = (account: QwenAccountItem) => {
        confirmDialog.onConfirm(async () => {
            setBusyId(account.id);
            try {
                applyResult(await deleteQwenAccount(account.id));
                showMessage('Đã xoá tài khoản', 'success');
            } catch (err) {
                showMessage(err instanceof Error ? err.message : 'Không xoá được tài khoản', 'error');
            } finally {
                setBusyId(0);
            }
        }, {
            title: 'Xoá tài khoản Qwen',
            message: `Xoá tài khoản ${account.email}? Hành động này không thể hoàn tác.`,
        });
    };

    const handleSeed = async () => {
        if (seeding) {
            return;
        }
        setSeeding(true);
        try {
            applyResult(await seedQwenAccountsFromEnv());
            showMessage('Đã nạp tài khoản từ .env', 'success');
        } catch (err) {
            showMessage(err instanceof Error ? err.message : 'Không nạp được tài khoản từ .env', 'error');
        } finally {
            setSeeding(false);
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minHeight: 0, flex: 1 }}>
            <Alert severity="info" sx={{ py: 0.75 }}>
                Qwen không cho tự đăng ký (cần OTP) nên tài khoản THÊM THỦ CÔNG. Hệ thống tự
                login bằng email/password và lưu token; token hết hạn sẽ login lại. Khi tài khoản
                bị Qwen giới hạn, hệ thống tạm nghỉ (cooldown) rồi xoay tài khoản kế.
            </Alert>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                <Button
                    size="small"
                    variant="contained"
                    startIcon={<AddCircleOutlineIcon />}
                    onClick={() => (showForm ? setShowForm(false) : openAddForm())}
                >
                    {showForm ? 'Đóng form' : 'Thêm tài khoản'}
                </Button>
                <Button
                    size="small"
                    variant="outlined"
                    disabled={seeding}
                    startIcon={<PlayCircleOutlineIcon />}
                    onClick={() => { void handleSeed(); }}
                >
                    Nạp từ .env
                </Button>
                <Box sx={{ flex: 1 }} />
                <Tooltip title="Tải lại">
                    <span>
                        <IconButton size="small" onClick={() => { void load(); }} disabled={loading}>
                            {loading ? <CircularProgress size={18} /> : <RefreshIcon fontSize="small" />}
                        </IconButton>
                    </span>
                </Tooltip>
            </Stack>

            <Collapse in={showForm} timeout="auto" unmountOnExit>
                <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                        {editingId > 0 ? `Sửa tài khoản: ${formEmail || '—'}` : 'Thêm tài khoản mới'}
                    </Typography>
                    <Stack spacing={1.5}>
                        <TextField
                            size="small"
                            label="Email đăng nhập"
                            value={formEmail}
                            onChange={(event) => setFormEmail(event.target.value)}
                            fullWidth
                            autoComplete="off"
                        />
                        <TextField
                            size="small"
                            label={editingId > 0 ? 'Password (để trống nếu không đổi)' : 'Password'}
                            value={formPassword}
                            onChange={(event) => setFormPassword(event.target.value)}
                            fullWidth
                            autoComplete="new-password"
                        />
                        <TextField
                            size="small"
                            label={editingId > 0
                                ? 'Token mới (để trống nếu giữ token cũ)'
                                : 'Token (tuỳ chọn — dán token localStorage chat.qwen.ai)'}
                            value={formToken}
                            onChange={(event) => setFormToken(event.target.value)}
                            fullWidth
                            multiline
                            minRows={2}
                        />
                        <TextField
                            size="small"
                            label={editingId > 0 ? 'Cookie JSON mới (để trống nếu giữ cũ)' : 'Cookie JSON (tuỳ chọn)'}
                            value={formCookie}
                            onChange={(event) => setFormCookie(event.target.value)}
                            fullWidth
                            multiline
                            minRows={2}
                        />
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button
                                size="small"
                                variant="outlined"
                                disabled={adding}
                                onClick={() => { resetForm(); setShowForm(false); }}
                            >
                                Hủy
                            </Button>
                            <LoadingButton
                                size="small"
                                variant="contained"
                                loading={adding}
                                onClick={() => { void handleAdd(); }}
                            >
                                {editingId > 0 ? 'Lưu thay đổi' : 'Lưu tài khoản'}
                            </LoadingButton>
                        </Stack>
                    </Stack>
                </Box>
            </Collapse>

            <Divider />

            <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mb: 1.5 }}>
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
                            Chưa có tài khoản Qwen nào. Bấm “Thêm tài khoản” để thêm thủ công.
                        </Alert>
                    ) : (
                        <Stack spacing={2}>
                            {accounts.map((account) => {
                                const meta = STATUS_META[account.status]
                                    || { label: account.status, color: 'default' as const };
                                const isBusy = busyId === account.id;
                                const isCurrent = currentId === account.id;
                                const isExpanded = expandedId === account.id;
                                const remaining = formatRemaining(account.cooldown_remaining_sec);
                                return (
                                    <Box
                                        key={account.id}
                                        sx={{
                                            border: 1,
                                            borderColor: isCurrent ? 'primary.main' : 'divider',
                                            borderRadius: 2,
                                            overflow: 'hidden',
                                            bgcolor: 'background.paper',
                                        }}
                                    >
                                        <Box
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => setExpandedId((prev) => (prev === account.id ? 0 : account.id))}
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter' || event.key === ' ') {
                                                    event.preventDefault();
                                                    setExpandedId((prev) => (prev === account.id ? 0 : account.id));
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
                                                </Stack>
                                                <Typography variant="caption" color="text.secondary">
                                                    Video hôm nay: <b>{formatNumber(account.video_used_today)}</b>
                                                    {' · '}Tổng: {formatNumber(account.total_video_used)}
                                                    {' · '}Dùng cuối: {formatDateTime(account.last_used_at)}
                                                    {remaining ? ` · ${remaining}` : ''}
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
                                                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                                                        <Chip
                                                            size="small"
                                                            variant="outlined"
                                                            icon={<KeyIcon fontSize="small" />}
                                                            label={account.has_token ? 'Có token' : 'Chưa có token'}
                                                            color={account.has_token ? 'default' : 'warning'}
                                                        />
                                                        <Chip
                                                            size="small"
                                                            variant="outlined"
                                                            label={account.has_password ? 'Có password' : 'Không password'}
                                                            color={account.has_password ? 'default' : 'warning'}
                                                        />
                                                        <Chip
                                                            size="small"
                                                            variant="outlined"
                                                            icon={<CookieIcon fontSize="small" />}
                                                            label={account.has_cookie ? 'Có cookie' : 'Không cookie'}
                                                            color={account.has_cookie ? 'default' : 'warning'}
                                                        />
                                                    </Stack>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Cooldown tới: {formatDateTime(account.cooldown_until)}
                                                        {remaining ? ` (${remaining})` : ''}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Thêm vào lúc: {formatDateTime(account.registered_at)}
                                                    </Typography>
                                                </Stack>

                                                {account.last_error ? (
                                                    <Alert severity="error" sx={{ mt: 1.5, py: 0.25, wordBreak: 'break-word' }}>
                                                        <Typography variant="caption">{account.last_error}</Typography>
                                                    </Alert>
                                                ) : null}
                                            </Box>

                                            <Divider />
                                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ px: 2, py: 1.25 }}>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    color="primary"
                                                    disabled={isBusy}
                                                    startIcon={<EditOutlinedIcon fontSize="small" />}
                                                    onClick={() => openEditForm(account)}
                                                >
                                                    Sửa
                                                </Button>
                                                <LoadingButton
                                                    size="small"
                                                    variant="contained"
                                                    color="info"
                                                    loading={loginTestingId === account.id}
                                                    disabled={isBusy || (loginTestingId > 0 && loginTestingId !== account.id)}
                                                    startIcon={<LoginIcon fontSize="small" />}
                                                    onClick={() => { void handleLoginTest(account); }}
                                                >
                                                    {loginTestingId === account.id ? 'Đang login…' : 'Login test'}
                                                </LoadingButton>
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
            {confirmDialog.component}
        </Box>
    );
}

export default function QwenAccountsDrawer({ open, onClose }: Props) {
    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title="Tài khoản Qwen (chat.qwen.ai)"
            width={560}
            ModalProps={{ sx: { zIndex: 1500 } }}
            restDialogContent={{
                sx: {
                    p: 0,
                    overflow: 'hidden',
                },
            }}
        >
            <Box sx={{ height: '100%', p: 3, overflowY: 'auto' }} className="custom_scroll">
                <QwenAccountsContent active={open} />
            </Box>
        </DrawerCustom>
    );
}
