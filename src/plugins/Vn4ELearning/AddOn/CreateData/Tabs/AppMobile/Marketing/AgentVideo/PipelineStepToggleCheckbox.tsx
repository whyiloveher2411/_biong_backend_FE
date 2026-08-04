import React from 'react';
import {
    Checkbox,
    FormControlLabel,
    Tooltip,
} from '@mui/material';
import type { FullAutoStepToggleKey } from './agentVideoApi';

const TOGGLE_TOOLTIP =
    'Chạy bước này trong pipeline A→Z. Bỏ check = tự bỏ qua (khi đã có audio script). Nút Run vẫn chạy tay được.';

type PipelineStepToggleCheckboxProps = {
    toggleKey: FullAutoStepToggleKey;
    checked: boolean;
    disabled?: boolean;
    /** compact = workflow/menu row; section = cạnh nhóm improve+QA */
    size?: 'compact' | 'section';
    onChange: (toggleKey: FullAutoStepToggleKey, checked: boolean) => void;
};

export function PipelineStepToggleCheckbox({
    toggleKey,
    checked,
    disabled = false,
    size = 'compact',
    onChange,
}: PipelineStepToggleCheckboxProps) {
    const compact = size === 'compact';

    return (
        <Tooltip title={TOGGLE_TOOLTIP} arrow placement="top">
            <FormControlLabel
                onClick={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
                control={(
                    <Checkbox
                        size="small"
                        checked={checked}
                        disabled={disabled}
                        onChange={(event) => {
                            event.stopPropagation();
                            onChange(toggleKey, event.target.checked);
                        }}
                        inputProps={{
                            'aria-label': 'Chạy trong pipeline',
                        }}
                        data-testid={`pipeline-step-toggle-${toggleKey}`}
                        sx={{
                            p: compact ? 0.25 : 0.35,
                            color: 'text.secondary',
                            '&.Mui-checked': { color: 'success.main' },
                        }}
                    />
                )}
                label="Chạy"
                sx={{
                    m: 0,
                    mr: 0,
                    ml: 0,
                    userSelect: 'none',
                    opacity: checked ? 1 : 0.72,
                    '& .MuiFormControlLabel-label': {
                        fontSize: compact ? 10 : 11,
                        fontWeight: 600,
                        color: 'text.secondary',
                        lineHeight: 1.2,
                        pl: 0.15,
                    },
                }}
            />
        </Tooltip>
    );
}
