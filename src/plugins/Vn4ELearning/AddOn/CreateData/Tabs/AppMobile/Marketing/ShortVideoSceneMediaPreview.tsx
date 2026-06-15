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
                width: 280,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                position: 'sticky',
                top: 0,
                alignSelf: 'flex-start',
            }}
        >
            <Typography variant="subtitle2" fontWeight={600}>
                Xem trước media
            </Typography>
            <Box
                sx={{
                    width: '100%',
                    aspectRatio: '9 / 16',
                    maxHeight: 420,
                    borderRadius: 2,
                    overflow: 'hidden',
                    bgcolor: '#000',
                    border: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {!showVisual || visualType === 'none' ? (
                    <Typography variant="caption" color="text.secondary" sx={{ px: 2, textAlign: 'left' }}>
                        Chưa có media — chọn ảnh hoặc video trong tab Media
                    </Typography>
                ) : visualType === 'image' && isHttpsImageUrl(ref) ? (
                    <Box
                        component="img"
                        src={ref}
                        alt=""
                        sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                        }}
                    />
                ) : visualType === 'video' && youtubeId ? (
                    <Box
                        component="iframe"
                        key={embedUrl}
                        src={embedUrl}
                        title="YouTube preview"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        sx={{
                            width: '100%',
                            height: '100%',
                            border: 0,
                        }}
                    />
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
                        width: '100%',
                        borderRadius: 1,
                        border: 1,
                        borderColor: 'divider',
                    }}
                />
            ) : null}
        </Box>
    );
}
