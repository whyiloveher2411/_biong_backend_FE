import React from 'react';
import { Alert, Box, Button, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import AutoAwesomeMotionIcon from '@mui/icons-material/AutoAwesomeMotion';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import ShortVideoAgentWhisperCompareText, {
    type ManualBeatMarkClickPayload,
    type ManualBeatSelectionPayload,
} from './ShortVideoAgentWhisperCompareText';
import ShortVideoAgentManualBeatQuickMenu, {
    type ManualBeatQuickMenuAnchor,
} from './ShortVideoAgentManualBeatQuickMenu';
import { buildSentenceBeatMarks, manualBeatColor, manualBeatCoverageRatio } from './agentVideoManualBeats';
import type { useAgentVideoContent } from './useAgentVideoContent';

type Props = {
    state: ReturnType<typeof useAgentVideoContent>;
};

export default function ShortVideoAgentVideo2sBeatPanel({ state }: Props) {
    const [anchor, setAnchor] = React.useState<ManualBeatQuickMenuAnchor | null>(null);

    const tokens = state.whisperScriptAlign?.tokens ?? [];
    const marks = state.manualBeatMarks;
    const latestMark = marks.length > 0 ? marks[marks.length - 1] : null;
    const coverage = manualBeatCoverageRatio(marks, tokens);
    const coveragePercent = Math.round(coverage * 100);
    const promptFilled = marks.filter((mark) => mark.imagePrompt.trim() !== '').length;
    const pendingSentenceBeats = React.useMemo(
        () => buildSentenceBeatMarks(tokens, marks).length,
        [marks, tokens],
    );

    const closeMenu = React.useCallback(() => setAnchor(null), []);

    const handleSelection = React.useCallback((payload: ManualBeatSelectionPayload) => {
        const blockedReason = state.manualBeatBlockedReason(payload);
        setAnchor({
            clientX: payload.clientX,
            clientY: payload.clientY,
            draft: blockedReason ? null : state.buildManualBeatDraft(payload),
            blockedReason,
        });
    }, [state]);

    const handleMarkClick = React.useCallback((payload: ManualBeatMarkClickPayload) => {
        setAnchor({ clientX: payload.clientX, clientY: payload.clientY, target: payload.mark });
    }, []);

    if (state.whisperStatus !== 'completed' || tokens.length === 0) {
        return (
            <Alert severity="warning">
                Chưa có dữ liệu whisper — chạy transcribe xong mới chia beat thủ công được.
            </Alert>
        );
    }

    return (
        <Stack spacing={1.5}>
            <Alert severity="info" sx={{ py: 0.5 }}>
                Bôi đen đoạn kịch bản rồi bấm <b>Tạo beat</b>. Beat chỉ lưu <b>content</b> (đoạn text đã bôi
                đen), <b>image prompt để trống</b> — sinh sau bằng Meta.ai. Đoạn đã chia beat bị khóa, click
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
                    plainScript
                    maxHeight={420}
                />
            </Box>

            {marks.length > 0 ? (
                <Stack spacing={0.5}>
                    <Typography variant="subtitle2">Beat đã chia</Typography>
                    <Box sx={{ maxHeight: 320, overflowY: 'auto', pr: 0.5 }}>
                        <Stack spacing={0.5}>
                            {marks.map((mark) => {
                                const color = manualBeatColor(mark.order);
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
                                            bgcolor: mark.imagePrompt ? color.bg : 'rgba(255, 152, 0, 0.14)',
                                            borderLeft: `3px solid ${mark.imagePrompt ? color.border : '#ff9800'}`,
                                        }}
                                    >
                                        <Typography variant="caption" fontWeight={700} sx={{ color: color.label }}>
                                            #{mark.order}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{ minWidth: 116, fontVariantNumeric: 'tabular-nums' }}
                                        >
                                            {mark.startSec.toFixed(2)}s → {mark.endSec.toFixed(2)}s
                                            {' '}({mark.durationSec.toFixed(2)}s)
                                        </Typography>
                                        <Typography variant="caption" sx={{ flex: 1 }}>
                                            {mark.content}
                                        </Typography>
                                        <Chip
                                            size="small"
                                            variant="outlined"
                                            color={mark.imagePrompt ? 'success' : 'warning'}
                                            label={mark.imagePrompt ? 'có prompt' : 'chưa prompt'}
                                        />
                                        <IconButton
                                            size="small"
                                            color="error"
                                            aria-label={`Xóa beat ${mark.order}`}
                                            disabled={state.savingManualBeat}
                                            onClick={() => { void state.handleDeleteManualBeat(mark.id); }}
                                        >
                                            <DeleteOutlineOutlinedIcon fontSize="small" />
                                        </IconButton>
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
        </Stack>
    );
}
