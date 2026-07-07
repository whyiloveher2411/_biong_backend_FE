import React from 'react';
import {
    Alert,
    Box,
    Button,
    Divider,
    IconButton,
    InputAdornment,
    List,
    ListItem,
    ListItemText,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SearchIcon from '@mui/icons-material/Search';
import StopIcon from '@mui/icons-material/Stop';
import DrawerCustom from 'components/molecules/DrawerCustom';
import type { AgentBgmSearchItem, ImportHtmlBgmSegment } from './agentVideoApi';
import { bgmPreviewUrl, formatBgmDuration } from './agentBgmPreview';

type Props = {
    open: boolean;
    onClose: () => void;
    searchQuery: string;
    onSearchQueryChange: (value: string) => void;
    searchResults: AgentBgmSearchItem[];
    searchingBgm: boolean;
    onSearch: () => void | Promise<void>;
    segments: ImportHtmlBgmSegment[];
    onAddSegment: (item: AgentBgmSearchItem) => void | Promise<void>;
    onRemoveSegment: (index: number) => void;
    targetSec: number;
    onPlayPreview: (item: AgentBgmSearchItem | ImportHtmlBgmSegment) => void;
    playingUrl: string | null;
};

function PixabayProviderBadge() {
    return (
        <Box
            component="span"
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                px: 0.75,
                py: 0.25,
                borderRadius: 1,
                bgcolor: 'rgba(43, 102, 255, 0.1)',
                color: '#2b66ff',
                fontSize: 11,
                fontWeight: 600,
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
            }}
        >
            Pixabay
        </Box>
    );
}

export default function ShortVideoAgentBgmSearchDrawer({
    open,
    onClose,
    searchQuery,
    onSearchQueryChange,
    searchResults,
    searchingBgm,
    onSearch,
    segments,
    onAddSegment,
    onRemoveSegment,
    targetSec,
    onPlayPreview,
    playingUrl,
}: Props) {
    const selectedTotal = segments.reduce(
        (sum, seg) => sum + Number(seg.duration_sec || 0),
        0,
    );

    const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            void onSearch();
        }
    };

    const renderPreviewButton = (item: AgentBgmSearchItem | ImportHtmlBgmSegment) => {
        const previewUrl = bgmPreviewUrl(item);
        const isPlaying = Boolean(previewUrl && playingUrl === previewUrl);
        return (
            <Tooltip title={previewUrl ? (isPlaying ? 'Dừng' : 'Nghe thử') : 'Chưa có URL audio'}>
                <span>
                    <IconButton
                        size="small"
                        disabled={!previewUrl}
                        onClick={() => onPlayPreview(item)}
                    >
                        {isPlaying ? <StopIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
                    </IconButton>
                </span>
            </Tooltip>
        );
    };

    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title="Chọn nhạc nền"
            width={520}
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
                    mt: 1,
                }}
            >
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                    <TextField
                        size="small"
                        fullWidth
                        label="Từ khóa (mood)"
                        value={searchQuery}
                        placeholder="lofi ambient, calm piano..."
                        onChange={(e) => onSearchQueryChange(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <PixabayProviderBadge />
                                </InputAdornment>
                            ),
                        }}
                    />
                    <LoadingButton
                        variant="contained"
                        loading={searchingBgm}
                        onClick={() => { void onSearch(); }}
                        startIcon={<SearchIcon />}
                        sx={{ flexShrink: 0, textTransform: 'none', mt: 0.25 }}
                    >
                        Tìm
                    </LoadingButton>
                </Box>

                <Box
                    sx={{
                        p: 1.5,
                        borderRadius: 1,
                        bgcolor: 'action.hover',
                        border: 1,
                        borderColor: 'divider',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: segments.length > 0 ? 1 : 0 }}>
                        <MusicNoteIcon fontSize="small" color="action" />
                        <Typography variant="body2" fontWeight={600}>
                            Đã chọn
                            {' '}
                            {segments.length}
                            {' '}
                            bài
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                            {selectedTotal > 0 ? `${selectedTotal.toFixed(1)}s` : '—'}
                            {' '}
                            /
                            {' '}
                            {targetSec > 0 ? `${targetSec.toFixed(1)}s` : '?'}
                        </Typography>
                    </Box>
                    {targetSec > 0 && selectedTotal > 0 && selectedTotal + 0.01 < targetSec ? (
                        <Alert severity="warning" sx={{ py: 0.25, mb: 1 }}>
                            BGM chưa đủ dài — thêm bài hoặc chọn track dài hơn.
                        </Alert>
                    ) : null}
                    {segments.length > 0 ? (
                        <List dense disablePadding>
                            {segments.map((seg, index) => (
                                <ListItem
                                    key={`${seg.download_url}-${index}`}
                                    disableGutters
                                    secondaryAction={(
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            {renderPreviewButton(seg)}
                                            <IconButton edge="end" size="small" onClick={() => onRemoveSegment(index)}>
                                                <DeleteOutlineIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    )}
                                >
                                    <ListItemText
                                        primary={seg.title || seg.id}
                                        secondary={formatBgmDuration(Number(seg.duration_sec || 0))}
                                        primaryTypographyProps={{ variant: 'body2' }}
                                        secondaryTypographyProps={{ variant: 'caption' }}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    ) : (
                        <Typography variant="caption" color="text.secondary">
                            Chưa có nhạc nền — tìm và bấm Thêm bên dưới.
                        </Typography>
                    )}
                </Box>

                <Divider />

                <Typography variant="subtitle2">
                    Kết quả tìm kiếm
                </Typography>

                <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                    {searchResults.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                            {searchingBgm
                                ? 'Đang tìm...'
                                : 'Nhập từ khóa và bấm Tìm để xem danh sách nhạc nền.'}
                        </Typography>
                    ) : (
                        <List dense>
                            {searchResults.map((item) => {
                                const key = String(item.download_url || item.id || item.title);
                                const alreadyAdded = segments.some(
                                    (seg) => seg.download_url === item.download_url,
                                );
                                return (
                                    <ListItem
                                        key={key}
                                        sx={{
                                            bgcolor: 'background.paper',
                                            borderRadius: 1,
                                            mb: 0.5,
                                            border: 1,
                                            borderColor: 'divider',
                                        }}
                                        secondaryAction={(
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                {renderPreviewButton(item)}
                                                <Button
                                                    size="small"
                                                    disabled={alreadyAdded}
                                                    onClick={() => { void onAddSegment(item); }}
                                                    sx={{ textTransform: 'none' }}
                                                >
                                                    {alreadyAdded ? 'Đã thêm' : 'Thêm'}
                                                </Button>
                                            </Box>
                                        )}
                                    >
                                        <ListItemText
                                            primary={item.title || 'BGM'}
                                            secondary={formatBgmDuration(Number(item.duration_sec || 0))}
                                            primaryTypographyProps={{ variant: 'body2' }}
                                            secondaryTypographyProps={{ variant: 'caption' }}
                                        />
                                    </ListItem>
                                );
                            })}
                        </List>
                    )}
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
                    <Button variant="contained" onClick={onClose} sx={{ textTransform: 'none' }}>
                        Xong
                    </Button>
                </Box>
            </Box>
        </DrawerCustom>
    );
}
