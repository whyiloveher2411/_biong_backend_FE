import React from 'react';
import {
    Box,
    CircularProgress,
    Stack,
    Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { alpha } from '@mui/material/styles';
import HeadlineCopyDisplay from './HeadlineCopyDisplay';
import {
    COPY_STYLE_PRESETS,
    getCopyStylePresetById,
    normalizeCopyStylePresetId,
    type CopyStylePresetId,
} from './storeScreenshotCopyStyleOptions';
import type { HeadlineCopyVariant } from './storeScreenshotTypes';

type Props = {
    variants: HeadlineCopyVariant[];
    selectedStyleId?: string;
    savingStyleId?: string;
    disabled?: boolean;
    onSelect: (copyStyleId: CopyStylePresetId) => void;
};

function HeadlineVariantPicker({
    variants,
    selectedStyleId,
    savingStyleId = '',
    disabled = false,
    onSelect,
}: Props) {
    const variantMap = React.useMemo(
        () => new Map(variants.map((variant) => [variant.copy_style_id, variant])),
        [variants],
    );

    const orderedVariants = COPY_STYLE_PRESETS
        .map((preset) => variantMap.get(preset.id))
        .filter((variant): variant is HeadlineCopyVariant => !!variant);

    if (orderedVariants.length === 0) {
        return null;
    }

    const activeStyleId = normalizeCopyStylePresetId(selectedStyleId);

    return (
        <Stack spacing={1}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                Chọn gợi ý headline/subtitle
            </Typography>

            <Stack spacing={1}>
                {orderedVariants.map((variant) => {
                    const preset = getCopyStylePresetById(variant.copy_style_id);
                    const selected = variant.copy_style_id === activeStyleId;
                    const saving = savingStyleId === variant.copy_style_id;

                    return (
                        <Box
                            key={variant.copy_style_id}
                            component="button"
                            type="button"
                            disabled={disabled || saving}
                            onClick={() => onSelect(variant.copy_style_id)}
                            sx={(theme) => ({
                                width: '100%',
                                p: 1.25,
                                textAlign: 'left',
                                borderRadius: 1.5,
                                border: '2px solid',
                                borderColor: selected
                                    ? theme.palette.primary.main
                                    : theme.palette.divider,
                                bgcolor: selected
                                    ? alpha(theme.palette.primary.main, 0.06)
                                    : theme.palette.background.paper,
                                cursor: disabled || saving ? 'not-allowed' : 'pointer',
                                font: 'inherit',
                                transition: theme.transitions.create(['border-color', 'background-color']),
                                '&:hover': disabled || saving
                                    ? {}
                                    : {
                                        borderColor: selected
                                            ? theme.palette.primary.dark
                                            : theme.palette.text.disabled,
                                    },
                            })}
                        >
                            <Stack direction="row" spacing={1} alignItems="flex-start">
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.75 }}>
                                        <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                            {preset.label}
                                        </Typography>
                                        {selected ? (
                                            <CheckCircleIcon sx={{ width: 16, height: 16, color: 'primary.main' }} />
                                        ) : null}
                                        {saving ? (
                                            <CircularProgress size={14} />
                                        ) : null}
                                    </Stack>
                                    <HeadlineCopyDisplay
                                        headline={variant.headline}
                                        subtitle={variant.subtitle}
                                        showLabels
                                    />
                                </Box>
                            </Stack>
                        </Box>
                    );
                })}
            </Stack>
        </Stack>
    );
}

export default HeadlineVariantPicker;
