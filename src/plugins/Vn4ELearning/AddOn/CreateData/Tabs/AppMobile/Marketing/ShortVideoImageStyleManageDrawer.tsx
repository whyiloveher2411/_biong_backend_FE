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
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import DrawerCustom from 'components/molecules/DrawerCustom';
import { useFloatingMessages } from 'hook/useFloatingMessages';
import {
    deleteShortVideoImageStyles,
    listShortVideoImageStyles,
    parseShortVideoImageStyleApiMessage,
    saveShortVideoAgentImageStyle,
    saveShortVideoImageStyle,
    shortVideoImageStyleImageUrl,
    uploadShortVideoImageStyleImage,
    type ShortVideoImageStyle,
} from 'helpers/marketingShortVideoImageStyleApi';

type Props = {
    open: boolean;
    onClose: () => void;
    shortVideoId: number;
    currentStyleId: number;
    /** Gọi sau khi chọn/bỏ chọn style cho video (FE cập nhật state + lưu BE). */
    onStyleChange?: (styleId: number) => void;
};

type StyleFormImage = { url: string; s3_key: string } | null;

type StyleFormState = {
    id: number;
    title: string;
    description: string;
    image: StyleFormImage;
    prompt: string;
};

const EMPTY_FORM: StyleFormState = {
    id: 0,
    title: '',
    description: '',
    image: null,
    prompt: '',
};

/** Parse field image (JSON {link, type_link, s3_key}) → {url, s3_key} cho form. */
function styleToFormImage(style: ShortVideoImageStyle): StyleFormImage {
    const url = shortVideoImageStyleImageUrl(style.image);
    if (!url) {
        return null;
    }
    let s3Key = '';
    const parsed = typeof style.image === 'string'
        ? (() => {
            try {
                return JSON.parse(style.image) as Record<string, unknown>;
            } catch {
                return null;
            }
        })()
        : (style.image as Record<string, unknown> | null);
    if (parsed && typeof parsed === 'object') {
        s3Key = String(parsed.s3_key || '');
    }
    return { url, s3_key: s3Key };
}

function StyleForm({
    form,
    onFormChange,
    saving,
    uploading,
    onSubmit,
    onCancel,
    onUploadImage,
}: {
    form: StyleFormState;
    onFormChange: (patch: Partial<StyleFormState>) => void;
    saving: boolean;
    uploading: boolean;
    onSubmit: () => void;
    onCancel: () => void;
    onUploadImage: (file: File) => void;
}) {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = React.useState(false);

    const acceptFile = (files: FileList | null) => {
        const file = files?.[0];
        if (!file) {
            return;
        }
        onUploadImage(file);
    };

    return (
        <Stack spacing={2}>
            <TextField
                label="Tên phong cách *"
                value={form.title}
                onChange={(e) => onFormChange({ title: e.target.value })}
                disabled={saving || uploading}
                size="small"
                fullWidth
                placeholder="VD: Collage Art, Vox, Courtroom Sketch"
            />
            <TextField
                label="Mô tả"
                value={form.description}
                onChange={(e) => onFormChange({ description: e.target.value })}
                disabled={saving || uploading}
                size="small"
                fullWidth
                multiline
                minRows={2}
            />
            <Box>
                <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                    Thumbnail (ảnh mẫu phong cách)
                </Typography>
                <Box
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        acceptFile(e.dataTransfer.files);
                    }}
                    onClick={() => !uploading && !saving && fileInputRef.current?.click()}
                    sx={{
                        border: '1px dashed',
                        borderColor: dragOver ? 'primary.main' : 'divider',
                        borderRadius: 1.5,
                        p: uploading ? 3 : 1.5,
                        textAlign: 'center',
                        cursor: uploading ? 'wait' : 'pointer',
                        bgcolor: dragOver ? 'action.selected' : 'background.default',
                        opacity: uploading ? 0.7 : 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 1,
                    }}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        hidden
                        onChange={(e) => {
                            acceptFile(e.target.files);
                            e.target.value = '';
                        }}
                    />
                    {form.image?.url ? (
                        <Box
                            component="img"
                            src={form.image.url}
                            alt={form.title || 'style'}
                            sx={{
                                maxWidth: '100%',
                                maxHeight: 260,
                                objectFit: 'contain',
                                borderRadius: 1,
                            }}
                        />
                    ) : (
                        <Stack spacing={0.5} alignItems="center" sx={{ py: 2 }}>
                            {uploading ? (
                                <CircularProgress size={22} />
                            ) : (
                                <CloudUploadOutlinedIcon color="action" />
                            )}
                            <Typography variant="caption" color="text.secondary">
                                {uploading ? 'Đang upload ảnh…' : 'Thả ảnh vào đây hoặc bấm để chọn (PNG/JPG/WEBP/GIF)'}
                            </Typography>
                        </Stack>
                    )}
                </Box>
                {form.image?.url ? (
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                        <ImageOutlinedIcon fontSize="small" color="action" />
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                            {form.image.url}
                        </Typography>
                        <Button
                            size="small"
                            color="error"
                            disabled={saving || uploading}
                            onClick={(e) => {
                                e.stopPropagation();
                                onFormChange({ image: null });
                            }}
                        >
                            Xóa ảnh
                        </Button>
                    </Stack>
                ) : null}
            </Box>
            <TextField
                label="Prompt phong cách *"
                value={form.prompt}
                onChange={(e) => onFormChange({ prompt: e.target.value })}
                disabled={saving || uploading}
                size="small"
                fullWidth
                multiline
                minRows={8}
                maxRows={20}
                helperText="Prompt mô tả đầy đủ phong cách hình ảnh — thay [prompt-style] khi copy prompt workflow"
            />
            <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button variant="outlined" onClick={onCancel} disabled={saving || uploading}>
                    Hủy
                </Button>
                <Button variant="contained" onClick={onSubmit} disabled={saving || uploading}>
                    {saving ? <CircularProgress size={16} color="inherit" /> : null}
                    {form.id > 0 ? 'Lưu thay đổi' : 'Thêm phong cách'}
                </Button>
            </Stack>
        </Stack>
    );
}

export default function ShortVideoImageStyleManageDrawer({
    open,
    onClose,
    shortVideoId,
    currentStyleId,
    onStyleChange,
}: Props) {
    const { showMessage } = useFloatingMessages();

    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [styles, setStyles] = React.useState<ShortVideoImageStyle[]>([]);
    const [mode, setMode] = React.useState<'list' | 'form'>('list');
    const [form, setForm] = React.useState<StyleFormState>(EMPTY_FORM);
    const [saving, setSaving] = React.useState(false);
    const [uploading, setUploading] = React.useState(false);
    const [deleteTarget, setDeleteTarget] = React.useState<ShortVideoImageStyle | null>(null);
    const [deleting, setDeleting] = React.useState(false);
    const [selectingStyleId, setSelectingStyleId] = React.useState<number | null>(null);

    const reloadList = React.useCallback(() => {
        setLoading(true);
        setError(null);
        listShortVideoImageStyles()
            .then((result) => {
                setLoading(false);
                if (result?.success === false) {
                    setError(parseShortVideoImageStyleApiMessage(result, 'Không tải được danh sách phong cách'));
                    setStyles([]);
                    return;
                }
                setStyles(Array.isArray(result?.styles) ? result.styles : []);
            })
            .catch((err: unknown) => {
                setLoading(false);
                setError(err instanceof Error ? err.message : 'Không tải được danh sách phong cách');
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

    const openEditForm = (style: ShortVideoImageStyle) => {
        setForm({
            id: style.id,
            title: style.title || '',
            description: style.description || '',
            image: styleToFormImage(style),
            prompt: style.prompt || '',
        });
        setMode('form');
    };

    const handleFormChange = (patch: Partial<StyleFormState>) => {
        setForm((prev) => ({ ...prev, ...patch }));
    };

    const handleUploadImage = (file: File) => {
        if (uploading) {
            return;
        }
        setUploading(true);
        uploadShortVideoImageStyleImage(file, form.id > 0 ? form.id : 0)
            .then((result) => {
                setUploading(false);
                if (result?.success === false) {
                    showMessage(parseShortVideoImageStyleApiMessage(result, 'Không upload được ảnh'), 'error');
                    return;
                }
                const url = String(result?.url || '');
                if (!url) {
                    showMessage('Upload ảnh thành công nhưng thiếu URL', 'error');
                    return;
                }
                handleFormChange({ image: { url, s3_key: String(result?.s3_key || '') } });
                showMessage('Đã upload ảnh phong cách', 'success');
                if (form.id > 0) {
                    // BE đã cập nhật field image của style — refresh list để thumbnail mới hiện ở danh sách.
                    reloadList();
                }
            })
            .catch((err: unknown) => {
                setUploading(false);
                showMessage(err instanceof Error ? err.message : 'Không upload được ảnh', 'error');
            });
    };

    const handleSubmit = () => {
        const title = form.title.trim();
        if (!title) {
            showMessage('Tên phong cách không được để trống', 'warning');
            return;
        }
        if (!form.prompt.trim()) {
            showMessage('Prompt phong cách không được để trống', 'warning');
            return;
        }

        setSaving(true);
        const image = form.image;
        saveShortVideoImageStyle({
            id: form.id > 0 ? form.id : 0,
            title,
            description: form.description,
            image: image
                ? {
                    link: image.url,
                    type_link: 'external',
                    ...(image.s3_key ? { s3_key: image.s3_key } : {}),
                }
                : '',
            prompt: form.prompt,
        })
            .then((result) => {
                setSaving(false);
                if (result?.success === false) {
                    showMessage(parseShortVideoImageStyleApiMessage(result, 'Không lưu được phong cách'), 'error');
                    return;
                }
                showMessage(form.id > 0 ? 'Đã cập nhật phong cách' : 'Đã thêm phong cách', 'success');
                setMode('list');
                setForm(EMPTY_FORM);
                reloadList();
            })
            .catch((err: unknown) => {
                setSaving(false);
                showMessage(err instanceof Error ? err.message : 'Không lưu được phong cách', 'error');
            });
    };

    const handleSelectStyle = (styleId: number) => {
        if (!shortVideoId || shortVideoId <= 0) {
            showMessage('Chưa có short video để gán phong cách', 'warning');
            return;
        }
        setSelectingStyleId(styleId);
        saveShortVideoAgentImageStyle(shortVideoId, styleId)
            .then((result) => {
                setSelectingStyleId(null);
                if (result?.success === false) {
                    showMessage(parseShortVideoImageStyleApiMessage(result, 'Không chọn được phong cách'), 'error');
                    return;
                }
                showMessage('Đã chọn phong cách hình ảnh', 'success');
                onStyleChange?.(styleId);
            })
            .catch((err: unknown) => {
                setSelectingStyleId(null);
                showMessage(err instanceof Error ? err.message : 'Không chọn được phong cách', 'error');
            });
    };

    const handleConfirmDelete = () => {
        if (!deleteTarget) {
            return;
        }
        setDeleting(true);
        deleteShortVideoImageStyles([deleteTarget.id])
            .then((result) => {
                setDeleting(false);
                if (result?.success === false) {
                    showMessage(parseShortVideoImageStyleApiMessage(result, 'Không xóa được phong cách'), 'error');
                    setDeleteTarget(null);
                    return;
                }
                showMessage('Đã xóa phong cách', 'success');
                if (currentStyleId === deleteTarget.id) {
                    onStyleChange?.(0);
                }
                setDeleteTarget(null);
                reloadList();
            })
            .catch((err: unknown) => {
                setDeleting(false);
                showMessage(err instanceof Error ? err.message : 'Không xóa được phong cách', 'error');
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
                title="Quản lý phong cách hình ảnh"
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
                            {form.id > 0 ? 'Sửa phong cách' : 'Thêm phong cách mới'}
                        </Typography>
                        <StyleForm
                            form={form}
                            onFormChange={handleFormChange}
                            saving={saving}
                            uploading={uploading}
                            onSubmit={handleSubmit}
                            onCancel={() => setMode('list')}
                            onUploadImage={handleUploadImage}
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
                        <PaletteOutlinedIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
                        <Typography variant="subtitle2" sx={{ mt: 1 }}>
                            Chưa có phong cách nào
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                            Thu thập phong cách hình ảnh (title, mô tả, thumbnail, prompt) — dùng lại cho các video sau
                            mà không cần định nghĩa lại.
                        </Typography>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<AddOutlinedIcon />}
                            onClick={openAddForm}
                        >
                            Thêm phong cách
                        </Button>
                    </Box>
                ) : null}

                {!loading && mode === 'list' && styles.length > 0 ? (
                    <Box
                        sx={{
                            display: 'grid',
                            gap: 1.5,
                            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                        }}
                    >
                        {styles.map((style) => {
                            const thumbnail = shortVideoImageStyleImageUrl(style.image);
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
                                            width: 72,
                                            height: 72,
                                            flexShrink: 0,
                                            borderRadius: 1.5,
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            bgcolor: 'background.default',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        {thumbnail ? (
                                            <Box
                                                component="img"
                                                src={thumbnail}
                                                alt={style.title}
                                                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <PaletteOutlinedIcon color="action" />
                                        )}
                                    </Box>
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                            <Radio
                                                size="small"
                                                checked={selected}
                                                onChange={() => handleSelectStyle(style.id)}
                                                disabled={selectingStyleId !== null}
                                                inputProps={{ 'aria-label': `Chọn phong cách ${style.title}` }}
                                            />
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }} noWrap>
                                                {style.title || '(Không tên)'}
                                            </Typography>
                                            {selected ? (
                                                <Typography variant="caption" color="primary" sx={{ flexShrink: 0 }}>
                                                    Đang dùng
                                                </Typography>
                                            ) : null}
                                        </Stack>
                                        {style.description ? (
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                sx={{ display: 'block' }}
                                                noWrap
                                            >
                                                {style.description}
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
                ) : null}
            </DrawerCustom>
            <Dialog
                open={Boolean(deleteTarget)}
                onClose={() => (deleting ? null : setDeleteTarget(null))}
            >
                <DialogTitle>Xóa phong cách?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Xóa phong cách "{deleteTarget?.title || ''}"?
                        Hành động không thể hoàn tác — video đang dùng phong cách này sẽ về trạng thái chưa chọn.
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
