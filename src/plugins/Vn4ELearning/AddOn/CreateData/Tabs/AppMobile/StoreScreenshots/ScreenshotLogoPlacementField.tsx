import React from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Box, Chip, Stack, Typography } from '@mui/material';
import {
    LOGO_PLACEMENT_OPTIONS,
    normalizeLogoPlacementId,
    type LogoPlacementId,
} from './storeScreenshotLogoPlacement';

type Props = {
    value: LogoPlacementId | string;
    onChange: (value: LogoPlacementId) => void;
};

function ScreenshotLogoPlacementField({ value, onChange }: Props) {
    const selectedId = normalizeLogoPlacementId(value);
    const selectedOption = LOGO_PLACEMENT_OPTIONS.find((option) => option.id === selectedId)
        ?? LOGO_PLACEMENT_OPTIONS[0];

    return (
        <Stack spacing={0.75}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Vị trí logo
            </Typography>
            <Typography variant="caption" color="text.secondary">
                Chọn có logo hay không. Nếu có logo, prompt sẽ mô tả ảnh 1 = logo, ảnh 2 = screenshot chính.
            </Typography>
            <Box
                role="radiogroup"
                aria-label="Vị trí logo"
                sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}
            >
                {LOGO_PLACEMENT_OPTIONS.map((option) => {
                    const selected = selectedId === option.id;

                    return (
                        <Chip
                            key={option.id}
                            label={option.label}
                            clickable
                            color={selected ? 'primary' : 'default'}
                            variant={selected ? 'filled' : 'outlined'}
                            icon={selected ? <CheckCircleIcon /> : undefined}
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
            <Typography variant="caption" color="text.secondary">
                {selectedOption.description}
                {selectedOption.usesLogo
                    ? ' · Dùng nút "Sao chép logo" ở thanh dưới trước khi dán ảnh vào AI.'
                    : ''}
            </Typography>
        </Stack>
    );
}

export default ScreenshotLogoPlacementField;
