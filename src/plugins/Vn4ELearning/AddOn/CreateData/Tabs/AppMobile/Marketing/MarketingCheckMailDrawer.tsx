import React from 'react';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    Divider,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LabelOffOutlinedIcon from '@mui/icons-material/LabelOffOutlined';
import DrawerCustom from 'components/molecules/DrawerCustom';
import useAjax from 'hook/useApi';
import useConfirmDialog from 'hook/useConfirmDialog';
import moment from 'moment';

type MailItem = {
    uid?: number;
    seq?: number;
    message_id?: string;
    from?: string;
    from_email?: string;
    subject?: string;
    date?: string;
    timestamp?: number;
};

type Props = {
    open: boolean;
    onClose: () => void;
};

function parseApiMessage(res: unknown): string {
    if (!res || typeof res !== 'object') return 'Yêu cầu thất bại';
    const r = res as { message?: { content?: string } | string };
    if (typeof r.message === 'string') return r.message;
    if (r.message && typeof r.message === 'object' && r.message.content) {
        return r.message.content;
    }
    return 'Yêu cầu thất bại';
}

function formatMailDate(item: MailItem): string {
    if (item.timestamp && Number.isFinite(item.timestamp)) {
        const m = moment(item.timestamp * 1000);
        if (m.isValid()) return m.format('DD/MM/YYYY HH:mm');
    }
    if (item.date) {
        const m = moment(item.date);
        if (m.isValid()) return m.format('DD/MM/YYYY HH:mm');
        return item.date;
    }
    return '';
}

export default function MarketingCheckMailDrawer({ open, onClose }: Props) {
    const api = useAjax();
    const confirm = useConfirmDialog();

    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [label, setLabel] = React.useState('');
    const [mailbox, setMailbox] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [removing, setRemoving] = React.useState(false);
    const [emails, setEmails] = React.useState<MailItem[]>([]);
    const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
    const [error, setError] = React.useState<string | null>(null);
    const [info, setInfo] = React.useState<string | null>(null);
    const [loaded, setLoaded] = React.useState(false);

    // Không lưu gì: xoá toàn bộ email, mật khẩu khỏi state khi đóng.
    React.useEffect(() => {
        if (!open) {
            setEmail('');
            setPassword('');
            setLabel('');
            setMailbox('');
            setEmails([]);
            setSelectedIds([]);
            setError(null);
            setInfo(null);
            setLoaded(false);
            setLoading(false);
            setRemoving(false);
        }
    }, [open]);

    const canSubmit = email.trim() !== '' && password !== '' && !loading && !removing;

    // Message-ID là định danh toàn cục (UID chỉ cục bộ theo mailbox).
    const itemKey = (item: MailItem): string => (
        item.message_id || (typeof item.uid === 'number' ? `uid:${item.uid}` : '')
    );

    const toggleSelect = (key: string) => {
        setSelectedIds((prev) => (
            prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
        ));
    };

    const handleLoad = () => {
        const trimmedEmail = email.trim();

        if (trimmedEmail === '' || password === '') {
            setError('Nhập email và App Password của Gmail');
            return;
        }

        setLoading(true);
        setError(null);
        setInfo(null);
        setEmails([]);
        setSelectedIds([]);
        setMailbox('');

        api.ajax({
            url: 'tool/check-mail',
            method: 'POST',
            data: {
                email: trimmedEmail,
                password,
                label: label.trim(),
                limit: 10,
            },
            loading: false,
            success: (res) => {
                setLoading(false);
                setLoaded(true);
                const data = res as { success?: boolean; emails?: MailItem[]; mailbox?: string };
                if (!data?.success) {
                    setError(parseApiMessage(data));
                    return;
                }
                setMailbox(String(data.mailbox || ''));
                setEmails(Array.isArray(data.emails) ? data.emails : []);
            },
            error: () => {
                setLoading(false);
                setError('Yêu cầu thất bại');
            },
        });
    };

    const performRemoveLabel = () => {
        const targetLabel = label.trim();

        if (targetLabel === '' || selectedIds.length === 0) {
            return;
        }

        const selectedEmails = emails.filter((item) => selectedIds.includes(itemKey(item)));
        const messageIds = selectedEmails
            .map((item) => item.message_id)
            .filter((v): v is string => Boolean(v));
        const uids = selectedEmails
            .map((item) => item.uid)
            .filter((v): v is number => typeof v === 'number');

        setRemoving(true);
        setError(null);
        setInfo(null);

        api.ajax({
            url: 'tool/check-mail',
            method: 'POST',
            data: {
                action: 'remove-label',
                email: email.trim(),
                password,
                label: targetLabel,
                message_ids: messageIds,
                uids,
            },
            loading: false,
            success: (res) => {
                setRemoving(false);
                const data = res as { success?: boolean; removed?: number; failed?: number[] };
                if (!data?.success) {
                    setError(parseApiMessage(data));
                    return;
                }

                const done = new Set(selectedIds);
                setEmails((prev) => prev.filter((item) => !done.has(itemKey(item))));
                setSelectedIds([]);

                const failedCount = Array.isArray(data.failed) ? data.failed.length : 0;
                setInfo(
                    failedCount > 0
                        ? `Đã xóa nhãn khỏi ${data.removed || 0} email, ${failedCount} email lỗi`
                        : parseApiMessage(data),
                );
            },
            error: () => {
                setRemoving(false);
                setError('Yêu cầu thất bại');
            },
        });
    };

    const handleRemoveLabel = () => {
        const targetLabel = label.trim();

        if (targetLabel === '') {
            setError('Nhập nhãn cần xóa (ô Nhãn / Label) trước khi xóa');
            return;
        }

        if (selectedIds.length === 0) {
            setError('Chọn ít nhất 1 email để xóa nhãn');
            return;
        }

        confirm.onConfirm(performRemoveLabel, {
            title: 'Xóa nhãn khỏi email',
            message: `Xóa nhãn "${targetLabel}" khỏi ${selectedIds.length} email đã chọn?`,
            icon: 'LabelOff',
        });
    };

    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title="Check mail"
            width={640}
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
            <Stack spacing={2.5} sx={{ pb: 1 }}>
                <Alert severity="info">
                    Kết nối Gmail qua IMAP. Cần bật xác thực 2 bước và dùng{' '}
                    <b>App Password</b> (không dùng mật khẩu Google thường).
                    Nhập <b>nhãn</b> để lọc (để trống = INBOX; hỗ trợ Important, Starred,
                    Spam, Trash, Sent, All Mail…).
                    Email, mật khẩu và danh sách email <b>không được lưu lại</b>.
                </Alert>

                <Stack spacing={1.5}>
                    <TextField
                        fullWidth
                        size="small"
                        label="Email Gmail"
                        type="email"
                        autoComplete="off"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        placeholder="your-email@gmail.com"
                    />
                    <TextField
                        fullWidth
                        size="small"
                        label="App Password"
                        type="password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && canSubmit) {
                                handleLoad();
                            }
                        }}
                    />
                    <TextField
                        fullWidth
                        size="small"
                        label="Nhãn / Label"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        disabled={loading}
                        placeholder="Để trống = INBOX (VD: Important, Starred, hoặc tên nhãn)"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && canSubmit) {
                                handleLoad();
                            }
                        }}
                    />
                    <Stack direction="row" justifyContent="flex-end">
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={
                                loading
                                    ? <CircularProgress size={16} color="inherit" />
                                    : <EmailOutlinedIcon fontSize="small" />
                            }
                            onClick={handleLoad}
                            disabled={!canSubmit}
                            sx={{ textTransform: 'none' }}
                        >
                            {loading ? 'Đang tải…' : 'Load email'}
                        </Button>
                    </Stack>
                </Stack>

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

                {loaded && !error && emails.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                        Không có email nào trong {mailbox || 'hộp thư đến'}.
                    </Typography>
                )}

                {emails.length > 0 && (
                    <Box>
                        <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            spacing={1}
                            sx={{ mb: 1 }}
                        >
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontWeight: 600 }}
                            >
                                {emails.length} email mới nhất{mailbox ? ` · ${mailbox}` : ''}
                            </Typography>
                            <Tooltip
                                title={
                                    label.trim() === ''
                                        ? 'Nhập nhãn ở ô Nhãn / Label để xóa khỏi email đã chọn'
                                        : 'Xóa nhãn khỏi email đã chọn'
                                }
                            >
                                <span>
                                    <Button
                                        size="small"
                                        variant="contained"
                                        color="error"
                                        startIcon={
                                            removing
                                                ? <CircularProgress size={16} color="inherit" />
                                                : <LabelOffOutlinedIcon fontSize="small" />
                                        }
                                        onClick={handleRemoveLabel}
                                        disabled={removing || selectedIds.length === 0 || label.trim() === ''}
                                        sx={{ textTransform: 'none', flexShrink: 0 }}
                                    >
                                        Xóa nhãn ({selectedIds.length})
                                    </Button>
                                </span>
                            </Tooltip>
                        </Stack>
                        <Box
                            sx={{
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                bgcolor: 'background.paper',
                                maxHeight: 420,
                                overflow: 'auto',
                            }}
                        >
                            {emails.map((item, index) => {
                                const key = itemKey(item);
                                const checked = key !== '' && selectedIds.includes(key);
                                return (
                                    <React.Fragment key={key || index}>
                                        {index > 0 && <Divider />}
                                        <Box
                                            sx={{
                                                px: 1,
                                                py: 1,
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: 0.5,
                                            }}
                                        >
                                            <Checkbox
                                                size="small"
                                                checked={checked}
                                                disabled={key === '' || removing}
                                                onChange={() => {
                                                    if (key !== '') {
                                                        toggleSelect(key);
                                                    }
                                                }}
                                                sx={{ mt: -0.5, p: 0.5 }}
                                            />
                                            <Box sx={{ minWidth: 0, flex: 1, pt: 0.25 }}>
                                                <Stack
                                                    direction="row"
                                                    justifyContent="space-between"
                                                    alignItems="baseline"
                                                    spacing={1}
                                                >
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            fontWeight: 600,
                                                            minWidth: 0,
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    >
                                                        {item.from || item.from_email || '(Không rõ người gửi)'}
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                        sx={{ flexShrink: 0 }}
                                                    >
                                                        {formatMailDate(item)}
                                                    </Typography>
                                                </Stack>
                                                <Typography
                                                    variant="body2"
                                                    color="text.primary"
                                                    sx={{ mt: 0.25, wordBreak: 'break-word' }}
                                                >
                                                    {item.subject || '(Không có tiêu đề)'}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </React.Fragment>
                                );
                            })}
                        </Box>
                    </Box>
                )}
            </Stack>
            {confirm.component}
        </DrawerCustom>
    );
}
