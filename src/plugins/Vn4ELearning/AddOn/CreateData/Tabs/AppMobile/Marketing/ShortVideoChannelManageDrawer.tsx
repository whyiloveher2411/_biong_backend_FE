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
import LiveTvOutlinedIcon from '@mui/icons-material/LiveTvOutlined';
import DrawerCustom from 'components/molecules/DrawerCustom';
import { useFloatingMessages } from 'hook/useFloatingMessages';
import {
    deleteShortVideoChannels,
    listShortVideoChannels,
    parseShortVideoChannelApiMessage,
    saveShortVideoAgentChannel,
    saveShortVideoChannel,
    shortVideoChannelImageUrl,
    uploadShortVideoChannelImage,
    type ShortVideoChannel,
} from 'helpers/marketingShortVideoChannelApi';

type Props = {
    open: boolean;
    onClose: () => void;
    shortVideoId: number;
    currentChannelId: number;
    /** Gọi sau khi chọn/bỏ chọn kênh cho video (FE cập nhật state). */
    onChannelChange?: (channelId: number) => void;
};

type ChannelFormImage = { url: string; s3_key: string } | null;

type ChannelFormState = {
    id: number;
    title: string;
    description: string;
    image: ChannelFormImage;
    keyword: string;
    category: string;
    video_format: string;
    lang: string;
    voice: string;
    hashtags: string;
    cta: string;
    tone: string;
    target_audience: string;
};

const EMPTY_FORM: ChannelFormState = {
    id: 0,
    title: '',
    description: '',
    image: null,
    keyword: '',
    category: '',
    video_format: '',
    lang: '',
    voice: '',
    hashtags: '',
    cta: '',
    tone: '',
    target_audience: '',
};

/** Parse field image (JSON {link, type_link, s3_key}) → {url, s3_key} cho form. */
function channelToFormImage(channel: ShortVideoChannel): ChannelFormImage {
    const url = shortVideoChannelImageUrl(channel.image);
    if (!url) {
        return null;
    }
    let s3Key = '';
    const parsed = typeof channel.image === 'string'
        ? (() => {
            try {
                return JSON.parse(channel.image) as Record<string, unknown>;
            } catch {
                return null;
            }
        })()
        : (channel.image as Record<string, unknown> | null);
    if (parsed && typeof parsed === 'object') {
        s3Key = String(parsed.s3_key || '');
    }
    return { url, s3_key: s3Key };
}

function ChannelForm({
    form,
    onFormChange,
    saving,
    uploading,
    onSubmit,
    onCancel,
    onUploadImage,
}: {
    form: ChannelFormState;
    onFormChange: (patch: Partial<ChannelFormState>) => void;
    saving: boolean;
    uploading: boolean;
    onSubmit: () => void;
    onCancel: () => void;
    onUploadImage: (file: File) => void;
}) {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = React.useState(false);
    const disabled = saving || uploading;

    const acceptFile = (files: FileList | null) => {
        const file = files?.[0];
        if (!file) {
            return;
        }
        onUploadImage(file);
    };

    const twoCol = {
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
    };

    return (
        <Stack spacing={2}>
            <Box sx={twoCol}>
                <TextField
                    label="Tên kênh *"
                    value={form.title}
                    onChange={(e) => onFormChange({ title: e.target.value })}
                    disabled={disabled}
                    size="small"
                    fullWidth
                    placeholder="VD: Kênh công nghệ, Kênh ẩm thực"
                />
                <TextField
                    label="Category"
                    value={form.category}
                    onChange={(e) => onFormChange({ category: e.target.value })}
                    disabled={disabled}
                    size="small"
                    fullWidth
                    placeholder="VD: Technology, Food"
                />
                <TextField
                    label="Tone / phong cách nội dung"
                    value={form.tone}
                    onChange={(e) => onFormChange({ tone: e.target.value })}
                    disabled={disabled}
                    size="small"
                    fullWidth
                    placeholder="VD: Hài hước, nghiêm túc, truyền cảm hứng"
                />
                <TextField
                    label="Target audience"
                    value={form.target_audience}
                    onChange={(e) => onFormChange({ target_audience: e.target.value })}
                    disabled={disabled}
                    size="small"
                    fullWidth
                    placeholder="VD: Gen Z, dân văn phòng"
                />
                <TextField
                    label="Ngôn ngữ mặc định"
                    value={form.lang}
                    onChange={(e) => onFormChange({ lang: e.target.value })}
                    disabled={disabled}
                    size="small"
                    fullWidth
                    placeholder="vi hoặc en"
                />
                <TextField
                    label="Giọng đọc mặc định"
                    value={form.voice}
                    onChange={(e) => onFormChange({ voice: e.target.value })}
                    disabled={disabled}
                    size="small"
                    fullWidth
                    placeholder="VD: minh_quân, adam"
                />
            </Box>
            <TextField
                label="Mô tả"
                value={form.description}
                onChange={(e) => onFormChange({ description: e.target.value })}
                disabled={disabled}
                size="small"
                fullWidth
                multiline
                minRows={2}
            />
            <TextField
                label="Keyword"
                value={form.keyword}
                onChange={(e) => onFormChange({ keyword: e.target.value })}
                disabled={disabled}
                size="small"
                fullWidth
                multiline
                minRows={2}
                helperText="Từ khóa chính của kênh — phân tách bằng dấu phẩy"
            />
            <TextField
                label="Format mô tả mặc định cho video"
                value={form.video_format}
                onChange={(e) => onFormChange({ video_format: e.target.value })}
                disabled={disabled}
                size="small"
                fullWidth
                multiline
                minRows={3}
                helperText="Mô tả/format mặc định khi tạo video thuộc kênh này"
            />
            <Box sx={twoCol}>
                <TextField
                    label="Hashtag mặc định"
                    value={form.hashtags}
                    onChange={(e) => onFormChange({ hashtags: e.target.value })}
                    disabled={disabled}
                    size="small"
                    fullWidth
                    multiline
                    minRows={4}
                    placeholder="#tiktok #review"
                />
                <TextField
                    label="CTA mặc định"
                    value={form.cta}
                    onChange={(e) => onFormChange({ cta: e.target.value })}
                    disabled={disabled}
                    size="small"
                    fullWidth
                    multiline
                    minRows={4}
                    placeholder="Theo dõi kênh để xem thêm nhé!"
                />
            </Box>
            <Box>
                <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                    Ảnh đại diện kênh
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
                    onClick={() => !disabled && fileInputRef.current?.click()}
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
                            alt={form.title || 'channel'}
                            sx={{
                                maxWidth: '100%',
                                maxHeight: 220,
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
                            disabled={disabled}
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
                <Button variant="outlined" onClick={onCancel} disabled={disabled}>
                    Hủy
                </Button>
                <Button variant="contained" onClick={onSubmit} disabled={disabled}>
                    {saving ? <CircularProgress size={16} color="inherit" /> : null}
                    {form.id > 0 ? 'Lưu thay đổi' : 'Thêm kênh'}
                </Button>
            </Stack>
        </Stack>
    );
}

export default function ShortVideoChannelManageDrawer({
    open,
    onClose,
    shortVideoId,
    currentChannelId,
    onChannelChange,
}: Props) {
    const { showMessage } = useFloatingMessages();

    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [channels, setChannels] = React.useState<ShortVideoChannel[]>([]);
    const [mode, setMode] = React.useState<'list' | 'form'>('list');
    const [form, setForm] = React.useState<ChannelFormState>(EMPTY_FORM);
    const [saving, setSaving] = React.useState(false);
    const [uploading, setUploading] = React.useState(false);
    const [deleteTarget, setDeleteTarget] = React.useState<ShortVideoChannel | null>(null);
    const [deleting, setDeleting] = React.useState(false);
    const [selectingChannelId, setSelectingChannelId] = React.useState<number | null>(null);

    const reloadList = React.useCallback(() => {
        setLoading(true);
        setError(null);
        listShortVideoChannels()
            .then((result) => {
                setLoading(false);
                if (result?.success === false) {
                    setError(parseShortVideoChannelApiMessage(result, 'Không tải được danh sách kênh'));
                    setChannels([]);
                    return;
                }
                setChannels(Array.isArray(result?.channels) ? result.channels : []);
            })
            .catch((err: unknown) => {
                setLoading(false);
                setError(err instanceof Error ? err.message : 'Không tải được danh sách kênh');
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

    const openEditForm = (channel: ShortVideoChannel) => {
        setForm({
            id: channel.id,
            title: channel.title || '',
            description: channel.description || '',
            image: channelToFormImage(channel),
            keyword: channel.keyword || '',
            category: channel.category || '',
            video_format: channel.video_format || '',
            lang: channel.lang || '',
            voice: channel.voice || '',
            hashtags: channel.hashtags || '',
            cta: channel.cta || '',
            tone: channel.tone || '',
            target_audience: channel.target_audience || '',
        });
        setMode('form');
    };

    const handleFormChange = (patch: Partial<ChannelFormState>) => {
        setForm((prev) => ({ ...prev, ...patch }));
    };

    const handleUploadImage = (file: File) => {
        if (uploading) {
            return;
        }
        setUploading(true);
        uploadShortVideoChannelImage(file, form.id > 0 ? form.id : 0)
            .then((result) => {
                setUploading(false);
                if (result?.success === false) {
                    showMessage(parseShortVideoChannelApiMessage(result, 'Không upload được ảnh'), 'error');
                    return;
                }
                const url = String(result?.url || '');
                if (!url) {
                    showMessage('Upload ảnh thành công nhưng thiếu URL', 'error');
                    return;
                }
                handleFormChange({ image: { url, s3_key: String(result?.s3_key || '') } });
                showMessage('Đã upload ảnh kênh', 'success');
                if (form.id > 0) {
                    // BE đã cập nhật field image của kênh — refresh list để thumbnail mới hiện.
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
            showMessage('Tên kênh không được để trống', 'warning');
            return;
        }

        setSaving(true);
        const image = form.image;
        saveShortVideoChannel({
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
            keyword: form.keyword,
            category: form.category,
            video_format: form.video_format,
            lang: form.lang,
            voice: form.voice,
            hashtags: form.hashtags,
            cta: form.cta,
            tone: form.tone,
            target_audience: form.target_audience,
        })
            .then((result) => {
                setSaving(false);
                if (result?.success === false) {
                    showMessage(parseShortVideoChannelApiMessage(result, 'Không lưu được kênh'), 'error');
                    return;
                }
                showMessage(form.id > 0 ? 'Đã cập nhật kênh' : 'Đã thêm kênh', 'success');
                setMode('list');
                setForm(EMPTY_FORM);
                reloadList();
            })
            .catch((err: unknown) => {
                setSaving(false);
                showMessage(err instanceof Error ? err.message : 'Không lưu được kênh', 'error');
            });
    };

    const handleSelectChannel = (channelId: number) => {
        if (!shortVideoId || shortVideoId <= 0) {
            showMessage('Chưa có short video để gán kênh', 'warning');
            return;
        }
        setSelectingChannelId(channelId);
        saveShortVideoAgentChannel(shortVideoId, channelId)
            .then((result) => {
                setSelectingChannelId(null);
                if (result?.success === false) {
                    showMessage(parseShortVideoChannelApiMessage(result, 'Không chọn được kênh'), 'error');
                    return;
                }
                showMessage('Đã chọn kênh', 'success');
                onChannelChange?.(channelId);
            })
            .catch((err: unknown) => {
                setSelectingChannelId(null);
                showMessage(err instanceof Error ? err.message : 'Không chọn được kênh', 'error');
            });
    };

    const handleConfirmDelete = () => {
        if (!deleteTarget) {
            return;
        }
        setDeleting(true);
        deleteShortVideoChannels([deleteTarget.id])
            .then((result) => {
                setDeleting(false);
                if (result?.success === false) {
                    showMessage(parseShortVideoChannelApiMessage(result, 'Không xóa được kênh'), 'error');
                    setDeleteTarget(null);
                    return;
                }
                showMessage('Đã xóa kênh', 'success');
                if (currentChannelId === deleteTarget.id) {
                    onChannelChange?.(0);
                }
                setDeleteTarget(null);
                reloadList();
            })
            .catch((err: unknown) => {
                setDeleting(false);
                showMessage(err instanceof Error ? err.message : 'Không xóa được kênh', 'error');
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
                    Thêm kênh
                </Button>
            )}
        </Stack>
    );

    return (
        <>
            <DrawerCustom
                open={open}
                onClose={onClose}
                title="Quản lý kênh"
                width={1000}
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
                            maxWidth: 860,
                        }}
                    >
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                            {form.id > 0 ? 'Sửa kênh' : 'Thêm kênh mới'}
                        </Typography>
                        <ChannelForm
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

                {!loading && mode === 'list' && channels.length === 0 ? (
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
                        <LiveTvOutlinedIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
                        <Typography variant="subtitle2" sx={{ mt: 1 }}>
                            Chưa có kênh nào
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                            Lưu thông tin kênh (title, mô tả, keyword, category, format mô tả mặc định…) — gán lại
                            cho các video sau.
                        </Typography>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<AddOutlinedIcon />}
                            onClick={openAddForm}
                        >
                            Thêm kênh
                        </Button>
                    </Box>
                ) : null}

                {!loading && mode === 'list' && channels.length > 0 ? (
                    <Box
                        sx={{
                            display: 'grid',
                            gap: 1.5,
                            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                        }}
                    >
                        {channels.map((channel) => {
                            const thumbnail = shortVideoChannelImageUrl(channel.image);
                            const selected = currentChannelId === channel.id;
                            return (
                                <Box
                                    key={channel.id}
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
                                            width: 64,
                                            height: 64,
                                            flexShrink: 0,
                                            borderRadius: '50%',
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
                                                alt={channel.title}
                                                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <LiveTvOutlinedIcon color="action" />
                                        )}
                                    </Box>
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                            <Radio
                                                size="small"
                                                checked={selected}
                                                onChange={() => handleSelectChannel(channel.id)}
                                                disabled={selectingChannelId !== null}
                                                inputProps={{ 'aria-label': `Chọn kênh ${channel.title}` }}
                                            />
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }} noWrap>
                                                {channel.title || '(Không tên)'}
                                            </Typography>
                                            {selected ? (
                                                <Typography variant="caption" color="primary" sx={{ flexShrink: 0 }}>
                                                    Đang dùng
                                                </Typography>
                                            ) : null}
                                        </Stack>
                                        {channel.category ? (
                                            <Chip
                                                size="small"
                                                label={channel.category}
                                                sx={{ height: 20, mb: 0.5 }}
                                            />
                                        ) : null}
                                        {channel.description ? (
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                sx={{ display: 'block' }}
                                                noWrap
                                            >
                                                {channel.description}
                                            </Typography>
                                        ) : null}
                                        {channel.keyword ? (
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                sx={{ display: 'block' }}
                                                noWrap
                                            >
                                                Keyword: {channel.keyword}
                                            </Typography>
                                        ) : null}
                                    </Box>
                                    <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                                        <Tooltip title="Sửa">
                                            <IconButton size="small" onClick={() => openEditForm(channel)}>
                                                <EditOutlinedIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Xóa">
                                            <IconButton size="small" color="error" onClick={() => setDeleteTarget(channel)}>
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
                <DialogTitle>Xóa kênh?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Xóa kênh "{deleteTarget?.title || ''}"?
                        Hành động không thể hoàn tác — video đang dùng kênh này sẽ về trạng thái chưa chọn.
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
