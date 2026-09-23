import React from 'react';
import { Box, Typography } from '@mui/material';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import {
    computeContainScale,
    computeScaledStageHeight,
    getClipStageDimensions,
    type ClipAspect,
} from './agentVideoHtmlBeatPreviewScale';

type Props = {
    beatId: string;
    imageUrl?: string;
    clipAspect?: ClipAspect;
    /** Audio beat (beat-audio mode) — phát thử ngay dưới ảnh. */
    audioUrl?: string;
    /** Video thay thế ảnh beat (render bằng video khi mediaSource = 'video'). */
    videoUrl?: string;
    /** Nguồn render đang chọn: 'image' | 'video'. */
    mediaSource?: 'image' | 'video';
};

export default function ShortVideoAgentBeatImagePreview({
    beatId,
    imageUrl = '',
    clipAspect = '9:16',
    audioUrl = '',
    videoUrl = '',
    mediaSource,
}: Props) {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const videoRef = React.useRef<HTMLVideoElement | null>(null);
    const [containerWidth, setContainerWidth] = React.useState(0);
    const [failed, setFailed] = React.useState(false);
    const [videoFailed, setVideoFailed] = React.useState(false);
    const [videoPlaying, setVideoPlaying] = React.useState(false);

    const videoSrc = String(videoUrl || '').trim();
    const hasImage = Boolean(String(imageUrl || '').trim()) && !failed;
    const showVideo = mediaSource === 'video' && videoSrc !== '' && !videoFailed;
    const hasMedia = showVideo || hasImage;
    const stage = getClipStageDimensions(clipAspect);
    const containScale = computeContainScale(containerWidth || 360, undefined, clipAspect);
    const scaledStageHeight = computeScaledStageHeight(containScale, clipAspect);

    React.useEffect(() => {
        setFailed(false);
        setVideoFailed(false);
        setVideoPlaying(false);
    }, [beatId, imageUrl, videoSrc, mediaSource]);

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
    }, [hasMedia]);

    const toggleVideoPlay = () => {
        const el = videoRef.current;
        if (!el) {
            return;
        }
        if (el.paused) {
            void el.play().catch(() => undefined);
        } else {
            el.pause();
        }
    };

    if (!hasMedia) {
        return (
            <Box
                sx={{
                    width: '100%',
                    maxWidth: clipAspect === '16:9' ? 480 : 360,
                    minHeight: 180,
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
                <ImageOutlinedIcon color="disabled" sx={{ mb: 1 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Chưa có ảnh cho {beatId}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75 }}>
                    Mở Duck.ai hoặc Meta.ai từ timeline/drawer — download ảnh → tự lưu vào beat này
                </Typography>
            </Box>
        );
    }

    return (
        <Box
            ref={containerRef}
            sx={{
                width: '100%',
                maxWidth: clipAspect === '16:9' ? 480 : 360,
                aspectRatio: stage.aspectRatioCss,
                mx: 'auto',
                bgcolor: 'common.black',
                borderRadius: 2,
                overflow: 'hidden',
                boxShadow: '0 14px 40px rgba(15,23,42,0.22)',
            }}
        >
            <Box
                sx={{
                    width: '100%',
                    height: scaledStageHeight > 0 ? scaledStageHeight : '100%',
                    overflow: 'hidden',
                    position: 'relative',
                    bgcolor: showVideo ? 'common.black' : '#fff',
                }}
            >
                {showVideo ? (
                    <>
                        <Box
                            component="video"
                            ref={videoRef}
                            src={videoSrc}
                            controls
                            playsInline
                            preload="metadata"
                            onError={() => setVideoFailed(true)}
                            onPlay={() => setVideoPlaying(true)}
                            onPause={() => setVideoPlaying(false)}
                            onEnded={() => setVideoPlaying(false)}
                            sx={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                display: 'block',
                                bgcolor: 'common.black',
                            }}
                        />
                        {!videoPlaying ? (
                            <Box
                                role="button"
                                aria-label="Phát video beat"
                                onClick={toggleVideoPlay}
                                sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    bgcolor: 'rgba(0,0,0,0.28)',
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 56,
                                        height: 56,
                                        borderRadius: '50%',
                                        bgcolor: 'rgba(0,0,0,0.6)',
                                        color: 'common.white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
                                    }}
                                >
                                    <PlayArrowIcon sx={{ fontSize: 34 }} />
                                </Box>
                            </Box>
                        ) : null}
                    </>
                ) : (
                    <Box
                        component="img"
                        src={imageUrl}
                        alt={`Preview ${beatId}`}
                        onError={() => setFailed(true)}
                        sx={{
                            width: stage.width,
                            height: stage.height,
                            transform: `scale(${containScale})`,
                            transformOrigin: 'top left',
                            objectFit: 'contain',
                            display: 'block',
                            bgcolor: '#fff',
                        }}
                    />
                )}
            </Box>
            {audioUrl ? (
                <audio
                    controls
                    controlsList="nodownload noplaybackrate"
                    preload="metadata"
                    src={audioUrl}
                    style={{
                        display: 'block',
                        width: '100%',
                        maxWidth: 360,
                        height: 40,
                        marginTop: 12,
                    }}
                >
                    <track kind="captions" />
                </audio>
            ) : null}
        </Box>
    );
}
