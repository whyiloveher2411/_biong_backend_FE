import React from 'react';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { Box, IconButton, Slider, Tooltip } from '@mui/material';

export const TIMELINE_ZOOM_MIN = 6;
export const TIMELINE_ZOOM_MAX = 480;
export const TIMELINE_ZOOM_DEFAULT = 56;
export const TIMELINE_ZOOM_STEP = 4;

export const SHORT_VIDEO_EDITOR_TIMELINE_ZOOM_STORAGE_KEY = 'short_video_editor_timeline_scale_width_v1';
export const SHORT_VIDEO_AGENT_TIMELINE_ZOOM_STORAGE_KEY = 'short_video_agent_timeline_scale_width_v1';

export function clampTimelineScaleWidth(value: number): number {
    return Math.max(TIMELINE_ZOOM_MIN, Math.min(TIMELINE_ZOOM_MAX, value));
}

export function readTimelineScaleWidth(
    storageKey: string,
    fallback = TIMELINE_ZOOM_DEFAULT,
): number {
    if (typeof window === 'undefined') {
        return fallback;
    }
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? Number(raw) : fallback;
    if (!Number.isFinite(parsed)) {
        return fallback;
    }
    return clampTimelineScaleWidth(parsed);
}

export function usePersistedTimelineScaleWidth(storageKey: string): [number, (next: number) => void] {
    const [scaleWidth, setScaleWidth] = React.useState(
        () => readTimelineScaleWidth(storageKey),
    );

    React.useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        window.localStorage.setItem(storageKey, String(scaleWidth));
    }, [scaleWidth, storageKey]);

    const setClampedScaleWidth = React.useCallback((next: number) => {
        setScaleWidth(clampTimelineScaleWidth(next));
    }, []);

    return [scaleWidth, setClampedScaleWidth];
}

type TimelineZoomControlsProps = {
    value: number;
    onChange: (next: number) => void;
};

export default function TimelineZoomControls({ value, onChange }: TimelineZoomControlsProps) {
    const zoomOut = () => onChange(clampTimelineScaleWidth(value - TIMELINE_ZOOM_STEP));
    const zoomIn = () => onChange(clampTimelineScaleWidth(value + TIMELINE_ZOOM_STEP));

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                width: 172,
                flexShrink: 0,
            }}
        >
            <Tooltip title="Thu nhỏ timeline">
                <span>
                    <IconButton
                        size="small"
                        aria-label="Thu nhỏ timeline"
                        onClick={zoomOut}
                        disabled={value <= TIMELINE_ZOOM_MIN}
                        sx={{
                            border: 1,
                            borderColor: 'divider',
                            borderRadius: 1,
                            width: 28,
                            height: 28,
                            color: 'text.secondary',
                        }}
                    >
                        <RemoveIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </span>
            </Tooltip>
            <Slider
                size="small"
                value={value}
                min={TIMELINE_ZOOM_MIN}
                max={TIMELINE_ZOOM_MAX}
                step={TIMELINE_ZOOM_STEP}
                onChange={(_event, next) => {
                    if (typeof next === 'number') {
                        onChange(clampTimelineScaleWidth(next));
                    }
                }}
                aria-label="Phóng to timeline"
                sx={{
                    flex: 1,
                    mx: 0.25,
                    color: 'text.secondary',
                    height: 4,
                    py: 0.75,
                    '& .MuiSlider-thumb': {
                        width: 12,
                        height: 12,
                    },
                    '& .MuiSlider-rail': {
                        opacity: 0.35,
                    },
                }}
            />
            <Tooltip title="Phóng to timeline">
                <span>
                    <IconButton
                        size="small"
                        aria-label="Phóng to timeline"
                        onClick={zoomIn}
                        disabled={value >= TIMELINE_ZOOM_MAX}
                        sx={{
                            width: 28,
                            height: 28,
                            color: 'text.secondary',
                        }}
                    >
                        <AddIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </span>
            </Tooltip>
        </Box>
    );
}
