import React from 'react';
import {
    Box,
    Chip,
    Divider,
    IconButton,
    Stack,
    Typography,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EditIcon from '@mui/icons-material/Edit';
import DrawerCustom from 'components/molecules/DrawerCustom';
import LoadingButton from 'components/atoms/LoadingButton';
import type { CaptionAlignResult } from './agentVideoCaptionScriptAlign';
import type { WhisperWord } from './agentVideoApi';
import ShortVideoAgentWhisperCompareText, { WHISPER_AUDIO_SEEK_PADDING_SEC } from './ShortVideoAgentWhisperCompareText';
import { WHISPER_TIER_STYLES, type WhisperCompareFilter } from './agentVideoWhisperCompareUi';
import { resolveActiveTokenIndex } from './agentVideoWhisperActiveToken';
import { listIssueTokenIndexes } from './useWhisperScriptAlign';

type Props = {
    open: boolean;
    onClose: () => void;
    audioScript: string;
    alignResult: CaptionAlignResult | null;
    whisperWords: WhisperWord[];
    audioFileUrl: string;
    focusIndex?: number | null;
    filter: WhisperCompareFilter;
    onFilterChange: (filter: WhisperCompareFilter) => void;
    onFocusScript: () => void;
    onSave: () => void | Promise<void>;
    saving: boolean;
    hasUnsavedChanges: boolean;
};

function formatClock(sec: number): string {
    const safe = Math.max(0, sec);
    const m = Math.floor(safe / 60);
    const s = Math.floor(safe % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
}

export default function ShortVideoAgentWhisperCompareDrawer({
    open,
    onClose,
    audioScript,
    alignResult,
    whisperWords,
    audioFileUrl,
    focusIndex = null,
    filter,
    onFilterChange,
    onFocusScript,
    onSave,
    saving,
    hasUnsavedChanges,
}: Props) {
    const audioRef = React.useRef<HTMLAudioElement | null>(null);
    const tokenRefs = React.useRef<Record<number, HTMLSpanElement | null>>({});
    const [currentTime, setCurrentTime] = React.useState(0);
    const [duration, setDuration] = React.useState(0);
    const [issueCursor, setIssueCursor] = React.useState(0);
    const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

    const issueIndexes = React.useMemo(
        () => (alignResult ? listIssueTokenIndexes(alignResult.tokens) : []),
        [alignResult],
    );

    const playingIndex = React.useMemo(
        () => resolveActiveTokenIndex(alignResult?.tokens ?? [], currentTime),
        [alignResult?.tokens, currentTime],
    );

    const handleAudioTime = React.useCallback((timeSec: number) => {
        setCurrentTime(timeSec);
    }, []);

    const seekToToken = React.useCallback((tokenIndex: number) => {
        if (!alignResult || !audioRef.current) {
            return;
        }
        const token = alignResult.tokens[tokenIndex];
        if (!token) {
            return;
        }
        setActiveIndex(tokenIndex);
        audioRef.current.currentTime = Math.max(0, token.start - WHISPER_AUDIO_SEEK_PADDING_SEC);
        void audioRef.current.play().catch(() => undefined);
    }, [alignResult]);

    React.useEffect(() => {
        if (!open || focusIndex == null || !alignResult) {
            return;
        }
        const issuePos = issueIndexes.indexOf(focusIndex);
        if (issuePos >= 0) {
            setIssueCursor(issuePos);
        }
        const node = tokenRefs.current[focusIndex];
        if (node) {
            node.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
        seekToToken(focusIndex);
    }, [alignResult, focusIndex, issueIndexes, open, seekToToken]);

    const jumpIssue = React.useCallback((direction: -1 | 1) => {
        if (issueIndexes.length === 0) {
            return;
        }
        const next = (issueCursor + direction + issueIndexes.length) % issueIndexes.length;
        setIssueCursor(next);
        const tokenIndex = issueIndexes[next];
        const node = tokenRefs.current[tokenIndex];
        if (node) {
            node.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
        seekToToken(tokenIndex);
    }, [issueCursor, issueIndexes, seekToToken]);

    React.useEffect(() => {
        if (!open || playingIndex == null) {
            return;
        }
        const node = tokenRefs.current[playingIndex];
        if (node) {
            node.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [open, playingIndex]);

    const handleFocusScript = () => {
        onClose();
        onFocusScript();
    };

    const selectedIndex = activeIndex ?? focusIndex ?? (issueIndexes[issueCursor] ?? null);

    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title="So sánh kịch bản & Whisper"
            width={720}
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
                    overflow: 'auto',
                },
            }}
            action={(
                <Stack direction="row" spacing={1} justifyContent="space-between" width="100%">
                    <LoadingButton
                        variant="outlined"
                        startIcon={<EditIcon />}
                        onClick={handleFocusScript}
                    >
                        Sửa kịch bản
                    </LoadingButton>
                    <LoadingButton
                        variant="contained"
                        loading={saving}
                        disabled={!hasUnsavedChanges}
                        onClick={() => { void onSave(); }}
                    >
                        Lưu chỉnh sửa karaoke
                    </LoadingButton>
                </Stack>
            )}
        >
            <Stack spacing={1.5}>
                {audioFileUrl ? (
                    <Box sx={{ position: 'sticky', top: 0, zIndex: 2, bgcolor: 'background.paper', pb: 1 }}>
                        <audio
                            ref={audioRef}
                            src={audioFileUrl}
                            controls
                            style={{ width: '100%' }}
                            onTimeUpdate={(event) => handleAudioTime(event.currentTarget.currentTime)}
                            onSeeked={(event) => handleAudioTime(event.currentTarget.currentTime)}
                            onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
                        />
                        <Typography variant="caption" color="text.secondary">
                            {formatClock(currentTime)} / {formatClock(duration)}
                            {' · '}
                            Click từ vàng/đỏ để nghe đoạn audio (−{WHISPER_AUDIO_SEEK_PADDING_SEC}s)
                        </Typography>
                    </Box>
                ) : null}

                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                    <Chip
                        size="small"
                        label="Tất cả"
                        color={filter === 'all' ? 'primary' : 'default'}
                        variant={filter === 'all' ? 'filled' : 'outlined'}
                        onClick={() => onFilterChange('all')}
                    />
                    <Chip
                        size="small"
                        label="Chỉ vàng/đỏ"
                        color={filter === 'issues' ? 'warning' : 'default'}
                        variant={filter === 'issues' ? 'filled' : 'outlined'}
                        onClick={() => onFilterChange('issues')}
                    />
                    <Chip
                        size="small"
                        label="Whisper thừa"
                        variant={filter === 'orphans' ? 'filled' : 'outlined'}
                        onClick={() => onFilterChange('orphans')}
                    />
                </Stack>

                {filter !== 'orphans' && issueIndexes.length > 0 ? (
                    <Stack direction="row" spacing={0.5} alignItems="center">
                        <IconButton size="small" onClick={() => jumpIssue(-1)} aria-label="Lỗi trước">
                            <ChevronLeftIcon fontSize="small" />
                        </IconButton>
                        <Typography variant="caption" color="text.secondary">
                            Lỗi {issueIndexes.length > 0 ? issueCursor + 1 : 0}/{issueIndexes.length}
                        </Typography>
                        <IconButton size="small" onClick={() => jumpIssue(1)} aria-label="Lỗi sau">
                            <ChevronRightIcon fontSize="small" />
                        </IconButton>
                    </Stack>
                ) : null}

                {filter !== 'orphans' && alignResult ? (
                    <ShortVideoAgentWhisperCompareText
                        audioScript={audioScript}
                        tokens={alignResult.tokens}
                        whisperWords={whisperWords}
                        filter={filter}
                        selectedIndex={selectedIndex}
                        playingIndex={playingIndex}
                        tokenRefs={tokenRefs}
                        onSeekToken={seekToToken}
                    />
                ) : null}

                {filter === 'orphans' || (alignResult?.orphans.length ?? 0) > 0 ? (
                    <>
                        {filter !== 'orphans' ? <Divider /> : null}
                        <Typography variant="subtitle2">Whisper thừa</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {(alignResult?.orphans ?? []).map((word, index) => (
                                <Box
                                    key={`orphan-${index}-${word.text}-${word.start}`}
                                    component="span"
                                    sx={{
                                        px: 0.5,
                                        py: 0.25,
                                        borderRadius: 1,
                                        border: '1px dashed',
                                        borderColor: WHISPER_TIER_STYLES.grey.border,
                                        bgcolor: WHISPER_TIER_STYLES.grey.bg,
                                        color: WHISPER_TIER_STYLES.grey.color,
                                        fontSize: '0.8125rem',
                                        cursor: 'pointer',
                                    }}
                                    onClick={() => {
                                        if (audioRef.current) {
                                            audioRef.current.currentTime = Math.max(
                                                0,
                                                word.start - WHISPER_AUDIO_SEEK_PADDING_SEC,
                                            );
                                            void audioRef.current.play().catch(() => undefined);
                                        }
                                    }}
                                >
                                    {word.text}
                                </Box>
                            ))}
                            {(alignResult?.orphans.length ?? 0) === 0 ? (
                                <Typography variant="caption" color="text.secondary">
                                    Không có token Whisper thừa.
                                </Typography>
                            ) : null}
                        </Box>
                    </>
                ) : null}
            </Stack>
        </DrawerCustom>
    );
}
