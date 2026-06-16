import React from 'react';
import { Box, Typography } from '@mui/material';
import {
    resolveSceneShowVisual,
    resolveSceneVisualRef,
    resolveSceneVisualStartSec,
    resolveSceneVisualType,
    resolveSceneVisualYoutubeId,
    type ShortVideoManifestScene,
} from 'helpers/shortVideoRenderManifest';
import {
    buildYoutubeEmbedUrl,
    buildYoutubeThumbnailUrl,
    isHttpsImageUrl,
} from 'helpers/shortVideoYoutube';

type Props = {
    scene: ShortVideoManifestScene;
};

export default function ShortVideoSceneMediaPreview({ scene }: Props) {
    const visualType = resolveSceneVisualType(scene);
    const showVisual = resolveSceneShowVisual(scene);
    const ref = resolveSceneVisualRef(scene);
    const youtubeId = resolveSceneVisualYoutubeId(scene);
    const startSec = resolveSceneVisualStartSec(scene);
    const embedUrl = youtubeId
        ? buildYoutubeEmbedUrl(youtubeId, { startSec, autoplay: true })
        : '';

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
                ) : visualType === 'image' && isHttpsImageUrl(ref) ? (
                    <Box
                        component="img"
                        src={ref}
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
                ) : (
                    <Typography variant="caption" color="error" sx={{ px: 2, textAlign: 'left' }}>
                        URL media chưa hợp lệ
                    </Typography>
                )}
            </Box>
            {visualType === 'video' && youtubeId ? (
                <Box
                    component="img"
                    src={buildYoutubeThumbnailUrl(youtubeId)}
                    alt=""
                    sx={{
                        display: 'block',
                        width: '100%',
                        maxWidth: '100%',
                        height: 'auto',
                        borderRadius: 1,
                        border: 1,
                        borderColor: 'divider',
                    }}
                />
            ) : null}
        </Box>
    );
}
