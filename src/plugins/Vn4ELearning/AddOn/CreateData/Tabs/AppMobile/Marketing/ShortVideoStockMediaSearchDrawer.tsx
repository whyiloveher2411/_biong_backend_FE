import React from 'react';
import {
    Alert,
    Box,
    ImageList,
    ImageListItem,
    ImageListItemBar,
    InputAdornment,
    TextField,
    Typography,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SearchIcon from '@mui/icons-material/Search';
import DrawerCustom from 'components/molecules/DrawerCustom';
import {
    searchStockMedia,
    type StockImageSearchItem,
    type StockMediaProvider,
    type StockMediaType,
    type StockVideoSearchItem,
} from 'helpers/marketingStockImageApi';

type Props = {
    open: boolean;
    onClose: () => void;
    mediaType?: StockMediaType;
    onSelectImage?: (url: string, item: StockImageSearchItem) => void;
    onSelectVideo?: (url: string, item: StockVideoSearchItem) => void;
    /** @deprecated Dùng onSelectImage */
    onSelect?: (url: string, item: StockImageSearchItem) => void;
    initialQuery?: string;
};

const ACTIVE_PROVIDER: StockMediaProvider = 'pexels';

function PexelsProviderBadge() {
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
                fontWeight: 700,
                letterSpacing: 0.2,
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
            }}
        >
            Pexels
        </Box>
    );
}

function formatDuration(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds <= 0) {
        return '';
    }
    const total = Math.round(seconds);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
}

export default function ShortVideoStockMediaSearchDrawer({
    open,
    onClose,
    mediaType = 'image',
    onSelectImage,
    onSelectVideo,
    onSelect,
    initialQuery = '',
}: Props) {
    const isVideo = mediaType === 'video';
    const [query, setQuery] = React.useState(initialQuery);
    const [imageItems, setImageItems] = React.useState<StockImageSearchItem[]>([]);
    const [videoItems, setVideoItems] = React.useState<StockVideoSearchItem[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [searched, setSearched] = React.useState(false);
    const [totalResults, setTotalResults] = React.useState(0);

    React.useEffect(() => {
        if (!open) {
            return;
        }
        setQuery(initialQuery);
        setImageItems([]);
        setVideoItems([]);
        setError('');
        setSearched(false);
        setTotalResults(0);
    }, [initialQuery, open, mediaType]);

    const runSearch = React.useCallback(async () => {
        const trimmed = query.trim();
        if (!trimmed) {
            setError('Cần nhập từ khóa tìm kiếm');
            setImageItems([]);
            setVideoItems([]);
            setSearched(false);
            return;
        }

        setLoading(true);
        setError('');
        try {
            const result = await searchStockMedia({
                mediaType,
                provider: ACTIVE_PROVIDER,
                query: trimmed,
            });
            if (isVideo) {
                setVideoItems((result.items ?? []) as StockVideoSearchItem[]);
                setImageItems([]);
            } else {
                setImageItems((result.items ?? []) as StockImageSearchItem[]);
                setVideoItems([]);
            }
            setTotalResults(result.total_results ?? result.items?.length ?? 0);
            setSearched(true);
        } catch (err) {
            setImageItems([]);
            setVideoItems([]);
            setTotalResults(0);
            setSearched(true);
            setError(err instanceof Error ? err.message : (isVideo ? 'Tìm video thất bại' : 'Tìm ảnh thất bại'));
        } finally {
            setLoading(false);
        }
    }, [isVideo, mediaType, query]);

    const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            void runSearch();
        }
    };

    const handleSelectImage = (item: StockImageSearchItem) => {
        if (onSelectImage) {
            onSelectImage(item.url, item);
        } else if (onSelect) {
            onSelect(item.url, item);
        }
        onClose();
    };

    const handleSelectVideo = (item: StockVideoSearchItem) => {
        onSelectVideo?.(item.url, item);
        onClose();
    };

    const itemCount = isVideo ? videoItems.length : imageItems.length;

    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title={isVideo ? 'Tìm video stock' : 'Tìm ảnh stock'}
            width={840}
            ModalProps={{
                sx: { zIndex: 1400 },
            }}
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
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    height: '100%',
                    minHeight: 0,
                    mt: 2,
                }}
            >
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                    <TextField
                        size="small"
                        fullWidth
                        value={query}
                        placeholder={isVideo ? 'Nhập từ khóa tìm video...' : 'Nhập từ khóa tìm ảnh...'}
                        onChange={(event) => setQuery(event.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <PexelsProviderBadge />
                                </InputAdornment>
                            ),
                        }}
                    />
                    <LoadingButton
                        variant="contained"
                        loading={loading}
                        onClick={() => void runSearch()}
                        startIcon={<SearchIcon />}
                        sx={{ flexShrink: 0, textTransform: 'none' }}
                    >
                        Tìm kiếm
                    </LoadingButton>
                </Box>

                {error ? (
                    <Alert severity="error" sx={{ py: 0.5 }}>
                        {error}
                    </Alert>
                ) : null}

                {searched && !loading && !error && itemCount === 0 ? (
                    <Alert severity="info" sx={{ py: 0.5 }}>
                        {isVideo ? 'Không tìm thấy video phù hợp' : 'Không tìm thấy ảnh phù hợp'}
                    </Alert>
                ) : null}

                {searched && itemCount > 0 ? (
                    <Typography variant="caption" color="text.secondary">
                        {totalResults} kết quả — chọn {isVideo ? 'video' : 'ảnh'} để dùng
                    </Typography>
                ) : null}

                <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                    {!isVideo && imageItems.length > 0 ? (
                        <ImageList variant="masonry" cols={3} gap={8}>
                            {imageItems.map((item) => (
                                <ImageListItem
                                    key={`${item.provider}-${item.id}`}
                                    sx={{
                                        cursor: 'pointer',
                                        borderRadius: 1,
                                        overflow: 'hidden',
                                        border: 1,
                                        borderColor: 'divider',
                                        '&:hover': {
                                            borderColor: 'primary.main',
                                            boxShadow: 2,
                                        },
                                    }}
                                    onClick={() => handleSelectImage(item)}
                                >
                                    <img
                                        src={item.preview_url}
                                        alt={item.photographer || 'Ảnh stock'}
                                        loading="lazy"
                                        style={{
                                            display: 'block',
                                            width: '100%',
                                            height: 'auto',
                                        }}
                                    />
                                    {item.photographer ? (
                                        <ImageListItemBar
                                            title={item.photographer}
                                            sx={{
                                                '& .MuiImageListItemBar-title': {
                                                    fontSize: 11,
                                                },
                                            }}
                                        />
                                    ) : null}
                                </ImageListItem>
                            ))}
                        </ImageList>
                    ) : null}

                    {isVideo && videoItems.length > 0 ? (
                        <ImageList variant="masonry" cols={2} gap={8}>
                            {videoItems.map((item) => (
                                <ImageListItem
                                    key={`${item.provider}-${item.id}`}
                                    sx={{
                                        cursor: 'pointer',
                                        borderRadius: 1,
                                        overflow: 'hidden',
                                        border: 1,
                                        borderColor: 'divider',
                                        position: 'relative',
                                        '&:hover': {
                                            borderColor: 'primary.main',
                                            boxShadow: 2,
                                        },
                                    }}
                                    onClick={() => handleSelectVideo(item)}
                                >
                                    <img
                                        src={item.preview_url}
                                        alt={item.user || 'Video stock'}
                                        loading="lazy"
                                        style={{
                                            display: 'block',
                                            width: '100%',
                                            height: 'auto',
                                        }}
                                    />
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            inset: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            pointerEvents: 'none',
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                width: 44,
                                                height: 44,
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
                                    <ImageListItemBar
                                        title={item.user || 'Video Pexels'}
                                        subtitle={formatDuration(item.duration)}
                                        sx={{
                                            '& .MuiImageListItemBar-title': {
                                                fontSize: 11,
                                            },
                                            '& .MuiImageListItemBar-subtitle': {
                                                fontSize: 10,
                                            },
                                        }}
                                    />
                                </ImageListItem>
                            ))}
                        </ImageList>
                    ) : null}
                </Box>

                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.45 }}>
                    {isVideo
                        ? 'Video do Pexels cung cấp — cần ghi credit creator khi xuất bản công khai.'
                        : 'Ảnh do Pexels cung cấp — cần ghi credit photographer khi xuất bản công khai.'}
                </Typography>
            </Box>
        </DrawerCustom>
    );
}
