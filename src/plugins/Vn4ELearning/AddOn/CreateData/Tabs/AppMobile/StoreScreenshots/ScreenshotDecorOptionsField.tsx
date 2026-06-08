import React from 'react';
import { Checkbox, FormControlLabel, Stack, Typography } from '@mui/material';

type Props = {
    floatingIconsEnabled: boolean;
    onFloatingIconsChange: (checked: boolean) => void;
};

function DecorCheckbox({
    checked,
    label,
    caption,
    onChange,
}: {
    checked: boolean;
    label: string;
    caption: string;
    onChange: (checked: boolean) => void;
}) {
    return (
        <Stack spacing={0.25}>
            <FormControlLabel
                sx={{ alignItems: 'flex-start', m: 0 }}
                control={(
                    <Checkbox
                        size="small"
                        checked={checked}
                        onChange={(event) => onChange(event.target.checked)}
                        sx={{ py: 0.25 }}
                    />
                )}
                label={(
                    <Typography variant="body2" sx={{ fontWeight: 600, pt: 0.25 }}>
                        {label}
                    </Typography>
                )}
            />
            <Typography variant="caption" color="text.secondary" sx={{ pl: 3.5, display: 'block', lineHeight: 1.35 }}>
                {caption}
            </Typography>
        </Stack>
    );
}

function ScreenshotDecorOptionsField({
    floatingIconsEnabled,
    onFloatingIconsChange,
}: Props) {
    return (
        <DecorCheckbox
            checked={floatingIconsEnabled}
            label="Floating icons quanh device"
            caption="Icon bay / exploded UI. Ưu tiên icon trong ảnh gốc."
            onChange={onFloatingIconsChange}
        />
    );
}

export default ScreenshotDecorOptionsField;
