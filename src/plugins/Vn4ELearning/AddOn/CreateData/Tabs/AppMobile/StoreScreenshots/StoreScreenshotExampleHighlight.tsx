import React from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';

type Props = {
    title?: string;
    headline: string;
    subtitle: string;
    avoid?: string;
    hint?: string;
};

function StoreScreenshotExampleHighlight({
    title = 'Ví dụ mẫu',
    headline,
    subtitle,
    avoid,
    hint,
}: Props) {
    return (
        <Box
            sx={(theme) => ({
                p: 2,
                borderRadius: 2,
                border: '2px solid',
                borderColor: theme.palette.warning.main,
                borderLeftWidth: 5,
                bgcolor: alpha(theme.palette.warning.main, 0.1),
                boxShadow: `0 0 0 1px ${alpha(theme.palette.warning.main, 0.15)}`,
            })}
        >
            <Chip
                label={title}
                color="warning"
                size="small"
                sx={{ mb: 1.5, fontWeight: 700 }}
            />

            {hint ? (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    {hint}
                </Typography>
            ) : null}

            <Stack spacing={1}>
                <Box>
                    <Typography variant="caption" color="warning.dark" sx={{ fontWeight: 700, display: 'block' }}>
                        Headline
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700, lineHeight: 1.4 }}>
                        {headline}
                    </Typography>
                </Box>

                <Box>
                    <Typography variant="caption" color="warning.dark" sx={{ fontWeight: 700, display: 'block' }}>
                        Subtitle
                    </Typography>
                    <Typography variant="body2" sx={{ lineHeight: 1.45 }}>
                        {subtitle}
                    </Typography>
                </Box>
            </Stack>

            {avoid ? (
                <Typography
                    variant="body2"
                    sx={(theme) => ({
                        mt: 1.5,
                        pt: 1.5,
                        borderTop: '1px dashed',
                        borderColor: alpha(theme.palette.warning.main, 0.45),
                        color: theme.palette.text.secondary,
                        fontStyle: 'italic',
                    })}
                >
                    {avoid}
                </Typography>
            ) : null}
        </Box>
    );
}

export default StoreScreenshotExampleHighlight;
