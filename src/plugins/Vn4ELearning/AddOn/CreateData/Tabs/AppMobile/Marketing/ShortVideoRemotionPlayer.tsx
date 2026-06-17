import React from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { Box, IconButton, Slider, Typography } from '@mui/material';
import {
    ShortVideoComposition,
    calcCompositionDurationInFrames,
} from '@spacedev/remotion-short-video/ShortVideoComposition';
import type { ShortVideoRenderManifest } from 'helpers/shortVideoRenderManifest';

type ManifestProps = {
    manifest: ShortVideoRenderManifest;
};

type PlayerRefHandle = React.MutableRefObject<PlayerRef | null>;

type PreviewProps = ManifestProps & {
    playerRef: PlayerRefHandle;
    onPlayerReady?: (player: PlayerRef | null) => void;
};

type TimelineBarProps = ManifestProps & {
    playerRef: PlayerRefHandle;
    playerInstance: PlayerRef | null;
    rightSlot?: React.ReactNode;
};

function formatPlaybackClock(totalSec: number): string {
    const clamped = Math.max(0, totalSec);
    const minutes = Math.floor(clamped / 60);
    const remainder = clamped % 60;
    const wholeSec = Math.floor(remainder);
    const tenths = Math.floor((remainder - wholeSec) * 10);
    return `${minutes}:${String(wholeSec).padStart(2, '0')}.${tenths}`;
}

function useManifestTiming(manifest: ShortVideoRenderManifest) {
    const fps = manifest.fps || 30;
    const width = manifest.width || 1080;
    const height = manifest.height || 1920;
    const durationInFrames = React.useMemo(
        () => Math.max(1, calcCompositionDurationInFrames(manifest)),
        [manifest]
    );
    const durationSec = durationInFrames / fps;

    return { fps, width, height, durationInFrames, durationSec };
}

function useRemotionPlayback(
    playerRef: PlayerRefHandle,
    playerInstance: PlayerRef | null,
    fps: number
) {
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [currentTimeSec, setCurrentTimeSec] = React.useState(0);
    const [isSeeking, setIsSeeking] = React.useState(false);

    const syncCurrentTime = React.useCallback(() => {
        const frame = playerRef.current?.getCurrentFrame() ?? 0;
        setCurrentTimeSec(frame / fps);
    }, [fps, playerRef]);

    React.useEffect(() => {
        if (!playerInstance) {
            setIsPlaying(false);
            setCurrentTimeSec(0);
        }
    }, [playerInstance]);

    React.useEffect(() => {
        const player = playerInstance;
        if (!player) {
            return;
        }

        const onPlay = () => setIsPlaying(true);
        const onPause = () => {
            setIsPlaying(false);
            syncCurrentTime();
        };
        const onTimeUpdate = () => {
            if (!isSeeking) {
                syncCurrentTime();
            }
        };
        const onSeeked = () => syncCurrentTime();
        const onEnded = () => {
            setIsPlaying(false);
            syncCurrentTime();
        };

        player.addEventListener('play', onPlay);
        player.addEventListener('pause', onPause);
        player.addEventListener('timeupdate', onTimeUpdate);
        player.addEventListener('frameupdate', onTimeUpdate);
        player.addEventListener('seeked', onSeeked);
        player.addEventListener('ended', onEnded);

        return () => {
            player.removeEventListener('play', onPlay);
            player.removeEventListener('pause', onPause);
            player.removeEventListener('timeupdate', onTimeUpdate);
            player.removeEventListener('frameupdate', onTimeUpdate);
            player.removeEventListener('seeked', onSeeked);
            player.removeEventListener('ended', onEnded);
        };
    }, [playerInstance, isSeeking, syncCurrentTime]);

    const handleTogglePlayback = React.useCallback(() => {
        playerRef.current?.toggle();
    }, [playerRef]);

    const handleSeekChange = React.useCallback(
        (_event: Event, value: number | number[]) => {
            const nextSec = Array.isArray(value) ? value[0] : value;
            setIsSeeking(true);
            setCurrentTimeSec(nextSec);
        },
        []
    );

    const handleSeekCommitted = React.useCallback(
        (_event: Event | React.SyntheticEvent, value: number | number[]) => {
            const nextSec = Array.isArray(value) ? value[0] : value;
            playerRef.current?.seekTo(Math.round(nextSec * fps));
            setCurrentTimeSec(nextSec);
            setIsSeeking(false);
        },
        [fps, playerRef]
    );

    return {
        isPlaying,
        currentTimeSec,
        handleTogglePlayback,
        handleSeekChange,
        handleSeekCommitted,
    };
}

export function ShortVideoRemotionPreview({
    manifest,
    playerRef,
    onPlayerReady,
}: PreviewProps) {
    const { fps, width, height, durationInFrames } = useManifestTiming(manifest);
    const previewFrameRef = React.useRef<HTMLDivElement | null>(null);
    const [frameSize, setFrameSize] = React.useState({ width: 0, height: 0 });

    const inputProps = React.useMemo(
        () => ({ manifest }),
        [manifest]
    );

    const bindPlayerRef = React.useCallback(
        (node: PlayerRef | null) => {
            playerRef.current = node;
            onPlayerReady?.(node);
        },
        [playerRef, onPlayerReady]
    );

    const handlePreviewClick = React.useCallback(() => {
        playerRef.current?.toggle();
    }, [playerRef]);

    React.useEffect(() => {
        const node = previewFrameRef.current;
        if (!node) {
            return;
        }

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) {
                return;
            }
            const nextWidth = Math.max(0, entry.contentRect.width);
            const nextHeight = Math.max(0, entry.contentRect.height);
            setFrameSize((prev) => {
                if (prev.width === nextWidth && prev.height === nextHeight) {
                    return prev;
                }
                return { width: nextWidth, height: nextHeight };
            });
        });

        observer.observe(node);
        return () => {
            observer.disconnect();
        };
    }, []);

    const playerSize = React.useMemo(() => {
        if (frameSize.width <= 0 || frameSize.height <= 0 || width <= 0 || height <= 0) {
            return null;
        }
        const scale = Math.min(frameSize.width / width, frameSize.height / height);
        const nextWidth = Math.max(1, Math.floor(width * scale));
        const nextHeight = Math.max(1, Math.floor(height * scale));
        return { width: nextWidth, height: nextHeight };
    }, [frameSize.height, frameSize.width, height, width]);

    return (
        <Box
            ref={previewFrameRef}
            onClick={handlePreviewClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handlePreviewClick();
                }
            }}
            role="button"
            tabIndex={0}
            aria-label="Phát hoặc tạm dừng video"
            sx={{
                width: '100%',
                height: '100%',
                minHeight: 0,
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 2,
                cursor: 'pointer',
                outline: 'none',
                WebkitTapHighlightColor: 'transparent',
                '&:focus, &:focus-visible': {
                    outline: 'none',
                },
            }}
        >
            {playerSize ? (
                <Box
                    sx={{
                        width: playerSize.width,
                        height: playerSize.height,
                        borderRadius: 1,
                        overflow: 'hidden',
                        boxShadow: '0 0 0 1px rgba(255,255,255,0.9), 0 6px 18px rgba(10,15,30,0.28)',
                        bgcolor: '#000',
                    }}
                >
                    <Player
                        ref={bindPlayerRef}
                        component={ShortVideoComposition}
                        inputProps={inputProps}
                        durationInFrames={durationInFrames}
                        fps={fps}
                        compositionWidth={width}
                        compositionHeight={height}
                        style={{
                            width: playerSize.width,
                            height: playerSize.height,
                            pointerEvents: 'none',
                        }}
                        controls={false}
                        initiallyMuted={false}
                        clickToPlay={false}
                    />
                </Box>
            ) : null}
        </Box>
    );
}

/** Box timeline + play/time; có thể gắn action (vd. Render) bên phải cùng hàng. */
export function ShortVideoRemotionTimelineBar({
    manifest,
    playerRef,
    playerInstance,
    rightSlot,
}: TimelineBarProps) {
    const { fps, durationSec } = useManifestTiming(manifest);
    const {
        isPlaying,
        currentTimeSec,
        handleTogglePlayback,
        handleSeekChange,
        handleSeekCommitted,
    } = useRemotionPlayback(playerRef, playerInstance, fps);

    const progressMax = Math.max(durationSec, 0.001);
    const progressValue = Math.min(currentTimeSec, progressMax);
    const progressRatio = progressMax > 0 ? progressValue / progressMax : 0;

    return (
        <Box
            sx={{
                flexShrink: 0,
                borderTop: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
                px: 2,
                py: 1.5,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
            }}
        >
            <Box
                sx={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                }}
            >
                <IconButton
                    aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}
                    onClick={handleTogglePlayback}
                    sx={{
                        width: 60,
                        height: 60,
                        flexShrink: 0,
                        color: 'primary.main',
                        bgcolor: 'action.hover',
                        borderRadius: 2,
                        '&:hover': {
                            bgcolor: 'action.selected',
                        },
                    }}
                >
                    {isPlaying ? (
                        <PauseIcon sx={{ fontSize: 32 }} />
                    ) : (
                        <PlayArrowIcon sx={{ fontSize: 32 }} />
                    )}
                </IconButton>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                            display: 'block',
                            mt: -1,
                            fontVariantNumeric: 'tabular-nums',
                            lineHeight: 1,
                        }}
                    >
                        {formatPlaybackClock(currentTimeSec)} / {formatPlaybackClock(durationSec)}
                    </Typography>
                    <Box
                        sx={{
                            position: 'relative',
                            height: 28,
                            display: 'flex',
                            alignItems: 'center',
                        }}
                    >
                        <Box
                            sx={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                height: '2px',
                                bgcolor: 'divider',
                                borderRadius: 1,
                            }}
                        />
                        <Box
                            sx={{
                                position: 'absolute',
                                left: 0,
                                width: `${progressRatio * 100}%`,
                                height: '2px',
                                bgcolor: 'primary.main',
                                borderRadius: 1,
                            }}
                        />
                        <Slider
                            size="small"
                            value={progressValue}
                            min={0}
                            max={progressMax}
                            step={0.05}
                            aria-label="Tiến trình video"
                            onChange={handleSeekChange}
                            onChangeCommitted={handleSeekCommitted}
                            sx={{
                                position: 'relative',
                                zIndex: 1,
                                width: '100%',
                                p: 0,
                                color: 'primary.main',
                                height: 28,
                                '& .MuiSlider-track': {
                                    opacity: 0,
                                },
                                '& .MuiSlider-rail': {
                                    opacity: 0,
                                },
                                '& .MuiSlider-thumb': {
                                    width: 14,
                                    height: 14,
                                    bgcolor: 'primary.main',
                                    border: '2px solid',
                                    borderColor: 'background.paper',
                                    boxShadow: '0 0 0 1px rgba(0,0,0,0.08)',
                                    '&::before': {
                                        display: 'none',
                                    },
                                    '&:hover, &.Mui-focusVisible': {
                                        boxShadow: '0 0 0 4px rgba(25, 118, 210, 0.16)',
                                    },
                                    '&.Mui-active': {
                                        boxShadow: '0 0 0 6px rgba(25, 118, 210, 0.2)',
                                    },
                                },
                            }}
                        />
                    </Box>
                </Box>
            </Box>
            {rightSlot ? (
                <Box sx={{ flexShrink: 0 }}>
                    {rightSlot}
                </Box>
            ) : null}
        </Box>
    );
}

/** @deprecated Dùng ShortVideoRemotionTimelineBar với prop rightSlot. */
export function ShortVideoRemotionPlaybackBar({
    manifest,
    playerRef,
    playerInstance,
    footerRight,
}: TimelineBarProps & { footerRight?: React.ReactNode }) {
    return (
        <ShortVideoRemotionTimelineBar
            manifest={manifest}
            playerRef={playerRef}
            playerInstance={playerInstance}
            rightSlot={footerRight}
        />
    );
}

export default function ShortVideoRemotionPlayer({ manifest }: ManifestProps) {
    const playerRef = React.useRef<PlayerRef | null>(null);
    const [playerInstance, setPlayerInstance] = React.useState<PlayerRef | null>(null);

    return (
        <>
            <ShortVideoRemotionPreview
                manifest={manifest}
                playerRef={playerRef}
                onPlayerReady={setPlayerInstance}
            />
            <ShortVideoRemotionTimelineBar
                manifest={manifest}
                playerRef={playerRef}
                playerInstance={playerInstance}
            />
        </>
    );
}
