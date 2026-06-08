import React from 'react';
import {
    FormControl,
    FormHelperText,
    InputLabel,
    ListItemText,
    MenuItem,
    Select,
    Stack,
    Typography,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import {
    BACKGROUND_PATTERN_OPTIONS,
    getBackgroundPatternOption,
    normalizeBackgroundPatternId,
    type BackgroundPatternId,
} from './storeScreenshotBackgroundPattern';

type Props = {
    value: BackgroundPatternId | string;
    onChange: (value: BackgroundPatternId) => void;
};

function ScreenshotBackgroundPatternField({ value, onChange }: Props) {
    const selectedId = normalizeBackgroundPatternId(value);
    const selectedOption = getBackgroundPatternOption(selectedId);

    const handleChange = (event: SelectChangeEvent<string>) => {
        onChange(normalizeBackgroundPatternId(event.target.value));
    };

    return (
        <Stack spacing={0.75}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Họa tiết nền (background pattern)
            </Typography>
            <FormControl size="small" fullWidth>
                <InputLabel id="store-screenshot-background-pattern-label">
                    Phong cách họa tiết
                </InputLabel>
                <Select
                    labelId="store-screenshot-background-pattern-label"
                    label="Phong cách họa tiết"
                    value={selectedId}
                    onChange={handleChange}
                    renderValue={(current) => getBackgroundPatternOption(current).label}
                >
                    {BACKGROUND_PATTERN_OPTIONS.map((option) => (
                        <MenuItem key={option.id} value={option.id} sx={{ alignItems: 'flex-start', py: 1 }}>
                            <ListItemText
                                primary={option.label}
                                secondary={`${option.term} — ${option.description}`}
                                primaryTypographyProps={{ fontWeight: 600, variant: 'body2' }}
                                secondaryTypographyProps={{
                                    variant: 'caption',
                                    sx: { whiteSpace: 'normal', lineHeight: 1.35, display: 'block', mt: 0.25 },
                                }}
                            />
                        </MenuItem>
                    ))}
                </Select>
                <FormHelperText sx={{ lineHeight: 1.35 }}>
                    {selectedOption.term}: {selectedOption.description}
                </FormHelperText>
            </FormControl>
        </Stack>
    );
}

export default ScreenshotBackgroundPatternField;
