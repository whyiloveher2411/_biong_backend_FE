import React from 'react';
import { Checkbox, FormControlLabel, Stack, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';

type Mode = 'auto' | 'manual';

type Props = {
    value: Mode;
    disabled?: boolean;
    onChange: (mode: Mode) => void;
    /** Chỉ chạy beat còn thiếu ảnh (bỏ qua beat đã có ảnh). */
    onlyMissing?: boolean;
    onlyMissingDisabled?: boolean;
    onOnlyMissingChange?: (checked: boolean) => void;
};

/** Toggle Thủ công / Tự động + checkbox "chỉ beat thiếu" cho bước Ảnh beat (pipeline). */
export function PipelineBeatImageFillModeToggle({
    value,
    disabled = false,
    onChange,
    onlyMissing = true,
    onlyMissingDisabled = false,
    onOnlyMissingChange,
}: Props) {
    return (
        <Tooltip
            title={value === 'auto'
                ? 'Tự động: headless Meta.ai (cookie Cookie Account domain meta.ai)'
                : 'Thủ công: pipeline chờ bạn fill ảnh (extension/upload) rồi mới tiếp'}
            arrow
            placement="top"
        >
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
                    sx={{
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
                {onOnlyMissingChange ? (
                    <Tooltip
                        title={onlyMissing
                            ? 'Chỉ chạy beat còn thiếu ảnh — beat đã có ảnh sẽ bỏ qua'
                            : 'Chạy tất cả beat (kể cả beat đã có ảnh — sẽ tạo lại ảnh)'}
                        arrow
                        placement="top"
                    >
                        <FormControlLabel
                            sx={{ m: 0, mr: 0.5 }}
                            control={
                                <Checkbox
                                    size="small"
                                    checked={onlyMissing}
                                    disabled={disabled || onlyMissingDisabled}
                                    onChange={(event) => onOnlyMissingChange(event.target.checked)}
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
                ) : null}
            </Stack>
        </Tooltip>
    );
}
