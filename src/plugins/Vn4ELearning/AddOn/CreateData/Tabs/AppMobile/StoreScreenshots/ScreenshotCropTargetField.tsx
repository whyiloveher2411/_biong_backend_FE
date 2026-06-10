import React from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
    Box,
    FormControl,
    FormHelperText,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Typography,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import { alpha } from '@mui/material/styles';
import {
    CROP_TARGET_SIZE_OPTIONS,
    normalizeCropTargetSizeId,
    type CropTargetSizeId,
} from './storeScreenshotCropTarget';

type Props = {
    value: CropTargetSizeId | string;
    onChange: (value: CropTargetSizeId) => void;
    compact?: boolean;
};

function ScreenshotCropTargetField({ value, onChange, compact = false }: Props) {
    const selectedId = normalizeCropTargetSizeId(value);
    const selectedOption = CROP_TARGET_SIZE_OPTIONS.find((option) => option.id === selectedId)
        ?? CROP_TARGET_SIZE_OPTIONS[0];

    if (compact) {
        return (
            <Stack spacing={0.75}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Kích thước cắt App Store
                </Typography>
                <FormControl size="small" fullWidth>
                    <InputLabel id="store-screenshot-crop-target-label">Kích thước</InputLabel>
                    <Select
                        labelId="store-screenshot-crop-target-label"
                        label="Kích thước"
                        value={selectedId}
                        onChange={(event: SelectChangeEvent<string>) => {
                            onChange(normalizeCropTargetSizeId(event.target.value));
                        }}
                    >
                        {CROP_TARGET_SIZE_OPTIONS.map((option) => (
                            <MenuItem key={option.id} value={option.id}>
                                {option.label} · {option.orientationLabel} · {option.ratio}
                            </MenuItem>
                        ))}
                    </Select>
                    <FormHelperText>
                        {selectedOption.orientationLabel} — safe zone cho headline và device khi cắt đúng size.
                    </FormHelperText>
                </FormControl>
            </Stack>
        );
    }

    return (
        <Stack spacing={0.75}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Kích thước cắt App Store
            </Typography>
            <Typography variant="caption" color="text.secondary">
                Prompt sẽ hướng dẫn AI đặt headline/subtitle và device trong vùng an toàn để khi cắt đúng size không bị mất chữ.
            </Typography>
            <Box
                role="radiogroup"
                aria-label="Kích thước cắt App Store"
                sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}
            >
                {CROP_TARGET_SIZE_OPTIONS.map((option) => {
                    const selected = selectedId === option.id;

                    return (
                        <Box
                            key={option.id}
                            component="button"
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => onChange(option.id)}
                            sx={(theme) => ({
                                position: 'relative',
                                minWidth: 148,
                                px: 1.5,
                                py: 1,
                                borderRadius: 1.5,
                                border: '2px solid',
                                borderColor: selected
                                    ? theme.palette[option.color].main
                                    : theme.palette.divider,
                                borderLeftWidth: selected ? 5 : 2,
                                borderLeftColor: selected
                                    ? theme.palette[option.color].main
                                    : theme.palette.divider,
                                bgcolor: selected
                                    ? theme.palette[option.color].main
                                    : theme.palette.background.paper,
                                boxShadow: selected
                                    ? `0 2px 8px ${alpha(theme.palette[option.color].main, 0.35)}`
                                    : 'none',
                                cursor: 'pointer',
                                textAlign: 'left',
                                font: 'inherit',
                                color: 'inherit',
                                transition: theme.transitions.create(
                                    ['border-color', 'background-color', 'box-shadow'],
                                    { duration: theme.transitions.duration.shortest },
                                ),
                                '&:hover': {
                                    borderColor: selected
                                        ? theme.palette[option.color].dark
                                        : theme.palette.text.disabled,
                                    bgcolor: selected
                                        ? theme.palette[option.color].dark
                                        : theme.palette.action.hover,
                                },
                            })}
                        >
                            {selected ? (
                                <CheckCircleIcon
                                    sx={(theme) => ({
                                        position: 'absolute',
                                        top: 6,
                                        right: 6,
                                        width: 18,
                                        height: 18,
                                        color: theme.palette.common.white,
                                    })}
                                />
                            ) : null}
                            <Typography
                                variant="body2"
                                sx={(theme) => ({
                                    fontVariantNumeric: 'tabular-nums',
                                    fontWeight: selected ? 700 : 500,
                                    lineHeight: 1.35,
                                    color: selected
                                        ? theme.palette.common.white
                                        : theme.palette.text.primary,
                                    pr: selected ? 2.5 : 0,
                                })}
                            >
                                {option.label}
                            </Typography>
                            <Typography
                                variant="caption"
                                sx={(theme) => ({
                                    lineHeight: 1.35,
                                    color: selected
                                        ? alpha(theme.palette.common.white, 0.88)
                                        : theme.palette.text.secondary,
                                })}
                            >
                                {option.orientationLabel} · {option.ratio}
                            </Typography>
                        </Box>
                    );
                })}
            </Box>
        </Stack>
    );
}

export default ScreenshotCropTargetField;
