import React from 'react';
import { Box, CircularProgress } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

type Props = {
    onClick?: (event?: React.MouseEvent) => void;
    disabled?: boolean;
    loading?: boolean;
    label?: string;
    testId?: string;
    /** compact = nút nhỏ sau status từng bước */
    size?: 'default' | 'compact';
    title?: string;
};

/** Nút Run pipeline — module riêng để tránh Fast Refresh giữ UI list cũ. */
export function PipelineRenderRunButton({
    onClick,
    disabled = false,
    loading = false,
    label = 'Run',
    testId = 'pipeline-rerun-render-upload',
    size = 'default',
    title,
}: Props) {
    const isDisabled = disabled || loading || !onClick;
    const isCompact = size === 'compact';

    return (
        <Box
            component="span"
            sx={{
                display: 'inline-flex',
                flexShrink: 0,
            }}
        >
            <button
                type="button"
                data-testid={testId}
                disabled={isDisabled}
                title={title}
                onClick={(event) => {
                    event.stopPropagation();
                    if (!isDisabled) {
                        onClick?.(event);
                    }
                }}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: isCompact ? 2 : 4,
                    height: isCompact ? 18 : 24,
                    minWidth: isCompact ? 40 : 52,
                    padding: isCompact ? '0 5px' : '0 8px',
                    margin: 0,
                    border: 'none',
                    borderRadius: 4,
                    backgroundColor: '#16a34a',
                    color: '#fff',
                    fontSize: isCompact ? 9 : 11,
                    fontWeight: 800,
                    lineHeight: 1,
                    fontFamily: 'inherit',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled ? 0.55 : 1,
                }}
            >
                {loading ? (
                    <CircularProgress size={isCompact ? 10 : 12} sx={{ color: '#fff' }} />
                ) : (
                    <PlayArrowIcon sx={{ fontSize: isCompact ? 11 : 14 }} />
                )}
                {label}
            </button>
        </Box>
    );
}
