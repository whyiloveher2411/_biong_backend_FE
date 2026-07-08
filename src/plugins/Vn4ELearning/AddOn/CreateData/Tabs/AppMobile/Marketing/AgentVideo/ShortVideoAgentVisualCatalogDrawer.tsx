import React from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    Divider,
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
import DrawerCustom from 'components/molecules/DrawerCustom';
import {
    searchStockMedia,
    type StockImageSearchItem,
} from 'helpers/marketingStockImageApi';
import type {
    ImportHtmlMarketingPostImage,
    ImportHtmlVisualCatalogItem,
} from './agentVideoApi';

type Props = {
    open: boolean;
    onClose: () => void;
    marketingPostImages: ImportHtmlMarketingPostImage[];
    visualCatalog: ImportHtmlVisualCatalogItem[];
    onAddItem: (item: ImportHtmlVisualCatalogItem) => void;
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

function formatVideoDuration(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds <= 0) {
        return '';
    }
    const total = Math.round(seconds);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
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
                borderRadius: 1,
                overflow: 'hidden',
                border: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
                width: 108,
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
                    height: 72,
                }}
            >
                <img
                    src={image.url}
                    alt={image.caption || 'Ảnh marketing'}
                    loading="lazy"
                    style={{
                        width: '100%',
                        height: 72,
                        objectFit: 'contain',
                        display: 'block',
                    }}
                />
                <Chip
                    label="Marketing"
                    size="small"
                    sx={{
                        position: 'absolute',
                        top: 4,
                        left: 4,
                        height: 18,
                        fontSize: 9,
                        '& .MuiChip-label': { px: 0.5 },
                    }}
                />
            </Box>
            <Box sx={{ p: 0.5 }}>
                <Typography variant="caption" noWrap display="block" title={image.caption || 'Ảnh marketing'} sx={{ fontSize: 10 }}>
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

export default function ShortVideoAgentVisualCatalogDrawer({
    open,
    onClose,
    marketingPostImages,
    visualCatalog,
    onAddItem,
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

    React.useEffect(() => {
        if (!open) {
            setPlayingKey(null);
        }
    }, [open]);

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

    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title="Hình ảnh cho beat HTML"
            width={680}
            ModalProps={{ sx: { zIndex: 1400 } }}
            restDialogContent={{
                sx: {
                    height: 'calc(100vh - 64px)',
                    display: 'flex',
                    flexDirection: 'column',
                    pt: 2,
                    px: 2,
                    pb: 2,
                },
            }}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%', minHeight: 0, mt: 1 }}>
                <Box sx={{ flexShrink: 0 }}>
                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                        Tìm thêm (Pexels)
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField
                            size="small"
                            fullWidth
                            value={query}
                            placeholder="technology abstract..."
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
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
                            sx={{ flexShrink: 0, textTransform: 'none' }}
                        >
                            Tìm
                        </LoadingButton>
                    </Box>
                    {searchError ? (
                        <Alert severity="error" sx={{ py: 0.25, mt: 1 }}>
                            {searchError}
                        </Alert>
                    ) : null}
                </Box>

                <Box sx={{ flex: 1, minHeight: 200, overflow: 'auto' }}>
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
                    ) : null}

                    {searched && !searching && !searchError
                        && imageResults.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                            Không tìm thấy kết quả.
                        </Typography>
                    ) : null}

                    {!searched && !searching ? (
                        <Typography variant="body2" color="text.secondary">
                            Nhập từ khóa và bấm Tìm.
                        </Typography>
                    ) : null}
                </Box>

                <Divider sx={{ flexShrink: 0 }} />

                <Box sx={{ flexShrink: 0 }}>
                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                        Thư viện visual (
                        {marketingPostImages.length}
                        {' '}
                        marketing ·
                        {' '}
                        {visualCatalog.length}
                        {' '}
                        stock)
                    </Typography>
                    {marketingPostImages.length === 0 && visualCatalog.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                            Bấm Thêm ở kết quả tìm kiếm, rồi Lưu hoặc Xong để ghi CMS.
                        </Typography>
                    ) : (
                        <Box
                            sx={{
                                display: 'flex',
                                gap: 1,
                                overflowX: 'auto',
                                overflowY: 'hidden',
                                pb: 0.5,
                                maxHeight: 130,
                            }}
                        >
                            {marketingPostImages.map((img) => (
                                <MarketingThumbCard key={img.url} image={img} />
                            ))}
                            {visualCatalog.map((item, index) => {
                                const cardKey = `catalog-${item.id}-${index}`;
                                const thumbUrl = item.preview_url || item.url;
                                return (
                                    <VisualMediaCard
                                        key={cardKey}
                                        compact
                                        mediaType={item.media_type}
                                        thumbnailUrl={thumbUrl}
                                        mediaUrl={item.url}
                                            title={item.caption || item.title || item.id}
                                        subtitle={
                                            item.media_type === 'video' && item.duration_sec
                                                ? formatVideoDuration(Number(item.duration_sec))
                                                : undefined
                                        }
                                        playing={playingKey === cardKey}
                                        onPlayToggle={() => togglePlaying(cardKey)}
                                        onRemove={() => onRemoveItem(index)}
                                    />
                                );
                            })}
                        </Box>
                    )}
                    {marketingPostImages.length > 0 ? (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            Ảnh marketing tự động đưa vào prompt beat HTML.
                        </Typography>
                    ) : null}
                </Box>

                <Box sx={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                    {dirty ? (
                        <Typography variant="caption" color="warning.main" align="right">
                            Có thay đổi chưa lưu — bấm Lưu hoặc Xong để ghi CMS.
                        </Typography>
                    ) : (
                        <Typography variant="caption" color="text.secondary" align="right">
                            Đã đồng bộ với CMS.
                        </Typography>
                    )}
                    <Box sx={{ display: 'flex', gap: 1 }}>
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
                </Box>
            </Box>
        </DrawerCustom>
    );
}
