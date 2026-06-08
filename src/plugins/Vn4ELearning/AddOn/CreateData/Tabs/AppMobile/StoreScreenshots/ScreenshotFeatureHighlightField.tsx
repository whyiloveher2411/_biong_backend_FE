import React from 'react';
import { Stack, TextField, Typography } from '@mui/material';

type Props = {
    value: string;
    onChange: (value: string) => void;
};

function ScreenshotFeatureHighlightField({ value, onChange }: Props) {
    return (
        <Stack spacing={0.5}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Feature highlight (UI focus)
            </Typography>
            <TextField
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder="VD: Tạo kính lúp đơn giản, focus vào lục giác đầu tiên"
                multiline
                minRows={2}
                maxRows={5}
                size="small"
                fullWidth
            />
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35 }}>
                Mô tả vùng cần làm nổi bật trong màn hình app và cách focus. Để trống nếu không cần.
            </Typography>
        </Stack>
    );
}

export default ScreenshotFeatureHighlightField;
