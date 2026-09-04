import React from 'react';
import {
    Button,
    Chip,
    CircularProgress,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import type { useAgentVideoContent } from './useAgentVideoContent';

type Props = {
    state: ReturnType<typeof useAgentVideoContent>;
    /** beat_N — map sang mark_N để lấy trạng thái audio từng beat. */
    beatId: string;
};

/**
 * Audio từng beat ngay trong box ảnh của beat: trạng thái + Tạo audio (dùng
 * provider đang setting, mặc định Saydi) + Upload MP3 thủ công. Audio full
 * được ghép TỰ ĐỘNG khi render.
 */
export default function WhiteboardBeatAudioControl({ state, beatId }: Props) {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const order = Number(String(beatId).replace(/\D+/g, '')) || 0;
    const item = (state.beatAudio?.items ?? []).find((it) => it.order === order);
    const markId = item?.mark_id ?? `mark_${order}`;
    const status = item?.status ?? 'pending';
    const isGenerating = state.generatingBeatAudio === markId;
    const busy = state.generatingBeatAudio !== null;

    return (
        <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
            sx={{
                px: 0.5,
                py: 0.25,
                borderRadius: 1,
                bgcolor: 'rgba(0,0,0,0.55)',
            }}
        >
            {status === 'ready' ? (
                <Tooltip
                    title={item?.source === 'upload'
                        ? 'Audio upload thủ công · bấm để nghe thử'
                        : `Audio do ${item?.tts_engine ?? 'TTS'} đọc · pause ${item?.pause_after_ms ?? 0}ms · bấm để nghe thử`}
                >
                    {item?.url ? (
                        <Chip
                            size="small"
                            color="success"
                            variant="outlined"
                            icon={<CheckCircleOutlineIcon sx={{ fontSize: 13 }} />}
                            label={`${(item?.duration_sec ?? 0).toFixed(2)}s`}
                            onClick={(event) => {
                                event.stopPropagation();
                                event.preventDefault();
                                window.open(String(item?.url || ''), '_blank', 'noopener,noreferrer');
                            }}
                            sx={{
                                color: '#a5d6a7',
                                borderColor: '#4caf50',
                                cursor: 'pointer',
                                '& .MuiChip-label': { textDecoration: 'underline dotted' },
                            }}
                        />
                    ) : (
                        <Chip
                            size="small"
                            color="success"
                            variant="outlined"
                            icon={<CheckCircleOutlineIcon sx={{ fontSize: 13 }} />}
                            label={`${(item?.duration_sec ?? 0).toFixed(2)}s`}
                            sx={{ color: '#a5d6a7', borderColor: '#4caf50' }}
                        />
                    )}
                </Tooltip>
            ) : status === 'error' ? (
                <Tooltip title={item?.error || 'Audio lỗi'}>
                    <Chip
                        size="small"
                        color="error"
                        variant="outlined"
                        icon={<ErrorOutlineIcon sx={{ fontSize: 13 }} />}
                        label="lỗi"
                    />
                </Tooltip>
            ) : isGenerating ? (
                <Chip
                    size="small"
                    variant="outlined"
                    icon={<CircularProgress size={13} />}
                    label="đang tạo"
                />
            ) : (
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                    chưa audio
                </Typography>
            )}
            <Button
                size="small"
                variant="outlined"
                sx={{
                    minWidth: 0,
                    px: 1,
                    py: 0.25,
                    fontSize: 11,
                    borderColor: 'rgba(255,255,255,0.35)',
                    color: 'common.white',
                }}
                startIcon={isGenerating
                    ? <CircularProgress size={13} color="inherit" />
                    : <GraphicEqIcon sx={{ fontSize: 14 }} />}
                disabled={busy}
                onClick={() => {
                    void state.handleGenerateBeatAudio(markId, status === 'ready');
                }}
            >
                {status === 'ready' ? 'Tạo lại' : 'Tạo audio'}
            </Button>
            <input
                ref={inputRef}
                type="file"
                accept="audio/mpeg,.mp3"
                hidden
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                        void state.handleUploadBeatAudio(markId, file);
                    }
                    e.target.value = '';
                }}
            />
            <Button
                size="small"
                variant="text"
                sx={{
                    minWidth: 0,
                    px: 0.75,
                    py: 0.25,
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.85)',
                }}
                startIcon={<UploadFileIcon sx={{ fontSize: 14 }} />}
                disabled={busy}
                onClick={() => inputRef.current?.click()}
            >
                Upload
            </Button>
        </Stack>
    );
}