import React from 'react';
import {
    Box,
    Button,
    IconButton,
    Slider,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import type { BeatZoomEffect } from '../../../agentVideoApi';
import type { EffectSettingsProps } from '../../types';
import { getZoomPhaseBounds, ZOOM_PHASE_MIN_DUR_SEC } from './zoomPhases';

export default function ZoomSettingsPanel({
    effect,
    beatDurationSec,
    onChange,
    onDelete,
    onMoveLayer,
    saving = false,
}: EffectSettingsProps<BeatZoomEffect>) {
    const phases = getZoomPhaseBounds(effect, beatDurationSec);
    const zoomInDur = Math.round((phases.zoomInEnd - phases.start) * 10) / 10;
    const holdDur = Math.round((phases.holdEnd - phases.zoomInEnd) * 10) / 10;
    const zoomOutDur = Math.round((phases.end - phases.holdEnd) * 10) / 10;

    return (
        <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                    Zoom
                </Typography>
                <Stack direction="row" spacing={0.25}>
                    <Tooltip title="Tăng layer (áp sau khi overlap)">
                        <IconButton size="small" onClick={() => onMoveLayer('up')} disabled={saving}>
                            <ArrowUpwardIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Giảm layer">
                        <IconButton size="small" onClick={() => onMoveLayer('down')} disabled={saving}>
                            <ArrowDownwardIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Xóa hiệu ứng">
                        <IconButton size="small" color="error" onClick={onDelete} disabled={saving}>
                            <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Stack>

            <TextField
                size="small"
                fullWidth
                label="Tên"
                value={effect.name || ''}
                onChange={(e) => onChange({ name: e.target.value })}
                sx={{ mb: 1.5 }}
            />

            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                Mức zoom đích (1.0 – 2.0)
            </Typography>
            <Slider
                size="small"
                min={1}
                max={2}
                step={0.01}
                value={effect.zoom_level}
                onChange={(_, value) => onChange({ zoom_level: value as number })}
                valueLabelDisplay="auto"
                valueLabelFormat={(v) => `${Math.round(v * 100) / 100}`}
                disabled={saving}
                sx={{ mb: 1.5 }}
            />

            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                3 đoạn trên timeline (tối thiểu {ZOOM_PHASE_MIN_DUR_SEC}s mỗi đoạn)
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <TextField
                    size="small"
                    label="Bắt đầu (s)"
                    type="number"
                    inputProps={{ min: 0, max: beatDurationSec, step: 0.1 }}
                    value={effect.start_sec}
                    onChange={(e) => onChange({ start_sec: Number(e.target.value) })}
                    sx={{ flex: 1 }}
                />
                <TextField
                    size="small"
                    label="Hết zoom in (s)"
                    type="number"
                    inputProps={{ min: 0, max: beatDurationSec, step: 0.1 }}
                    value={effect.zoom_in_end_sec}
                    onChange={(e) => onChange({ zoom_in_end_sec: Number(e.target.value) })}
                    sx={{ flex: 1 }}
                />
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <TextField
                    size="small"
                    label="Hết giữ zoom (s)"
                    type="number"
                    inputProps={{ min: 0, max: beatDurationSec, step: 0.1 }}
                    value={effect.hold_end_sec}
                    onChange={(e) => onChange({ hold_end_sec: Number(e.target.value) })}
                    sx={{ flex: 1 }}
                />
                <TextField
                    size="small"
                    label="Kết thúc (s)"
                    type="number"
                    inputProps={{ min: 0, max: beatDurationSec, step: 0.1 }}
                    value={effect.end_sec}
                    onChange={(e) => onChange({ end_sec: Number(e.target.value) })}
                    sx={{ flex: 1 }}
                />
            </Stack>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Zoom in {zoomInDur}s · Giữ {holdDur}s · Zoom out {zoomOutDur}s
            </Typography>

            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <TextField
                    size="small"
                    label="Focus X"
                    type="number"
                    inputProps={{ min: 0, max: 1, step: 0.01 }}
                    value={effect.focus_x}
                    onChange={(e) => onChange({ focus_x: Number(e.target.value) })}
                    sx={{ flex: 1 }}
                />
                <TextField
                    size="small"
                    label="Focus Y"
                    type="number"
                    inputProps={{ min: 0, max: 1, step: 0.01 }}
                    value={effect.focus_y}
                    onChange={(e) => onChange({ focus_y: Number(e.target.value) })}
                    sx={{ flex: 1 }}
                />
            </Stack>

            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Layer: {effect.layer} — kéo 2 tay giữa trên timeline hoặc click ảnh để đặt điểm zoom.
            </Typography>

            <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={onDelete}
                disabled={saving}
                sx={{ textTransform: 'none' }}
            >
                Xóa hiệu ứng zoom
            </Button>
        </Box>
    );
}
