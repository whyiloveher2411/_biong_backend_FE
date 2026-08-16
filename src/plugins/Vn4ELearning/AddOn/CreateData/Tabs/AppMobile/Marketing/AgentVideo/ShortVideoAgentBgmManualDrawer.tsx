import React from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    Divider,
    FormControlLabel,
    IconButton,
    Slider,
    Stack,
    Switch,
    Tooltip,
    Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { LoadingButton } from '@mui/lab';
import {
    DragDropContext,
    Draggable,
    Droppable,
    type DropResult,
} from 'react-beautiful-dnd';
import DrawerCustom from 'components/molecules/DrawerCustom';
import { useFloatingMessages } from 'hook/useFloatingMessages';
import { writePromptTextToClipboard } from 'helpers/marketingShortVideoAgentPrompt';
import type { useAgentVideoContent } from './useAgentVideoContent';
import type { ImportHtmlBgmSegment } from './agentVideoApi';
import { bgmPreviewUrl, formatBgmDuration } from './agentBgmPreview';

type AgentVideoState = ReturnType<typeof useAgentVideoContent>;

type Props = {
    open: boolean;
    onClose: () => void;
    state: AgentVideoState;
};

function PromptCard({
    label,
    prompt,
    onCopy,
}: {
    label: string;
    prompt: string;
    onCopy: () => Promise<boolean>;
}) {
    const [expanded, setExpanded] = React.useState(false);
    const [copied, setCopied] = React.useState(false);

    const handleCopy = async () => {
        const ok = await onCopy();
        if (ok) {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <Box
            sx={{
                p: 1.25,
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
            }}
        >
            <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="body2" fontWeight={600} sx={{ flex: 1, minWidth: 0 }}>
                    {label}
                </Typography>
                <Tooltip title={copied ? 'Đã copy' : 'Copy prompt'}>
                    <IconButton size="small" color="primary" onClick={() => { void handleCopy(); }}>
                        <ContentCopyIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Stack>
            <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                    display: '-webkit-box',
                    mt: 0.5,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    ...(expanded ? {} : {
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        cursor: 'pointer',
                    }),
                }}
                onClick={() => setExpanded((v) => !v)}
            >
                {prompt}
            </Typography>
            <Typography
                variant="caption"
                color="primary"
                sx={{ cursor: 'pointer', mt: 0.25, display: 'block' }}
                onClick={() => setExpanded((v) => !v)}
            >
                {expanded ? 'Thu gọn' : 'Xem đầy đủ'}
            </Typography>
        </Box>
    );
}

export default function ShortVideoAgentBgmManualDrawer({
    open,
    onClose,
    state,
}: Props) {
    const { showMessage } = useFloatingMessages();
    const audioRef = React.useRef<HTMLAudioElement | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const fetchPromptOnceRef = React.useRef(false);
    const [playingUrl, setPlayingUrl] = React.useState<string | null>(null);

    const targetSec = Number(state.beatMap?.totalVideoSec || state.audioDurationSec || 0);
    const selectedTotal = state.bgmSegments.reduce(
        (sum, seg) => sum + Number(seg.duration_sec || 0),
        0,
    );
    const insufficient = targetSec > 0 && selectedTotal > 0 && selectedTotal + 0.01 < targetSec;
    const shortfallSec = insufficient ? Math.max(0, targetSec - selectedTotal) : 0;

    React.useEffect(() => {
        if (!open) {
            fetchPromptOnceRef.current = false;
            return;
        }
        if (fetchPromptOnceRef.current) {
            return;
        }
        fetchPromptOnceRef.current = true;
        void state.handleFetchBgmPromptSuggestions();
        // Chỉ fetch đúng 1 lần mỗi lần mở drawer — handler có thể đổi identity
        // mỗi render (showMessage từ useFloatingMessages không ổn định).
    }, [open, state]);

    React.useEffect(() => () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
    }, []);

    const handlePlayPreview = React.useCallback((item: ImportHtmlBgmSegment) => {
        const url = bgmPreviewUrl(item);
        if (!url) {
            showMessage('Không có file audio trực tiếp để nghe thử', 'warning');
            return;
        }

        if (playingUrl === url && audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
            setPlayingUrl(null);
            return;
        }

        if (audioRef.current) {
            audioRef.current.pause();
        }

        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
            setPlayingUrl(null);
            audioRef.current = null;
        };
        audio.onerror = () => {
            setPlayingUrl(null);
            audioRef.current = null;
            showMessage('Không phát được preview — URL có thể hết hạn', 'warning');
        };
        void audio.play().then(() => {
            setPlayingUrl(url);
        }).catch(() => {
            setPlayingUrl(null);
            audioRef.current = null;
            showMessage('Trình duyệt chặn phát audio — thử bấm lại', 'warning');
        });
    }, [playingUrl, showMessage]);

    const handleCopyPrompt = async (prompt: string): Promise<boolean> => {
        const ok = await writePromptTextToClipboard(prompt);
        if (!ok) {
            showMessage('Không copy được — hãy chọn và copy thủ công', 'error');
            return false;
        }
        showMessage('Đã copy prompt vào clipboard', 'success');
        return true;
    };

    const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        if (files.length > 0) {
            void state.handleUploadBgmMp3(files);
        }
        event.target.value = '';
    };

    const handleDragEnd = React.useCallback((result: DropResult) => {
        if (!result.destination) {
            return;
        }
        void state.handleReorderBgmSegments(
            result.source.index,
            result.destination.index,
        );
    }, [state]);

    const handleVolumeCommit = React.useCallback(() => {
        void state.persistImportHtmlAssets({ silent: true });
    }, [state]);

    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title="Audio background thủ công"
            width={680}
            ModalProps={{
                sx: { zIndex: 1400 },
            }}
            restDialogContent={{
                sx: {
                    height: 'calc(100vh - 64px)',
                    display: 'flex',
                    flexDirection: 'column',
                    pt: 2,
                    px: 2,
                    pb: 2,
                    gap: 2,
                    overflow: 'hidden',
                },
            }}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%', minHeight: 0, overflow: 'auto' }}>
                <Alert severity="info">
                    File MP3 được tạo bằng <strong>MiniMax Audio</strong> (https://www.minimax.io/audio/music). Copy
                    prompt gợi ý bên dưới → dán vào chatbot AI (Gemini, ChatGPT, Claude…) để nhận{' '}
                    <strong>5 option prompt</strong> → dán từng option vào MiniMax Audio để tạo và chọn bản phù hợp.
                    Upload nhiều file nếu mỗi file ngắn — audio sẽ được <strong>lặp lại</strong> khi render nếu không
                    đủ dài.
                </Alert>

                <Box>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            Gợi ý prompt cho chatbot AI
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                            {state.bgmPromptSuggestionsLoading ? (
                                <Chip size="small" variant="outlined" label="Đang tạo…" />
                            ) : null}
                            <Button
                                size="small"
                                variant="outlined"
                                color="secondary"
                                startIcon={<OpenInNewIcon />}
                                component="a"
                                href="https://www.minimax.io/audio/music"
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{ textTransform: 'none', fontSize: 11, py: 0.25, minHeight: 0 }}
                            >
                                Mở MiniMax Audio
                            </Button>
                        </Stack>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        Bước 1: copy prompt → dán vào chatbot AI để nhận 5 option. Bước 2: dán từng option vào MiniMax
                        Audio và chọn bản phù hợp nhất.
                    </Typography>
                    {state.bgmPromptSuggestionsLoading ? (
                        <Alert severity="info" sx={{ py: 0.25 }}>
                            Đang build prompt từ title + audio script…
                        </Alert>
                    ) : null}
                    {!state.bgmPromptSuggestionsLoading && state.bgmPromptSuggestions.length === 0 ? (
                        <Alert severity="warning" sx={{ py: 0.25 }}>
                            Chưa có gợi ý prompt — bấm đóng/mở lại drawer để thử lại.
                        </Alert>
                    ) : null}
                    <Stack spacing={1}>
                        {state.bgmPromptSuggestions.map((item) => (
                            <PromptCard
                                key={item.id}
                                label={item.label}
                                prompt={item.prompt}
                                onCopy={() => handleCopyPrompt(item.prompt)}
                            />
                        ))}
                    </Stack>
                </Box>

                <Divider />

                <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                        Upload MP3 audio nền
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        Có thể upload nhiều file — mỗi file một bài; tổng thời lượng được cộng dồn.
                    </Typography>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="audio/mpeg,.mp3"
                        multiple
                        style={{ display: 'none' }}
                        onChange={handleFilesSelected}
                    />
                    <LoadingButton
                        variant="contained"
                        size="small"
                        startIcon={<UploadFileIcon />}
                        loading={state.bgmManualUploading}
                        disabled={state.savingImportAssets}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {state.bgmManualUploading ? 'Đang upload…' : 'Upload MP3 (nhiều file)'}
                    </LoadingButton>
                </Box>

                <Box
                    sx={{
                        p: 1.5,
                        borderRadius: 1,
                        bgcolor: 'action.hover',
                        border: 1,
                        borderColor: insufficient ? 'warning.main' : 'divider',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: state.bgmSegments.length > 0 ? 1 : 0 }}>
                        <MusicNoteIcon fontSize="small" color="action" />
                        <Typography variant="body2" fontWeight={600}>
                            Đã chọn
                            {' '}
                            {state.bgmSegments.length}
                            {' '}
                            bài
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                            {selectedTotal > 0 ? `${selectedTotal.toFixed(1)}s` : '—'}
                            {' '}
                            /
                            {' '}
                            {targetSec > 0 ? `${targetSec.toFixed(1)}s` : '?'}
                        </Typography>
                    </Box>

                    {insufficient ? (
                        <Alert severity="warning" sx={{ py: 0.25, mb: 1 }}>
                            Audio background chưa đủ dài (
                            {selectedTotal.toFixed(1)}s
                            {' '}
                            /
                            {' '}
                            {targetSec.toFixed(1)}s
                            {shortfallSec > 0 ? ` — thiếu ~${shortfallSec.toFixed(1)}s` : ''}
                            ).
                            {state.bgmLoop
                                ? ' Audio sẽ được lặp lại khi render.'
                                : ' Bật "Lặp lại audio" bên dưới để phủ đủ video.'}
                        </Alert>
                    ) : null}

                    {state.bgmSegments.length > 0 ? (
                        <DragDropContext onDragEnd={handleDragEnd}>
                            <Droppable droppableId="bgm-manual-segments">
                                {(dropProvided) => (
                                    <Box
                                        {...dropProvided.droppableProps}
                                        ref={dropProvided.innerRef}
                                        sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}
                                    >
                                        {state.bgmSegments.map((seg, index) => {
                                            const previewUrl = bgmPreviewUrl(seg);
                                            const isPlaying = Boolean(previewUrl && playingUrl === previewUrl);
                                            const isUploaded = String(seg.provider || '').toLowerCase() === 'user_upload';
                                            const segVolume = Number(seg.volume) > 0 ? Number(seg.volume) : 0.6;
                                            return (
                                                <Draggable
                                                    key={`${seg.download_url}-${index}`}
                                                    draggableId={`bgm-seg-${index}`}
                                                    index={index}
                                                >
                                                    {(dragProvided, dragSnapshot) => (
                                                        <Box
                                                            ref={dragProvided.innerRef}
                                                            {...dragProvided.draggableProps}
                                                            sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 0.75,
                                                                py: 0.75,
                                                                px: 0.5,
                                                                borderRadius: 1,
                                                                bgcolor: 'background.paper',
                                                                border: 1,
                                                                borderColor: dragSnapshot.isDragging ? 'primary.main' : 'divider',
                                                                boxShadow: dragSnapshot.isDragging ? 3 : 'none',
                                                            }}
                                                        >
                                                            <Box
                                                                {...dragProvided.dragHandleProps}
                                                                sx={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    cursor: 'grab',
                                                                    color: 'text.secondary',
                                                                    '&:active': { cursor: 'grabbing' },
                                                                }}
                                                                title="Kéo để sắp xếp thứ tự phát"
                                                            >
                                                                <DragHandleIcon fontSize="small" />
                                                            </Box>
                                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                                <Stack direction="row" spacing={0.75} alignItems="center">
                                                                    <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                        {seg.title || seg.id}
                                                                    </Typography>
                                                                    {isUploaded ? (
                                                                        <Chip
                                                                            size="small"
                                                                            color="primary"
                                                                            variant="outlined"
                                                                            label="Upload"
                                                                            sx={{ height: 16, '& .MuiChip-label': { px: 0.5, fontSize: 9 } }}
                                                                        />
                                                                    ) : null}
                                                                </Stack>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {formatBgmDuration(Number(seg.duration_sec || 0))}
                                                                </Typography>
                                                            </Box>
                                                            <Box
                                                                sx={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 0.5,
                                                                    width: 150,
                                                                    flexShrink: 0,
                                                                }}
                                                            >
                                                                <VolumeUpIcon fontSize="small" color="action" />
                                                                <Slider
                                                                    size="small"
                                                                    min={0.05}
                                                                    max={1.5}
                                                                    step={0.05}
                                                                    value={segVolume}
                                                                    valueLabelDisplay="auto"
                                                                    valueLabelFormat={(v) => `x${Number(v).toFixed(2)}`}
                                                                    onChange={(_e, value) => {
                                                                        const next = Array.isArray(value) ? value[0] : value;
                                                                        state.handleUpdateBgmSegmentVolume(index, next);
                                                                    }}
                                                                    onChangeCommitted={() => handleVolumeCommit()}
                                                                    disabled={state.savingImportAssets}
                                                                />
                                                            </Box>
                                                            <Tooltip title={previewUrl ? (isPlaying ? 'Dừng' : 'Nghe thử') : 'Chưa có URL audio'}>
                                                                <span>
                                                                    <IconButton
                                                                        size="small"
                                                                        disabled={!previewUrl}
                                                                        onClick={() => handlePlayPreview(seg)}
                                                                    >
                                                                        {isPlaying ? <StopIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
                                                                    </IconButton>
                                                                </span>
                                                            </Tooltip>
                                                            <IconButton
                                                                edge="end"
                                                                size="small"
                                                                disabled={state.savingImportAssets}
                                                                onClick={() => { void state.handleRemoveBgmSegment(index); }}
                                                            >
                                                                <DeleteOutlineIcon fontSize="small" />
                                                            </IconButton>
                                                        </Box>
                                                    )}
                                                </Draggable>
                                            );
                                        })}
                                        {dropProvided.placeholder}
                                    </Box>
                                )}
                            </Droppable>
                        </DragDropContext>
                    ) : (
                        <Typography variant="caption" color="text.secondary">
                            Chưa có audio nền — upload MP3 hoặc chọn từ tab tìm nhạc.
                        </Typography>
                    )}

                    <Divider sx={{ my: 1 }} />

                    <FormControlLabel
                        control={(
                            <Switch
                                size="small"
                                checked={state.bgmLoop}
                                disabled={state.savingImportAssets}
                                onChange={(e) => { void state.handleBgmLoopChange(e.target.checked); }}
                            />
                        )}
                        label="Lặp lại audio background khi không đủ dài"
                        slotProps={{
                            typography: { variant: 'caption' },
                        }}
                    />
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                        Tắt = render sẽ báo lỗi nếu tổng audio ngắn hơn video (mặc định bật, tự lặp phủ đủ).
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
                    <LoadingButton
                        variant="contained"
                        loading={state.savingImportAssets}
                        onClick={onClose}
                        sx={{ textTransform: 'none' }}
                    >
                        Xong
                    </LoadingButton>
                </Box>
            </Box>
        </DrawerCustom>
    );
}
