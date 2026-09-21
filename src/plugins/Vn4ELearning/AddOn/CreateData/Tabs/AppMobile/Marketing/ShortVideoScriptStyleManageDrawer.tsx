import React from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    Radio,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import RecordVoiceOverOutlinedIcon from '@mui/icons-material/RecordVoiceOverOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import DrawerCustom from 'components/molecules/DrawerCustom';
import { useFloatingMessages } from 'hook/useFloatingMessages';
import {
    deleteShortVideoScriptStyle,
    listShortVideoScriptStyles,
    parseShortVideoScriptStyleApiMessage,
    saveShortVideoScriptStyle,
    type ShortVideoScriptStyle,
} from 'helpers/marketingShortVideoScriptStyleApi';

type Props = {
    open: boolean;
    onClose: () => void;
    shortVideoId: number;
    currentStyleId: number;
    /** Gọi sau khi chọn/bỏ chọn style cho video (cha cập nhật state + lưu BE). */
    onStyleChange?: (styleId: number) => void | Promise<void>;
};

type ScriptStyleFormState = {
    id: number;
    title: string;
    guide: string;
};

const EMPTY_FORM: ScriptStyleFormState = {
    id: 0,
    title: '',
    guide: '',
};

function ScriptStyleForm({
    form,
    onFormChange,
    saving,
    onSubmit,
    onCancel,
    onDelete,
}: {
    form: ScriptStyleFormState;
    onFormChange: (patch: Partial<ScriptStyleFormState>) => void;
    saving: boolean;
    onSubmit: () => void;
    onCancel: () => void;
    onDelete: () => void;
}) {
    const isEdit = form.id > 0;

    return (
        <Stack spacing={2}>
            <TextField
                label="Tên phong cách *"
                value={form.title}
                onChange={(e) => onFormChange({ title: e.target.value })}
                disabled={saving}
                size="small"
                fullWidth
                placeholder="VD: Kể chuyện drama, Giọng đọc tin tức"
            />
            <TextField
                label="Hướng dẫn *"
                value={form.guide}
                onChange={(e) => onFormChange({ guide: e.target.value })}
                disabled={saving}
                size="small"
                fullWidth
                multiline
                minRows={8}
                maxRows={24}
                helperText="Hướng dẫn phong cách script — thay [script-style] khi copy prompt workflow."
            />
            <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button variant="outlined" onClick={onCancel} disabled={saving}>
                    Hủy
                </Button>
                {isEdit ? (
                    <Button variant="outlined" color="error" onClick={onDelete} disabled={saving}>
                        Xóa
                    </Button>
                ) : null}
                <Button variant="contained" onClick={onSubmit} disabled={saving}>
                    {saving ? <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} /> : null}
                    {isEdit ? 'Lưu thay đổi' : 'Thêm phong cách'}
                </Button>
            </Stack>
        </Stack>
    );
}

export default function ShortVideoScriptStyleManageDrawer({
    open,
    onClose,
    shortVideoId,
    currentStyleId,
    onStyleChange,
}: Props) {
    const { showMessage } = useFloatingMessages();

    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [styles, setStyles] = React.useState<ShortVideoScriptStyle[]>([]);
    const [mode, setMode] = React.useState<'list' | 'form'>('list');
    const [form, setForm] = React.useState<ScriptStyleFormState>(EMPTY_FORM);
    const [saving, setSaving] = React.useState(false);
    const [deleteTarget, setDeleteTarget] = React.useState<ShortVideoScriptStyle | null>(null);
    const [deleting, setDeleting] = React.useState(false);
    const [selectingStyleId, setSelectingStyleId] = React.useState<number | null>(null);

    const reloadList = React.useCallback(() => {
        setLoading(true);
        setError(null);
        listShortVideoScriptStyles()
            .then((result) => {
                setLoading(false);
                if (result?.success === false) {
                    setError(parseShortVideoScriptStyleApiMessage(result, 'Không tải được danh sách phong cách script'));
                    setStyles([]);
                    return;
                }
                setStyles(Array.isArray(result?.styles) ? result.styles : []);
            })
            .catch((err: unknown) => {
                setLoading(false);
                setError(err instanceof Error ? err.message : 'Không tải được danh sách phong cách script');
            });
    }, []);

    React.useEffect(() => {
        if (open) {
            setMode('list');
            setForm(EMPTY_FORM);
            setDeleteTarget(null);
            reloadList();
        }
    }, [open, reloadList]);

    const openAddForm = () => {
        setForm(EMPTY_FORM);
        setMode('form');
    };

    const openEditForm = (style: ShortVideoScriptStyle) => {
        setForm({
            id: style.id,
            title: style.title || '',
            guide: style.guide || '',
        });
        setMode('form');
    };

    const handleFormChange = (patch: Partial<ScriptStyleFormState>) => {
        setForm((prev) => ({ ...prev, ...patch }));
    };

    const handleSubmit = () => {
        const title = form.title.trim();
        const guide = form.guide.trim();
        if (!title) {
            showMessage('Tên phong cách không được để trống', 'warning');
            return;
        }
        if (!guide) {
            showMessage('Hướng dẫn không được để trống', 'warning');
            return;
        }

        setSaving(true);
        saveShortVideoScriptStyle({ id: form.id > 0 ? form.id : 0, title, guide })
            .then((result) => {
                setSaving(false);
                if (result?.success === false) {
                    showMessage(parseShortVideoScriptStyleApiMessage(result, 'Không lưu được phong cách script'), 'error');
                    return;
                }
                showMessage(
                    parseShortVideoScriptStyleApiMessage(
                        result,
                        form.id > 0 ? 'Đã cập nhật phong cách script' : 'Đã thêm phong cách script',
                    ),
                    'success',
                );
                setMode('list');
                setForm(EMPTY_FORM);
                reloadList();
                if (form.id > 0 && currentStyleId === form.id) {
                    onStyleChange?.(form.id);
                }
            })
            .catch((err: unknown) => {
                setSaving(false);
                showMessage(err instanceof Error ? err.message : 'Không lưu được phong cách script', 'error');
            });
    };

    const handleSelectStyle = (styleId: number) => {
        if (!shortVideoId || shortVideoId <= 0) {
            showMessage('Chưa có short video để gắn phong cách script', 'warning');
            return;
        }
        if (!onStyleChange) {
            return;
        }
        setSelectingStyleId(styleId);
        Promise.resolve(onStyleChange(styleId)).finally(() => setSelectingStyleId(null));
    };

    const handleConfirmDelete = () => {
        if (!deleteTarget) {
            return;
        }
        setDeleting(true);
        deleteShortVideoScriptStyle(deleteTarget.id)
            .then((result) => {
                setDeleting(false);
                if (result?.success === false) {
                    showMessage(parseShortVideoScriptStyleApiMessage(result, 'Không xóa được phong cách script'), 'error');
                    setDeleteTarget(null);
                    return;
                }
                showMessage(parseShortVideoScriptStyleApiMessage(result, 'Đã xóa phong cách script'), 'success');
                if (currentStyleId === deleteTarget.id) {
                    void onStyleChange?.(0);
                }
                setDeleteTarget(null);
                reloadList();
            })
            .catch((err: unknown) => {
                setDeleting(false);
                showMessage(err instanceof Error ? err.message : 'Không xóa được phong cách script', 'error');
            });
    };

    const headerAction = (
        <Stack direction="row" spacing={1} alignItems="center">
            {mode === 'form' ? (
                <Button
                    size="small"
                    variant="outlined"
                    startIcon={<ArrowBackOutlinedIcon />}
                    onClick={() => setMode('list')}
                    disabled={saving}
                    sx={{ color: 'common.white', borderColor: 'rgba(255,255,255,0.6)' }}
                >
                    Danh sách
                </Button>
            ) : (
                <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AddOutlinedIcon />}
                    onClick={openAddForm}
                    sx={{ color: 'common.white', borderColor: 'rgba(255,255,255,0.6)' }}
                >
                    Thêm phong cách
                </Button>
            )}
        </Stack>
    );

    return (
        <>
            <DrawerCustom
                open={open}
                onClose={onClose}
                title="Quản lý phong cách script"
                width={900}
                activeOnClose
                headerAction={headerAction}
                restDialogContent={{
                    sx: {
                        backgroundColor: 'body.background',
                        pt: 2,
                        px: 3,
                        pb: 3,
                    },
                }}
            >
                <Typography>&nbsp;</Typography>
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
                            {form.id > 0 ? 'Sửa phong cách script' : 'Thêm phong cách script mới'}
                        </Typography>
                        <ScriptStyleForm
                            form={form}
                            onFormChange={handleFormChange}
                            saving={saving}
                            onSubmit={handleSubmit}
                            onCancel={() => setMode('list')}
                            onDelete={() => {
                                const target = styles.find((item) => item.id === form.id);
                                if (target) {
                                    setDeleteTarget(target);
                                }
                            }}
                        />
                    </Box>
                ) : null}

                {!loading && mode === 'list' && styles.length === 0 ? (
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
                        <RecordVoiceOverOutlinedIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
                        <Typography variant="subtitle2" sx={{ mt: 1 }}>
                            Chưa có phong cách script nào
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                            Lưu tên phong cách + hướng dẫn — dùng lại cho các video sau mà không cần định nghĩa lại.
                        </Typography>
                        <Button variant="contained" size="small" startIcon={<AddOutlinedIcon />} onClick={openAddForm}>
                            Thêm phong cách
                        </Button>
                    </Box>
                ) : null}

                {!loading && mode === 'list' && styles.length > 0 ? (
                    <>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1 }}>
                                Danh sách phong cách script
                            </Typography>
                            <Tooltip title="Tải lại">
                                <span>
                                    <IconButton size="small" onClick={reloadList} disabled={loading}>
                                        <RefreshOutlinedIcon fontSize="small" />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Stack>
                        <Box
                            sx={{
                                display: 'grid',
                                gap: 1.5,
                                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                            }}
                        >
                            {styles.map((style) => {
                                const selected = currentStyleId === style.id;
                                return (
                                    <Box
                                        key={style.id}
                                        sx={{
                                            border: '1px solid',
                                            borderColor: selected ? 'primary.main' : 'divider',
                                            borderRadius: 2,
                                            bgcolor: selected ? 'rgba(25, 118, 210, 0.06)' : 'background.paper',
                                            p: 1.5,
                                            display: 'flex',
                                            gap: 1.5,
                                            alignItems: 'flex-start',
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                width: 48,
                                                height: 48,
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
                                            <RecordVoiceOverOutlinedIcon color="action" />
                                        </Box>
                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                                <Radio
                                                    size="small"
                                                    checked={selected}
                                                    onChange={() => handleSelectStyle(style.id)}
                                                    disabled={selectingStyleId !== null || !onStyleChange}
                                                    inputProps={{
                                                        'aria-label': `Chọn phong cách ${style.title}`,
                                                    }}
                                                />
                                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }} noWrap>
                                                    {style.title || `Style #${style.id}`}
                                                </Typography>
                                            </Stack>
                                            {style.guide ? (
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    sx={{
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden',
                                                        whiteSpace: 'pre-wrap',
                                                    }}
                                                >
                                                    {style.guide}
                                                </Typography>
                                            ) : null}
                                        </Box>
                                        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                                            <Tooltip title="Sửa">
                                                <IconButton size="small" onClick={() => openEditForm(style)}>
                                                    <EditOutlinedIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Xóa">
                                                <IconButton size="small" color="error" onClick={() => setDeleteTarget(style)}>
                                                    <DeleteOutlineOutlinedIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </Box>
                                );
                            })}
                        </Box>
                    </>
                ) : null}
            </DrawerCustom>
            <Dialog open={Boolean(deleteTarget)} onClose={() => (deleting ? null : setDeleteTarget(null))}>
                <DialogTitle>Xóa phong cách script?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Xóa phong cách "{deleteTarget?.title || ''}"? Hành động không thể hoàn tác — video đang dùng phong
                        cách này sẽ về trạng thái chưa chọn.
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
        </>
    );
}
