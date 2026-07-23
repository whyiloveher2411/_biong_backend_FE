import React from 'react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ComputerIcon from '@mui/icons-material/Computer';
import CodeIcon from '@mui/icons-material/Code';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
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
    normalizeBeatQaStatus,
    BEAT_QA_STATUS_LABELS,
    type BeatHtmlEntry,
    type BeatMap,
    type BeatQaStatus,
    type BeatVersion,
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
    quickIterateBeatStages?: Record<string, 'queued' | 'visual' | 'html'>;
    savingImportHtml?: boolean;
    onBeatClick?: (beatId: string) => void;
    onCopyPrompt?: (beatId: string) => void;
    onPasteHtml?: (beatId: string) => void;
    onEditHtml?: (beatId: string) => void;
    onOpenInfo?: (beatId: string) => void;
    onDeleteBeatData?: (beatId: string) => void;
    onOpenGemini?: (beatId: string) => void;
    onOpenGeminiHeadless?: (beatId: string) => void;
    onSaveBeatQa?: (beatId: string, qaStatus: BeatQaStatus, qaRefineNote?: string) => Promise<boolean>;
    beatVersions?: Record<string, BeatVersion[]>;
    beatActiveVersionId?: Record<string, string>;
    onRestoreBeatVersion?: (beatId: string, versionId: string, label: string) => Promise<string | null>;
    scrollLeft: number;
    contentWidthPx: number;
    layout: AgentVideoTimelineLayout;
    rulerHeight: number;
    trackTopGap: number;
    trackHeight: number;
    totalHeight: number;
};

const VERSION_DOT_COLORS = [
    '#60a5fa',
    '#f472b6',
    '#34d399',
    '#f59e0b',
    '#a78bfa',
    '#fb7185',
    '#22d3ee',
    '#facc15',
];

const QUICK_ITERATE_STAGE_TOOLTIP: Record<'queued' | 'visual' | 'html', string> = {
    queued: 'Chờ trong hàng đợi…',
    visual: 'Đang tạo visual mới…',
    html: 'Đang fill HTML…',
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
    quickIterateBeatStages = {},
    savingImportHtml = false,
    onBeatClick,
    onCopyPrompt,
    onPasteHtml,
    onEditHtml,
    onOpenInfo,
    onDeleteBeatData,
    onOpenGemini,
    onOpenGeminiHeadless,
    onSaveBeatQa,
    beatVersions = {},
    beatActiveVersionId = {},
    onRestoreBeatVersion,
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
    const [savingQaBeatId, setSavingQaBeatId] = React.useState('');

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

    const handleToggleApproved = React.useCallback(async (beatId: string) => {
        if (!onSaveBeatQa || !beatId || savingQaBeatId) {
            return;
        }
        const entry = beatHtml[beatId];
        const current = normalizeBeatQaStatus(entry?.qa_status);
        const nextStatus: BeatQaStatus = current === 'approved' ? '' : 'approved';
        const note = String(entry?.qa_refine_note || '');
        setSavingQaBeatId(beatId);
        try {
            await onSaveBeatQa(beatId, nextStatus, note);
        } finally {
            setSavingQaBeatId('');
        }
    }, [beatHtml, onSaveBeatQa, savingQaBeatId]);

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
    const menuIsQuickIterating = menuBeatId !== ''
        && Boolean(quickIterateBeatStages[menuBeatId]);
    const menuIsBusy = menuIsCopying
        || menuIsPasting
        || menuIsDeleting
        || menuIsOpeningGemini
        || menuIsOpeningGeminiHeadless
        || menuIsQuickIterating;

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
                    const qaStatus = normalizeBeatQaStatus(beatHtml[segment.beatId]?.qa_status);
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
                    const quickIterateStage = quickIterateBeatStages[segment.beatId];
                    const isQuickIterating = Boolean(quickIterateStage);
                    const isQuickIterateActive = quickIterateStage === 'visual'
                        || quickIterateStage === 'html';
                    const isQuickIterateQueued = quickIterateStage === 'queued';
                    const isBusy = isCopying
                        || isPasting
                        || isDeleting
                        || isOpeningGemini
                        || isOpeningGeminiHeadless
                        || isQuickIterating;
                    const isMenuOpen = menuBeatId === segment.beatId;
                    const versions = beatVersions?.[segment.beatId] || [];
                    const activeVersionId = String(beatActiveVersionId?.[segment.beatId] || '');
                    const isApproved = qaStatus === 'approved';
                    const isSavingQa = savingQaBeatId === segment.beatId;
                    const showApprovedBorder = isApproved && !isQuickIterating;
                    const quickIterateTooltip = quickIterateStage
                        ? QUICK_ITERATE_STAGE_TOOLTIP[quickIterateStage]
                        : '';

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
                                opacity: isActive ? 1 : (isQuickIterateQueued ? 0.95 : 0.9),
                                outline: isActive && !isQuickIterating && !isApproved
                                    ? '2px solid rgba(255,255,255,0.9)'
                                    : 'none',
                                outlineOffset: -2,
                                boxShadow: isQuickIterateActive
                                    ? '0 0 0 1px rgba(251,191,36,0.85), 0 0 10px rgba(251,191,36,0.45)'
                                    : (showApprovedBorder
                                        ? '0 0 0 2px rgba(244,114,182,0.95), 0 0 14px rgba(236,72,153,0.75), inset 0 0 0 1px rgba(255,255,255,0.25)'
                                        : (isActive
                                            ? 'inset 0 0 0 1px rgba(0,0,0,0.25)'
                                            : 'none')),
                                border: isQuickIterateQueued
                                    ? '2px dashed rgba(251,191,36,0.95)'
                                    : 'none',
                                animation: isQuickIterateQueued
                                    ? 'quickIterateQueuedPulse 1.4s ease-in-out infinite'
                                    : 'none',
                                '@keyframes quickIterateQueuedPulse': {
                                    '0%, 100%': { opacity: 0.88 },
                                    '50%': { opacity: 1 },
                                },
                            }}
                        >
                            {isQuickIterateActive ? (
                                <Box
                                    component="svg"
                                    viewBox={`0 0 ${Math.max(widthPx, 2)} ${Math.max(trackHeight, 2)}`}
                                    preserveAspectRatio="none"
                                    sx={{
                                        position: 'absolute',
                                        inset: 0,
                                        width: '100%',
                                        height: '100%',
                                        pointerEvents: 'none',
                                        zIndex: 3,
                                        overflow: 'visible',
                                        '& rect': {
                                            animation: 'quickIterateDash 0.9s linear infinite',
                                        },
                                        '@keyframes quickIterateDash': {
                                            to: { strokeDashoffset: -40 },
                                        },
                                    }}
                                >
                                    <rect
                                        x="1.5"
                                        y="1.5"
                                        width={Math.max(widthPx - 3, 1)}
                                        height={Math.max(trackHeight - 3, 1)}
                                        fill="none"
                                        stroke="#fbbf24"
                                        strokeWidth="2.5"
                                        strokeDasharray="10 7"
                                        rx="1"
                                    />
                                </Box>
                            ) : null}
                            {showApprovedBorder ? (
                                <Box
                                    component="svg"
                                    viewBox={`0 0 ${Math.max(widthPx, 2)} ${Math.max(trackHeight, 2)}`}
                                    preserveAspectRatio="none"
                                    sx={{
                                        position: 'absolute',
                                        inset: 0,
                                        width: '100%',
                                        height: '100%',
                                        pointerEvents: 'none',
                                        zIndex: 3,
                                        overflow: 'visible',
                                        '& rect': {
                                            animation: 'beatApprovedDash 0.85s linear infinite',
                                        },
                                        '@keyframes beatApprovedDash': {
                                            to: { strokeDashoffset: -48 },
                                        },
                                    }}
                                >
                                    <rect
                                        x="1.5"
                                        y="1.5"
                                        width={Math.max(widthPx - 3, 1)}
                                        height={Math.max(trackHeight - 3, 1)}
                                        fill="none"
                                        stroke="#f472b6"
                                        strokeWidth="3.5"
                                        strokeDasharray="12 6"
                                        strokeLinecap="round"
                                        rx="1"
                                    />
                                </Box>
                            ) : null}
                            <Box
                                sx={{
                                    position: 'relative',
                                    flex: 1,
                                    minHeight: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 0.5,
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
                                        {isQuickIterating ? (
                                            <Tooltip title={quickIterateTooltip} placement="top">
                                                <Box
                                                    component="span"
                                                    sx={{
                                                        display: 'inline-flex',
                                                        flexShrink: 0,
                                                        lineHeight: 0,
                                                    }}
                                                >
                                                    <CircularProgress
                                                        size={11}
                                                        thickness={5}
                                                        sx={{ color: '#fde68a' }}
                                                    />
                                                </Box>
                                            </Tooltip>
                                        ) : null}
                                        {visualState === 'error' ? (
                                            <Tooltip title={errorMessage} placement="top">
                                                <WarningAmberIcon sx={{ fontSize: 12, color: 'common.white' }} />
                                            </Tooltip>
                                        ) : null}
                                        {qaStatus ? (
                                            <Tooltip
                                                title={BEAT_QA_STATUS_LABELS[qaStatus] || qaStatus}
                                                placement="top"
                                            >
                                                <Box
                                                    component="span"
                                                    sx={{
                                                        width: 6,
                                                        height: 6,
                                                        borderRadius: '50%',
                                                        bgcolor: qaStatus === 'approved'
                                                            ? '#bbf7d0'
                                                            : '#fde68a',
                                                        boxShadow: '0 0 0 1px rgba(0,0,0,0.35)',
                                                        flexShrink: 0,
                                                    }}
                                                />
                                            </Tooltip>
                                        ) : null}
                                        <Tooltip
                                            title={isQuickIterating ? quickIterateTooltip : ''}
                                            placement="top"
                                            disableHoverListener={!isQuickIterating}
                                        >
                                            <span>{`beat ${segment.beatIndex}`}</span>
                                        </Tooltip>
                                    </Box>
                                </Box>
                                <Tooltip
                                    title={isApproved ? 'Bỏ đánh dấu đã ổn' : 'Đánh dấu đã ổn'}
                                    placement="top"
                                >
                                    <span style={{ display: 'inline-flex', flexShrink: 0 }}>
                                        <IconButton
                                            size="small"
                                            aria-label={isApproved
                                                ? `Bỏ đánh dấu đã ổn ${segment.beatId}`
                                                : `Đánh dấu đã ổn ${segment.beatId}`}
                                            disabled={
                                                !onSaveBeatQa
                                                || isBusy
                                                || isSavingQa
                                                || savingImportHtml
                                            }
                                            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                                                event.stopPropagation();
                                                onBeatClick?.(segment.beatId);
                                                void handleToggleApproved(segment.beatId);
                                            }}
                                            sx={{
                                                width: 28,
                                                height: 28,
                                                p: 0,
                                                ml: 0.25,
                                                color: isApproved ? '#fbcfe8' : 'common.white',
                                                bgcolor: isApproved
                                                    ? 'rgba(236,72,153,0.55)'
                                                    : 'rgba(0,0,0,0.28)',
                                                border: isApproved
                                                    ? '1px solid rgba(244,114,182,0.95)'
                                                    : '1px solid rgba(255,255,255,0.22)',
                                                borderRadius: 0.75,
                                                '&:hover': {
                                                    bgcolor: isApproved
                                                        ? 'rgba(236,72,153,0.72)'
                                                        : 'rgba(0,0,0,0.5)',
                                                    borderColor: isApproved
                                                        ? 'rgba(251,207,232,0.98)'
                                                        : 'rgba(255,255,255,0.45)',
                                                },
                                                '&.Mui-disabled': {
                                                    color: 'rgba(255,255,255,0.45)',
                                                    bgcolor: 'rgba(0,0,0,0.14)',
                                                },
                                            }}
                                        >
                                            {isSavingQa ? (
                                                <CircularProgress size={14} sx={{ color: 'inherit' }} />
                                            ) : isApproved ? (
                                                <CheckBoxIcon sx={{ fontSize: 20 }} />
                                            ) : (
                                                <CheckBoxOutlineBlankIcon sx={{ fontSize: 20 }} />
                                            )}
                                        </IconButton>
                                    </span>
                                </Tooltip>

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
                                {versions.length > 0 ? (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            left: 4,
                                            bottom: 3,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0,
                                            maxWidth: '58%',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        {versions.map((version, idx) => {
                                            const isVersionActive = activeVersionId === version.version_id;
                                            return (
                                                <Tooltip
                                                    key={`beat-version-dot-${segment.beatId}-${version.version_id}`}
                                                    title={`${version.label}${isVersionActive ? ' · Đang dùng' : ''}`}
                                                    placement="top"
                                                >
                                                    <Box
                                                        component="button"
                                                        type="button"
                                                        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                                                            event.stopPropagation();
                                                            onBeatClick?.(segment.beatId);
                                                            if (!onRestoreBeatVersion || isVersionActive || savingImportHtml) {
                                                                return;
                                                            }
                                                            void onRestoreBeatVersion(
                                                                segment.beatId,
                                                                version.version_id,
                                                                version.label,
                                                            );
                                                        }}
                                                        sx={{
                                                            m: 0,
                                                            p: 0,
                                                            width: 18,
                                                            height: 18,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            border: 'none',
                                                            bgcolor: 'transparent',
                                                            cursor: (isVersionActive || savingImportHtml || !onRestoreBeatVersion)
                                                                ? 'default'
                                                                : 'pointer',
                                                            opacity: (savingImportHtml && !isVersionActive) ? 0.55 : 1,
                                                            flexShrink: 0,
                                                            '&::after': {
                                                                content: '""',
                                                                width: 16,
                                                                height: 16,
                                                                borderRadius: '50%',
                                                                border: isVersionActive
                                                                    ? '2px solid rgba(255,255,255,0.95)'
                                                                    : '1px solid rgba(255,255,255,0.62)',
                                                                bgcolor: VERSION_DOT_COLORS[idx % VERSION_DOT_COLORS.length],
                                                                boxShadow: isVersionActive
                                                                    ? '0 0 0 1px rgba(0,0,0,0.32)'
                                                                    : 'none',
                                                            },
                                                        }}
                                                    />
                                                </Tooltip>
                                            );
                                        })}
                                    </Box>
                                ) : null}
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
