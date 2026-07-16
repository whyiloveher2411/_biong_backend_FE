import React from 'react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ComputerIcon from '@mui/icons-material/Computer';
import CodeIcon from '@mui/icons-material/Code';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
    Box,
    CircularProgress,
    IconButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Tooltip,
} from '@mui/material';
import {
    getBeatBoundaryMarkers,
    getBeatHtmlVisualState,
    getBeatRenderErrorMessage,
    getBeatTimelineSegments,
    type BeatHtmlEntry,
    type BeatMap,
} from './agentVideoBeatMap';
import {
    timeSecToTimelineLeftPx,
    type AgentVideoTimelineLayout,
} from './agentVideoTimelineModel';

type Props = {
    beatMap: BeatMap | null;
    beatHtml: Record<string, BeatHtmlEntry>;
    activeBeatId: string;
    copyingBeatHtmlPromptBeatId: string;
    pastingBeatHtmlBeatId: string;
    deletingBeatHtmlBeatId?: string;
    openingBeatGeminiBeatIds?: string[];
    openingBeatGeminiHeadlessBeatIds?: string[];
    savingImportHtml?: boolean;
    onBeatClick?: (beatId: string) => void;
    onCopyPrompt?: (beatId: string) => void;
    onPasteHtml?: (beatId: string) => void;
    onEditHtml?: (beatId: string) => void;
    onOpenInfo?: (beatId: string) => void;
    onDeleteBeatData?: (beatId: string) => void;
    onOpenGemini?: (beatId: string) => void;
    onOpenGeminiHeadless?: (beatId: string) => void;
    scrollLeft: number;
    contentWidthPx: number;
    layout: AgentVideoTimelineLayout;
    rulerHeight: number;
    trackTopGap: number;
    trackHeight: number;
    totalHeight: number;
};

export default function AgentVideoBeatBoundaryOverlay({
    beatMap,
    beatHtml,
    activeBeatId,
    copyingBeatHtmlPromptBeatId,
    pastingBeatHtmlBeatId,
    deletingBeatHtmlBeatId = '',
    openingBeatGeminiBeatIds = [],
    openingBeatGeminiHeadlessBeatIds = [],
    savingImportHtml = false,
    onBeatClick,
    onCopyPrompt,
    onPasteHtml,
    onEditHtml,
    onOpenInfo,
    onDeleteBeatData,
    onOpenGemini,
    onOpenGeminiHeadless,
    scrollLeft,
    contentWidthPx,
    layout,
    rulerHeight,
    trackTopGap,
    trackHeight,
    totalHeight,
}: Props) {
    const [menuBeatId, setMenuBeatId] = React.useState('');
    const [menuAnchorEl, setMenuAnchorEl] = React.useState<HTMLElement | null>(null);

    const boundaries = React.useMemo(
        () => getBeatBoundaryMarkers(beatMap),
        [beatMap],
    );
    const segments = React.useMemo(
        () => getBeatTimelineSegments(beatMap),
        [beatMap],
    );

    const closeMenu = React.useCallback(() => {
        setMenuBeatId('');
        setMenuAnchorEl(null);
    }, []);

    const runMenuAction = React.useCallback((action?: () => void) => {
        closeMenu();
        action?.();
    }, [closeMenu]);

    if (!beatMap?.sections?.length) {
        return null;
    }

    const toLeft = (timeSec: number) => timeSecToTimelineLeftPx(timeSec, layout);
    const trackTop = rulerHeight + trackTopGap;
    const menuSegment = segments.find((segment) => segment.beatId === menuBeatId) || null;
    const menuVisualState = menuSegment
        ? getBeatHtmlVisualState(beatHtml, menuSegment.beatId)
        : 'missing';
    const menuIsCopying = menuBeatId !== '' && copyingBeatHtmlPromptBeatId === menuBeatId;
    const menuIsPasting = menuBeatId !== '' && pastingBeatHtmlBeatId === menuBeatId;
    const menuIsDeleting = menuBeatId !== '' && deletingBeatHtmlBeatId === menuBeatId;
    const menuIsOpeningGemini = menuBeatId !== '' && openingBeatGeminiBeatIds.includes(menuBeatId);
    const menuIsOpeningGeminiHeadless = menuBeatId !== ''
        && openingBeatGeminiHeadlessBeatIds.includes(menuBeatId);
    const menuIsBusy = menuIsCopying
        || menuIsPasting
        || menuIsDeleting
        || menuIsOpeningGemini
        || menuIsOpeningGeminiHeadless;

    return (
        <Box
            sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                overflow: 'hidden',
                pointerEvents: 'none',
                zIndex: 2,
            }}
        >
            <Box
                sx={{
                    position: 'relative',
                    width: contentWidthPx,
                    height: totalHeight,
                    transform: `translateX(-${scrollLeft}px)`,
                }}
            >
                {boundaries.map((marker) => (
                    <Box
                        key={`beat-boundary-${marker.beatIndex}-${marker.timeSec}`}
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: toLeft(marker.timeSec),
                            width: '1px',
                            height: rulerHeight + trackTopGap + trackHeight,
                            bgcolor: 'rgba(255,255,255,0.28)',
                            transform: 'translateX(-0.5px)',
                        }}
                    />
                ))}

                {segments.map((segment) => {
                    const leftPx = toLeft(segment.startSec);
                    const widthPx = Math.max(2, toLeft(segment.endSec) - leftPx);
                    const visualState = getBeatHtmlVisualState(beatHtml, segment.beatId);
                    const segmentColor = visualState === 'error'
                        ? 'warning.main'
                        : (visualState === 'ok' ? 'success.main' : 'error.main');
                    const errorMessage = getBeatRenderErrorMessage(beatHtml, segment.beatId);
                    const isActive = segment.beatId === activeBeatId;
                    const isCopying = copyingBeatHtmlPromptBeatId === segment.beatId;
                    const isPasting = pastingBeatHtmlBeatId === segment.beatId;
                    const isDeleting = deletingBeatHtmlBeatId === segment.beatId;
                    const isOpeningGemini = openingBeatGeminiBeatIds.includes(segment.beatId);
                    const isOpeningGeminiHeadless = openingBeatGeminiHeadlessBeatIds.includes(segment.beatId);
                    const isBusy = isCopying
                        || isPasting
                        || isDeleting
                        || isOpeningGemini
                        || isOpeningGeminiHeadless;
                    const isMenuOpen = menuBeatId === segment.beatId;

                    return (
                        <Box
                            key={`beat-segment-${segment.beatId}`}
                            sx={{
                                position: 'absolute',
                                top: trackTop,
                                left: leftPx,
                                width: widthPx,
                                height: trackHeight,
                                pointerEvents: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                                bgcolor: segmentColor,
                                color: 'common.white',
                                opacity: isActive ? 1 : 0.9,
                                outline: isActive ? '2px solid rgba(255,255,255,0.9)' : 'none',
                                outlineOffset: -2,
                                boxShadow: isActive ? 'inset 0 0 0 1px rgba(0,0,0,0.25)' : 'none',
                            }}
                        >
                            <Box
                                sx={{
                                    position: 'relative',
                                    flex: 1,
                                    minHeight: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    px: widthPx < 36 ? 0.25 : 2.5,
                                }}
                            >
                                <Box
                                    component="button"
                                    type="button"
                                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                                        event.stopPropagation();
                                        onBeatClick?.(segment.beatId);
                                    }}
                                    sx={{
                                        m: 0,
                                        p: '2px 4px',
                                        border: 'none',
                                        bgcolor: 'transparent',
                                        color: 'inherit',
                                        cursor: 'pointer',
                                        fontSize: 10,
                                        fontWeight: 700,
                                        fontFamily: 'inherit',
                                        textTransform: 'none',
                                        lineHeight: 1.2,
                                        whiteSpace: 'nowrap',
                                        textOverflow: 'ellipsis',
                                        overflow: 'hidden',
                                        textAlign: 'center',
                                        maxWidth: '100%',
                                        borderRadius: 0.5,
                                        '&:hover': {
                                            bgcolor: 'rgba(0,0,0,0.12)',
                                        },
                                    }}
                                >
                                    <Box
                                        sx={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 0.25,
                                            justifyContent: 'center',
                                            maxWidth: '100%',
                                        }}
                                    >
                                        {visualState === 'error' ? (
                                            <Tooltip title={errorMessage} placement="top">
                                                <WarningAmberIcon sx={{ fontSize: 12, color: 'common.white' }} />
                                            </Tooltip>
                                        ) : null}
                                        <span>{`beat ${segment.beatIndex}`}</span>
                                    </Box>
                                </Box>

                                <Tooltip title="Thao tác beat" placement="top">
                                    <IconButton
                                        size="small"
                                        disabled={isBusy && !isMenuOpen}
                                        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                                            event.stopPropagation();
                                            onBeatClick?.(segment.beatId);
                                            setMenuBeatId(segment.beatId);
                                            setMenuAnchorEl(event.currentTarget);
                                        }}
                                        sx={{
                                            position: 'absolute',
                                            top: 1,
                                            right: 1,
                                            width: 22,
                                            height: 22,
                                            p: 0,
                                            color: 'common.white',
                                            bgcolor: isMenuOpen ? 'rgba(0,0,0,0.42)' : 'rgba(0,0,0,0.28)',
                                            borderRadius: 0.75,
                                            '&:hover': {
                                                bgcolor: 'rgba(0,0,0,0.46)',
                                            },
                                            '&.Mui-disabled': {
                                                color: 'rgba(255,255,255,0.55)',
                                                bgcolor: 'rgba(0,0,0,0.18)',
                                            },
                                        }}
                                    >
                                        {isBusy && !isMenuOpen ? (
                                            <CircularProgress size={12} sx={{ color: 'inherit' }} />
                                        ) : (
                                            <MoreVertIcon sx={{ fontSize: 16 }} />
                                        )}
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Thông tin beat" placement="right">
                                    <IconButton
                                        size="small"
                                        aria-label={`Thông tin ${segment.beatId}`}
                                        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                                            event.stopPropagation();
                                            onBeatClick?.(segment.beatId);
                                            onOpenInfo?.(segment.beatId);
                                        }}
                                        sx={{
                                            position: 'absolute',
                                            top: 25,
                                            right: 1,
                                            width: 22,
                                            height: 22,
                                            p: 0,
                                            color: 'common.white',
                                            bgcolor: 'rgba(0,0,0,0.22)',
                                            border: '1px solid rgba(255,255,255,0.16)',
                                            borderRadius: 0.75,
                                            '&:hover': {
                                                bgcolor: 'rgba(0,0,0,0.46)',
                                                borderColor: 'rgba(255,255,255,0.38)',
                                            },
                                            '&:focus-visible': {
                                                outline: '2px solid rgba(255,255,255,0.95)',
                                                outlineOffset: -2,
                                            },
                                        }}
                                    >
                                        <InfoOutlinedIcon sx={{ fontSize: 15 }} />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </Box>
                    );
                })}
            </Box>

            <Menu
                anchorEl={menuAnchorEl}
                open={Boolean(menuAnchorEl) && menuBeatId !== ''}
                onClose={closeMenu}
                onClick={(event) => { event.stopPropagation(); }}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                    paper: {
                        sx: {
                            minWidth: 200,
                            mt: 0.5,
                        },
                    },
                }}
            >
                {onEditHtml ? (
                    <MenuItem
                        disabled={menuIsBusy}
                        onClick={() => {
                            const beatId = menuBeatId;
                            runMenuAction(() => { void onEditHtml(beatId); });
                        }}
                    >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                            <CodeIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Sửa HTML" secondary="Mở form chỉnh HTML beat" />
                    </MenuItem>
                ) : null}

                <MenuItem
                    disabled={menuIsBusy}
                    onClick={() => {
                        const beatId = menuBeatId;
                        runMenuAction(() => { void onCopyPrompt?.(beatId); });
                    }}
                >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                        {menuIsCopying ? (
                            <CircularProgress size={16} />
                        ) : (
                            <ContentCopyIcon fontSize="small" />
                        )}
                    </ListItemIcon>
                    <ListItemText primary="Copy prompt" secondary="Copy prompt HTML beat" />
                </MenuItem>

                <MenuItem
                    disabled={menuIsBusy || savingImportHtml}
                    onClick={() => {
                        const beatId = menuBeatId;
                        runMenuAction(() => { void onPasteHtml?.(beatId); });
                    }}
                >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                        {menuIsPasting ? (
                            <CircularProgress size={16} />
                        ) : (
                            <ContentPasteIcon fontSize="small" />
                        )}
                    </ListItemIcon>
                    <ListItemText primary="Dán HTML" secondary="Dán HTML từ clipboard" />
                </MenuItem>

                {onOpenGemini ? (
                    <MenuItem
                        disabled={menuIsBusy || savingImportHtml}
                        onClick={() => {
                            const beatId = menuBeatId;
                            runMenuAction(() => { void onOpenGemini(beatId); });
                        }}
                    >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                            {menuIsOpeningGemini ? (
                                <CircularProgress size={16} />
                            ) : (
                                <AutoAwesomeIcon fontSize="small" />
                            )}
                        </ListItemIcon>
                        <ListItemText primary="Gemini" secondary="Mở tab Gemini (tự bấm Gửi)" />
                    </MenuItem>
                ) : null}

                {onOpenGeminiHeadless ? (
                    <MenuItem
                        disabled={menuIsBusy || savingImportHtml}
                        onClick={() => {
                            const beatId = menuBeatId;
                            runMenuAction(() => { void onOpenGeminiHeadless(beatId); });
                        }}
                    >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                            {menuIsOpeningGeminiHeadless ? (
                                <CircularProgress size={16} />
                            ) : (
                                <ComputerIcon fontSize="small" />
                            )}
                        </ListItemIcon>
                        <ListItemText primary="API / Headless" secondary="Gemini full auto → lưu CMS" />
                    </MenuItem>
                ) : null}

                {menuVisualState !== 'missing' && onDeleteBeatData ? (
                    <MenuItem
                        disabled={menuIsBusy || savingImportHtml}
                        onClick={() => {
                            const beatId = menuBeatId;
                            runMenuAction(() => { void onDeleteBeatData(beatId); });
                        }}
                        sx={{ color: 'error.main' }}
                    >
                        <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                            {menuIsDeleting ? (
                                <CircularProgress size={16} color="inherit" />
                            ) : (
                                <DeleteOutlineIcon fontSize="small" />
                            )}
                        </ListItemIcon>
                        <ListItemText
                            primary="Xóa HTML"
                            secondary="Pipeline có thể chạy lại beat"
                            primaryTypographyProps={{ color: 'inherit' }}
                        />
                    </MenuItem>
                ) : null}
            </Menu>
        </Box>
    );
}
