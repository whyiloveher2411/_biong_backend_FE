export const PIPELINE_STEP_STATUS_LABEL: Record<string, string> = {
    done: 'Xong',
    skipped: 'Bỏ qua',
    running: 'Đang chạy',
    failed: 'Lỗi',
    pending: 'Chưa làm',
};

export type PipelineGroupKey = 'script' | 'beat' | 'audio_background' | 'render' | 'thumbnail';

type PipelineGroupSurface = {
    bgcolor: string;
    borderColor: string;
    headerColor: string;
};

export const PIPELINE_GROUP_SURFACES: Record<PipelineGroupKey, {
    light: PipelineGroupSurface;
    dark: PipelineGroupSurface;
}> = {
    script: {
        light: {
            bgcolor: 'rgba(25, 118, 210, 0.07)',
            borderColor: 'rgba(25, 118, 210, 0.18)',
            headerColor: 'primary.dark',
        },
        dark: {
            bgcolor: 'rgba(25, 118, 210, 0.16)',
            borderColor: 'rgba(25, 118, 210, 0.32)',
            headerColor: 'rgba(144, 202, 249, 0.95)',
        },
    },
    beat: {
        light: {
            bgcolor: 'rgba(103, 58, 183, 0.07)',
            borderColor: 'rgba(103, 58, 183, 0.18)',
            headerColor: '#5e35b1',
        },
        dark: {
            bgcolor: 'rgba(103, 58, 183, 0.18)',
            borderColor: 'rgba(103, 58, 183, 0.34)',
            headerColor: 'rgba(206, 147, 216, 0.95)',
        },
    },
    audio_background: {
        light: {
            bgcolor: 'rgba(237, 108, 2, 0.07)',
            borderColor: 'rgba(237, 108, 2, 0.2)',
            headerColor: '#e65100',
        },
        dark: {
            bgcolor: 'rgba(237, 108, 2, 0.16)',
            borderColor: 'rgba(237, 108, 2, 0.34)',
            headerColor: 'rgba(255, 183, 77, 0.95)',
        },
    },
    render: {
        light: {
            bgcolor: 'rgba(46, 125, 50, 0.07)',
            borderColor: 'rgba(46, 125, 50, 0.18)',
            headerColor: '#2e7d32',
        },
        dark: {
            bgcolor: 'rgba(46, 125, 50, 0.16)',
            borderColor: 'rgba(46, 125, 50, 0.32)',
            headerColor: 'rgba(165, 214, 167, 0.95)',
        },
    },
    thumbnail: {
        light: {
            bgcolor: 'rgba(194, 24, 91, 0.07)',
            borderColor: 'rgba(194, 24, 91, 0.18)',
            headerColor: '#ad1457',
        },
        dark: {
            bgcolor: 'rgba(194, 24, 91, 0.16)',
            borderColor: 'rgba(194, 24, 91, 0.32)',
            headerColor: 'rgba(244, 143, 177, 0.95)',
        },
    },
};

export function getPipelineGroupSurface(
    groupKey: string,
    variant: 'light' | 'dark' = 'dark',
): PipelineGroupSurface {
    const surfaces = PIPELINE_GROUP_SURFACES[groupKey as PipelineGroupKey];
    if (!surfaces) {
        return variant === 'light'
            ? {
                bgcolor: 'action.hover',
                borderColor: 'divider',
                headerColor: 'text.secondary',
            }
            : {
                bgcolor: 'rgba(255,255,255,0.04)',
                borderColor: 'rgba(255,255,255,0.1)',
                headerColor: 'rgba(255,255,255,0.55)',
            };
    }
    return surfaces[variant];
}

export function pipelineHeadlessBadgeSx(variant: 'light' | 'dark' = 'dark') {
    if (variant === 'light') {
        return {
            height: 18,
            maxWidth: '100%',
            color: 'text.secondary',
            borderColor: 'rgba(0,0,0,0.18)',
            bgcolor: 'rgba(0,0,0,0.03)',
            '& .MuiChip-label': {
                px: 0.6,
                fontSize: 10,
                fontWeight: 700,
                lineHeight: 1.2,
                letterSpacing: 0.2,
            },
        };
    }
    return {
        height: 18,
        maxWidth: '100%',
        color: 'rgba(255,255,255,0.72)',
        borderColor: 'rgba(255,255,255,0.22)',
        bgcolor: 'rgba(255,255,255,0.06)',
        '& .MuiChip-label': {
            px: 0.6,
            fontSize: 10,
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: 0.2,
        },
    };
}

export function pipelineHeadlessLegendSx(variant: 'light' | 'dark' = 'dark') {
    if (variant === 'light') {
        return {
            display: 'block',
            px: 0.5,
            pb: 0.5,
            fontSize: 10,
            fontWeight: 600,
            color: 'text.secondary',
            lineHeight: 1.35,
        };
    }
    return {
        display: 'block',
        px: 0.5,
        pb: 0.5,
        fontSize: 10,
        fontWeight: 600,
        color: 'rgba(255,255,255,0.5)',
        lineHeight: 1.35,
    };
}

export function pipelineAiBadgeSx(variant: 'light' | 'dark' = 'dark') {
    if (variant === 'light') {
        return {
            height: 18,
            maxWidth: '100%',
            color: '#6a1b9a',
            borderColor: 'rgba(106, 27, 154, 0.28)',
            bgcolor: 'rgba(106, 27, 154, 0.06)',
            '& .MuiChip-label': {
                px: 0.6,
                fontSize: 10,
                fontWeight: 700,
                lineHeight: 1.2,
                letterSpacing: 0.2,
            },
        };
    }
    return {
        height: 18,
        maxWidth: '100%',
        color: 'rgba(225, 190, 231, 0.95)',
        borderColor: 'rgba(206, 147, 216, 0.35)',
        bgcolor: 'rgba(103, 58, 183, 0.18)',
        '& .MuiChip-label': {
            px: 0.6,
            fontSize: 10,
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: 0.2,
        },
    };
}

export function pipelineStepStatusColor(
    status: string,
    variant: 'light' | 'dark' = 'dark',
): string {
    if (variant === 'light') {
        switch (status) {
            case 'done':
                return 'success.light';
            case 'running':
                return 'info.light';
            case 'failed':
                return 'error.light';
            case 'skipped':
                return 'rgba(255,255,255,0.45)';
            default:
                return 'rgba(255,255,255,0.35)';
        }
    }

    switch (status) {
        case 'done':
            return 'success.main';
        case 'skipped':
            return 'text.secondary';
        case 'running':
            return 'info.main';
        case 'failed':
            return 'error.main';
        default:
            return 'text.disabled';
    }
}
