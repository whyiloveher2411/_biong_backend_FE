import React from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import {
    COPY_STYLE_PRESETS,
    type CopyStylePresetId,
    getCopyStylePresetById,
    normalizeCopyStylePresetId,
} from './storeScreenshotCopyStyleOptions';
import StoreScreenshotExampleHighlight from './StoreScreenshotExampleHighlight';

type Props = {
    value: CopyStylePresetId | string;
    onChange: (value: CopyStylePresetId) => void;
    showExample?: boolean;
    compactExample?: boolean;
};

function ScreenshotCopyStyleField({
    value,
    onChange,
    showExample = true,
    compactExample = true,
}: Props) {
    const presetId = normalizeCopyStylePresetId(value);
    const preset = getCopyStylePresetById(presetId);

    return (
        <Stack spacing={1}>
            <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                    Phong cách headline/subtitle
                </Typography>
                <Box
                    role="radiogroup"
                    aria-label="Phong cách headline/subtitle"
                    sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}
                >
                    {COPY_STYLE_PRESETS.map((option) => {
                        const selected = presetId === option.id;

                        return (
                            <Chip
                                key={option.id}
                                label={option.label}
                                clickable
                                color={selected ? 'primary' : 'default'}
                                variant={selected ? 'filled' : 'outlined'}
                                onClick={() => onChange(option.id)}
                                aria-checked={selected}
                                role="radio"
                                sx={{
                                    height: 'auto',
                                    py: 0.5,
                                    '& .MuiChip-label': {
                                        whiteSpace: 'normal',
                                        lineHeight: 1.35,
                                    },
                                }}
                            />
                        );
                    })}
                </Box>
            </Box>

            <Typography variant="caption" color="text.secondary">
                {preset.description}
            </Typography>

            {showExample ? (
                <StoreScreenshotExampleHighlight
                    title={compactExample ? `Ví dụ: ${preset.label}` : `Ví dụ mẫu — ${preset.label}`}
                    headline={preset.example.headline}
                    subtitle={preset.example.subtitle}
                    avoid={compactExample ? undefined : preset.example.avoid}
                    hint={compactExample ? preset.headlineGuide : undefined}
                />
            ) : null}
        </Stack>
    );
}

export default ScreenshotCopyStyleField;
