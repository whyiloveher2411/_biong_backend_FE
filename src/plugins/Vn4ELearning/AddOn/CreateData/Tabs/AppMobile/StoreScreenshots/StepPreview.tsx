import React from 'react';
import { Alert, Box, Chip, Stack } from '@mui/material';
import { alpha } from '@mui/material/styles';
import useDraggableScroll from 'hook/useDraggableScroll';
import GeminiLogoRegionSelector from './GeminiLogoRegionSelector';
import type { StoreScreenshotConfig } from './storeScreenshotTypes';
import type { GeminiLogoRegionsById } from './storeScreenshotGeminiLogoRegion';
import { resolveStoreScreenshotAiImageDisplayUrl } from './storeScreenshotImageUtils';

type Props = {
    config: StoreScreenshotConfig;
    regionsById: GeminiLogoRegionsById;
    activeSelectionId: string | null;
    geminiRemoverReady?: boolean;
    onRegionsChange: (regionsById: GeminiLogoRegionsById) => void;
    onActiveSelectionChange: (screenshotId: string | null) => void;
};

function StepPreview({
    config,
    regionsById,
    activeSelectionId,
    geminiRemoverReady = false,
    onRegionsChange,
    onActiveSelectionChange,
}: Props) {
    const scrollRef = React.useRef<HTMLDivElement>(null);
    const { onMouseDown } = useDraggableScroll(scrollRef, { direction: 'horizontal' });

    const items = [...(config.screenshots || [])]
        .sort((a, b) => a.order - b.order)
        .filter((item) => String(item.ai_image_url || '').trim() !== '');

    const handleRegionChange = (screenshotId: string, region: GeminiLogoRegionsById[string]) => {
        onRegionsChange({
            ...regionsById,
            [screenshotId]: region,
        });
    };

    return (
        <Stack spacing={2}>
            <Alert severity="info">
                Xem trước các ảnh store do AI tạo. Logo Gemini có thể không cùng vị trí — nhấn biểu tượng khung, kéo chọn vùng sát logo sparkle (khoảng 48–96 px), rồi bấm Xóa logo Gemini. Chỉ ảnh đã chọn vùng mới được xóa; ảnh không chọn vùng giữ nguyên. Nếu đã xóa bị vết đen, dùng Lấy lại ảnh gốc rồi chọn lại vùng nhỏ hơn.
            </Alert>

            {items.length === 0 ? (
                <Alert severity="warning">
                    Chưa có ảnh AI nào. Hãy upload ảnh ở bước Copy & ảnh AI trước.
                </Alert>
            ) : (
                <Box
                    ref={scrollRef}
                    onMouseDown={activeSelectionId ? undefined : onMouseDown}
                    sx={(theme) => ({
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 2,
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        cursor: activeSelectionId ? 'default' : 'grab',
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
                        const imageUrl = resolveStoreScreenshotAiImageDisplayUrl(item);
                        const region = regionsById[item.id] ?? null;

                        return (
                            <Box key={item.id} sx={{ position: 'relative' }}>
                                {item.gemini_logo_removed ? (
                                    <Chip
                                        label="Đã xóa logo"
                                        size="small"
                                        color="success"
                                        sx={{
                                            position: 'absolute',
                                            top: 44,
                                            left: 12,
                                            zIndex: 4,
                                        }}
                                    />
                                ) : region ? (
                                    <Chip
                                        label="Đã chọn vùng"
                                        size="small"
                                        color="warning"
                                        sx={{
                                            position: 'absolute',
                                            top: 44,
                                            left: 12,
                                            zIndex: 4,
                                        }}
                                    />
                                ) : null}
                                <GeminiLogoRegionSelector
                                    imageUrl={imageUrl}
                                    alt={`Store screenshot ${item.order}`}
                                    order={item.order}
                                    region={region}
                                    selecting={activeSelectionId === item.id}
                                    disabled={!geminiRemoverReady || Boolean(item.gemini_logo_removed)}
                                    logoRemoved={Boolean(item.gemini_logo_removed)}
                                    onSelectStart={() => onActiveSelectionChange(item.id)}
                                    onSelectEnd={() => onActiveSelectionChange(null)}
                                    onRegionChange={(nextRegion) => handleRegionChange(item.id, nextRegion)}
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
