import React from 'react';
import {
    Alert,
    Box,
    Card,
    CardMedia,
    Link,
    Stack,
    Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import type { StoreScreenshotConfig } from './storeScreenshotTypes';
import {
    getPromptLangText,
    normalizeMultilangText,
    STORE_SCREENSHOT_PROMPT_LANG,
} from './storeScreenshotMultilang';

type Props = {
    config: StoreScreenshotConfig;
};

function StepPreview({ config }: Props) {
    const items = [...(config.screenshots || [])]
        .sort((a, b) => a.order - b.order)
        .filter((item) => String(item.ai_image_url || '').trim() !== '');

    return (
        <Stack spacing={2}>
            <Alert severity="info">
                Xem trước các ảnh store do AI tạo mà bạn đã upload ở bước Copy & ảnh AI.
            </Alert>

            {items.length === 0 ? (
                <Alert severity="warning">
                    Chưa có ảnh AI nào. Hãy upload ảnh ở bước Copy & ảnh AI trước.
                </Alert>
            ) : (
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                        gap: 2,
                    }}
                >
                    {items.map((item) => {
                        const headlineMap = normalizeMultilangText(item.headline);
                        const subtitleMap = normalizeMultilangText(item.subtitle);
                        const promptHeadline = getPromptLangText(headlineMap);
                        const promptSubtitle = getPromptLangText(subtitleMap);
                        const reviewLines = [
                            ...Object.entries(headlineMap)
                                .filter(([lang]) => lang !== STORE_SCREENSHOT_PROMPT_LANG)
                                .map(([lang, text]) => `${lang} headline: ${text}`),
                            ...Object.entries(subtitleMap)
                                .filter(([lang]) => lang !== STORE_SCREENSHOT_PROMPT_LANG)
                                .map(([lang, text]) => `${lang} subtitle: ${text}`),
                        ];

                        return (
                        <Card key={item.id}>
                            <CardMedia
                                component="img"
                                image={item.ai_image_url}
                                alt={`AI screenshot ${item.order}`}
                                sx={{ height: 360, objectFit: 'cover' }}
                            />
                            <Box sx={{ p: 1.5 }}>
                                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                                    Screenshot #{item.order}
                                </Typography>
                                {promptHeadline ? (
                                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25 }}>
                                        {promptHeadline}
                                    </Typography>
                                ) : null}
                                {promptSubtitle ? (
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                        {promptSubtitle}
                                    </Typography>
                                ) : null}
                                {reviewLines.length > 0 ? (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                        Review: {reviewLines.join(' · ')}
                                    </Typography>
                                ) : null}
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <Link href={item.ai_image_url} target="_blank" rel="noopener noreferrer">
                                        <OpenInNewIcon fontSize="small" />
                                    </Link>
                                </Box>
                            </Box>
                        </Card>
                        );
                    })}
                </Box>
            )}
        </Stack>
    );
}

export default StepPreview;
