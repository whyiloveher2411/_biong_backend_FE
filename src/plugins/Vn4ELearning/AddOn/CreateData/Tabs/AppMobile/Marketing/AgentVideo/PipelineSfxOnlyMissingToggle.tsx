import React from 'react';
import { Checkbox, FormControlLabel, Stack, Tooltip } from '@mui/material';

type Props = {
    /** Chỉ sinh SFX cho beat còn thiếu (bỏ qua beat đã có SFX). */
    onlyMissing?: boolean;
    disabled?: boolean;
    onChange?: (checked: boolean) => void;
};

/** Checkbox "Chỉ beat thiếu" cho bước Sound effect (pipeline). */
export function PipelineSfxOnlyMissingToggle({
    onlyMissing = true,
    disabled = false,
    onChange,
}: Props) {
    if (!onChange) {
        return null;
    }
    return (
        <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
            flexWrap="wrap"
            rowGap={0.25}
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            sx={{ flexShrink: 1, minWidth: 0, justifyContent: 'flex-end' }}
        >
            <Tooltip
                title={onlyMissing
                    ? 'Chỉ sinh SFX cho beat còn thiếu — beat đã có SFX sẽ bỏ qua'
                    : 'Xóa SFX cũ và tạo lại SFX cho TẤT CẢ beat'}
                arrow
                placement="top"
            >
                <FormControlLabel
                    sx={{ m: 0, mr: 0.5 }}
                    control={
                        <Checkbox
                            size="small"
                            checked={onlyMissing}
                            disabled={disabled}
                            onChange={(event) => onChange(event.target.checked)}
                            sx={{
                                p: 0.3,
                                '& .MuiSvgIcon-root': { fontSize: 15 },
                            }}
                        />
                    }
                    label={
                        <span style={{ fontSize: 10, fontWeight: 700, lineHeight: 1.2 }}>
                            Chỉ beat thiếu
                        </span>
                    }
                />
            </Tooltip>
        </Stack>
    );
}
