import React from 'react';
import {
    Box,
    Chip,
    FormControl,
    FormLabel,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export type ContentStyleItem = {
    id: string;
    label: string;
    short: string;
    emoji: string;
    example: string;
    tags?: string[];
};

export type StyleSpice = 'mild' | 'medium' | 'bold';

export type StyleOptionsState = {
    styleIds: string[];
    styleCustom: string;
    styleSpice: StyleSpice;
};

type Props = {
    styles: ContentStyleItem[];
    value: StyleOptionsState;
    onChange: (next: StyleOptionsState) => void;
    maxStyles?: number;
    disabled?: boolean;
};

const SPICE_OPTIONS: { id: StyleSpice; label: string; hint: string }[] = [
    { id: 'mild', label: 'Nhẹ', hint: 'An toàn, ít slang' },
    { id: 'medium', label: 'Vừa', hint: 'Cân bằng' },
    { id: 'bold', label: 'Táo', hint: 'Personality cao, vẫn PG-13' },
];

export default function NotificationStylePicker({
    styles,
    value,
    onChange,
    maxStyles = 2,
    disabled = false,
}: Props) {
    const toggleStyle = (id: string) => {
        if (disabled) return;
        const current = value.styleIds;
        if (current.includes(id)) {
            const next = current.filter((x) => x !== id);
            onChange({
                ...value,
                styleIds: next.length ? next : ['balanced'],
            });
            return;
        }
        if (current.length >= maxStyles) {
            onChange({
                ...value,
                styleIds: [...current.slice(1), id],
            });
            return;
        }
        onChange({
            ...value,
            styleIds: [...current, id],
        });
    };

    return (
        <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                    Phong cách nội dung
                </Typography>
                <Chip size="small" label={`Tối đa ${maxStyles} style`} variant="outlined" />
            </Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                Chọn nhanh giọng điệu (Duolingo, Gen Z, cà khịa…). AI vẫn tuân điều kiện gửi & lịch.
            </Typography>

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 1,
                }}
            >
                {styles.map((style) => {
                    const selected = value.styleIds.includes(style.id);
                    return (
                        <Box
                            key={style.id}
                            onClick={() => toggleStyle(style.id)}
                            sx={{
                                p: 1.25,
                                borderRadius: 1,
                                border: '2px solid',
                                borderColor: selected ? 'primary.main' : 'divider',
                                bgcolor: selected ? 'action.selected' : 'background.paper',
                                cursor: disabled ? 'default' : 'pointer',
                                opacity: disabled ? 0.6 : 1,
                                transition: 'border-color 0.15s, background 0.15s',
                                position: 'relative',
                                '&:hover': disabled
                                    ? {}
                                    : {
                                          borderColor: selected ? 'primary.main' : 'primary.light',
                                          bgcolor: selected ? 'action.selected' : 'action.hover',
                                      },
                            }}
                        >
                            {selected && (
                                <CheckCircleIcon
                                    color="primary"
                                    fontSize="small"
                                    sx={{ position: 'absolute', top: 6, right: 6 }}
                                />
                            )}
                            <Typography variant="body2" fontWeight={600}>
                                {style.emoji} {style.label}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                                {style.short}
                            </Typography>
                            <Typography
                                variant="caption"
                                sx={{
                                    display: 'block',
                                    mt: 0.75,
                                    fontStyle: 'italic',
                                    color: 'text.secondary',
                                }}
                            >
                                VD: {style.example}
                            </Typography>
                        </Box>
                    );
                })}
            </Box>

            <FormControl sx={{ mt: 2, width: '100%' }} disabled={disabled}>
                <FormLabel sx={{ fontSize: 13, mb: 0.5 }}>Độ táo bạo</FormLabel>
                <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={value.styleSpice}
                    onChange={(_, v: StyleSpice | null) => {
                        if (v) onChange({ ...value, styleSpice: v });
                    }}
                    sx={{ flexWrap: 'wrap' }}
                >
                    {SPICE_OPTIONS.map((opt) => (
                        <ToggleButton key={opt.id} value={opt.id} sx={{ px: 2 }}>
                            {opt.label}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {SPICE_OPTIONS.find((o) => o.id === value.styleSpice)?.hint}
                </Typography>
            </FormControl>

            <TextField
                fullWidth
                size="small"
                label="Ghi chú / twist riêng cho AI"
                placeholder='VD: "Nhắc kiểu sếp Duolingo", "thêm emoji cú mèo", "không dùng từ streak"...'
                value={value.styleCustom}
                onChange={(e) => onChange({ ...value, styleCustom: e.target.value })}
                disabled={disabled}
                multiline
                minRows={2}
                sx={{ mt: 2 }}
            />
        </Box>
    );
}
