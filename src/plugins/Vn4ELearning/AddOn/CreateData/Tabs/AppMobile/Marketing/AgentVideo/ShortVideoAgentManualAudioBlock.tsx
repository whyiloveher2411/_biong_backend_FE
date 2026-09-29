import React from 'react';
import {
    Alert,
    Box,
    Chip,
    Divider,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    DragDropContext,
    Draggable,
    Droppable,
    type DropResult,
} from 'react-beautiful-dnd';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import LoadingButton from 'components/atoms/LoadingButton';
import { whisperStatusLabel } from './agentVideoUi';
import type { useAgentVideoContent } from './useAgentVideoContent';

type Props = {
    state: ReturnType<typeof useAgentVideoContent>;
};

/**
 * Video 2s (audio từng beat TẮT): upload 1 file audio tổng hoặc nhiều file MP3/WAV.
 * Các file được ghép theo thứ tự (chèn 0,3s giữa 2 đoạn) để làm audio full cho
 * pipeline; beat vẫn giữ kịch bản riêng, KHÔNG sinh audio từng beat.
 */
export default function ShortVideoAgentManualAudioBlock({ state }: Props) {
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    const manualAudioSegments = state.narrationSegments.filter((seg) => seg.source === 'manual');
    const manualAudioTotalSec = manualAudioSegments.reduce(
        (sum, seg) => sum + Number(seg.duration_sec || 0),
        0,
    );
    const manualAudioNeedsMerge = manualAudioSegments.length > 0
        && (state.manualAudioState.dirty || !state.hasAudio);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        event.target.value = '';
        if (files.length === 0) {
            return;
        }
        void state.handleUploadMp3(files);
    };

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) {
            return;
        }
        void state.handleReorderManualAudioSegments(
            result.source.index,
            result.destination.index,
        );
    };

    // Chạy Whisper trên audio tổng rồi reload beat marks — backend tự realign
    // start/end từng beat theo timing whisper thật (canh chỉnh cho khớp audio).
    const handleRunWhisper = async () => {
        await state.runWhisperTranscribe({ force: true });
        await state.reloadManualBeatMarks();
    };

    return (
        <Stack spacing={1}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" display="block">
                Audio tổng
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35 }}>
                Upload 1 file audio tổng hoặc nhiều file MP3/WAV (ghép theo thứ tự, chèn 0,3s giữa 2 đoạn).
                Pipeline dùng audio này cho toàn video — không tạo audio từng beat; beat vẫn giữ kịch bản riêng.
            </Typography>

            {manualAudioSegments.length > 0 ? (
                <Stack spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Typography variant="caption" color="text.secondary">
                            {manualAudioSegments.length} file upload
                            {manualAudioTotalSec > 0 ? ` · ${manualAudioTotalSec.toFixed(1)}s` : ''}
                        </Typography>
                        {manualAudioNeedsMerge ? (
                            <Chip size="small" color="warning" variant="outlined" label="Chưa ghép" />
                        ) : (
                            <Chip size="small" color="success" variant="outlined" label="Đã ghép" />
                        )}
                    </Stack>

                    <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="video2s-manual-audio-segments">
                            {(dropProvided) => (
                                <Stack
                                    spacing={1}
                                    ref={dropProvided.innerRef}
                                    {...dropProvided.droppableProps}
                                >
                                    {manualAudioSegments.map((seg, idx) => (
                                        <Draggable
                                            key={seg.id || `manual-${idx}`}
                                            draggableId={String(seg.id || `manual-${idx}`)}
                                            index={idx}
                                        >
                                            {(dragProvided, dragSnapshot) => (
                                                <Box
                                                    ref={dragProvided.innerRef}
                                                    {...dragProvided.draggableProps}
                                                    sx={{
                                                        p: 1,
                                                        borderRadius: 1,
                                                        border: '1px solid',
                                                        borderColor: 'divider',
                                                        bgcolor: 'background.paper',
                                                        boxShadow: dragSnapshot.isDragging ? 3 : 0,
                                                    }}
                                                >
                                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                                        <Box
                                                            {...dragProvided.dragHandleProps}
                                                            sx={{ display: 'flex', color: 'text.disabled', cursor: 'grab' }}
                                                        >
                                                            <DragHandleIcon fontSize="small" />
                                                        </Box>
                                                        <Typography variant="caption" fontWeight={700}>
                                                            {`Đoạn ${idx + 1}/${manualAudioSegments.length}`}
                                                        </Typography>
                                                        {seg.duration_sec > 0 ? (
                                                            <Typography variant="caption" color="text.secondary">
                                                                {Number(seg.duration_sec).toFixed(1)}s
                                                            </Typography>
                                                        ) : null}
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                            sx={{
                                                                flex: 1,
                                                                minWidth: 0,
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        >
                                                            {seg.filename || ''}
                                                        </Typography>
                                                        <Tooltip title="Xóa đoạn này">
                                                            <span>
                                                                <IconButton
                                                                    size="small"
                                                                    color="error"
                                                                    disabled={state.savingManualAudioOrder || state.finalizingManualAudio}
                                                                    onClick={() => {
                                                                        void state.handleRemoveManualAudioSegment(String(seg.id || ''));
                                                                    }}
                                                                >
                                                                    <DeleteOutlineIcon fontSize="small" />
                                                                </IconButton>
                                                            </span>
                                                        </Tooltip>
                                                    </Stack>
                                                    <audio controls src={seg.url} style={{ width: '100%', height: 32 }}>
                                                        <track kind="captions" />
                                                    </audio>
                                                </Box>
                                            )}
                                        </Draggable>
                                    ))}
                                    {dropProvided.placeholder}
                                </Stack>
                            )}
                        </Droppable>
                    </DragDropContext>

                    <LoadingButton
                        size="small"
                        variant="contained"
                        color="success"
                        loading={state.finalizingManualAudio}
                        disabled={state.uploading || state.savingManualAudioOrder}
                        startIcon={<PlaylistAddCheckIcon />}
                        onClick={() => { void state.handleFinalizeManualAudio(); }}
                    >
                        {manualAudioNeedsMerge ? 'Ghép audio' : 'Ghép lại audio'}
                    </LoadingButton>

                    {state.hasAudio ? (
                        <Box>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                                File ghép cho pipeline
                                {state.audioDurationSec != null ? ` · ${state.audioDurationSec.toFixed(1)}s` : ''}
                            </Typography>
                            <audio controls src={state.audioFileUrl} style={{ width: '100%', height: 36 }}>
                                <track kind="captions" />
                            </audio>
                        </Box>
                    ) : null}
                </Stack>
            ) : state.hasAudio ? (
                <Box>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                        Audio hiện tại
                        {state.audioDurationSec != null ? ` · ${state.audioDurationSec.toFixed(1)}s` : ''}
                    </Typography>
                    <audio controls src={state.audioFileUrl} style={{ width: '100%', height: 36 }}>
                        <track kind="captions" />
                    </audio>
                </Box>
            ) : (
                <Alert severity="warning" sx={{ py: 0.25 }}>
                    Chưa có audio — upload 1 file audio tổng hoặc nhiều file MP3/WAV.
                </Alert>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="audio/mpeg,audio/wav,audio/x-wav,.mp3,.wav"
                multiple
                hidden
                onChange={handleFileChange}
            />
            <LoadingButton
                size="small"
                loading={state.uploading}
                variant={manualAudioSegments.length > 0 ? 'outlined' : 'contained'}
                disabled={state.finalizingManualAudio}
                startIcon={<UploadFileIcon />}
                onClick={() => fileInputRef.current?.click()}
            >
                {manualAudioSegments.length > 0 ? 'Thêm MP3/WAV' : 'Upload MP3/WAV'}
            </LoadingButton>

            <Divider sx={{ my: 0.5 }} />

            <Typography variant="caption" fontWeight={700} color="text.secondary" display="block">
                Whisper canh thời gian beat
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35 }}>
                Chạy Whisper trên audio tổng để lấy timing từ thật — hệ thống tự canh chỉnh
                start/end của từng beat cho khớp audio.
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <LoadingButton
                    size="small"
                    variant="outlined"
                    loading={state.transcribingWhisper || state.whisperStatus === 'processing'}
                    disabled={!state.hasAudio || !state.scriptApproved}
                    startIcon={<GraphicEqIcon />}
                    onClick={() => { void handleRunWhisper(); }}
                >
                    {state.whisperStatus === 'failed' ? 'Chạy lại Whisper' : 'Whisper'}
                </LoadingButton>
                <Chip size="small" label={whisperStatusLabel(state.whisperStatus)} variant="outlined" />
                {!state.hasAudio ? (
                    <Typography variant="caption" color="warning.main">
                        Cần upload + ghép audio tổng trước
                    </Typography>
                ) : !state.scriptApproved ? (
                    <Typography variant="caption" color="warning.main">
                        Bấm “Ghép audio” (duyệt) trước khi chạy Whisper
                    </Typography>
                ) : null}
                {state.whisperWords.length > 0 ? (
                    <Typography variant="caption" color="text.secondary">
                        {state.whisperWords.length} từ
                    </Typography>
                ) : null}
            </Stack>
        </Stack>
    );
}
