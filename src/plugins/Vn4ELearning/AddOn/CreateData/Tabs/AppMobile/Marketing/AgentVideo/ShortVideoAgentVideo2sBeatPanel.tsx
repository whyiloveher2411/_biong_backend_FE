import React from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import MergeIcon from '@mui/icons-material/Merge';
import UndoIcon from '@mui/icons-material/Undo';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import AutoAwesomeMotionIcon from '@mui/icons-material/AutoAwesomeMotion';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import VerifiedIcon from '@mui/icons-material/Verified';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ShortVideoAgentWhisperCompareText, {
    type ManualBeatCursorClickPayload,
    type ManualBeatMarkClickPayload,
    type ManualBeatSelectionPayload,
} from './ShortVideoAgentWhisperCompareText';
import ShortVideoAgentManualBeatQuickMenu, {
    type ManualBeatQuickMenuAnchor,
} from './ShortVideoAgentManualBeatQuickMenu';
import {
    buildManualBeatRangeFromCursor,
    buildSentenceBeatMarks,
    isManualBeatTooShort,
    manualBeatColor,
    manualBeatCoverageRatio,
    type ManualBeatTokenRange,
} from './agentVideoManualBeats';
import type { useAgentVideoContent } from './useAgentVideoContent';

type Props = {
    state: ReturnType<typeof useAgentVideoContent>;
};

function BeatAudioUploadButton({
    markId,
    disabled,
    onUpload,
}: {
    markId: string;
    disabled: boolean;
    onUpload: (markId: string, file: File) => void;
}) {
    const inputRef = React.useRef<HTMLInputElement>(null);

    return (
        <>
            <input
                ref={inputRef}
                type="file"
                accept="audio/mpeg,.mp3"
                hidden
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                        onUpload(markId, file);
                    }
                    e.target.value = '';
                }}
            />
            <Button
                size="small"
                variant="text"
                disabled={disabled}
                startIcon={<UploadFileIcon />}
                onClick={(event) => {
                    event.stopPropagation();
                    inputRef.current?.click();
                }}
            >
                Upload
            </Button>
        </>
    );
}

export default function ShortVideoAgentVideo2sBeatPanel({ state }: Props) {
    const [anchor, setAnchor] = React.useState<ManualBeatQuickMenuAnchor | null>(null);
    const [pendingBeatRange, setPendingBeatRange] = React.useState<ManualBeatTokenRange | null>(null);
    const [aiDialogOpen, setAiDialogOpen] = React.useState(false);
    const [aiOutputText, setAiOutputText] = React.useState('');
    const [selectedBeatIds, setSelectedBeatIds] = React.useState<string[]>([]);

    const tokens = state.whisperScriptAlign?.tokens ?? state.scriptOnlyScriptAlign?.tokens ?? [];
    const marks = state.manualBeatMarks;
    const latestMark = marks.length > 0 ? marks[marks.length - 1] : null;
    const coverage = manualBeatCoverageRatio(marks, tokens);
    const coveragePercent = Math.round(coverage * 100);
    const promptFilled = marks.filter((mark) => mark.imagePrompt.trim() !== '').length;
    const beatAudioItemsByMark = React.useMemo(() => {
        const map = new Map<string, NonNullable<typeof state.beatAudio>['items'][number]>();
        for (const item of state.beatAudio?.items ?? []) {
            map.set(item.mark_id, item);
        }
        return map;
    }, [state.beatAudio]);
    const beatAudioReadyCount = (state.beatAudio?.items ?? []).filter((item) => item.status === 'ready').length;
    const beatAudioAllReady = marks.length > 0 && beatAudioReadyCount >= marks.length;
    const pendingSentenceBeats = React.useMemo(
        () => buildSentenceBeatMarks(tokens, marks).length,
        [marks, tokens],
    );

    const closeMenu = React.useCallback(() => {
        setAnchor(null);
        setPendingBeatRange(null);
    }, []);

    const handleSelection = React.useCallback((payload: ManualBeatSelectionPayload) => {
        const blockedReason = state.manualBeatBlockedReason(payload);
        setPendingBeatRange(null);
        setAnchor({
            clientX: payload.clientX,
            clientY: payload.clientY,
            draft: blockedReason ? null : state.buildManualBeatDraft(payload),
            blockedReason,
        });
    }, [state]);

    const handleMarkClick = React.useCallback((payload: ManualBeatMarkClickPayload) => {
        setPendingBeatRange(null);
        setAnchor({ clientX: payload.clientX, clientY: payload.clientY, target: payload.mark });
    }, []);

    const handleCursorClick = React.useCallback((payload: ManualBeatCursorClickPayload) => {
        const result = buildManualBeatRangeFromCursor(payload.tokenIndex, tokens, marks);
        if (result.blockedReason || !result.range) {
            setPendingBeatRange(null);
            setAnchor({
                clientX: payload.clientX,
                clientY: payload.clientY,
                draft: null,
                blockedReason: result.blockedReason ?? 'Không tạo được beat tại vị trí này',
            });
            return;
        }
        setPendingBeatRange(result.range);
        const draft = state.buildManualBeatDraft(result.range);
        setAnchor({
            clientX: payload.clientX,
            clientY: payload.clientY,
            draft,
            blockedReason: draft ? undefined : 'Không xác định được timing whisper của đoạn này',
        });
    }, [marks, state, tokens]);

    const submitAiResult = React.useCallback(() => {
        const text = aiOutputText.trim();
        if (!text) {
            return;
        }
        setAiDialogOpen(false);
        setAiOutputText('');
        void state.handleImportAiBeatDivision(text);
    }, [aiOutputText, state]);

    const handleBeatSelect = React.useCallback((markId: string, markOrder: number) => {
        setSelectedBeatIds((current) => {
            const selectedIndex = current.indexOf(markId);
            if (selectedIndex !== -1) {
                return current.filter((id) => id !== markId);
            }
            // Yêu cầu chọn các beat LIÊN TỤC: nếu id mới không nằm sát 1 trong 2 đầu
            // của vùng đang chọn thì bỏ chọn hết, chọn lại từ mark này.
            const bySelectedOrder = marks.filter((mark) => current.includes(mark.id));
            if (current.length === 0 || bySelectedOrder.length === 0) {
                return [markId];
            }
            const first = bySelectedOrder[0].order;
            const last = bySelectedOrder[bySelectedOrder.length - 1].order;
            const contiguous = markOrder === last + 1 || markOrder === first - 1;
            if (contiguous) {
                return [...current, markId];
            }
            return [markId];
        });
    }, [marks]);

    if (tokens.length === 0 || (state.whisperStatus !== 'completed' && !state.agentBeatAudio)) {
        return (
            <Alert severity="warning">
                {state.agentBeatAudio
                    ? 'Cần có audio script để chia beat — script đang rỗng.'
                    : 'Chưa có dữ liệu whisper — chạy transcribe xong mới chia beat thủ công được.'}
            </Alert>
        );
    }

    return (
        <Stack spacing={1.5}>
            <Alert severity="info" sx={{ py: 0.5 }}>
                <b>Click</b> vào một từ để tự động tạo beat từ beat cuối cùng đến đó; hoặc <b>bôi đen</b> một
                đoạn để chọn chính xác, rồi bấm <b>Tạo beat</b>. Beat chỉ lưu <b>content</b> (đoạn text đã
                chọn), <b>image prompt để trống</b> — sinh sau bằng Meta.ai. Đoạn đã chia beat bị khóa, click
                vào để xóa. Dấu kết câu được bọc trong{' '}
                <Box
                    component="span"
                    sx={{
                        display: 'inline-flex',
                        px: 0.4,
                        color: 'common.white',
                        bgcolor: 'error.main',
                        border: '1px solid',
                        borderColor: 'error.dark',
                        borderRadius: '4px',
                        fontWeight: 700,
                    }}
                >
                    .
                </Box>
                {' '}để dễ thấy chỗ hết câu.
            </Alert>

            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip
                    size="small"
                    color={marks.length > 0 ? 'primary' : 'default'}
                    variant={marks.length > 0 ? 'filled' : 'outlined'}
                    label={`${marks.length} beat`}
                />
                <Chip
                    size="small"
                    color={promptFilled === marks.length && marks.length > 0 ? 'success' : 'default'}
                    variant="outlined"
                    label={`${promptFilled}/${marks.length} có prompt ảnh`}
                />
                <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                    Phủ {coveragePercent}% số từ
                </Typography>
                <Button
                    size="small"
                    variant="outlined"
                    startIcon={state.copyingBeatDivisionPrompt
                        ? <CircularProgress size={14} color="inherit" />
                        : <ContentCopyIcon />}
                    disabled={state.copyingBeatDivisionPrompt}
                    onClick={() => { void state.handleCopyBeatDivisionPrompt(); }}
                >
                    Copy prompt chia beat
                </Button>
                <Button
                    size="small"
                    variant="outlined"
                    color="secondary"
                    startIcon={<SmartToyIcon />}
                    disabled={state.importingAiBeatDivision}
                    onClick={() => { setAiOutputText(''); setAiDialogOpen(true); }}
                >
                    Dán kết quả AI
                </Button>
                <Button
                    size="small"
                    variant="contained"
                    startIcon={<AutoAwesomeMotionIcon />}
                    disabled={state.savingManualBeat || pendingSentenceBeats === 0}
                    onClick={() => { void state.handleAutoSplitManualBeats(); }}
                >
                    Chia tự động theo dấu "."
                    {pendingSentenceBeats > 0 ? ` (${pendingSentenceBeats})` : ''}
                </Button>
                <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<UndoIcon />}
                    disabled={!latestMark || state.savingManualBeat}
                    onClick={() => {
                        if (latestMark) {
                            void state.handleDeleteManualBeat(latestMark.id);
                        }
                    }}
                >
                    Xóa beat gần nhất
                    {latestMark ? ` (#${latestMark.order})` : ''}
                </Button>
            </Stack>

            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                <Tooltip
                    title={coverage < 1
                        ? `Cần chia beat phủ hết kịch bản (đang ${coveragePercent}%) mới sinh prompt được`
                        : 'Mở tab Meta.ai: panel tự dán prompt art-director rồi hiện danh sách beat'}
                >
                    <span>
                        <Button
                            size="small"
                            variant="contained"
                            color="secondary"
                            startIcon={<ImageSearchIcon />}
                            disabled={coverage < 1 || marks.length === 0 || state.openingVideo2sMetaAi}
                            onClick={() => { void state.handleOpenVideo2sMetaAi(); }}
                        >
                            Sinh prompt ảnh từ Meta.ai
                        </Button>
                    </span>
                </Tooltip>
                <Button
                    size="small"
                    variant="text"
                    startIcon={<RefreshIcon />}
                    onClick={() => { void state.reloadManualBeatMarks(); }}
                >
                    Tải lại prompt đã dán
                </Button>
                {coverage < 1 ? (
                    <Typography variant="caption" color="text.secondary">
                        Nhớ upload ảnh nhân vật vào Meta.ai trước khi bấm từng beat.
                    </Typography>
                ) : null}
            </Stack>

            <Box
                sx={{
                    p: 1.5,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                }}
            >
                <ShortVideoAgentWhisperCompareText
                    audioScript={state.audioScript}
                    tokens={tokens}
                    whisperWords={state.whisperWords}
                    manualBeatMarks={marks}
                    onManualBeatSelection={handleSelection}
                    onManualBeatMarkClick={handleMarkClick}
                    onManualBeatCursorClick={handleCursorClick}
                    pendingBeatRange={pendingBeatRange}
                    plainScript
                    maxHeight={420}
                />
            </Box>

            {marks.length > 0 ? (
                <Stack spacing={0.5}>
                    <Typography variant="subtitle2">Beat đã chia</Typography>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                        {selectedBeatIds.length > 0 ? (
                            <Chip
                                size="small"
                                color="secondary"
                                variant="filled"
                                onDelete={() => setSelectedBeatIds([])}
                                label={`Đang chọn ${selectedBeatIds.length} beat`}
                            />
                        ) : (
                            <Typography variant="caption" color="text.secondary">
                                Click 1 beat để chọn; click các beat <b>gần nhau</b> để gộp.
                            </Typography>
                        )}
                        <Button
                            size="small"
                            variant="contained"
                            color="secondary"
                            startIcon={state.mergingManualBeat
                                ? <CircularProgress size={14} color="inherit" />
                                : <MergeIcon />}
                            disabled={state.mergingManualBeat || selectedBeatIds.length < 2}
                            onClick={() => {
                                const ids = [...selectedBeatIds];
                                setSelectedBeatIds([]);
                                void state.handleMergeManualBeats(ids);
                            }}
                        >
                            Gộp {selectedBeatIds.length} beat
                        </Button>
                    </Stack>
                    <Box sx={{ maxHeight: 320, overflowY: 'auto', pr: 0.5 }}>
                        <Stack spacing={0.5}>
                            {marks.map((mark) => {
                                const color = manualBeatColor(mark.order);
                                const isSelected = selectedBeatIds.includes(mark.id);
                                const tooShort = isManualBeatTooShort(mark.durationSec);
                                return (
                                    <Stack
                                        key={mark.id}
                                        direction="row"
                                        spacing={1}
                                        alignItems="center"
                                        sx={{
                                            px: 1,
                                            py: 0.5,
                                            borderRadius: 1,
                                            cursor: 'pointer',
                                            outline: isSelected ? '2px solid' : 'none',
                                            outlineColor: isSelected ? 'secondary.main' : 'transparent',
                                            bgcolor: isSelected
                                                ? 'secondary.main'
                                                : tooShort
                                                    ? 'rgba(255, 152, 0, 0.3)'
                                                    : mark.imagePrompt
                                                        ? color.bg
                                                        : 'rgba(255, 152, 0, 0.14)',
                                            borderLeft: `3px solid ${mark.imagePrompt ? color.border : '#ff9800'}`,
                                            '&:hover': { filter: isSelected ? 'none' : 'brightness(0.97)' },
                                        }}
                                        onClick={() => handleBeatSelect(mark.id, mark.order)}
                                    >
                                        <Typography variant="caption" fontWeight={700} sx={{ color: color.label }}>
                                            #{mark.order}
                                        </Typography>
                                        {mark.timelineConfirmed ? (
                                            <Tooltip title="Đã xác nhận timeline thủ công — timing là chuẩn">
                                                <VerifiedIcon
                                                    fontSize="small"
                                                    sx={{ color: 'success.main', fontSize: 14 }}
                                                />
                                            </Tooltip>
                                        ) : null}
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            onClick={(event) => {
                                                const audioItem = beatAudioItemsByMark.get(mark.id);
                                                if (!state.agentBeatAudio || !audioItem?.url) {
                                                    return;
                                                }
                                                event.stopPropagation();
                                                event.preventDefault();
                                                window.open(String(audioItem.url || ''), '_blank', 'noopener,noreferrer');
                                            }}
                                            sx={{
                                                minWidth: 116,
                                                fontVariantNumeric: 'tabular-nums',
                                                ...(state.agentBeatAudio && beatAudioItemsByMark.get(mark.id)?.url ? {
                                                    cursor: 'pointer',
                                                    textDecoration: 'underline dotted',
                                                    '&:hover': { color: 'primary.main' },
                                                } : {}),
                                            }}
                                            title={state.agentBeatAudio && beatAudioItemsByMark.get(mark.id)?.url
                                                ? 'Bấm để nghe audio beat'
                                                : undefined}
                                        >
                                            {mark.startSec.toFixed(2)}s → {mark.endSec.toFixed(2)}s
                                            {' '}({mark.durationSec.toFixed(2)}s)
                                        </Typography>
                                        <Typography variant="caption" sx={{ flex: 1 }}>
                                            {mark.content}
                                        </Typography>
                                        {tooShort ? (
                                            <Chip size="small" color="warning" label="<2s" />
                                        ) : null}
                                        <Chip
                                            size="small"
                                            variant="outlined"
                                            color={mark.imagePrompt ? 'success' : 'warning'}
                                            label={mark.imagePrompt ? 'có prompt' : 'chưa prompt'}
                                        />
                                        {isSelected ? (
                                            <IconButton
                                                size="small"
                                                color="inherit"
                                                aria-label={`Gộp beat ${mark.order}`}
                                                disabled={state.mergingManualBeat}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    const ids = [...selectedBeatIds];
                                                    setSelectedBeatIds([]);
                                                    void state.handleMergeManualBeats(ids);
                                                }}
                                            >
                                                <MergeIcon fontSize="small" />
                                            </IconButton>
                                        ) : (
                                            <IconButton
                                                size="small"
                                                color="error"
                                                aria-label={`Xóa beat ${mark.order}`}
                                                disabled={state.savingManualBeat}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    void state.handleDeleteManualBeat(mark.id);
                                                }}
                                            >
                                                <DeleteOutlineOutlinedIcon fontSize="small" />
                                            </IconButton>
                                        )}
                                    </Stack>
                                );
                            })}
                        </Stack>
                    </Box>
                </Stack>
            ) : null}

            {state.agentBeatAudio ? (
                <Stack spacing={1}>
                    <Box>
                        <Typography variant="subtitle2">Audio từng beat</Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.35 }}>
                            Mỗi beat đọc audio RIÊNG theo đúng content (provider lấy từ cài đặt TTS — mặc định Saydi).
                            Beat nào đọc sai (whisper QA báo lỗi) thì bấm <b>Tạo lại</b> hoặc <b>Upload</b> MP3 thủ công.
                            Xong tất cả bấm <b>Ghép audio</b> để tạo audio full (ngắt nghỉ theo dấu câu).
                        </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Button
                            size="small"
                            variant="contained"
                            startIcon={state.generatingBeatAudio === 'all'
                                ? <CircularProgress size={14} color="inherit" />
                                : <GraphicEqIcon />}
                            disabled={state.generatingBeatAudio !== null || marks.length === 0}
                            onClick={() => { void state.handleGenerateAllBeatAudio(); }}
                        >
                            {state.generatingBeatAudio === 'all' ? 'Đang tạo...' : 'Tạo audio tất cả beat'}
                        </Button>
                        {state.beatAudio?.merged?.duration_sec ? (
                            <Chip
                                size="small"
                                color="success"
                                variant="outlined"
                                label={`Audio full ${state.beatAudio.merged.duration_sec.toFixed(2)}s (ghép lúc render)`}
                            />
                        ) : (
                            <Typography variant="caption" color="text.secondary">
                                Audio full được ghép TỰ ĐỘNG khi bấm Render — không cần bước riêng.
                            </Typography>
                        )}
                    </Stack>
                    <Box sx={{ maxHeight: 260, overflowY: 'auto', pr: 0.5 }}>
                        <Stack spacing={0.5}>
                            {marks.map((mark) => {
                                const item = beatAudioItemsByMark.get(mark.id);
                                const status = item?.status ?? 'pending';
                                const isGenerating = state.generatingBeatAudio === mark.id;
                                const color = manualBeatColor(mark.order);
                                return (
                                    <Stack
                                        key={`beat-audio-${mark.id}`}
                                        direction="row"
                                        spacing={1}
                                        alignItems="center"
                                        sx={{
                                            px: 1,
                                            py: 0.5,
                                            borderRadius: 1,
                                            bgcolor: status === 'error'
                                                ? 'rgba(244, 67, 54, 0.08)'
                                                : status === 'ready'
                                                    ? 'rgba(76, 175, 80, 0.08)'
                                                    : 'background.default',
                                            border: '1px solid',
                                            borderColor: 'divider',
                                        }}
                                    >
                                        <Typography variant="caption" fontWeight={700} sx={{ color: color.label }}>
                                            #{mark.order}
                                        </Typography>
                                        {status === 'ready' ? (
                                            <Tooltip title={item?.source === 'upload' ? 'Audio upload thủ công' : `Audio do ${item?.tts_engine ?? 'TTS'} đọc`}>
                                                <CheckCircleOutlineIcon fontSize="small" sx={{ color: 'success.main', fontSize: 15 }} />
                                            </Tooltip>
                                        ) : status === 'error' ? (
                                            <Tooltip title={item?.error || 'Audio lỗi'}>
                                                <ErrorOutlineIcon fontSize="small" sx={{ color: 'error.main', fontSize: 15 }} />
                                            </Tooltip>
                                        ) : null}
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{
                                                minWidth: 74,
                                                fontVariantNumeric: 'tabular-nums',
                                                ...(status === 'ready' && item?.url ? {
                                                    cursor: 'pointer',
                                                    textDecoration: 'underline dotted',
                                                    '&:hover': { color: 'primary.main' },
                                                } : {}),
                                            }}
                                            onClick={status === 'ready' && item?.url
                                                ? (event) => {
                                                    event.stopPropagation();
                                                    event.preventDefault();
                                                    window.open(String(item?.url || ''), '_blank', 'noopener,noreferrer');
                                                }
                                                : undefined}
                                        >
                                            {status === 'ready' ? `${(item?.duration_sec ?? 0).toFixed(2)}s` : status}
                                        </Typography>
                                        {item?.pause_after_ms ? (
                                            <Typography variant="caption" color="text.secondary">
                                                pause {item.pause_after_ms}ms
                                            </Typography>
                                        ) : null}
                                        <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1 }}>
                                            {mark.content}
                                        </Typography>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={isGenerating
                                                ? <CircularProgress size={13} color="inherit" />
                                                : <GraphicEqIcon />}
                                            disabled={state.generatingBeatAudio !== null}
                                            onClick={() => {
                                                void state.handleGenerateBeatAudio(mark.id, status === 'ready');
                                            }}
                                        >
                                            {status === 'ready' ? 'Tạo lại' : 'Tạo audio'}
                                        </Button>
                                        <BeatAudioUploadButton
                                            markId={mark.id}
                                            disabled={state.generatingBeatAudio !== null}
                                            onUpload={(markId, file) => { void state.handleUploadBeatAudio(markId, file); }}
                                        />
                                    </Stack>
                                );
                            })}
                        </Stack>
                    </Box>
                </Stack>
            ) : null}

            <ShortVideoAgentManualBeatQuickMenu
                anchor={anchor}
                busy={state.savingManualBeat}
                onCreate={(draft) => {
                    closeMenu();
                    void state.handleCreateManualBeat(draft);
                }}
                onDelete={(markId) => {
                    closeMenu();
                    void state.handleDeleteManualBeat(markId);
                }}
                onClose={closeMenu}
            />

            <Dialog
                open={aiDialogOpen}
                onClose={() => {
                    if (!state.importingAiBeatDivision) {
                        setAiDialogOpen(false);
                    }
                }}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Dán kết quả AI chia beat</DialogTitle>
                <DialogContent dividers>
                    <Alert severity="warning" sx={{ mb: 1.5 }}>
                        Thao tác này sẽ <b>thay toàn bộ</b> beat hiện tại. AI chỉ cần trả{' '}
                        <b>content nguyên văn</b> — backend tự tính start/end dựa trên audio script + whisper
                        timing.
                    </Alert>
                    <Box
                        component="textarea"
                        value={aiOutputText}
                        onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
                            setAiOutputText(event.target.value);
                        }}
                        placeholder={'1. content beat 1\n2. content beat 2\n...\n\n(Mỗi beat 1 dòng; hỗ trợ cả "Beat N:", bullet, hay JSON list)'}
                        sx={{
                            width: '100%',
                            minHeight: 180,
                            p: 1,
                            fontFamily: 'monospace',
                            fontSize: 13,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            bgcolor: 'background.paper',
                            color: 'text.primary',
                            resize: 'vertical',
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        size="small"
                        disabled={state.importingAiBeatDivision}
                        onClick={() => { setAiDialogOpen(false); }}
                    >
                        Hủy
                    </Button>
                    <Button
                        size="small"
                        variant="contained"
                        startIcon={state.importingAiBeatDivision
                            ? <CircularProgress size={14} color="inherit" />
                            : <SmartToyIcon />}
                        disabled={!aiOutputText.trim() || state.importingAiBeatDivision}
                        onClick={submitAiResult}
                    >
                        {state.importingAiBeatDivision ? 'Đang nhập...' : 'Nhập beat AI'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
}
