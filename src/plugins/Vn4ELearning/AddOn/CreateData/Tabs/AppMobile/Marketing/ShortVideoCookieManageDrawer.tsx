import React from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import CookieOutlinedIcon from '@mui/icons-material/CookieOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import DrawerCustom from 'components/molecules/DrawerCustom';
import { useFloatingMessages } from 'hook/useFloatingMessages';
import {
    deleteShortVideoCookies,
    listShortVideoCookies,
    parseShortVideoCookieApiMessage,
    saveShortVideoCookie,
    SUPPORTED_COOKIE_WEBSITE,
    validateShortVideoCookieJson,
    type ShortVideoCookie,
} from 'helpers/marketingShortVideoCookieApi';

type Props = {
    open: boolean;
    onClose: () => void;
};

type CookieFormState = {
    id: number;
    title: string;
    website: string;
    cookie_value: string;
    description: string;
};

const EMPTY_FORM: CookieFormState = {
    id: 0,
    title: '',
    website: SUPPORTED_COOKIE_WEBSITE,
    cookie_value: '',
    description: '',
};

function CookieForm({
    form,
    onFormChange,
    saving,
    onSubmit,
    onCancel,
}: {
    form: CookieFormState;
    onFormChange: (patch: Partial<CookieFormState>) => void;
    saving: boolean;
    onSubmit: () => void;
    onCancel: () => void;
}) {
    const validation = validateShortVideoCookieJson(form.cookie_value);

    return (
        <Stack spacing={2}>
            <TextField
                label="Tên cookie *"
                value={form.title}
                onChange={(e) => onFormChange({ title: e.target.value })}
                disabled={saving}
                size="small"
                fullWidth
                placeholder="VD: Meta account 1, Meta account 2"
            />
            <TextField
                label="Website (domain)"
                value={form.website}
                disabled
                size="small"
                fullWidth
                helperText="Domain cố định theo tab — meta.ai (render ảnh beat) hoặc vibes.ai (convert ảnh beat → video)"
            />
            <TextField
                label="Mô tả"
                value={form.description}
                onChange={(e) => onFormChange({ description: e.target.value })}
                disabled={saving}
                size="small"
                fullWidth
                multiline
                minRows={2}
            />
            <TextField
                label="Cookie JSON *"
                value={form.cookie_value}
                onChange={(e) => onFormChange({ cookie_value: e.target.value })}
                disabled={saving}
                size="small"
                fullWidth
                multiline
                minRows={6}
                maxRows={14}
                error={Boolean(form.cookie_value.trim()) && !validation.ok}
                helperText={
                    form.cookie_value.trim() && !validation.ok
                        ? validation.error || 'Cookie JSON không hợp lệ'
                        : 'Export cookie từ extension Cookie-Editor khi đang login website, rồi paste vào đây'
                }
            />
            <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button variant="outlined" onClick={onCancel} disabled={saving}>
                    Hủy
                </Button>
                <Button variant="contained" onClick={onSubmit} disabled={saving}>
                    {saving ? <CircularProgress size={16} color="inherit" /> : null}
                    {form.id > 0 ? 'Lưu thay đổi' : 'Thêm cookie'}
                </Button>
            </Stack>
        </Stack>
    );
}

export function ShortVideoCookieManageContent({
    active = true,
    website = 'meta.ai',
}: {
    active?: boolean;
    /** Domain cố định cho tab này (meta.ai hoặc vibes.ai). */
    website?: string;
}) {
    const { showMessage } = useFloatingMessages();

    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [cookies, setCookies] = React.useState<ShortVideoCookie[]>([]);
    const [mode, setMode] = React.useState<'list' | 'form'>('list');
    const [form, setForm] = React.useState<CookieFormState>(EMPTY_FORM);
    const [saving, setSaving] = React.useState(false);
    const [deleteTarget, setDeleteTarget] = React.useState<ShortVideoCookie | null>(null);
    const [deleting, setDeleting] = React.useState(false);

    const emptyForm = React.useMemo<CookieFormState>(() => ({
        ...EMPTY_FORM,
        website,
    }), [website]);

    const reloadList = React.useCallback(() => {
        setLoading(true);
        setError(null);
        listShortVideoCookies(website)
            .then((result) => {
                setLoading(false);
                if (result?.success === false) {
                    setError(parseShortVideoCookieApiMessage(result, 'Không tải được danh sách cookie'));
                    setCookies([]);
                    return;
                }
                setCookies(Array.isArray(result?.cookies) ? result.cookies : []);
            })
            .catch((err: unknown) => {
                setLoading(false);
                setError(err instanceof Error ? err.message : 'Không tải được danh sách cookie');
            });
    }, [website]);

    React.useEffect(() => {
        if (active) {
            setMode('list');
            setForm(emptyForm);
            setDeleteTarget(null);
            reloadList();
        }
    }, [active, emptyForm, reloadList]);

    const openAddForm = () => {
        setForm(emptyForm);
        setMode('form');
    };

    const openEditForm = (cookie: ShortVideoCookie) => {
        setForm({
            id: cookie.id,
            title: cookie.title || '',
            website: cookie.website || website,
            cookie_value: cookie.cookie_value || '',
            description: cookie.description || '',
        });
        setMode('form');
    };

    const handleFormChange = (patch: Partial<CookieFormState>) => {
        setForm((prev) => ({ ...prev, ...patch }));
    };

    const handleSubmit = () => {
        const title = form.title.trim();
        // Tab cố định domain → luôn lưu theo website của tab (tránh nhảy bảng).
        const targetWebsite = website.trim().toLowerCase() || SUPPORTED_COOKIE_WEBSITE;
        if (!title) {
            showMessage('Tên cookie không được để trống', 'warning');
            return;
        }
        const validation = validateShortVideoCookieJson(form.cookie_value);
        if (!validation.ok) {
            showMessage(validation.error || 'Cookie JSON không hợp lệ', 'warning');
            return;
        }

        setSaving(true);
        saveShortVideoCookie({
            id: form.id > 0 ? form.id : 0,
            title,
            website: targetWebsite,
            description: form.description,
            cookie_value: form.cookie_value,
        })
            .then((result) => {
                setSaving(false);
                if (result?.success === false) {
                    showMessage(parseShortVideoCookieApiMessage(result, 'Không lưu được cookie'), 'error');
                    return;
                }
                showMessage(form.id > 0 ? 'Đã cập nhật cookie' : 'Đã thêm cookie', 'success');
                setMode('list');
                setForm(emptyForm);
                reloadList();
            })
            .catch((err: unknown) => {
                setSaving(false);
                showMessage(err instanceof Error ? err.message : 'Không lưu được cookie', 'error');
            });
    };

    const handleConfirmDelete = () => {
        if (!deleteTarget) {
            return;
        }
        setDeleting(true);
        deleteShortVideoCookies([deleteTarget.id], deleteTarget.website)
            .then((result) => {
                setDeleting(false);
                if (result?.success === false) {
                    showMessage(parseShortVideoCookieApiMessage(result, 'Không xóa được cookie'), 'error');
                    setDeleteTarget(null);
                    return;
                }
                showMessage('Đã xóa cookie', 'success');
                setDeleteTarget(null);
                reloadList();
            })
            .catch((err: unknown) => {
                setDeleting(false);
                showMessage(err instanceof Error ? err.message : 'Không xóa được cookie', 'error');
            });
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minHeight: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                {mode === 'form' ? (
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ArrowBackOutlinedIcon />}
                        onClick={() => setMode('list')}
                    >
                        Danh sách
                    </Button>
                ) : (
                    <Button
                        size="small"
                        variant="contained"
                        startIcon={<AddOutlinedIcon />}
                        onClick={openAddForm}
                    >
                        Thêm cookie
                    </Button>
                )}
                <Box sx={{ flex: 1 }} />
                <Tooltip title="Tải lại">
                    <span>
                        <IconButton size="small" onClick={reloadList} disabled={loading}>
                            {loading ? <CircularProgress size={18} /> : <RefreshIcon fontSize="small" />}
                        </IconButton>
                    </span>
                </Tooltip>
            </Stack>

            {error && (
                <Alert severity="error">
                    {error}
                </Alert>
            )}

            {loading && (
                <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
                    <CircularProgress />
                </Box>
            )}

            {!loading && mode === 'form' ? (
                <Box
                    sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        bgcolor: 'background.paper',
                        p: 2.5,
                        maxWidth: 720,
                    }}
                >
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                        {form.id > 0 ? 'Sửa cookie' : 'Thêm cookie mới'}
                    </Typography>
                    <CookieForm
                        form={form}
                        onFormChange={handleFormChange}
                        saving={saving}
                        onSubmit={handleSubmit}
                        onCancel={() => setMode('list')}
                    />
                </Box>
            ) : null}

            {!loading && mode === 'list' && cookies.length === 0 ? (
                <Box
                    sx={{
                        border: '1px dashed',
                        borderColor: 'divider',
                        borderRadius: 2,
                        py: 8,
                        textAlign: 'center',
                        bgcolor: 'background.paper',
                    }}
                >
                    <CookieOutlinedIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
                    <Typography variant="subtitle2" sx={{ mt: 1 }}>
                        Chưa có cookie nào
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                        {website === 'vibes.ai'
                            ? 'Cookie pool vibes.ai dùng convert ảnh beat → video headless (xoay vòng, cookie bị giới hạn sẽ tạm nghỉ).'
                            : 'Cookie pool meta.ai dùng render ảnh beat (xoay vòng) và extension tự set cookie để mở Meta.ai.'}
                    </Typography>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<AddOutlinedIcon />}
                        onClick={openAddForm}
                    >
                        Thêm cookie
                    </Button>
                </Box>
            ) : null}

            {!loading && mode === 'list' && cookies.length > 0 ? (
                <Box
                    sx={{
                        display: 'grid',
                        gap: 1.5,
                        gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                    }}
                >
                    {cookies.map((cookie) => (
                        <Box
                            key={cookie.id}
                            sx={{
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 2,
                                bgcolor: 'background.paper',
                                p: 1.5,
                                display: 'flex',
                                gap: 1.5,
                                alignItems: 'flex-start',
                            }}
                        >
                            <Box
                                sx={{
                                    width: 44,
                                    height: 44,
                                    flexShrink: 0,
                                    borderRadius: 1.5,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    bgcolor: 'background.default',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <CookieOutlinedIcon color="action" />
                            </Box>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                    <Chip
                                        size="small"
                                        label={cookie.website || SUPPORTED_COOKIE_WEBSITE}
                                        color="primary"
                                        variant="outlined"
                                        sx={{ maxWidth: 180 }}
                                    />
                                    <Chip
                                        size="small"
                                        label={String(cookie.cookie_count ?? 0) + ' cookie'}
                                        variant="outlined"
                                    />
                                </Stack>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }} noWrap>
                                    {cookie.title || '(Không tên)'}
                                </Typography>
                                {cookie.description ? (
                                    <Typography
                                        variant="caption"
                                        color="text.disabled"
                                        sx={{ display: 'block' }}
                                        noWrap
                                    >
                                        {cookie.description}
                                    </Typography>
                                ) : null}
                            </Box>
                            <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                                <Tooltip title="Sửa">
                                    <IconButton size="small" onClick={() => openEditForm(cookie)}>
                                        <EditOutlinedIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Xóa">
                                    <IconButton size="small" color="error" onClick={() => setDeleteTarget(cookie)}>
                                        <DeleteOutlineOutlinedIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Stack>
                        </Box>
                    ))}
                </Box>
            ) : null}

            <Dialog
                open={Boolean(deleteTarget)}
                onClose={() => (deleting ? null : setDeleteTarget(null))}
            >
                <DialogTitle>Xóa cookie?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Xóa cookie "{deleteTarget?.title || ''}" ({deleteTarget?.website})?
                        Hành động không thể hoàn tác — các beat đã lưu cookie_id này sẽ fallback sang cookie khác khi mở lại chat.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
                        Hủy
                    </Button>
                    <Button color="error" variant="contained" onClick={handleConfirmDelete} disabled={deleting}>
                        {deleting ? <CircularProgress size={16} color="inherit" /> : null}
                        Xóa
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default function ShortVideoCookieManageDrawer({ open, onClose }: Props) {
    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title="Quản lý cookie chatbot"
            width={900}
            activeOnClose
            restDialogContent={{
                sx: {
                    backgroundColor: 'body.background',
                    p: 0,
                    overflow: 'hidden',
                },
            }}
        >
            <Box sx={{ height: '100%', p: 3, overflowY: 'auto' }} className="custom_scroll">
                <ShortVideoCookieManageContent active={open} />
            </Box>
        </DrawerCustom>
    );
}
