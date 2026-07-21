import React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import LoadingButton from 'components/atoms/LoadingButton';
import { downloadImageUrl, openImagePopup } from 'helpers/image';

type Props = {
    imageUrl: string;
    shortVideoId?: number;
    onDownloadError?: (message: string) => void;
};

export default function ShortVideoAgentThumbnailImagePreview({
    imageUrl,
    shortVideoId = 0,
    onDownloadError,
}: Props) {
    const [downloading, setDownloading] = React.useState(false);
    const url = String(imageUrl || '').trim();

    const handleDownload = React.useCallback(async () => {
        if (!url) {
            return;
        }
        setDownloading(true);
        try {
            const fileName = shortVideoId > 0
                ? `short-video-${shortVideoId}-thumbnail.png`
                : 'thumbnail.png';
            await downloadImageUrl(url, fileName);
        } catch (e) {
            onDownloadError?.(e instanceof Error ? e.message : String(e));
        } finally {
            setDownloading(false);
        }
    }, [onDownloadError, shortVideoId, url]);

    if (!url) {
        return (
            <Box
                sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                    p: 2,
                    bgcolor: 'action.hover',
                }}
            >
                <Typography variant="body2" color="text.secondary">
                    Chưa có ảnh thumbnail — bấm Generate image sau khi có HTML.
                </Typography>
            </Box>
        );
    }

    return (
        <Stack spacing={1}>
            <Box
                sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                    overflow: 'hidden',
                    bgcolor: '#111',
                }}
            >
                <Box
                    component="img"
                    src={url}
                    alt="Thumbnail preview"
                    sx={{
                        display: 'block',
                        width: '100%',
                        maxHeight: 420,
                        objectFit: 'contain',
                    }}
                />
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button
                    size="small"
                    variant="outlined"
                    startIcon={<OpenInNewIcon />}
                    onClick={() => openImagePopup(url)}
                >
                    Mở ảnh full
                </Button>
                <LoadingButton
                    size="small"
                    variant="contained"
                    startIcon={<CloudDownloadIcon />}
                    loading={downloading}
                    disabled={downloading}
                    onClick={() => { void handleDownload(); }}
                >
                    Tải ảnh
                </LoadingButton>
            </Stack>
        </Stack>
    );
}
