import React from 'react';
import { ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';

type Mode = 'auto' | 'manual';

type Props = {
    value: Mode;
    disabled?: boolean;
    onChange: (mode: Mode) => void;
};

/** Toggle Thủ công / Tự động cho bước Ảnh beat (pipeline). */
export function PipelineBeatImageFillModeToggle({
    value,
    disabled = false,
    onChange,
}: Props) {
    return (
        <Tooltip
            title={value === 'auto'
                ? 'Tự động: headless Meta.ai (cookie Cookie Account domain meta.ai)'
                : 'Thủ công: pipeline chờ bạn fill ảnh (extension/upload) rồi mới tiếp'}
            arrow
            placement="top"
        >
            <ToggleButtonGroup
                size="small"
                exclusive
                value={value}
                disabled={disabled}
                onChange={(_event, next: Mode | null) => {
                    if (!next || next === value) {
                        return;
                    }
                    onChange(next);
                }}
                onClick={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
                sx={{
                    flexShrink: 0,
                    height: 22,
                    '& .MuiToggleButton-root': {
                        px: 0.7,
                        py: 0,
                        fontSize: 10,
                        fontWeight: 700,
                        lineHeight: 1.2,
                        textTransform: 'none',
                        borderColor: 'rgba(25, 118, 210, 0.35)',
                    },
                }}
            >
                <ToggleButton value="manual" aria-label="Thủ công">
                    Thủ công
                </ToggleButton>
                <ToggleButton value="auto" aria-label="Tự động">
                    Tự động
                </ToggleButton>
            </ToggleButtonGroup>
        </Tooltip>
    );
}
