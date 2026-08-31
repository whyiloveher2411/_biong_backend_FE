import React from 'react';
import {
    Box,
    Chip,
    CircularProgress,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

import type { BeatImageLayer } from './agentVideoApi';
import { WHITEBOARD_MAX_IMAGE_LAYERS } from './whiteboardImageLayers';

type Props = {
    layers: BeatImageLayer[];
    activeLayerId: string;
    /** Số vùng + ảnh thêm mỗi lớp — badge trên thumbnail. */
    itemCountByLayerId?: Record<string, number>;
    busy?: boolean;
    /** Beat chưa có background dùng chung → cảnh báo nền sẽ nháy khi đổi ảnh. */
    missingSharedBackground?: boolean;
    onSelect: (layerId: string) => void;
    onAdd: (file: File) => void | Promise<void>;
    onRemove: (layerId: string) => void | Promise<void>;
    onMove: (layerId: string, delta: number) => void | Promise<void>;
};

function formatSlot(layer: BeatImageLayer): string {
    const start = Number(layer.start_sec || 0);
    const end = Number(layer.end_sec || 0);
    if (!(end > start)) {
        return '—';
    }
    return `${start.toFixed(1)}s → ${end.toFixed(1)}s`;
}

/**
 * Thanh tab LỚP ẢNH của beat: chọn lớp để vẽ vùng, thêm / xóa / đổi thứ tự lớp.
 * Các lớp thay nhau theo slot thời gian, dùng chung 1 custom background.
 */
export default function WhiteboardBeatImageLayerTabs({
    layers,
    activeLayerId,
    itemCountByLayerId,
    busy = false,
    missingSharedBackground = false,
    onSelect,
    onAdd,
    onRemove,
    onMove,
}: Props) {
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const canAdd = layers.length < WHITEBOARD_MAX_IMAGE_LAYERS;
    const canRemove = layers.length > 1;

    return (
        <Stack spacing={0.5} sx={{ mb: 0.75 }}>
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                <Typography variant="caption" sx={{ opacity: 0.75, mr: 0.25 }}>
                    Lớp ảnh
                </Typography>

                {layers.map((layer, index) => {
                    const isActive = layer.id === activeLayerId;
                    const count = itemCountByLayerId?.[layer.id] || 0;
                    return (
                        <Box
                            key={layer.id}
                            sx={{
                                position: 'relative',
                                width: 62,
                                height: 62,
                                borderRadius: 1,
                                overflow: 'visible',
                            }}
                        >
                            <Tooltip
                                placement="top"
                                title={`Lớp ${index + 1} — ${formatSlot(layer)}${
                                    count ? ` — ${count} mục` : ''
                                }`}
                            >
                                <Box
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => onSelect(layer.id)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            onSelect(layer.id);
                                        }
                                    }}
                                    sx={{
                                        position: 'absolute',
                                        inset: 0,
                                        borderRadius: 1,
                                        overflow: 'hidden',
                                        cursor: busy ? 'wait' : 'pointer',
                                        border: '2px solid',
                                        borderColor: isActive ? 'warning.main' : 'rgba(255,255,255,0.35)',
                                        bgcolor: 'rgba(0,0,0,0.5)',
                                        opacity: isActive ? 1 : 0.7,
                                        '&:hover': { opacity: 1, borderColor: 'common.white' },
                                    }}
                                >
                                    <Box
                                        component="img"
                                        src={layer.image_url}
                                        alt={`Lớp ${index + 1}`}
                                        draggable={false}
                                        sx={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            display: 'block',
                                        }}
                                    />
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            position: 'absolute',
                                            bottom: 0,
                                            left: 0,
                                            right: 0,
                                            fontSize: 9,
                                            textAlign: 'center',
                                            color: 'common.white',
                                            bgcolor: 'rgba(0,0,0,0.65)',
                                            userSelect: 'none',
                                        }}
                                    >
                                        {index + 1}
                                        {count ? ` · ${count}` : ''}
                                    </Typography>
                                </Box>
                            </Tooltip>

                            {isActive && layers.length > 1 ? (
                                <Stack
                                    direction="row"
                                    sx={{
                                        position: 'absolute',
                                        top: -12,
                                        right: -8,
                                        bgcolor: 'rgba(0,0,0,0.75)',
                                        borderRadius: 0.5,
                                    }}
                                >
                                    <IconButton
                                        size="small"
                                        disabled={busy || index === 0}
                                        onClick={() => onMove(layer.id, -1)}
                                        sx={{ p: 0.1, color: 'common.white' }}
                                    >
                                        <ChevronLeftIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        disabled={busy || index === layers.length - 1}
                                        onClick={() => onMove(layer.id, 1)}
                                        sx={{ p: 0.1, color: 'common.white' }}
                                    >
                                        <ChevronRightIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                    {canRemove ? (
                                        <IconButton
                                            size="small"
                                            disabled={busy}
                                            onClick={() => onRemove(layer.id)}
                                            sx={{ p: 0.1, color: 'error.light' }}
                                        >
                                            <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                                        </IconButton>
                                    ) : null}
                                </Stack>
                            ) : null}
                        </Box>
                    );
                })}

                <Tooltip
                    placement="top"
                    title={canAdd
                        ? 'Thêm lớp ảnh (ảnh full-frame cùng khung, hiện sau lớp cuối)'
                        : `Tối đa ${WHITEBOARD_MAX_IMAGE_LAYERS} lớp ảnh mỗi beat`}
                >
                    <Box
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                            if (!busy && canAdd) {
                                inputRef.current?.click();
                            }
                        }}
                        sx={{
                            width: 62,
                            height: 62,
                            borderRadius: 1,
                            border: '1.5px dashed',
                            borderColor: canAdd ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.2)',
                            bgcolor: 'rgba(0,0,0,0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: !canAdd || busy ? 'not-allowed' : 'pointer',
                            opacity: canAdd ? 1 : 0.4,
                        }}
                    >
                        {busy ? (
                            <CircularProgress size={16} sx={{ color: 'common.white' }} />
                        ) : (
                            <AddPhotoAlternateOutlinedIcon sx={{ fontSize: 20, color: 'common.white' }} />
                        )}
                    </Box>
                </Tooltip>

                {layers.length > 1 && missingSharedBackground ? (
                    <Chip
                        size="small"
                        color="warning"
                        variant="outlined"
                        label="Thiếu background dùng chung"
                    />
                ) : null}
            </Stack>

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    event.target.value = '';
                    if (file) {
                        void onAdd(file);
                    }
                }}
            />
        </Stack>
    );
}
