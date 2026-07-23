import React from 'react';
import { Box, CircularProgress } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

type Props = {
    onClick?: () => void;
    disabled?: boolean;
    loading?: boolean;
    label?: string;
    testId?: string;
};

/** Nút Run render+upload — module riêng để tránh Fast Refresh giữ UI list cũ. */
export function PipelineRenderRunButton({
    onClick,
    disabled = false,
    loading = false,
    label = 'Run',
    testId = 'pipeline-rerun-render-upload',
}: Props) {
    const isDisabled = disabled || loading || !onClick;

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
                onClick={() => {
                    if (!isDisabled) {
                        onClick?.();
                    }
                }}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    height: 24,
                    minWidth: 52,
                    padding: '0 8px',
                    margin: 0,
                    border: 'none',
                    borderRadius: 4,
                    backgroundColor: '#16a34a',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 800,
                    lineHeight: 1,
                    fontFamily: 'inherit',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled ? 0.55 : 1,
                }}
            >
                {loading ? (
                    <CircularProgress size={12} sx={{ color: '#fff' }} />
                ) : (
                    <PlayArrowIcon sx={{ fontSize: 14 }} />
                )}
                {label}
            </button>
        </Box>
    );
}
