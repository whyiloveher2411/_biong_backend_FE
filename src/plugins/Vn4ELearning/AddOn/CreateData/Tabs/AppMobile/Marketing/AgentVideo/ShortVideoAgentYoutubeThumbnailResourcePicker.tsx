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
    DialogTitle,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import {
    listShortVideoResources,
    type ShortVideoResource,
} from 'helpers/marketingShortVideoResourceApi';

type Props = {
    shortVideoId: number;
    /** Id resource đã chọn (giữ đúng thứ tự chọn). */
    selectedIds: number[];
    /** Lưu danh sách id đã chọn cho video. */
    onChange: (ids: number[]) => void;
    disabled?: boolean;
};

/** Parse output youtube.thumbnail_resource_ids (JSON array | "1,2,3") → list id. */
export function parseThumbnailResourceIds(raw: unknown): number[] {
    let source: unknown = raw;
    if (typeof raw === 'string') {
        const text = raw.trim();
        if (!text) {
            return [];
        }
        try {
            source = JSON.parse(text);
        } catch {
            source = text.split(',');
        }
    }
    if (!Array.isArray(source)) {
        return [];
    }
    const out: number[] = [];
    source.forEach((value) => {
        const id = Number(value);
        if (Number.isFinite(id) && id > 0 && !out.includes(id)) {
            out.push(id);
        }
    });
    return out;
}

/**
 * Chọn resource (nhân vật/bối cảnh) để đính kèm khi render ảnh thu nhỏ —
 * giữ nhân vật đồng nhất với resource. Danh sách đã chọn chỉ hiển thị title (ảnh
 * được backend đính kèm theo thứ tự khi render).
 */
export default function ShortVideoAgentYoutubeThumbnailResourcePicker({
    shortVideoId,
    selectedIds,
    onChange,
    disabled = false,
}: Props) {
    const [resources, setResources] = React.useState<ShortVideoResource[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [pickerOpen, setPickerOpen] = React.useState(false);
    const [draftIds, setDraftIds] = React.useState<number[]>([]);

    const loadResources = React.useCallback(() => {
        if (!shortVideoId || shortVideoId <= 0) {
            setResources([]);
            return;
        }
        setLoading(true);
        setError(null);
        listShortVideoResources(shortVideoId)
            .then((result) => {
                setLoading(false);
                if (result?.success === false) {
                    setError('Không tải được danh sách resource');
                    setResources([]);
                    return;
                }
                setResources(Array.isArray(result?.resources) ? result.resources : []);
            })
            .catch(() => {
                setLoading(false);
                setError('Không tải được danh sách resource');
            });
    }, [shortVideoId]);

    React.useEffect(() => {
        loadResources();
    }, [loadResources]);

    const openPicker = () => {
        setDraftIds(selectedIds);
        setPickerOpen(true);
        loadResources();
    };

    const toggleDraft = (resourceId: number) => {
        setDraftIds((prev) => (
            prev.includes(resourceId)
                ? prev.filter((id) => id !== resourceId)
                : [...prev, resourceId]
        ));
    };

    const confirmPicker = () => {
        onChange(draftIds);
        setPickerOpen(false);
    };

    const removeSelected = (resourceId: number) => {
        onChange(selectedIds.filter((id) => id !== resourceId));
    };

    const resourceById = React.useMemo(() => {
        const map = new Map<number, ShortVideoResource>();
        resources.forEach((resource) => map.set(resource.id, resource));
        return map;
    }, [resources]);

    const selectedResources = selectedIds
        .map((id) => resourceById.get(id))
        .filter(Boolean) as ShortVideoResource[];

    return (
        <Box
            sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                p: 1.25,
                bgcolor: 'background.paper',
            }}
        >
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={1}
                sx={{ mb: selectedIds.length > 0 ? 1 : 0 }}
            >
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                        RESOURCE ĐÍNH KÈM ({selectedResources.length})
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.4 }}>
                        Chọn nhân vật/bối cảnh để ảnh thu nhỏ đồng nhất với resource khi render.
                    </Typography>
                </Box>
                <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AddPhotoAlternateOutlinedIcon fontSize="small" />}
                    onClick={openPicker}
                    disabled={disabled || !shortVideoId}
                    sx={{ textTransform: 'none', flexShrink: 0 }}
                >
                    Chọn resource
                </Button>
            </Stack>

            {selectedResources.length > 0 ? (
                <Stack spacing={0.5}>
                    {selectedResources.map((resource) => (
                        <Stack
                            key={resource.id}
                            direction="row"
                            spacing={0.75}
                            alignItems="center"
                            sx={{
                                border: 1,
                                borderColor: 'divider',
                                borderRadius: 1,
                                px: 0.75,
                                py: 0.5,
                                bgcolor: 'background.default',
                            }}
                        >
                            <Box
                                sx={{
                                    width: 40,
                                    height: 40,
                                    flexShrink: 0,
                                    borderRadius: 1,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    bgcolor: 'background.paper',
                                }}
                            >
                                {resource.image_url ? (
                                    <Box
                                        component="img"
                                        src={resource.image_url}
                                        alt={resource.title}
                                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <ImageOutlinedIcon fontSize="small" color="disabled" />
                                )}
                            </Box>
                            <Typography
                                variant="body2"
                                sx={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600 }}
                                noWrap
                            >
                                {resource.title || resource.resource_key || `#${resource.id}`}
                            </Typography>
                            {resource.resource_key ? (
                                <Chip
                                    size="small"
                                    variant="outlined"
                                    label={resource.resource_key}
                                    sx={{ height: 18, '& .MuiChip-label': { px: 0.5, fontSize: 10 } }}
                                />
                            ) : null}
                            <Tooltip title="Bỏ chọn">
                                <span>
                                    <IconButton
                                        size="small"
                                        color="error"
                                        disabled={disabled}
                                        onClick={() => removeSelected(resource.id)}
                                        sx={{ p: 0.25 }}
                                    >
                                        <DeleteOutlineOutlinedIcon fontSize="small" />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Stack>
                    ))}
                </Stack>
            ) : null}

            <Dialog open={pickerOpen} onClose={() => setPickerOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle sx={{ pb: 1 }}>
                    Chọn resource
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Đã chọn {draftIds.length} — thứ tự chọn = thứ tự đính kèm ảnh.
                    </Typography>
                </DialogTitle>
                <DialogContent dividers sx={{ maxHeight: 420 }}>
                    {loading ? (
                        <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
                            <CircularProgress size={24} />
                        </Box>
                    ) : null}
                    {!loading && error ? (
                        <Alert severity="error" sx={{ mb: 1 }}>
                            {error}
                        </Alert>
                    ) : null}
                    {!loading && !error && resources.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                            Chưa có resource. Thêm resource ở “Quản lý resource” trước.
                        </Typography>
                    ) : null}
                    {!loading && resources.length > 0 ? (
                        <Stack spacing={0.5}>
                            {resources.map((resource) => {
                                const checked = draftIds.includes(resource.id);
                                return (
                                    <Stack
                                        key={resource.id}
                                        direction="row"
                                        spacing={0.75}
                                        alignItems="center"
                                        onClick={() => toggleDraft(resource.id)}
                                        sx={{
                                            border: 1,
                                            borderColor: checked ? 'primary.main' : 'divider',
                                            borderRadius: 1,
                                            px: 0.75,
                                            py: 0.5,
                                            cursor: 'pointer',
                                            bgcolor: checked ? 'action.selected' : 'background.paper',
                                        }}
                                    >
                                        <Checkbox
                                            size="small"
                                            checked={checked}
                                            onChange={() => toggleDraft(resource.id)}
                                            onClick={(event) => event.stopPropagation()}
                                            sx={{ p: 0.25 }}
                                        />
                                        <Box
                                            sx={{
                                                width: 40,
                                                height: 40,
                                                flexShrink: 0,
                                                borderRadius: 1,
                                                border: '1px solid',
                                                borderColor: 'divider',
                                                overflow: 'hidden',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                bgcolor: 'background.default',
                                            }}
                                        >
                                            {resource.image_url ? (
                                                <Box
                                                    component="img"
                                                    src={resource.image_url}
                                                    alt={resource.title}
                                                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <ImageOutlinedIcon fontSize="small" color="disabled" />
                                            )}
                                        </Box>
                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                            <Typography variant="body2" sx={{ fontSize: 12.5, fontWeight: 600 }} noWrap>
                                                {resource.title || resource.resource_key || `#${resource.id}`}
                                            </Typography>
                                            {resource.prompt && !resource.image_url ? (
                                                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                                                    {resource.prompt}
                                                </Typography>
                                            ) : null}
                                        </Box>
                                        {resource.resource_key ? (
                                            <Chip
                                                size="small"
                                                variant="outlined"
                                                label={resource.resource_key}
                                                sx={{ height: 18, '& .MuiChip-label': { px: 0.5, fontSize: 10 } }}
                                            />
                                        ) : null}
                                    </Stack>
                                );
                            })}
                        </Stack>
                    ) : null}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPickerOpen(false)}>Hủy</Button>
                    <Button variant="contained" onClick={confirmPicker}>
                        Lưu lựa chọn
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
