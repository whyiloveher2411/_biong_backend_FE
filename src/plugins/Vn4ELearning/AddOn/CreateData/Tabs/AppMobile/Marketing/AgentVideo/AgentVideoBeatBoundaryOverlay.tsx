import React from 'react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import {
    Box,
    Button,
    CircularProgress,
    Tooltip,
} from '@mui/material';
import {
    getBeatBoundaryMarkers,
    getBeatTimelineSegments,
    type BeatMap,
} from './agentVideoBeatMap';
import {
    timeSecToTimelineLeftPx,
    type AgentVideoTimelineLayout,
} from './agentVideoTimelineModel';

const MIN_SEGMENT_WIDTH_FOR_ACTION_LABELS = 170;

type BeatHtmlEntry = {
    html?: string;
};

type Props = {
    beatMap: BeatMap | null;
    beatHtml: Record<string, BeatHtmlEntry>;
    activeBeatId: string;
    copyingBeatHtmlPromptBeatId: string;
    pastingBeatHtmlBeatId: string;
    deletingBeatHtmlBeatId?: string;
    openingBeatGeminiBeatIds?: string[];
    savingImportHtml?: boolean;
    onBeatClick?: (beatId: string) => void;
    onCopyPrompt?: (beatId: string) => void;
    onPasteHtml?: (beatId: string) => void;
    onDeleteBeatData?: (beatId: string) => void;
    onOpenGemini?: (beatId: string) => void;
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
    savingImportHtml = false,
    onBeatClick,
    onCopyPrompt,
    onPasteHtml,
    onDeleteBeatData,
    onOpenGemini,
    scrollLeft,
    contentWidthPx,
    layout,
    rulerHeight,
    trackTopGap,
    trackHeight,
    totalHeight,
}: Props) {
    const boundaries = React.useMemo(
        () => getBeatBoundaryMarkers(beatMap),
        [beatMap],
    );
    const segments = React.useMemo(
        () => getBeatTimelineSegments(beatMap),
        [beatMap],
    );

    if (!beatMap?.sections?.length) {
        return null;
    }

    const toLeft = (timeSec: number) => timeSecToTimelineLeftPx(timeSec, layout);
    const trackTop = rulerHeight + trackTopGap;

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
                    const hasData = Boolean(beatHtml[segment.beatId]?.html?.trim());
                    const isActive = segment.beatId === activeBeatId;
                    const isCopying = copyingBeatHtmlPromptBeatId === segment.beatId;
                    const isPasting = pastingBeatHtmlBeatId === segment.beatId;
                    const isDeleting = deletingBeatHtmlBeatId === segment.beatId;
                    const isOpeningGemini = openingBeatGeminiBeatIds.includes(segment.beatId);
                    const isBusy = isCopying || isPasting || isDeleting || isOpeningGemini;
                    const showActionLabels = widthPx >= MIN_SEGMENT_WIDTH_FOR_ACTION_LABELS;

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
                                bgcolor: hasData ? 'success.main' : 'error.main',
                                color: 'common.white',
                                opacity: isActive ? 1 : 0.9,
                                outline: isActive ? '2px solid rgba(255,255,255,0.9)' : 'none',
                                outlineOffset: -2,
                                boxShadow: isActive ? 'inset 0 0 0 1px rgba(0,0,0,0.25)' : 'none',
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
                                    flex: '0 0 auto',
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
                                    width: '100%',
                                    mt: 1,
                                    '&:hover': {
                                        bgcolor: 'rgba(0,0,0,0.12)',
                                    },
                                }}
                            >
                                {`beat ${segment.beatIndex}`}
                            </Box>

                            <Box
                                sx={{
                                    flex: 1,
                                    minHeight: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 0.35,
                                    px: 0.35,
                                    pb: 0.35,
                                }}
                            >
                                <Tooltip title="Copy prompt HTML" placement="top">
                                    <span>
                                        <Button
                                            size="small"
                                            variant="contained"
                                            disabled={isBusy}
                                            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                                                event.stopPropagation();
                                                void onCopyPrompt?.(segment.beatId);
                                            }}
                                            startIcon={isCopying ? (
                                                <CircularProgress size={12} sx={{ color: 'inherit' }} />
                                            ) : (
                                                <ContentCopyIcon sx={{ fontSize: 12 }} />
                                            )}
                                            sx={{
                                                minWidth: showActionLabels ? 52 : 28,
                                                px: showActionLabels ? 0.75 : 0.5,
                                                py: 0.15,
                                                fontSize: 9,
                                                lineHeight: 1.2,
                                                textTransform: 'none',
                                                bgcolor: 'rgba(0,0,0,0.22)',
                                                color: 'common.white',
                                                boxShadow: 'none',
                                                '&:hover': { bgcolor: 'rgba(0,0,0,0.36)', boxShadow: 'none' },
                                                '& .MuiButton-startIcon': { mr: showActionLabels ? 0.35 : 0 },
                                            }}
                                        >
                                            {showActionLabels ? 'Copy' : ''}
                                        </Button>
                                    </span>
                                </Tooltip>

                                <Tooltip title="Dán HTML từ clipboard" placement="top">
                                    <span>
                                        <Button
                                            size="small"
                                            variant="contained"
                                            disabled={isBusy || savingImportHtml}
                                            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                                                event.stopPropagation();
                                                void onPasteHtml?.(segment.beatId);
                                            }}
                                            startIcon={isPasting ? (
                                                <CircularProgress size={12} sx={{ color: 'inherit' }} />
                                            ) : (
                                                <ContentPasteIcon sx={{ fontSize: 12 }} />
                                            )}
                                            sx={{
                                                minWidth: showActionLabels ? 44 : 28,
                                                px: showActionLabels ? 0.75 : 0.5,
                                                py: 0.15,
                                                fontSize: 9,
                                                lineHeight: 1.2,
                                                textTransform: 'none',
                                                bgcolor: 'rgba(0,0,0,0.22)',
                                                color: 'common.white',
                                                boxShadow: 'none',
                                                '&:hover': { bgcolor: 'rgba(0,0,0,0.36)', boxShadow: 'none' },
                                                '& .MuiButton-startIcon': { mr: showActionLabels ? 0.35 : 0 },
                                            }}
                                        >
                                            {showActionLabels ? 'Dán' : ''}
                                        </Button>
                                    </span>
                                </Tooltip>

                                {onOpenGemini ? (
                                    <Tooltip title="Mở Gemini và điền prompt (bạn tự bấm Gửi)" placement="top">
                                        <span>
                                            <Button
                                                size="small"
                                                variant="contained"
                                                disabled={isBusy || savingImportHtml}
                                                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                                                    event.stopPropagation();
                                                    void onOpenGemini(segment.beatId);
                                                }}
                                                startIcon={isOpeningGemini ? (
                                                    <CircularProgress size={12} sx={{ color: 'inherit' }} />
                                                ) : (
                                                    <AutoAwesomeIcon sx={{ fontSize: 12 }} />
                                                )}
                                                sx={{
                                                    minWidth: showActionLabels ? 52 : 28,
                                                    px: showActionLabels ? 0.75 : 0.5,
                                                    py: 0.15,
                                                    fontSize: 9,
                                                    lineHeight: 1.2,
                                                    textTransform: 'none',
                                                    bgcolor: 'rgba(0,0,0,0.22)',
                                                    color: 'common.white',
                                                    boxShadow: 'none',
                                                    '&:hover': { bgcolor: 'rgba(0,0,0,0.36)', boxShadow: 'none' },
                                                    '& .MuiButton-startIcon': { mr: showActionLabels ? 0.35 : 0 },
                                                }}
                                            >
                                                {showActionLabels ? 'Gemini' : ''}
                                            </Button>
                                        </span>
                                    </Tooltip>
                                ) : null}

                                {hasData && onDeleteBeatData ? (
                                    <Tooltip title="Xóa HTML beat — pipeline có thể chạy lại" placement="top">
                                        <span>
                                            <Button
                                                size="small"
                                                variant="contained"
                                                disabled={isBusy || savingImportHtml}
                                                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                                                    event.stopPropagation();
                                                    void onDeleteBeatData(segment.beatId);
                                                }}
                                                startIcon={isDeleting ? (
                                                    <CircularProgress size={12} sx={{ color: 'inherit' }} />
                                                ) : (
                                                    <DeleteOutlineIcon sx={{ fontSize: 12 }} />
                                                )}
                                                sx={{
                                                    minWidth: showActionLabels ? 40 : 28,
                                                    px: showActionLabels ? 0.75 : 0.5,
                                                    py: 0.15,
                                                    fontSize: 9,
                                                    lineHeight: 1.2,
                                                    textTransform: 'none',
                                                    bgcolor: 'rgba(0,0,0,0.22)',
                                                    color: 'common.white',
                                                    boxShadow: 'none',
                                                    '&:hover': { bgcolor: 'rgba(140,0,0,0.45)', boxShadow: 'none' },
                                                    '& .MuiButton-startIcon': { mr: showActionLabels ? 0.35 : 0 },
                                                }}
                                            >
                                                {showActionLabels ? 'Xóa' : ''}
                                            </Button>
                                        </span>
                                    </Tooltip>
                                ) : null}
                            </Box>
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
}
