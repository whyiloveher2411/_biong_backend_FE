import React from 'react';
import { Box, Stack } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

type OptionItem = {
    value: string;
    label: string;
};

type Props = {
    value: string;
    options: OptionItem[];
    onChange: (value: string) => void;
    disabled?: boolean;
    ariaLabel?: string;
    /** Mỗi option giãn đều theo hàng (giống fullWidth của ToggleButtonGroup). */
    fullWidth?: boolean;
    /** Màu active — mặc định xanh dương. */
    activeColor?: string;
};

/** Option dạng card: option được chọn → viền xanh + nền xanh nhạt + icon check ở góc trên phải. */
export function AgentOptionToggleGroup({
    value,
    options,
    onChange,
    disabled = false,
    ariaLabel = 'Chọn option',
    fullWidth = true,
    activeColor = '#1976d2',
}: Props) {
    return (
        <Stack
            direction="row"
            spacing={0.75}
            flexWrap="wrap"
            useFlexGap
            aria-label={ariaLabel}
            role="group"
        >
            {options.map((option) => {
                const active = value === option.value;
                return (
                    <Box
                        key={option.value}
                        role="button"
                        tabIndex={0}
                        aria-pressed={active}
                        aria-label={option.label}
                        onClick={() => {
                            if (!disabled) {
                                onChange(option.value);
                            }
                        }}
                        onKeyDown={(e) => {
                            if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
                                e.preventDefault();
                                onChange(option.value);
                            }
                        }}
                        sx={{
                            flex: fullWidth ? '1 1 0%' : '0 1 auto',
                            cursor: disabled ? 'default' : 'pointer',
                            position: 'relative',
                            borderRadius: 1,
                            border: '1.5px solid',
                            borderColor: active ? activeColor : 'rgba(25, 118, 210, 0.18)',
                            bgcolor: active ? `${activeColor}1A` : 'transparent',
                            px: active ? 2.5 : 1,
                            py: 0.9,
                            textAlign: 'center',
                            fontWeight: 700,
                            fontSize: 12,
                            lineHeight: 1.3,
                            color: active ? '#1565c0' : 'text.secondary',
                            opacity: disabled ? 0.6 : 1,
                            '&:hover': {
                                borderColor: active ? activeColor : 'rgba(25, 118, 210, 0.45)',
                                bgcolor: active ? `${activeColor}26` : 'rgba(25, 118, 210, 0.05)',
                            },
                        }}
                    >
                        {active ? (
                            <CheckCircleIcon
                                sx={{
                                    position: 'absolute',
                                    top: 2,
                                    right: 3,
                                    color: activeColor,
                                    fontSize: 14,
                                }}
                            />
                        ) : null}
                        {option.label}
                    </Box>
                );
            })}
        </Stack>
    );
}
