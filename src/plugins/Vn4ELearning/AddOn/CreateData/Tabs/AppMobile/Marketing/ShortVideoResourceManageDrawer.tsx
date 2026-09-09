import React from 'react';
import {
    Alert,
    Box,
    Button,
    Checkbox,
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
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DrawerCustom from 'components/molecules/DrawerCustom';
import { useFloatingMessages } from 'hook/useFloatingMessages';
import {
    deleteShortVideoResource,
    deleteShortVideoResources,
    listShortVideoResources,
    openResourceMetaAi,
    parseShortVideoResourceApiMessage,
    saveShortVideoResource,
    SHORT_VIDEO_RESOURCE_IMAGE_SAVED_EVENT,
    uploadShortVideoResourceImage,
    type ShortVideoResource,
} from 'helpers/marketingShortVideoResourceApi';

type Props = {
    open: boolean;
    onClose: () => void;
    shortVideoId: number;
    shortVideoTitle?: string;
};

type ResourceFormState = {
    id: number;
    resource_key: string;
    title: string;
    prompt: string;
    description: string;
    image: { url: string; s3_key: string } | null;
};

const EMPTY_FORM: ResourceFormState = {
    id: 0,
    resource_key: '',
    title: '',
    prompt: '',
    description: '',
    image: null,
};

/** Chuẩn hoá mã định danh để so trùng phía client (đồng bộ với normalize phía BE). */
function normalizeResourceKey(key: string): string {
    return key.trim().replace(/\s+/g, ' ').toLowerCase();
}

function promptPreview(prompt: string): string {
    const flat = prompt.replace(/\s+/g, ' ').trim();
    return flat.length > 140 ? `${flat.slice(0, 140)}…` : flat;
}

function ResourceForm({
    form,
    onFormChange,
    shortVideoId,
    saving,
    uploading,
    onSubmit,
    onCancel,
    onUploadImage,
}: {
    form: ResourceFormState;
    onFormChange: (patch: Partial<ResourceFormState>) => void;
    shortVideoId: number;
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
        if (!file || shortVideoId <= 0) {
            return;
        }
        onUploadImage(file);
    };

    return (
        <Stack spacing={2}>
            <TextField
                label="Mã định danh *"
                value={form.resource_key}
                onChange={(e) => onFormChange({ resource_key: e.target.value })}
                disabled={saving || uploading}
                size="small"
                fullWidth
                placeholder="VD: main_character, logo_brand"
                helperText="Dùng để gọi tên resource ở các bước generate. Unique trong short video này."
            />
            <TextField
                label="Tên resource *"
                value={form.title}
                onChange={(e) => onFormChange({ title: e.target.value })}
                disabled={saving || uploading}
                size="small"
                fullWidth
            />
            <TextField
                label="Prompt"
                value={form.prompt}
                onChange={(e) => onFormChange({ prompt: e.target.value })}
                disabled={saving || uploading}
                size="small"
                fullWidth
                multiline
                minRows={4}
                placeholder="Prompt dùng để tạo resource này"
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
                placeholder="Resource này dùng để làm gì, xuất hiện ở đâu…"
            />
            <Box>
                <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                    Ảnh resource
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
                            alt={form.title || 'resource'}
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
            <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button variant="outlined" onClick={onCancel} disabled={saving || uploading}>
                    Hủy
                </Button>
                <Button variant="contained" onClick={onSubmit} disabled={saving || uploading}>
                    {saving ? <CircularProgress size={16} color="inherit" /> : null}
                    {form.id > 0 ? 'Lưu thay đổi' : 'Thêm resource'}
                </Button>
            </Stack>
        </Stack>
    );
}

export default function ShortVideoResourceManageDrawer({
    open,
    onClose,
    shortVideoId,
    shortVideoTitle,
}: Props) {
    const { showMessage } = useFloatingMessages();

    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [resources, setResources] = React.useState<ShortVideoResource[]>([]);
    const [mode, setMode] = React.useState<'list' | 'form'>('list');
    const [form, setForm] = React.useState<ResourceFormState>(EMPTY_FORM);
    const [saving, setSaving] = React.useState(false);
    const [uploading, setUploading] = React.useState(false);
    const [deleteTarget, setDeleteTarget] = React.useState<ShortVideoResource | null>(null);
    const [deleting, setDeleting] = React.useState(false);
    const [selectedIds, setSelectedIds] = React.useState<number[]>([]);
    const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);
    const [bulkDeleting, setBulkDeleting] = React.useState(false);
    const [openingMetaAiId, setOpeningMetaAiId] = React.useState(0);

    const toggleSelected = (resourceId: number) => {
        setSelectedIds((prev) => (prev.includes(resourceId)
            ? prev.filter((id) => id !== resourceId)
            : [...prev, resourceId]));
    };

    const reloadList = React.useCallback(() => {
        if (shortVideoId <= 0) {
            setError('Chưa xác định short video');
            setResources([]);
            return;
        }

        setLoading(true);
        setError(null);
        listShortVideoResources(shortVideoId)
            .then((result) => {
                setLoading(false);
                if (result?.success === false) {
                    setError(parseShortVideoResourceApiMessage(
                        result,
                        'Không tải được danh sách resource',
                    ));
                    setResources([]);
                    return;
                }
                setResources(Array.isArray(result?.resources) ? result.resources : []);
            })
            .catch((err: unknown) => {
                setLoading(false);
                setError(err instanceof Error ? err.message : 'Không tải được danh sách resource');
            });
    }, [shortVideoId]);

    React.useEffect(() => {
        if (open) {
            setMode('list');
            setForm(EMPTY_FORM);
            setDeleteTarget(null);
            setSelectedIds([]);
            setBulkDeleteOpen(false);
            reloadList();
        }
    }, [open, reloadList]);

    // Extension lưu ảnh resource xong → tự reload danh sách.
    React.useEffect(() => {
        if (!open) {
            return;
        }
        const onResourceImageSaved = (event: Event) => {
            const detail = (event as CustomEvent<{ shortVideoId?: number }>).detail || {};
            const savedShortVideoId = Number(detail.shortVideoId || 0);
            if (savedShortVideoId && savedShortVideoId !== shortVideoId) {
                return;
            }
            reloadList();
        };
        document.addEventListener(SHORT_VIDEO_RESOURCE_IMAGE_SAVED_EVENT, onResourceImageSaved);
        return () => {
            document.removeEventListener(SHORT_VIDEO_RESOURCE_IMAGE_SAVED_EVENT, onResourceImageSaved);
        };
    }, [open, shortVideoId, reloadList]);

    const handleOpenMetaAi = (resource: ShortVideoResource) => {
        if (shortVideoId <= 0 || !resource.prompt.trim()) {
            return;
        }
        // Gửi CẢ DANH SÁCH resource có prompt — panel Meta.ai Prev/Next di chuyển
        // trong 1 tab, update nhiều resource không cần mở lại từ CMS.
        const fillable = resources.filter((item) => item.prompt.trim());
        if (!fillable.length) {
            showMessage('Chưa có resource nào có prompt', 'warning');
            return;
        }
        setOpeningMetaAiId(resource.id);
        openResourceMetaAi({
            shortVideoId,
            activeResourceId: resource.id,
            resources: fillable.map((item) => ({
                resourceId: item.id,
                resourceKey: item.resource_key,
                resourceTitle: item.title,
                prompt: item.prompt,
                imageUrl: item.image_url,
            })),
            autoSubmit: true,
        })
            .then(() => {
                setOpeningMetaAiId(0);
                showMessage(`Đã mở tab Meta.ai với ${fillable.length} resource — Prev/Next chuyển resource, download ảnh → tự lưu`, 'success');
            })
            .catch((err: unknown) => {
                setOpeningMetaAiId(0);
                showMessage(err instanceof Error ? err.message : 'Không mở được tab Meta.ai', 'error');
            });
    };

    const openAddForm = () => {
        setForm(EMPTY_FORM);
        setMode('form');
    };

    const openEditForm = (resource: ShortVideoResource) => {
        setForm({
            id: resource.id,
            resource_key: resource.resource_key || '',
            title: resource.title || '',
            prompt: resource.prompt || '',
            description: resource.description || '',
            image: resource.image_url
                ? { url: resource.image_url, s3_key: resource.image_s3_key || '' }
                : null,
        });
        setMode('form');
    };

    const handleFormChange = (patch: Partial<ResourceFormState>) => {
        setForm((prev) => ({ ...prev, ...patch }));
    };

    const handleUploadImage = (file: File) => {
        if (shortVideoId <= 0) {
            showMessage('Chưa xác định short video', 'warning');
            return;
        }
        setUploading(true);
        uploadShortVideoResourceImage(shortVideoId, file)
            .then((result) => {
                setUploading(false);
                if (result?.success === false || !result?.url) {
                    showMessage(
                        parseShortVideoResourceApiMessage(
                            result,
                            'Upload ảnh thất bại',
                        ),
                        'error',
                    );
                    return;
                }
                handleFormChange({ image: { url: result.url || '', s3_key: result.s3_key || '' } });
                showMessage('Đã upload ảnh resource', 'success');
            })
            .catch((err: unknown) => {
                setUploading(false);
                showMessage(err instanceof Error ? err.message : 'Upload ảnh thất bại', 'error');
            });
    };

    const handleSubmit = () => {
        if (shortVideoId <= 0) {
            showMessage('Chưa xác định short video', 'warning');
            return;
        }

        const key = form.resource_key.trim();
        const title = form.title.trim();
        if (!key) {
            showMessage('Mã định danh không được để trống', 'warning');
            return;
        }
        if (!title) {
            showMessage('Tên resource không được để trống', 'warning');
            return;
        }

        const normalized = normalizeResourceKey(key);
        const duplicate = resources.some(
            (item) => item.id !== form.id && normalizeResourceKey(item.resource_key || '') === normalized,
        );
        if (duplicate) {
            showMessage(`Mã định danh "${key}" đã tồn tại trong short video này`, 'error');
            return;
        }

        setSaving(true);
        saveShortVideoResource({
            id: form.id > 0 ? form.id : 0,
            short_video_id: shortVideoId,
            resource_key: key,
            title,
            prompt: form.prompt,
            description: form.description,
            image: form.image,
        })
            .then((result) => {
                setSaving(false);
                if (result?.success === false) {
                    showMessage(
                        parseShortVideoResourceApiMessage(
                            result,
                            'Không lưu được resource',
                        ),
                        'error',
                    );
                    return;
                }
                showMessage(form.id > 0 ? 'Đã cập nhật resource' : 'Đã thêm resource', 'success');
                setMode('list');
                setForm(EMPTY_FORM);
                reloadList();
            })
            .catch((err: unknown) => {
                setSaving(false);
                showMessage(err instanceof Error ? err.message : 'Không lưu được resource', 'error');
            });
    };

    const handleConfirmDelete = () => {
        if (!deleteTarget) {
            return;
        }
        setDeleting(true);
        deleteShortVideoResource(deleteTarget.id)
            .then((result) => {
                setDeleting(false);
                if (result?.success === false) {
                    showMessage(
                        parseShortVideoResourceApiMessage(
                            result,
                            'Không xóa được resource',
                        ),
                        'error',
                    );
                    setDeleteTarget(null);
                    return;
                }
                showMessage('Đã xóa resource', 'success');
                setDeleteTarget(null);
                reloadList();
            })
            .catch((err: unknown) => {
                setDeleting(false);
                showMessage(err instanceof Error ? err.message : 'Không xóa được resource', 'error');
            });
    };

    const handleBulkDelete = () => {
        if (!selectedIds.length) {
            return;
        }
        setBulkDeleting(true);
        deleteShortVideoResources(selectedIds)
            .then((result) => {
                setBulkDeleting(false);
                if (result?.success === false) {
                    showMessage(
                        parseShortVideoResourceApiMessage(
                            result,
                            'Không xóa được resource đã chọn',
                        ),
                        'error',
                    );
                    setBulkDeleteOpen(false);
                    return;
                }
                const deletedCount = Number(result?.deleted || selectedIds.length);
                showMessage(`Đã xóa ${deletedCount} resource`, 'success');
                setBulkDeleteOpen(false);
                setSelectedIds([]);
                reloadList();
            })
            .catch((err: unknown) => {
                setBulkDeleting(false);
                showMessage(err instanceof Error ? err.message : 'Không xóa được resource đã chọn', 'error');
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
                    disabled={shortVideoId <= 0}
                    sx={{ color: 'common.white', borderColor: 'rgba(255,255,255,0.6)' }}
                >
                    Thêm resource
                </Button>
            )}
        </Stack>
    );

    return (
        <>
            <DrawerCustom
                open={open}
                onClose={onClose}
                title={shortVideoTitle ? `Quản lý resource — ${shortVideoTitle}` : 'Quản lý resource'}
                width={1100}
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
                            {form.id > 0 ? 'Sửa resource' : 'Thêm resource mới'}
                        </Typography>
                        <ResourceForm
                            form={form}
                            onFormChange={handleFormChange}
                            shortVideoId={shortVideoId}
                            saving={saving}
                            uploading={uploading}
                            onSubmit={handleSubmit}
                            onCancel={() => setMode('list')}
                            onUploadImage={handleUploadImage}
                        />
                    </Box>
                ) : null}

                {!loading && mode === 'list' && resources.length === 0 ? (
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
                        <ImageOutlinedIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
                        <Typography variant="subtitle2" sx={{ mt: 1 }}>
                            Chưa có resource nào
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                            Resource (mã định danh, prompt, ảnh) dùng cho generate image của video này.
                        </Typography>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<AddOutlinedIcon />}
                            onClick={openAddForm}
                            disabled={shortVideoId <= 0}
                        >
                            Thêm resource
                        </Button>
                    </Box>
                ) : null}

                {!loading && mode === 'list' && selectedIds.length > 0 ? (
                    <Box
                        sx={{
                            mb: 1.5,
                            px: 1.5,
                            py: 1,
                            border: '1px solid',
                            borderColor: 'primary.main',
                            borderRadius: 2,
                            bgcolor: 'background.paper',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            flexWrap: 'wrap',
                            position: 'sticky',
                            top: 0,
                            zIndex: 2,
                        }}
                    >
                        <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, minWidth: 120 }}>
                            Đã chọn {selectedIds.length} resource
                        </Typography>
                        <Button
                            size="small"
                            onClick={() => setSelectedIds(resources.map((item) => item.id))}
                            disabled={bulkDeleting || selectedIds.length >= resources.length}
                            sx={{ textTransform: 'none' }}
                        >
                            Chọn tất cả
                        </Button>
                        <Button
                            size="small"
                            onClick={() => setSelectedIds([])}
                            disabled={bulkDeleting}
                            sx={{ textTransform: 'none' }}
                        >
                            Bỏ chọn
                        </Button>
                        <Button
                            size="small"
                            variant="contained"
                            color="error"
                            onClick={() => setBulkDeleteOpen(true)}
                            disabled={bulkDeleting}
                            startIcon={bulkDeleting ? <CircularProgress size={14} color="inherit" /> : undefined}
                            sx={{ textTransform: 'none' }}
                        >
                            Xóa đã chọn
                        </Button>
                    </Box>
                ) : null}

                {!loading && mode === 'list' && resources.length > 0 ? (
                    <Box
                        sx={{
                            display: 'grid',
                            gap: 1.5,
                            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                        }}
                    >
                        {resources.map((resource) => (
                            <Box
                                key={resource.id}
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
                                        width: 84,
                                        height: 84,
                                        flexShrink: 0,
                                        borderRadius: 1.5,
                                        border: '1px solid',
                                        borderColor: selectedIds.includes(resource.id) ? 'primary.main' : 'divider',
                                        bgcolor: 'background.default',
                                        overflow: 'hidden',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        position: 'relative',
                                    }}
                                >
                                    <Checkbox
                                        size="small"
                                        checked={selectedIds.includes(resource.id)}
                                        onChange={() => toggleSelected(resource.id)}
                                        onClick={(e) => e.stopPropagation()}
                                        sx={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            p: 0.25,
                                            zIndex: 1,
                                            bgcolor: 'rgba(255,255,255,0.75)',
                                            borderRadius: 1,
                                            '& .MuiSvgIcon-root': { fontSize: 18 },
                                        }}
                                    />
                                    {resource.image_url ? (
                                        <Box
                                            component="img"
                                            src={resource.image_url}
                                            alt={resource.title || resource.resource_key}
                                            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                        />
                                    ) : (
                                        <ImageOutlinedIcon color="disabled" />
                                    )}
                                </Box>
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                        <Chip
                                            size="small"
                                            label={resource.resource_key || `#${resource.id}`}
                                            color="primary"
                                            variant="outlined"
                                            sx={{ fontWeight: 700, maxWidth: 220 }}
                                        />
                                    </Stack>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }} noWrap>
                                        {resource.title || '(Không tên)'}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                        {resource.prompt
                                            ? promptPreview(resource.prompt)
                                            : 'Chưa có prompt'}
                                    </Typography>
                                    {resource.description ? (
                                        <Typography
                                            variant="caption"
                                            color="text.disabled"
                                            sx={{ display: 'block', fontStyle: 'italic' }}
                                        >
                                            {promptPreview(resource.description)}
                                        </Typography>
                                    ) : null}
                                </Box>
                                <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                                    <Tooltip
                                        title={resource.prompt.trim()
                                            ? 'Mở Meta.ai + điền prompt — download ảnh → tự lưu vào resource'
                                            : 'Resource chưa có prompt'}
                                    >
                                        <span>
                                            <IconButton
                                                size="small"
                                                color="warning"
                                                disabled={!resource.prompt.trim() || openingMetaAiId === resource.id}
                                                onClick={() => handleOpenMetaAi(resource)}
                                            >
                                                {openingMetaAiId === resource.id
                                                    ? <CircularProgress size={16} />
                                                    : <AutoAwesomeIcon fontSize="small" />}
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                    <Tooltip title="Sửa">
                                        <IconButton size="small" onClick={() => openEditForm(resource)}>
                                            <EditOutlinedIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Xóa">
                                        <IconButton size="small" color="error" onClick={() => setDeleteTarget(resource)}>
                                            <DeleteOutlineOutlinedIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </Stack>
                            </Box>
                        ))}
                    </Box>
                ) : null}
            </DrawerCustom>
            <Dialog
                open={Boolean(deleteTarget)}
                onClose={() => (deleting ? null : setDeleteTarget(null))}
            >
                <DialogTitle>Xóa resource?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Xóa resource "{deleteTarget?.title || deleteTarget?.resource_key || ''}"
                        ({deleteTarget?.resource_key}) khỏi short video? Hành động không thể hoàn tác.
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
            <Dialog
                open={bulkDeleteOpen}
                onClose={() => (bulkDeleting ? null : setBulkDeleteOpen(false))}
            >
                <DialogTitle>Xóa {selectedIds.length} resource đã chọn?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Xóa {selectedIds.length} resource khỏi short video? Hành động không thể hoàn tác.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setBulkDeleteOpen(false)} disabled={bulkDeleting}>
                        Hủy
                    </Button>
                    <Button color="error" variant="contained" onClick={handleBulkDelete} disabled={bulkDeleting}>
                        {bulkDeleting ? <CircularProgress size={16} color="inherit" /> : null}
                        Xóa {selectedIds.length} resource
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
