import React from 'react';
import { Box, Typography } from '@mui/material';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
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
};

export default function ShortVideoAgentBeatImagePreview({
    beatId,
    imageUrl = '',
    clipAspect = '9:16',
    audioUrl = '',
}: Props) {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const [containerWidth, setContainerWidth] = React.useState(0);
    const [failed, setFailed] = React.useState(false);

    const hasImage = Boolean(String(imageUrl || '').trim()) && !failed;
    const stage = getClipStageDimensions(clipAspect);
    const containScale = computeContainScale(containerWidth || 360, undefined, clipAspect);
    const scaledStageHeight = computeScaledStageHeight(containScale, clipAspect);

    React.useEffect(() => {
        setFailed(false);
    }, [beatId, imageUrl]);

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
    }, [hasImage]);

    if (!hasImage) {
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
                    bgcolor: '#fff',
                }}
            >
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
