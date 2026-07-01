import React from 'react';
import { Timeline, type TimelineState } from '@xzdarcy/react-timeline-editor';
import '@xzdarcy/react-timeline-editor/dist/react-timeline-editor.css';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { Box, CircularProgress, IconButton, Typography } from '@mui/material';
import {
    TIMELINE_EDIT_AREA_TOP_GAP,
    TIMELINE_RULER_HEIGHT,
    timelineEditorWorkspaceEndSec,
} from 'helpers/shortVideoTimelineAdapter';
import {
    AGENT_VIDEO_TIMELINE_EFFECTS,
    AGENT_VIDEO_TRACK_ROW_HEIGHT,
    buildAgentVideoTimelineRows,
    resolveAgentVideoDurationSec,
} from './agentVideoTimelineModel';
import { resolveFilmstripTileDisplayWidthPx } from './agentVideoFilmstrip';
import { useAgentVideoFilmstrip } from './useAgentVideoFilmstrip';

const TRACK_LABELS_WIDTH = 100;
const TIMELINE_SCALE_WIDTH = 56;
const TIMELINE_SCALE = 1;
const TIMELINE_SCALE_SPLIT_COUNT = 5;
const TIMELINE_START_LEFT = 20;
const CURSOR_HEAD_OVERFLOW = 10;
const HORIZONTAL_SCROLLBAR_HEIGHT = 12;
const FILMSTRIP_TILE_WIDTH_PX = resolveFilmstripTileDisplayWidthPx();

function getTimelineScrollGrids(host: HTMLElement): HTMLElement[] {
    return Array.from(host.querySelectorAll<HTMLElement>('.timeline-editor-edit-area .ReactVirtualized__Grid'));
}

function getTimelineHorizontalScrollLeft(host: HTMLElement): number {
    const grids = getTimelineScrollGrids(host);
    if (grids.length === 0) {
        return 0;
    }
    return grids[0].scrollLeft;
}

function formatPlaybackClock(totalSec: number): string {
    const clamped = Math.max(0, totalSec);
    const minutes = Math.floor(clamped / 60);
    const remainder = clamped % 60;
    const wholeSec = Math.floor(remainder);
    const tenths = Math.floor((remainder - wholeSec) * 10);
    return `${minutes}:${String(wholeSec).padStart(2, '0')}.${tenths}`;
}

function truncateLabel(label: string, maxLen = 48): string {
    const text = String(label || '').trim();
    if (text.length <= maxLen) {
        return text;
    }
    return `${text.slice(0, maxLen - 1)}…`;
}

type AgentVideoFilmstripClipProps = {
    clipLabel: string;
    thumbnails: string[];
    loading: boolean;
    failed: boolean;
};

function AgentVideoFilmstripClip({
    clipLabel,
    thumbnails,
    loading,
    failed,
}: AgentVideoFilmstripClipProps) {
    const showFallback = !loading && thumbnails.length === 0;

    return (
        <Box
            sx={{
                width: '100%',
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 0.75,
                border: '1px solid rgba(147, 197, 253, 0.45)',
                bgcolor: showFallback ? 'rgba(30, 58, 138, 0.72)' : 'rgba(15, 23, 42, 0.95)',
            }}
        >
            {thumbnails.length > 0 ? (
                <Box
                    sx={{
                        display: 'flex',
                        width: '100%',
                        height: '100%',
                        overflow: 'hidden',
                    }}
                >
                    {thumbnails.map((src, index) => (
                        <Box
                            key={`filmstrip-${index}`}
                            component="img"
                            src={src}
                            alt=""
                            sx={{
                                width: FILMSTRIP_TILE_WIDTH_PX,
                                flexShrink: 0,
                                height: '100%',
                                objectFit: 'cover',
                                display: 'block',
                                borderRight: index < thumbnails.length - 1
                                    ? '1px solid rgba(255,255,255,0.08)'
                                    : undefined,
                            }}
                        />
                    ))}
                </Box>
            ) : null}

            {loading ? (
                <Box
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'rgba(15, 23, 42, 0.55)',
                    }}
                >
                    <CircularProgress size={18} sx={{ color: '#93c5fd' }} />
                </Box>
            ) : null}

            {failed && !loading && thumbnails.length === 0 ? (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 6,
                        right: 8,
                    }}
                >
                    <Typography variant="caption" sx={{ color: 'rgba(248, 113, 113, 0.95)', fontSize: 10 }}>
                        Không tạo được thumbnail
                    </Typography>
                </Box>
            ) : null}

            <Box
                sx={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    px: 0.75,
                    py: 0.35,
                    background: 'linear-gradient(180deg, rgba(15, 23, 42, 0) 0%, rgba(15, 23, 42, 0.82) 100%)',
                }}
            >
                <Typography
                    variant="caption"
                    sx={{
                        color: '#eff6ff',
                        fontSize: 11,
                        lineHeight: 1.2,
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {truncateLabel(clipLabel)}
                </Typography>
            </Box>
        </Box>
    );
}

type Props = {
    shortVideoId: number;
    videoUrl: string;
    agentVideoRenderedAt?: string;
    videoRef: React.RefObject<HTMLVideoElement>;
    clipLabel?: string;
    audioDurationSec?: number | null;
    estimatedDurationSec?: number | null;
};

export default function ShortVideoAgentVideoTimeline({
    shortVideoId,
    videoUrl,
    agentVideoRenderedAt = '',
    videoRef,
    clipLabel = 'HyperFrames',
    audioDurationSec,
    estimatedDurationSec,
}: Props) {
    const timelineRef = React.useRef<TimelineState>(null);
    const timelineHostRef = React.useRef<HTMLDivElement>(null);
    const syncingFromVideoRef = React.useRef(false);
    const isScrubbingRef = React.useRef(false);
    const [mediaDurationSec, setMediaDurationSec] = React.useState<number | null>(null);
    const [currentTimeSec, setCurrentTimeSec] = React.useState(0);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const isPlayingRef = React.useRef(false);

    const hasVideo = String(videoUrl || '').trim() !== '';

    const contentDurationSec = React.useMemo(
        () => resolveAgentVideoDurationSec({
            mediaDurationSec,
            audioDurationSec,
            estimatedDurationSec,
        }),
        [audioDurationSec, estimatedDurationSec, mediaDurationSec],
    );

    const { thumbnails, loading: filmstripLoading, failed: filmstripFailed } = useAgentVideoFilmstrip(
        videoUrl,
        contentDurationSec,
        shortVideoId,
        agentVideoRenderedAt,
    );

    const timelineWorkspaceEndSec = React.useMemo(
        () => timelineEditorWorkspaceEndSec(contentDurationSec),
        [contentDurationSec],
    );

    const editorData = React.useMemo(
        () => buildAgentVideoTimelineRows(contentDurationSec, thumbnails.length),
        [contentDurationSec, thumbnails.length],
    );

    const minScaleCount = Math.max(20, Math.ceil(timelineWorkspaceEndSec) + 2);
    const tracksViewportHeight = TIMELINE_EDIT_AREA_TOP_GAP + AGENT_VIDEO_TRACK_ROW_HEIGHT;
    const timelineContentHeight = TIMELINE_RULER_HEIGHT + tracksViewportHeight;
    const timelineTotalHeight = timelineContentHeight + HORIZONTAL_SCROLLBAR_HEIGHT + CURSOR_HEAD_OVERFLOW;

    const syncTimelineCursor = React.useCallback((timeSec: number) => {
        if (!timelineRef.current) {
            return;
        }
        syncingFromVideoRef.current = true;
        timelineRef.current.setTime(timeSec);
        syncingFromVideoRef.current = false;
    }, []);

    const seekToTime = React.useCallback((timeSec: number, options?: { pauseVideo?: boolean }) => {
        const video = videoRef.current;
        const clamped = Math.max(0, Math.min(timeSec, contentDurationSec));
        if (options?.pauseVideo !== false && video && !video.paused) {
            video.pause();
        }
        if (video) {
            video.currentTime = clamped;
        }
        setCurrentTimeSec(clamped);
        syncTimelineCursor(clamped);
    }, [contentDurationSec, syncTimelineCursor, videoRef]);

    React.useLayoutEffect(() => {
        if (!hasVideo) {
            setMediaDurationSec(null);
            setCurrentTimeSec(0);
            setIsPlaying(false);
            return undefined;
        }

        const video = videoRef.current;
        if (!video) {
            return undefined;
        }

        const updateDuration = () => {
            const duration = video.duration;
            if (Number.isFinite(duration) && duration > 0) {
                setMediaDurationSec(duration);
            }
        };

        const onTimeUpdate = () => {
            if (isScrubbingRef.current || isPlayingRef.current) {
                return;
            }
            const sec = video.currentTime;
            setCurrentTimeSec(sec);
            syncTimelineCursor(sec);
        };

        const onPlay = () => {
            isPlayingRef.current = true;
            setIsPlaying(true);
        };
        const onPause = () => {
            isPlayingRef.current = false;
            setIsPlaying(false);
            onTimeUpdate();
        };
        const onEnded = () => {
            isPlayingRef.current = false;
            setIsPlaying(false);
            onTimeUpdate();
        };

        video.addEventListener('loadedmetadata', updateDuration);
        video.addEventListener('durationchange', updateDuration);
        video.addEventListener('timeupdate', onTimeUpdate);
        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);
        video.addEventListener('ended', onEnded);
        updateDuration();

        return () => {
            video.removeEventListener('loadedmetadata', updateDuration);
            video.removeEventListener('durationchange', updateDuration);
            video.removeEventListener('timeupdate', onTimeUpdate);
            video.removeEventListener('play', onPlay);
            video.removeEventListener('pause', onPause);
            video.removeEventListener('ended', onEnded);
        };
    }, [hasVideo, syncTimelineCursor, videoRef, videoUrl]);

    React.useEffect(() => {
        if (!hasVideo || !isPlaying) {
            return undefined;
        }

        let frameId = 0;
        const tick = () => {
            if (isScrubbingRef.current) {
                frameId = window.requestAnimationFrame(tick);
                return;
            }
            const video = videoRef.current;
            if (!video || video.paused) {
                return;
            }
            const sec = video.currentTime;
            setCurrentTimeSec(sec);
            syncTimelineCursor(sec);
            frameId = window.requestAnimationFrame(tick);
        };

        frameId = window.requestAnimationFrame(tick);
        return () => {
            window.cancelAnimationFrame(frameId);
        };
    }, [hasVideo, isPlaying, syncTimelineCursor, videoRef]);

    const updateTimeFromClientX = React.useCallback((clientX: number, interactArea: HTMLElement) => {
        const host = timelineHostRef.current;
        if (!host) {
            return;
        }

        const rect = interactArea.getBoundingClientRect();
        const localX = clientX - rect.left;
        const scrollLeft = getTimelineHorizontalScrollLeft(host);
        const absoluteLeft = Math.max(TIMELINE_START_LEFT, localX + scrollLeft);
        const time = ((absoluteLeft - TIMELINE_START_LEFT) / TIMELINE_SCALE_WIDTH) * TIMELINE_SCALE;
        seekToTime(time, { pauseVideo: true });
    }, [seekToTime]);

    React.useEffect(() => {
        const host = timelineHostRef.current;
        if (!host || !hasVideo) {
            return undefined;
        }

        const onMouseDown = (event: MouseEvent) => {
            if (event.button !== 0) {
                return;
            }

            const target = event.target as HTMLElement | null;
            let interactArea = target?.closest('.timeline-editor-time-area-interact') as HTMLElement | null;
            if (!interactArea) {
                const editArea = target?.closest('.timeline-editor-edit-area') as HTMLElement | null;
                const onClip = Boolean(target?.closest('.timeline-editor-action'));
                if (editArea && !onClip) {
                    interactArea = editArea;
                }
            }
            if (!interactArea) {
                return;
            }

            const scrubArea = interactArea;

            event.preventDefault();
            isScrubbingRef.current = true;
            updateTimeFromClientX(event.clientX, scrubArea);

            const onMouseMove = (moveEvent: MouseEvent) => {
                updateTimeFromClientX(moveEvent.clientX, scrubArea);
            };

            const onMouseUp = (upEvent: MouseEvent) => {
                updateTimeFromClientX(upEvent.clientX, scrubArea);
                isScrubbingRef.current = false;
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
            };

            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        };

        host.addEventListener('mousedown', onMouseDown);
        return () => {
            host.removeEventListener('mousedown', onMouseDown);
        };
    }, [hasVideo, updateTimeFromClientX]);

    const handleTogglePlayback = React.useCallback(() => {
        const video = videoRef.current;
        if (!video) {
            return;
        }
        if (video.paused) {
            void video.play();
        } else {
            video.pause();
        }
    }, [videoRef]);

    const handleCursorDrag = React.useCallback((time: number) => {
        if (syncingFromVideoRef.current) {
            return;
        }
        seekToTime(time, { pauseVideo: true });
    }, [seekToTime]);

    const handleClickTimeArea = React.useCallback((time: number) => {
        seekToTime(time, { pauseVideo: true });
        return true;
    }, [seekToTime]);

    const handleTimelineChange = React.useCallback(() => {
        // Read-only timeline — clip edits disabled via disableDrag.
    }, []);

    return (
        <Box
            sx={{
                flexShrink: 0,
                borderTop: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 1.5,
                    py: 0.75,
                    borderBottom: 1,
                    borderColor: 'divider',
                    userSelect: 'none',
                }}
            >
                <IconButton
                    size="small"
                    aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}
                    disabled={!hasVideo}
                    onClick={handleTogglePlayback}
                >
                    {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                </IconButton>
                <Typography variant="caption" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatPlaybackClock(currentTimeSec)} / {formatPlaybackClock(contentDurationSec)}
                </Typography>
            </Box>

            {!hasVideo ? (
                <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 1.25 }}>
                    Chưa có video trên timeline
                </Typography>
            ) : (
                <Box
                    ref={timelineHostRef}
                    sx={{
                        height: timelineTotalHeight,
                        minHeight: timelineTotalHeight,
                        maxHeight: timelineTotalHeight,
                        display: 'flex',
                        overflow: 'visible',
                        pt: `${CURSOR_HEAD_OVERFLOW}px`,
                        boxSizing: 'border-box',
                        bgcolor: '#191b1d',
                        userSelect: 'none',
                    }}
                >
                    <Box
                        sx={{
                            width: TRACK_LABELS_WIDTH,
                            flexShrink: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            height: timelineTotalHeight - CURSOR_HEAD_OVERFLOW,
                            borderRight: 1,
                            borderColor: 'rgba(255,255,255,0.12)',
                            bgcolor: '#141618',
                        }}
                    >
                        <Box
                            sx={{
                                height: TIMELINE_RULER_HEIGHT,
                                flexShrink: 0,
                            }}
                        />
                        <Box
                            sx={{
                                height: AGENT_VIDEO_TRACK_ROW_HEIGHT + TIMELINE_EDIT_AREA_TOP_GAP,
                                display: 'flex',
                                alignItems: 'center',
                                px: 1,
                                mt: `${TIMELINE_EDIT_AREA_TOP_GAP}px`,
                            }}
                        >
                            <Typography
                                variant="caption"
                                sx={{ color: 'rgba(255,255,255,0.72)', fontWeight: 600 }}
                            >
                                Video
                            </Typography>
                        </Box>
                    </Box>

                    <Box
                        sx={{
                            position: 'relative',
                            flex: 1,
                            minWidth: 0,
                            height: timelineTotalHeight - CURSOR_HEAD_OVERFLOW,
                            overflow: 'visible',
                            '& .timeline-editor': {
                                height: `${timelineTotalHeight - CURSOR_HEAD_OVERFLOW}px !important`,
                                width: '100% !important',
                                minHeight: `${timelineTotalHeight - CURSOR_HEAD_OVERFLOW}px`,
                                maxHeight: `${timelineTotalHeight - CURSOR_HEAD_OVERFLOW}px`,
                                overflow: 'visible !important',
                                userSelect: 'none !important',
                            },
                            '& .timeline-editor-cursor': {
                                top: '0 !important',
                                height: '100% !important',
                                zIndex: 1,
                                pointerEvents: 'auto',
                            },
                            '& .timeline-editor-cursor-top': {
                                top: '0 !important',
                                width: '10px !important',
                                height: '15px !important',
                                transform: 'translate(-50%, -100%) scaleX(2) !important',
                            },
                            '& .timeline-editor-cursor-top path': {
                                fill: '#5297FF',
                            },
                            '& .timeline-editor-edit-area': {
                                flex: '1 1 auto',
                                minHeight: 0,
                                marginTop: `${TIMELINE_EDIT_AREA_TOP_GAP}px`,
                                overflow: 'hidden',
                            },
                            '& .timeline-editor-action': {
                                backgroundColor: 'transparent !important',
                            },
                            '& .timeline-editor-action .timeline-editor-action-left-stretch, & .timeline-editor-action .timeline-editor-action-right-stretch': {
                                opacity: '0 !important',
                            },
                        }}
                    >
                        <Timeline
                            ref={timelineRef}
                            editorData={editorData}
                            effects={AGENT_VIDEO_TIMELINE_EFFECTS}
                            scale={TIMELINE_SCALE}
                            scaleWidth={TIMELINE_SCALE_WIDTH}
                            scaleSplitCount={TIMELINE_SCALE_SPLIT_COUNT}
                            startLeft={TIMELINE_START_LEFT}
                            minScaleCount={minScaleCount}
                            rowHeight={AGENT_VIDEO_TRACK_ROW_HEIGHT}
                            gridSnap
                            dragLine
                            disableDrag
                            autoScroll
                            style={{
                                width: '100%',
                                height: timelineTotalHeight - CURSOR_HEAD_OVERFLOW,
                            }}
                            onChange={handleTimelineChange}
                            onCursorDrag={handleCursorDrag}
                            onClickTimeArea={handleClickTimeArea}
                            getActionRender={() => (
                                <AgentVideoFilmstripClip
                                    clipLabel={clipLabel}
                                    thumbnails={thumbnails}
                                    loading={filmstripLoading}
                                    failed={filmstripFailed}
                                />
                            )}
                        />
                    </Box>
                </Box>
            )}
        </Box>
    );
}
