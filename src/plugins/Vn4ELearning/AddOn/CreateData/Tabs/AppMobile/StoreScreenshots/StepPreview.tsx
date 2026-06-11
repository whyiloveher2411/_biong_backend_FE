import React from 'react';
import { Alert, Box, Stack } from '@mui/material';
import { alpha } from '@mui/material/styles';
import useDraggableScroll from 'hook/useDraggableScroll';
import type { StoreScreenshotConfig } from './storeScreenshotTypes';
import { encodeExternalImageUrlWithCacheBust } from './storeScreenshotImageUtils';

type Props = {
    config: StoreScreenshotConfig;
};

function StepPreview({ config }: Props) {
    const scrollRef = React.useRef<HTMLDivElement>(null);
    const { onMouseDown } = useDraggableScroll(scrollRef, { direction: 'horizontal' });

    const items = [...(config.screenshots || [])]
        .sort((a, b) => a.order - b.order)
        .filter((item) => String(item.ai_image_url || '').trim() !== '');

    const previewCacheBust = React.useMemo(
        () => Date.now(),
        [items.map((item) => `${item.id}:${item.ai_image_url}`).join('|')],
    );

    return (
        <Stack spacing={2}>
            <Alert severity="info">
                Xem trước các ảnh store do AI tạo mà bạn đã upload ở bước Copy & ảnh AI. Cuộn hoặc kéo ngang tự do để xem như trên app store.
            </Alert>

            {items.length === 0 ? (
                <Alert severity="warning">
                    Chưa có ảnh AI nào. Hãy upload ảnh ở bước Copy & ảnh AI trước.
                </Alert>
            ) : (
                <Box
                    ref={scrollRef}
                    onMouseDown={onMouseDown}
                    sx={(theme) => ({
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 2,
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        cursor: 'grab',
                        py: 3,
                        px: { xs: 1.5, md: 2.5 },
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.common.black, 0.04),
                        border: '1px solid',
                        borderColor: 'divider',
                        scrollSnapType: 'none',
                        WebkitOverflowScrolling: 'touch',
                        '&::-webkit-scrollbar': { height: 8 },
                        '&::-webkit-scrollbar-thumb': {
                            borderRadius: 4,
                            bgcolor: 'action.disabled',
                        },
                    })}
                >
                    {items.map((item) => {
                        const imageUrl = encodeExternalImageUrlWithCacheBust(item.ai_image_url, previewCacheBust);

                        return (
                            <Box
                                key={item.id}
                                sx={(theme) => ({
                                    flex: '0 0 auto',
                                    borderRadius: 2.5,
                                    overflow: 'hidden',
                                    bgcolor: theme.palette.common.black,
                                    boxShadow: theme.shadows[6],
                                })}
                            >
                                <Box
                                    component="img"
                                    src={imageUrl}
                                    alt={`Store screenshot ${item.order}`}
                                    draggable={false}
                                    sx={{
                                        display: 'block',
                                        height: 'auto',
                                        width: 'auto',
                                        maxHeight: 'min(78vh, 920px)',
                                        objectFit: 'contain',
                                    }}
                                />
                            </Box>
                        );
                    })}
                </Box>
            )}
        </Stack>
    );
}

export default StepPreview;
