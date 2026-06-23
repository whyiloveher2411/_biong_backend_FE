import React from 'react';
import { Box, Typography } from '@mui/material';
import {
    resolveSceneShowVisual,
    resolveSceneVisualAudioVolume,
    resolveSceneVisualImageRef,
    resolveSceneVisualPlaybackUrl,
    resolveSceneVisualRef,
    resolveSceneVisualStartSec,
    resolveSceneVisualType,
    resolveSceneVisualVideoRef,
    resolveSceneVisualYoutubeId,
    resolveSceneVisualYoutubeMuted,
    type ShortVideoManifestScene,
} from 'helpers/shortVideoRenderManifest';
import { resolveSceneVisualVideoPreviewUrl } from 'helpers/shortVideoVisualRefHelpers';
import {
    buildYoutubeEmbedUrl,
    isHttpsImageUrl,
    isHttpsVideoUrl,
} from 'helpers/shortVideoYoutube';

type Props = {
    scene: ShortVideoManifestScene;
};

function resolveDirectPreviewVideoUrl(scene: ShortVideoManifestScene): string {
    const youtubeId = resolveSceneVisualYoutubeId(scene);
    if (youtubeId) {
        return '';
    }
    const playback = resolveSceneVisualPlaybackUrl(scene);
    if (playback && /^https?:\/\//i.test(playback)) {
        return playback;
    }
    const videoRef = resolveSceneVisualVideoRef(scene);
    if (videoRef && isHttpsVideoUrl(videoRef)) {
        return videoRef;
    }
    return '';
}

export default function ShortVideoSceneMediaPreview({ scene }: Props) {
    const visualType = resolveSceneVisualType(scene);
    const showVisual = resolveSceneShowVisual(scene);
    const imageRef = resolveSceneVisualImageRef(scene);
    const ref = resolveSceneVisualRef(scene);
    const youtubeId = resolveSceneVisualYoutubeId(scene);
    const startSec = resolveSceneVisualStartSec(scene);
    const youtubeMuted = resolveSceneVisualYoutubeMuted(scene);
    const videoVolume = resolveSceneVisualAudioVolume(scene);
    const directVideoUrl = visualType === 'video' ? resolveDirectPreviewVideoUrl(scene) : '';
    const embedUrl = youtubeId
        ? buildYoutubeEmbedUrl(youtubeId, { startSec, autoplay: false, muted: youtubeMuted })
        : '';

    const videoRefElement = React.useRef<HTMLVideoElement | null>(null);

    React.useEffect(() => {
        const element = videoRefElement.current;
        if (!element || !directVideoUrl) {
            return;
        }
        if (startSec > 0) {
            const applyStart = () => {
                try {
                    element.currentTime = startSec;
                } catch {
                    // ignore seek errors before metadata loads
                }
            };
            if (element.readyState >= 1) {
                applyStart();
            } else {
                element.addEventListener('loadedmetadata', applyStart, { once: true });
            }
        }
    }, [directVideoUrl, startSec]);

    React.useEffect(() => {
        const element = videoRefElement.current;
        if (!element || !directVideoUrl) {
            return;
        }
        element.volume = videoVolume;
        element.muted = videoVolume <= 0.001;
    }, [directVideoUrl, videoVolume]);

    return (
        <Box
            sx={{
                width: '100%',
                maxWidth: '100%',
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
            }}
        >
            <Typography variant="subtitle2" fontWeight={600}>
                Xem trước media
            </Typography>
            <Box
                sx={{
                    width: '100%',
                    maxWidth: '100%',
                    minWidth: 0,
                    borderRadius: 2,
                    overflow: 'hidden',
                    bgcolor: '#000',
                    border: 1,
                    borderColor: 'divider',
                }}
            >
                {!showVisual || visualType === 'none' ? (
                    <Box
                        sx={{ px: 2, py: 3, textAlign: 'left', width: '100%' }}
                    >
                        Chưa có media — chọn ảnh hoặc video trên timeline
                    </Box>
                ) : visualType === 'image' && isHttpsImageUrl(imageRef || ref) ? (
                    <Box
                        component="img"
                        src={imageRef || ref}
                        alt=""
                        sx={{
                            display: 'block',
                            width: '100%',
                            maxWidth: '100%',
                            height: 'auto',
                            objectFit: 'contain',
                        }}
                    />
                ) : visualType === 'video' && youtubeId ? (
                    <Box
                        sx={{
                            width: '100%',
                            aspectRatio: '16 / 9',
                            maxHeight: 200,
                        }}
                    >
                        <Box
                            component="iframe"
                            key={embedUrl}
                            src={embedUrl}
                            title="YouTube preview"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            sx={{
                                display: 'block',
                                width: '100%',
                                height: '100%',
                                border: 0,
                            }}
                        />
                    </Box>
                ) : visualType === 'video' && directVideoUrl ? (
                    <video
                        ref={videoRefElement}
                        key={directVideoUrl}
                        src={directVideoUrl}
                        controls
                        playsInline
                        muted={videoVolume <= 0.001}
                        poster={resolveSceneVisualVideoPreviewUrl(scene) || undefined}
                        style={{
                            display: 'block',
                            width: '100%',
                            maxWidth: '100%',
                            maxHeight: 200,
                            objectFit: 'contain',
                        }}
                    />
                ) : (
                    <Typography variant="caption" color="error" sx={{ px: 2, textAlign: 'left' }}>
                        URL media chưa hợp lệ
                    </Typography>
                )}
            </Box>
            {visualType === 'video' && (youtubeId || directVideoUrl) && videoVolume > 0.001 ? (
                <Typography variant="caption" color="text.secondary">
                    Trình duyệt có thể yêu cầu tương tác để phát tiếng
                </Typography>
            ) : null}
        </Box>
    );
}
