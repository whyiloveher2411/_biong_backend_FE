import React from 'react';
import { Box, Typography } from '@mui/material';
import {
    computeContainScale,
    computeScaledStageHeight,
    HF_STAGE_HEIGHT,
    HF_STAGE_WIDTH,
} from './agentVideoHtmlBeatPreviewScale';
import { seekCustomHtmlIframe } from './agentVideoCustomHtmlPreview';

type Props = {
    beatId: string;
    html: string;
    revision?: string;
    audioUrl?: string;
    startSec: number;
    durationSec: number;
};

function muteIframeMedia(iframe: HTMLIFrameElement | null): void {
    try {
        iframe?.contentDocument?.querySelectorAll<HTMLMediaElement>('audio, video').forEach((media) => {
            media.muted = true;
            media.volume = 0;
        });
    } catch {
        // Ignore sandbox/document access failures.
    }
}

export default function ShortVideoAgentBeatVisualPreview({
    beatId,
    html,
    revision = '',
    audioUrl = '',
    startSec,
    durationSec,
}: Props) {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const iframeRef = React.useRef<HTMLIFrameElement | null>(null);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);
    const frameRef = React.useRef<number | null>(null);
    const elapsedBeforePlayRef = React.useRef(0);
    const lastSeekAtRef = React.useRef(0);
    const [containerWidth, setContainerWidth] = React.useState(0);
    const [isPlaying, setIsPlaying] = React.useState(false);

    const safeDurationSec = Math.max(0.1, Number(durationSec) || 0.1);
    const hasHtml = Boolean(html.trim());
    const containScale = computeContainScale(containerWidth || 360);
    const scaledStageHeight = computeScaledStageHeight(containScale);

    React.useEffect(() => {
        elapsedBeforePlayRef.current = 0;
        setIsPlaying(false);
        const audio = audioRef.current;
        if (audio) {
            audio.pause();
            try {
                audio.currentTime = Math.max(0, startSec);
            } catch {
                // Audio metadata may not be ready yet.
            }
        }
    }, [beatId, html, startSec]);

    React.useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return undefined;
        }

        const updateWidth = () => setContainerWidth(container.clientWidth);
        updateWidth();
        const observer = new ResizeObserver(updateWidth);
        observer.observe(container);
        return () => observer.disconnect();
    }, [hasHtml]);

    React.useEffect(() => {
        const audio = audioRef.current;
        if (!hasHtml || !isPlaying) {
            return undefined;
        }

        const startedAt = performance.now() - (elapsedBeforePlayRef.current * 1000);
        const useAudioClock = Boolean(audio && audioUrl);

        const tick = (now: number) => {
            let localTimeSec = 0;
            if (useAudioClock && audio) {
                localTimeSec = Math.max(0, audio.currentTime - startSec);
                if (localTimeSec >= safeDurationSec || audio.currentTime < startSec) {
                    localTimeSec = 0;
                    try {
                        audio.currentTime = Math.max(0, startSec);
                        if (!audio.paused) {
                            void audio.play().catch(() => undefined);
                        }
                    } catch {
                        // Audio metadata may not be ready yet.
                    }
                }
            } else {
                const elapsedSec = Math.max(0, (now - startedAt) / 1000);
                localTimeSec = elapsedSec % safeDurationSec;
            }

            elapsedBeforePlayRef.current = localTimeSec;
            if (now - lastSeekAtRef.current >= 1000 / 24) {
                lastSeekAtRef.current = now;
                seekCustomHtmlIframe(iframeRef.current, localTimeSec);
            }

            frameRef.current = window.requestAnimationFrame(tick);
        };

        frameRef.current = window.requestAnimationFrame(tick);
        return () => {
            if (frameRef.current != null) {
                window.cancelAnimationFrame(frameRef.current);
                frameRef.current = null;
            }
        };
    }, [audioUrl, beatId, hasHtml, isPlaying, safeDurationSec, startSec]);

    React.useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                audioRef.current?.pause();
                setIsPlaying(false);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    React.useEffect(() => () => {
        audioRef.current?.pause();
    }, []);

    const handleIframeLoad = () => {
        muteIframeMedia(iframeRef.current);
        seekCustomHtmlIframe(iframeRef.current, elapsedBeforePlayRef.current);
        window.setTimeout(() => {
            muteIframeMedia(iframeRef.current);
            seekCustomHtmlIframe(iframeRef.current, elapsedBeforePlayRef.current);
        }, 50);
    };

    const handleAudioReady = () => {
        const audio = audioRef.current;
        if (!audio || !audioUrl) {
            return;
        }
        audio.muted = false;
        audio.volume = 1;
        try {
            audio.currentTime = Math.max(0, startSec + elapsedBeforePlayRef.current);
        } catch {
            return;
        }
    };

    const handleAudioTimeUpdate = (audio: HTMLAudioElement) => {
        const beatEndSec = startSec + safeDurationSec;
        const outsideBeat = audio.currentTime < startSec || audio.currentTime >= beatEndSec;
        if (outsideBeat) {
            const shouldContinue = !audio.paused;
            try {
                audio.currentTime = Math.max(0, startSec);
            } catch {
                return;
            }
            elapsedBeforePlayRef.current = 0;
            seekCustomHtmlIframe(iframeRef.current, 0);
            if (shouldContinue) {
                void audio.play().catch(() => undefined);
            }
            return;
        }

        const localTimeSec = Math.max(0, audio.currentTime - startSec);
        elapsedBeforePlayRef.current = localTimeSec;
        seekCustomHtmlIframe(iframeRef.current, localTimeSec);
    };

    const handleTogglePlayback = () => {
        const audio = audioRef.current;
        if (audio && audioUrl) {
            if (audio.paused) {
                audio.muted = false;
                audio.volume = 1;
                void audio.play().catch(() => undefined);
            } else {
                audio.pause();
            }
            return;
        }
        setIsPlaying((current) => !current);
    };

    if (!hasHtml) {
        return (
            <Box
                sx={{
                    width: '100%',
                    maxWidth: 360,
                    minHeight: 220,
                    mx: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 1,
                    borderStyle: 'dashed',
                    borderColor: 'divider',
                    borderRadius: 2,
                    bgcolor: 'grey.50',
                    px: 3,
                    textAlign: 'center',
                }}
            >
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Chưa có HTML cho {beatId}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75 }}>
                    Tạo HTML beat để xem preview visual tại đây
                </Typography>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            }}
        >
            <Box
                ref={containerRef}
                role="button"
                tabIndex={0}
                aria-label={isPlaying ? 'Tạm dừng preview beat' : 'Phát preview beat'}
                onClick={handleTogglePlayback}
                onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleTogglePlayback();
                    }
                }}
                sx={{
                    width: '100%',
                    maxWidth: 360,
                    aspectRatio: '9 / 16',
                    bgcolor: 'common.black',
                    borderRadius: 2,
                    overflow: 'hidden',
                    boxShadow: '0 14px 40px rgba(15,23,42,0.22)',
                    position: 'relative',
                    cursor: 'pointer',
                    '&:focus-visible': {
                        outline: '3px solid',
                        outlineColor: 'primary.main',
                        outlineOffset: 3,
                    },
                }}
            >
                <Box
                    sx={{
                        width: '100%',
                        height: scaledStageHeight > 0 ? scaledStageHeight : '100%',
                        overflow: 'hidden',
                        position: 'relative',
                    }}
                >
                    <Box
                        sx={{
                            width: HF_STAGE_WIDTH,
                            height: HF_STAGE_HEIGHT,
                            transform: `scale(${containScale})`,
                            transformOrigin: 'top left',
                        }}
                    >
                        <Box
                            component="iframe"
                            key={`${beatId}:${revision}:${html.length}`}
                            ref={iframeRef}
                            title={`Preview visual ${beatId}`}
                            sandbox="allow-scripts allow-same-origin"
                            srcDoc={html}
                            onLoad={handleIframeLoad}
                            sx={{
                                width: HF_STAGE_WIDTH,
                                height: HF_STAGE_HEIGHT,
                                border: 0,
                                display: 'block',
                                bgcolor: 'common.black',
                                pointerEvents: 'none',
                            }}
                        />
                    </Box>
                </Box>
            </Box>

            <audio
                ref={audioRef}
                src={audioUrl || undefined}
                controls
                controlsList="nodownload noplaybackrate"
                preload="metadata"
                onLoadedMetadata={handleAudioReady}
                onTimeUpdate={(event) => handleAudioTimeUpdate(event.currentTarget)}
                onSeeking={(event) => handleAudioTimeUpdate(event.currentTarget)}
                onSeeked={(event) => handleAudioTimeUpdate(event.currentTarget)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={(event) => handleAudioTimeUpdate(event.currentTarget)}
                style={{
                    display: audioUrl ? 'block' : 'none',
                    width: '100%',
                    maxWidth: 360,
                    height: 40,
                    marginTop: 12,
                }}
            >
                <track kind="captions" />
            </audio>
        </Box>
    );
}
