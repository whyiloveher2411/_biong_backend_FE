import React from 'react';
import {
    Box,
    FormControl,
    FormHelperText,
    InputLabel,
    MenuItem,
    Select,
    Typography,
} from '@mui/material';
import { HF_PROMPT_CATALOG } from './agentVideoHfPromptCatalog';

type Props = {
    value: string;
    disabled?: boolean;
    missingBeatCount?: number;
    compact?: boolean;
    onChange: (nextType: string) => void;
};

export default function AgentVideoHfPromptTypeSelect({
    value,
    disabled,
    missingBeatCount,
    compact = false,
    onChange,
}: Props) {
    const selected = HF_PROMPT_CATALOG.find((item) => item.key === value);

    const helperParts = [
        selected?.descriptionVi,
        missingBeatCount != null && missingBeatCount > 0
            ? `Gán vào ${missingBeatCount} beat thiếu HTML trong beat-map`
            : null,
    ].filter(Boolean);

    const formControl = (
        <FormControl
            size="small"
            fullWidth={!compact}
            disabled={disabled}
            sx={compact ? { minWidth: 200, maxWidth: 260 } : undefined}
        >
            <InputLabel id="agent-video-hf-prompt-type-label">Phong cách visual</InputLabel>
            <Select
                labelId="agent-video-hf-prompt-type-label"
                label="Phong cách visual"
                value={value}
                renderValue={(key) => {
                    const item = HF_PROMPT_CATALOG.find((entry) => entry.key === key);
                    if (!item) {
                        return String(key);
                    }
                    return compact ? item.label : `${item.label} — ${item.descriptionVi}`;
                }}
                onChange={(e) => onChange(String(e.target.value))}
                MenuProps={{
                    PaperProps: {
                        sx: { maxHeight: 360 },
                    },
                }}
            >
                {HF_PROMPT_CATALOG.map((item) => (
                    <MenuItem key={item.key} value={item.key} sx={{ alignItems: 'flex-start', py: 1 }}>
                        <Box>
                            <Typography variant="body2" fontWeight={600}>
                                {item.label}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                                {item.descriptionVi}
                            </Typography>
                        </Box>
                    </MenuItem>
                ))}
            </Select>
            {!compact ? <FormHelperText>{helperParts.join(' · ')}</FormHelperText> : null}
        </FormControl>
    );

    return formControl;
}
