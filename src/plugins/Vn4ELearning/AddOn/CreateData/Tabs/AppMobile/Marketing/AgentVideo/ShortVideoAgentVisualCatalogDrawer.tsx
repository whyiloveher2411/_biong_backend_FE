import React from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    IconButton,
    ImageList,
    ImageListItem,
    InputAdornment,
    TextField,
    Typography,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SearchIcon from '@mui/icons-material/Search';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DrawerCustom from 'components/molecules/DrawerCustom';
import {
    searchStockMedia,
    type StockImageSearchItem,
} from 'helpers/marketingStockImageApi';
import { uploadAgentVisualImage, parseApiMessage } from './agentVideoApi';
import type {
    ImportHtmlGithubImageShot,
    ImportHtmlMarketingPostImage,
    ImportHtmlVisualCatalogItem,
} from './agentVideoApi';

type Props = {
    open: boolean;
    onClose: () => void;
    shortVideoId: number;
    marketingPostImages: ImportHtmlMarketingPostImage[];
    visualCatalog: ImportHtmlVisualCatalogItem[];
    githubImageShots?: ImportHtmlGithubImageShot[];
    pastingGithubShotId?: string | null;
    onPasteGithubShot?: (shotId: string) => void;
    onUnlinkGithubShot?: (shotId: string) => void;
    onUpdateGithubShotDescription?: (shotId: string, description: string) => void;
    onAddItem: (item: ImportHtmlVisualCatalogItem) => void;
    onUpdateItem: (index: number, partial: Partial<ImportHtmlVisualCatalogItem>) => void;
    onRemoveItem: (index: number) => void;
    onSave: () => void | Promise<void>;
    saving?: boolean;
    dirty?: boolean;
};

type VisualMediaCardProps = {
    mediaType: 'image' | 'video';
    thumbnailUrl: string;
    mediaUrl: string;
    title: string;
    subtitle?: string;
    added?: boolean;
    playing: boolean;
    compact?: boolean;
    onPlayToggle?: () => void;
    onAdd?: () => void;
    onRemove?: () => void;
};

function PexelsBadge() {
    return (
        <Box
            component="span"
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                px: 0.75,
                py: 0.25,
                borderRadius: 1,
                bgcolor: 'rgba(5, 151, 104, 0.12)',
                color: '#059768',
                fontSize: 11,
                fontWeight: 600,
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
            }}
        >
            Pexels
        </Box>
    );
}

function DrawerSection({
    title,
    subtitle,
    children,
    sx,
}: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    sx?: object;
}) {
    return (
        <Box sx={sx}>
            <Typography variant="subtitle2" sx={{ mb: subtitle ? 0.25 : 0.75, fontWeight: 600 }}>
                {title}
            </Typography>
            {subtitle ? (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    {subtitle}
                </Typography>
            ) : null}
            {children}
        </Box>
    );
}

function LibraryCountChips({
    marketing,
    upload,
    stock,
}: {
    marketing: number;
    upload: number;
    stock: number;
}) {
    const chips = [
        { label: `${marketing} marketing`, show: marketing > 0 },
        { label: `${upload} upload`, show: upload > 0 },
        { label: `${stock} stock`, show: stock > 0 },
    ].filter((item) => item.show);

    if (chips.length === 0) {
        return (
            <Typography variant="caption" color="text.secondary">
                Chưa có ảnh
            </Typography>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {chips.map((chip) => (
                <Chip key={chip.label} label={chip.label} size="small" variant="outlined" sx={{ height: 22 }} />
            ))}
        </Box>
    );
}

function SourceBadge({ source }: { source: 'user_upload' | 'stock' | 'marketing_post' }) {
    const config = {
        user_upload: { label: 'Upload', bgcolor: 'rgba(25, 118, 210, 0.12)', color: '#1976d2' },
        stock: { label: 'Pexels', bgcolor: 'rgba(5, 151, 104, 0.12)', color: '#059768' },
        marketing_post: { label: 'Marketing', bgcolor: 'rgba(0, 0, 0, 0.08)', color: 'text.secondary' },
    }[source];

    return (
        <Box
            component="span"
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                px: 0.75,
                py: 0.25,
                borderRadius: 1,
                bgcolor: config.bgcolor,
                color: config.color,
                fontSize: 10,
                fontWeight: 600,
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
            }}
        >
            {config.label}
        </Box>
    );
}

function CatalogLibraryCard({
    item,
    playing,
    onPlayToggle,
    onCaptionChange,
    onRemove,
}: {
    item: ImportHtmlVisualCatalogItem;
    playing: boolean;
    onPlayToggle?: () => void;
    onCaptionChange: (caption: string) => void;
    onRemove: () => void;
}) {
    const [captionDraft, setCaptionDraft] = React.useState(String(item.caption || item.title || ''));
    const videoRef = React.useRef<HTMLVideoElement | null>(null);
    const thumbUrl = item.preview_url || item.url;
    const source = item.source === 'user_upload' ? 'user_upload' : 'stock';

    React.useEffect(() => {
        setCaptionDraft(String(item.caption || item.title || ''));
    }, [item.caption, item.title]);

    React.useEffect(() => {
        if (!playing && videoRef.current) {
            videoRef.current.pause();
        }
    }, [playing]);

    const commitCaption = () => {
        const next = captionDraft.trim();
        if (next !== String(item.caption || '').trim()) {
            onCaptionChange(next);
        }
    };

    return (
        <Box
            sx={{
                borderRadius: 1.5,
                overflow: 'hidden',
                border: 1,
                borderColor: playing ? 'primary.main' : 'divider',
                bgcolor: 'background.paper',
                width: 132,
                flexShrink: 0,
            }}
        >
            <Box
                sx={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'grey.50',
                    height: 80,
                    cursor: item.media_type === 'video' && !playing ? 'pointer' : 'default',
                }}
                onClick={item.media_type === 'video' && !playing ? onPlayToggle : undefined}
            >
                {item.media_type === 'video' && playing ? (
                    <video
                        ref={videoRef}
                        src={item.url}
                        autoPlay
                        controls
                        muted
                        playsInline
                        onClick={(event) => event.stopPropagation()}
                        onEnded={onPlayToggle}
                        style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }}
                    />
                ) : (
                    <img
                        src={thumbUrl}
                        alt={item.caption || item.title || item.id}
                        loading="lazy"
                        style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }}
                    />
                )}
                <Box sx={{ position: 'absolute', top: 4, left: 4 }}>
                    <SourceBadge source={source} />
                </Box>
                <IconButton
                    size="small"
                    onClick={(event) => {
                        event.stopPropagation();
                        onRemove();
                    }}
                    aria-label="Xóa"
                    sx={{
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        bgcolor: 'rgba(255,255,255,0.92)',
                        '&:hover': { bgcolor: '#fff' },
                        p: 0.25,
                    }}
                >
                    <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                </IconButton>
            </Box>
            <Box sx={{ p: 0.75 }}>
                <TextField
                    size="small"
                    fullWidth
                    value={captionDraft}
                    placeholder="Mô tả (tuỳ chọn)"
                    onChange={(e) => setCaptionDraft(e.target.value)}
                    onBlur={commitCaption}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            commitCaption();
                        }
                    }}
                    sx={{
                        '& .MuiInputBase-input': { fontSize: 11, py: 0.75 },
                    }}
                />
            </Box>
        </Box>
    );
}

function VisualMediaCard({
    mediaType,
    thumbnailUrl,
    mediaUrl,
    title,
    subtitle,
    added = false,
    playing,
    compact = false,
    onPlayToggle,
    onAdd,
    onRemove,
}: VisualMediaCardProps) {
    const videoRef = React.useRef<HTMLVideoElement | null>(null);
    const isVideo = mediaType === 'video';
    const thumbMaxHeight = compact ? 72 : 200;

    React.useEffect(() => {
        if (!playing && videoRef.current) {
            videoRef.current.pause();
        }
    }, [playing]);

    const handleThumbClick = () => {
        if (isVideo && onPlayToggle) {
            onPlayToggle();
        }
    };

    const handleAddClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        onAdd?.();
    };

    const handleRemoveClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        onRemove?.();
    };

    return (
        <Box
            sx={{
                borderRadius: 1,
                overflow: 'hidden',
                border: 1,
                borderColor: playing ? 'primary.main' : 'divider',
                bgcolor: 'background.paper',
                width: compact ? 108 : '100%',
                flexShrink: 0,
            }}
        >
            <Box
                sx={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'grey.100',
                    cursor: isVideo && !playing ? 'pointer' : 'default',
                    height: compact ? 72 : undefined,
                }}
                onClick={isVideo && !playing ? handleThumbClick : undefined}
            >
                {isVideo && playing ? (
                    <video
                        ref={videoRef}
                        src={mediaUrl}
                        autoPlay
                        controls
                        muted
                        playsInline
                        onClick={(event) => event.stopPropagation()}
                        onEnded={onPlayToggle}
                        style={{
                            width: '100%',
                            height: compact ? 72 : 'auto',
                            maxHeight: thumbMaxHeight,
                            objectFit: 'contain',
                            display: 'block',
                        }}
                    />
                ) : (
                    <>
                        <img
                            src={thumbnailUrl}
                            alt={title}
                            loading="lazy"
                            style={{
                                width: '100%',
                                height: compact ? 72 : 'auto',
                                maxHeight: thumbMaxHeight,
                                objectFit: 'contain',
                                display: 'block',
                            }}
                        />
                        {isVideo ? (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    bgcolor: 'rgba(0,0,0,0.15)',
                                    '&:hover': { bgcolor: 'rgba(0,0,0,0.28)' },
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: '50%',
                                        bgcolor: 'rgba(0,0,0,0.55)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#fff',
                                    }}
                                >
                                    <PlayArrowIcon />
                                </Box>
                            </Box>
                        ) : null}
                        {isVideo && subtitle ? (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    right: 6,
                                    bottom: 6,
                                    px: 0.5,
                                    py: 0.25,
                                    borderRadius: 0.5,
                                    bgcolor: 'rgba(0,0,0,0.65)',
                                    color: '#fff',
                                    fontSize: 10,
                                    fontWeight: 600,
                                    lineHeight: 1.2,
                                }}
                            >
                                {subtitle}
                            </Box>
                        ) : null}
                    </>
                )}
            </Box>
            <Box
                sx={{
                    p: compact ? 0.5 : 0.75,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 0.5,
                }}
            >
                {!compact ? (
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="caption" noWrap display="block" title={title}>
                            {title}
                        </Typography>
                        {!isVideo && subtitle ? (
                            <Typography variant="caption" color="text.secondary" noWrap display="block">
                                {subtitle}
                            </Typography>
                        ) : null}
                    </Box>
                ) : (
                    <Typography
                        variant="caption"
                        noWrap
                        title={title}
                        sx={{ flex: 1, minWidth: 0, fontSize: 10 }}
                    >
                        {title}
                    </Typography>
                )}
                {onRemove ? (
                    <IconButton
                        size="small"
                        onClick={handleRemoveClick}
                        aria-label="Xóa"
                        sx={compact ? { p: 0.25 } : undefined}
                    >
                        <DeleteOutlineIcon sx={{ fontSize: compact ? 14 : 18 }} />
                    </IconButton>
                ) : null}
                {onAdd ? (
                    <Button
                        type="button"
                        size="small"
                        disabled={added}
                        onClick={handleAddClick}
                        sx={{ textTransform: 'none', flexShrink: 0, minWidth: compact ? 48 : undefined }}
                    >
                        {added ? 'Đã thêm' : 'Thêm'}
                    </Button>
                ) : null}
            </Box>
        </Box>
    );
}

function MarketingThumbCard({ image }: { image: ImportHtmlMarketingPostImage }) {
    return (
        <Box
            sx={{
                borderRadius: 1.5,
                overflow: 'hidden',
                border: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
                width: 132,
                flexShrink: 0,
            }}
        >
            <Box
                sx={{
                    position: 'relative',
                    bgcolor: 'grey.50',
                    height: 80,
                }}
            >
                <img
                    src={image.url}
                    alt={image.caption || 'Ảnh marketing'}
                    loading="lazy"
                    style={{
                        width: '100%',
                        height: 80,
                        objectFit: 'cover',
                        display: 'block',
                    }}
                />
                <Box sx={{ position: 'absolute', top: 4, left: 4 }}>
                    <SourceBadge source="marketing_post" />
                </Box>
            </Box>
            <Box sx={{ px: 0.75, py: 0.5 }}>
                <Typography
                    variant="caption"
                    noWrap
                    display="block"
                    title={image.caption || 'Ảnh marketing'}
                    sx={{ fontSize: 11, color: 'text.secondary' }}
                >
                    {image.caption || 'Ảnh marketing'}
                </Typography>
            </Box>
        </Box>
    );
}

function buildStockVisualCaption(options: {
    mediaType: 'image' | 'video';
    alt?: string;
    creator?: string;
    searchQuery?: string;
}): string {
    const alt = String(options.alt || '').trim();
    if (alt) {
        return alt;
    }
    const searchQuery = String(options.searchQuery || '').trim();
    const creator = String(options.creator || '').trim();
    if (searchQuery && creator) {
        return `${searchQuery} — ${creator}`;
    }
    if (searchQuery) {
        return searchQuery;
    }
    if (creator) {
        return creator;
    }
    return options.mediaType === 'video' ? 'Stock video Pexels' : 'Stock image Pexels';
}

function stockImageToCatalogItem(
    item: StockImageSearchItem,
    index: number,
    searchQuery: string,
): ImportHtmlVisualCatalogItem {
    const creator = item.photographer || 'Pexels';
    const caption = buildStockVisualCaption({
        mediaType: 'image',
        alt: item.alt,
        creator,
        searchQuery,
    });
    return {
        id: `vis-img-${item.id || index + 1}`,
        media_type: 'image',
        url: item.url,
        preview_url: item.preview_url || item.url,
        title: caption,
        caption,
        search_query: searchQuery.trim() || undefined,
        provider: 'pexels',
        source: 'stock',
    };
}

function extractImageFileFromClipboard(clipboardData: DataTransfer | null): File | null {
    if (!clipboardData?.items?.length) {
        return null;
    }
    for (let index = 0; index < clipboardData.items.length; index += 1) {
        const item = clipboardData.items[index];
        if (item.kind !== 'file' || !item.type.startsWith('image/')) {
            continue;
        }
        const file = item.getAsFile();
        if (file) {
            return file;
        }
    }
    return null;
}

function normalizeClipboardImageFile(file: File): File {
    if (file.name && file.name.trim() !== '') {
        return file;
    }
    const ext = file.type === 'image/png'
        ? 'png'
        : file.type === 'image/webp'
            ? 'webp'
            : 'jpg';
    return new File([file], `clipboard-${Date.now()}.${ext}`, { type: file.type || 'image/png' });
}

export default function ShortVideoAgentVisualCatalogDrawer({
    open,
    onClose,
    shortVideoId,
    marketingPostImages,
    visualCatalog,
    githubImageShots = [],
    pastingGithubShotId = null,
    onPasteGithubShot,
    onUnlinkGithubShot,
    onUpdateGithubShotDescription,
    onAddItem,
    onUpdateItem,
    onRemoveItem,
    onSave,
    saving = false,
    dirty = false,
}: Props) {
    const [query, setQuery] = React.useState('');
    const [imageResults, setImageResults] = React.useState<StockImageSearchItem[]>([]);
    const [searching, setSearching] = React.useState(false);
    const [searchError, setSearchError] = React.useState('');
    const [searched, setSearched] = React.useState(false);
    const [playingKey, setPlayingKey] = React.useState<string | null>(null);
    const [uploadCaption, setUploadCaption] = React.useState('');
    const [uploading, setUploading] = React.useState(false);
    const [uploadError, setUploadError] = React.useState('');
    const [uploadPreviewUrl, setUploadPreviewUrl] = React.useState('');
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    const uploadCount = React.useMemo(
        () => visualCatalog.filter((item) => item.source === 'user_upload').length,
        [visualCatalog],
    );
    const stockCount = React.useMemo(
        () => visualCatalog.filter((item) => item.source !== 'user_upload').length,
        [visualCatalog],
    );

    React.useEffect(() => {
        if (!open) {
            setPlayingKey(null);
            setUploadError('');
            setUploadPreviewUrl('');
        }
    }, [open]);

    React.useEffect(() => () => {
        if (uploadPreviewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(uploadPreviewUrl);
        }
    }, [uploadPreviewUrl]);

    const togglePlaying = React.useCallback((key: string) => {
        setPlayingKey((current) => (current === key ? null : key));
    }, []);

    const catalogUrls = React.useMemo(
        () => new Set(visualCatalog.map((item) => item.url)),
        [visualCatalog],
    );

    const runSearch = React.useCallback(async () => {
        const trimmed = query.trim();
        if (!trimmed) {
            setSearchError('Cần nhập từ khóa tìm kiếm');
            return;
        }
        setSearching(true);
        setSearchError('');
        try {
            const result = await searchStockMedia({
                mediaType: 'image',
                query: trimmed,
                perPage: 12,
            });
            setImageResults((result.items ?? []) as StockImageSearchItem[]);
            setSearched(true);
        } catch (err) {
            setImageResults([]);
            setSearched(true);
            setSearchError(err instanceof Error ? err.message : 'Tìm kiếm thất bại');
        } finally {
            setSearching(false);
        }
    }, [query]);

    const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            void runSearch();
        }
    };

    const handlePickUploadFile = () => {
        fileInputRef.current?.click();
    };

    const uploadVisualImageFile = React.useCallback(async (file: File) => {
        if (!shortVideoId) {
            setUploadError('Thiếu short video id');
            return;
        }

        const caption = uploadCaption.trim();
        const localPreview = URL.createObjectURL(file);
        setUploadPreviewUrl((prev) => {
            if (prev.startsWith('blob:')) {
                URL.revokeObjectURL(prev);
            }
            return localPreview;
        });
        setUploading(true);
        setUploadError('');
        try {
            const res = await uploadAgentVisualImage(shortVideoId, file);
            if (!res?.success) {
                throw new Error(parseApiMessage(res?.message) || 'Upload ảnh thất bại');
            }
            const url = String(res.url || '').trim();
            if (!url) {
                throw new Error('Server không trả URL ảnh');
            }
            const previewUrl = String(res.preview_url || url).trim() || url;
            const nextId = `vis-upload-${Date.now()}`;
            onAddItem({
                id: nextId,
                media_type: 'image',
                url,
                preview_url: previewUrl,
                title: caption || 'Ảnh upload',
                caption,
                provider: 'upload',
                source: 'user_upload',
            });
            setUploadPreviewUrl((prev) => {
                if (prev.startsWith('blob:')) {
                    URL.revokeObjectURL(prev);
                }
                return '';
            });
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : 'Upload ảnh thất bại');
        } finally {
            setUploading(false);
        }
    }, [onAddItem, shortVideoId, uploadCaption]);

    const handleUploadFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) {
            return;
        }
        await uploadVisualImageFile(file);
    };

    React.useEffect(() => {
        if (!open) {
            return undefined;
        }

        const onPaste = (event: Event) => {
            if (!(event instanceof ClipboardEvent) || uploading) {
                return;
            }
            const imageFile = extractImageFileFromClipboard(event.clipboardData);
            if (!imageFile) {
                return;
            }
            event.preventDefault();
            void uploadVisualImageFile(normalizeClipboardImageFile(imageFile));
        };

        window.addEventListener('paste', onPaste);
        return () => {
            window.removeEventListener('paste', onPaste);
        };
    }, [open, uploadVisualImageFile, uploading]);

    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title="Hình ảnh cho beat HTML"
            width={680}
            ModalProps={{ sx: { zIndex: 1400 } }}
            restDialogContent={{
                sx: {
                    height: 'calc(100vh - 136px)',
                    overflow: 'auto',
                    pt: 2,
                    px: 2,
                    pb: 2,
                },
            }}
            action={(
                <Box
                    sx={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 1,
                        flexWrap: 'wrap',
                    }}
                >
                    {dirty ? (
                        <Typography variant="caption" color="warning.main" sx={{ mr: 'auto' }}>
                            Có thay đổi chưa lưu
                        </Typography>
                    ) : (
                        <Typography variant="caption" color="text.secondary" sx={{ mr: 'auto' }}>
                            Đã đồng bộ CMS
                        </Typography>
                    )}
                    <LoadingButton
                        type="button"
                        variant="outlined"
                        loading={saving}
                        disabled={!dirty}
                        onClick={() => { void onSave(); }}
                        sx={{ textTransform: 'none' }}
                    >
                        Lưu
                    </LoadingButton>
                    <Button type="button" variant="contained" onClick={onClose} sx={{ textTransform: 'none' }}>
                        Xong
                    </Button>
                </Box>
            )}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 0.5 }}>
                {githubImageShots.length > 0 ? (
                    <DrawerSection
                        title="Ảnh GitHub cần chuẩn bị"
                        subtitle={`${githubImageShots.filter((s) => Boolean(s.visual_catalog_id)).length}/${githubImageShots.length} đã gắn ảnh — Paste từ clipboard sau khi copy ảnh`}
                    >
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                            {githubImageShots.map((shot) => {
                                const linkedItem = shot.visual_catalog_id
                                    ? visualCatalog.find((item) => item.id === shot.visual_catalog_id)
                                    : undefined;
                                const pasting = pastingGithubShotId === shot.id;
                                return (
                                    <Box
                                        key={shot.id}
                                        sx={{
                                            border: 1,
                                            borderColor: 'divider',
                                            borderRadius: 1.5,
                                            p: 1.25,
                                            display: 'flex',
                                            gap: 1.25,
                                            alignItems: 'flex-start',
                                        }}
                                    >
                                        {linkedItem ? (
                                            <Box
                                                component="img"
                                                src={linkedItem.preview_url || linkedItem.url}
                                                alt={shot.description}
                                                sx={{
                                                    width: 56,
                                                    height: 56,
                                                    objectFit: 'cover',
                                                    borderRadius: 1,
                                                    flexShrink: 0,
                                                    bgcolor: 'grey.100',
                                                }}
                                            />
                                        ) : (
                                            <Box
                                                sx={{
                                                    width: 56,
                                                    height: 56,
                                                    borderRadius: 1,
                                                    flexShrink: 0,
                                                    bgcolor: 'grey.100',
                                                    border: 1,
                                                    borderColor: 'divider',
                                                    borderStyle: 'dashed',
                                                }}
                                            />
                                        )}
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            {onUpdateGithubShotDescription ? (
                                                <TextField
                                                    size="small"
                                                    fullWidth
                                                    multiline
                                                    minRows={1}
                                                    maxRows={3}
                                                    value={shot.description}
                                                    onChange={(e) => onUpdateGithubShotDescription(shot.id, e.target.value)}
                                                    sx={{ mb: 0.75 }}
                                                />
                                            ) : (
                                                <Typography variant="body2" sx={{ mb: 0.75 }}>
                                                    {shot.description}
                                                </Typography>
                                            )}
                                            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                                                {!linkedItem && onPasteGithubShot ? (
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        disabled={pasting || saving}
                                                        onClick={() => onPasteGithubShot(shot.id)}
                                                        sx={{ textTransform: 'none' }}
                                                    >
                                                        {pasting ? 'Đang dán...' : 'Paste từ clipboard'}
                                                    </Button>
                                                ) : null}
                                                {linkedItem && onUnlinkGithubShot ? (
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        color="inherit"
                                                        disabled={saving}
                                                        onClick={() => onUnlinkGithubShot(shot.id)}
                                                        sx={{ textTransform: 'none' }}
                                                    >
                                                        Bỏ gắn ảnh
                                                    </Button>
                                                ) : null}
                                                <Chip
                                                    size="small"
                                                    label={linkedItem ? 'Đã có ảnh' : 'Chưa có ảnh'}
                                                    color={linkedItem ? 'success' : 'default'}
                                                    variant={linkedItem ? 'filled' : 'outlined'}
                                                />
                                            </Box>
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>
                    </DrawerSection>
                ) : null}

                <DrawerSection
                    title="Thư viện visual"
                    subtitle="Ảnh upload được ưu tiên khi sinh beat — có thể thêm mô tả sau"
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1 }}>
                        <LibraryCountChips
                            marketing={marketingPostImages.length}
                            upload={uploadCount}
                            stock={stockCount}
                        />
                    </Box>
                    {marketingPostImages.length === 0 && visualCatalog.length === 0 ? (
                        <Box
                            sx={{
                                py: 2,
                                px: 1.5,
                                borderRadius: 1.5,
                                border: 1,
                                borderColor: 'divider',
                                borderStyle: 'dashed',
                                bgcolor: 'grey.50',
                                textAlign: 'center',
                            }}
                        >
                            <Typography variant="body2" color="text.secondary">
                                Chưa có ảnh — thêm bên dưới rồi Lưu để ghi CMS
                            </Typography>
                        </Box>
                    ) : (
                        <Box
                            sx={{
                                display: 'flex',
                                gap: 1,
                                overflowX: 'auto',
                                overflowY: 'hidden',
                                pb: 0.5,
                            }}
                        >
                            {marketingPostImages.map((img) => (
                                <MarketingThumbCard key={img.url} image={img} />
                            ))}
                            {visualCatalog.map((item, index) => {
                                const cardKey = `catalog-${item.id}-${index}`;
                                return (
                                    <CatalogLibraryCard
                                        key={cardKey}
                                        item={item}
                                        playing={playingKey === cardKey}
                                        onPlayToggle={() => togglePlaying(cardKey)}
                                        onCaptionChange={(caption) => onUpdateItem(index, {
                                            caption,
                                            title: caption || item.title || 'Ảnh upload',
                                        })}
                                        onRemove={() => onRemoveItem(index)}
                                    />
                                );
                            })}
                        </Box>
                    )}
                </DrawerSection>

                <DrawerSection title="Thêm ảnh">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        hidden
                        onChange={(e) => { void handleUploadFileChange(e); }}
                    />
                    <Box
                        role="button"
                        tabIndex={0}
                        onClick={uploading ? undefined : handlePickUploadFile}
                        onKeyDown={(event) => {
                            if (uploading) {
                                return;
                            }
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                handlePickUploadFile();
                            }
                        }}
                        sx={{
                            borderRadius: 1.5,
                            border: 1,
                            borderColor: uploadError ? 'error.light' : 'divider',
                            borderStyle: 'dashed',
                            bgcolor: uploading ? 'action.hover' : 'grey.50',
                            px: 2,
                            py: 1.75,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            cursor: uploading ? 'default' : 'pointer',
                            transition: 'border-color 0.15s, background-color 0.15s',
                            '&:hover': uploading ? undefined : {
                                borderColor: 'primary.light',
                                bgcolor: 'action.hover',
                            },
                        }}
                    >
                        {uploadPreviewUrl ? (
                            <Box
                                component="img"
                                src={uploadPreviewUrl}
                                alt="Đang upload"
                                sx={{
                                    width: 52,
                                    height: 52,
                                    objectFit: 'cover',
                                    borderRadius: 1,
                                    flexShrink: 0,
                                }}
                            />
                        ) : (
                            <Box
                                sx={{
                                    width: 52,
                                    height: 52,
                                    borderRadius: 1,
                                    bgcolor: 'background.paper',
                                    border: 1,
                                    borderColor: 'divider',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}
                            >
                                <CloudUploadIcon color="action" />
                            </Box>
                        )}
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography variant="body2" fontWeight={600}>
                                {uploading ? 'Đang upload...' : 'Chọn file hoặc dán ảnh'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                                JPG, PNG, WebP, GIF · tối đa 20MB · ⌘V / Ctrl+V khi drawer đang mở
                            </Typography>
                        </Box>
                        <LoadingButton
                            variant="outlined"
                            size="small"
                            loading={uploading}
                            onClick={(event) => {
                                event.stopPropagation();
                                handlePickUploadFile();
                            }}
                            sx={{ textTransform: 'none', flexShrink: 0 }}
                        >
                            Chọn file
                        </LoadingButton>
                    </Box>
                    <TextField
                        size="small"
                        fullWidth
                        value={uploadCaption}
                        placeholder="Mô tả tuỳ chọn — giúp prompt chọn ảnh đúng beat"
                        onChange={(e) => setUploadCaption(e.target.value)}
                        sx={{ mt: 1 }}
                    />
                    {uploadError ? (
                        <Alert severity="error" sx={{ py: 0, mt: 1 }}>
                            {uploadError}
                        </Alert>
                    ) : null}
                </DrawerSection>

                <DrawerSection
                    title="Tìm stock Pexels"
                    subtitle="Bổ sung ảnh minh hoạ khi cần"
                >
                    <Box sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                        <TextField
                            size="small"
                            value={query}
                            placeholder="technology abstract..."
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            sx={{ flex: 1, minWidth: 0 }}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end" sx={{ ml: 0.5 }}>
                                        <PexelsBadge />
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <LoadingButton
                            variant="contained"
                            loading={searching}
                            onClick={() => { void runSearch(); }}
                            startIcon={<SearchIcon />}
                            sx={{ flexShrink: 0, textTransform: 'none', whiteSpace: 'nowrap' }}
                        >
                            Tìm
                        </LoadingButton>
                    </Box>
                    {searchError ? (
                        <Alert severity="error" sx={{ py: 0, mb: 1 }}>
                            {searchError}
                        </Alert>
                    ) : null}
                    <Box sx={{ minHeight: 120 }}>
                        {imageResults.length > 0 ? (
                            <ImageList variant="masonry" cols={2} gap={8}>
                                {imageResults.map((item, index) => {
                                    const catalogItem = stockImageToCatalogItem(item, index, query);
                                    const cardKey = `search-img-${item.id}-${index}`;
                                    const added = catalogUrls.has(catalogItem.url);
                                    return (
                                        <ImageListItem key={cardKey} sx={{ display: 'block' }}>
                                            <VisualMediaCard
                                                mediaType="image"
                                                thumbnailUrl={item.preview_url}
                                                mediaUrl={item.url}
                                                title={item.photographer || 'Pexels'}
                                                added={added}
                                                playing={false}
                                                onAdd={() => onAddItem(catalogItem)}
                                            />
                                        </ImageListItem>
                                    );
                                })}
                            </ImageList>
                        ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                                {searched && !searching && !searchError
                                    ? 'Không tìm thấy kết quả.'
                                    : 'Nhập từ khóa tiếng Anh và bấm Tìm.'}
                            </Typography>
                        )}
                    </Box>
                </DrawerSection>
            </Box>
        </DrawerCustom>
    );
}
