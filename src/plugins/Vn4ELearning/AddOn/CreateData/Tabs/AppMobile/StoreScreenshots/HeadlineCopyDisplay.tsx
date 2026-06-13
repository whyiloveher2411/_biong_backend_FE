import React from 'react';
import { Stack, Typography } from '@mui/material';
import { getReviewCopyLines, type StoreScreenshotMultilangText } from './storeScreenshotMultilang';

type Props = {
    headline: StoreScreenshotMultilangText | string;
    subtitle: StoreScreenshotMultilangText | string;
    showLabels?: boolean;
};

function HeadlineCopyDisplay({ headline, subtitle, showLabels = false }: Props) {
    const copy = getReviewCopyLines(headline, subtitle);

    if (!copy.headline && !copy.subtitle) {
        return null;
    }

    return (
        <Stack spacing={0.75}>
            {copy.headline ? (
                <Stack spacing={0.25}>
                    {showLabels ? (
                        <Typography
                            variant="overline"
                            sx={{ lineHeight: 1.2, fontSize: 10, letterSpacing: 0.6, color: 'text.disabled' }}
                        >
                            Headline
                        </Typography>
                    ) : null}
                    <Typography
                        variant="body2"
                        sx={{ fontWeight: 700, lineHeight: 1.35, color: 'text.primary' }}
                    >
                        {copy.headline}
                    </Typography>
                </Stack>
            ) : null}
            {copy.subtitle ? (
                <Stack spacing={0.25}>
                    {showLabels ? (
                        <Typography
                            variant="overline"
                            sx={{ lineHeight: 1.2, fontSize: 10, letterSpacing: 0.6, color: 'text.disabled' }}
                        >
                            Subtitle
                        </Typography>
                    ) : null}
                    <Typography
                        variant="body2"
                        sx={{ fontWeight: 400, lineHeight: 1.35, color: 'text.secondary', fontSize: '0.8125rem' }}
                    >
                        {copy.subtitle}
                    </Typography>
                </Stack>
            ) : null}
        </Stack>
    );
}

export default HeadlineCopyDisplay;
