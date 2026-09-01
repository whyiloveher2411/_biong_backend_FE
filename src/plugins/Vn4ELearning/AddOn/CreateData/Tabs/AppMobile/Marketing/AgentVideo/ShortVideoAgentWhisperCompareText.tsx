import React from 'react';
import { Box, Typography } from '@mui/material';
import type { CaptionAlignToken } from './agentVideoCaptionScriptAlign';
import { scriptWhisperTextsDiffer } from './agentVideoCaptionScriptAlign';
import type { TtsPhoneticDictEntry, WhisperWord } from './agentVideoApi';
import { buildScriptLinesWithTokens } from './agentVideoWhisperScriptLayout';
import { WHISPER_GAP_OUTLINE, WHISPER_KARAOKE_ACTIVE_STYLE, WHISPER_TIER_STYLES, type WhisperCompareFilter } from './agentVideoWhisperCompareUi';
import { resolvePhoneticPhraseMarks, type PhoneticPhraseMark } from './agentVideoPhoneticMarkUi';
import PhoneticMarkedWord from './PhoneticMarkedWord';
import {
    MANUAL_BEAT_TOKEN_ATTR,
    buildManualBeatTokenMap,
    manualBeatColor,
    resolveSelectionTokenRange,
    type ManualBeatMark,
    type ManualBeatTokenRange,
} from './agentVideoManualBeats';

export const WHISPER_AUDIO_SEEK_PADDING_SEC = 1;

export type ManualBeatSelectionPayload = ManualBeatTokenRange & {
    clientX: number;
    clientY: number;
};

export type ManualBeatMarkClickPayload = {
    mark: ManualBeatMark;
    clientX: number;
    clientY: number;
};

export type ManualBeatCursorClickPayload = {
    tokenIndex: number;
    clientX: number;
    clientY: number;
};

type Props = {
    audioScript: string;
    tokens: CaptionAlignToken[];
    whisperWords?: WhisperWord[];
    phoneticDict?: TtsPhoneticDictEntry[];
    filter?: WhisperCompareFilter;
    selectedIndex?: number | null;
    playingIndex?: number | null;
    tokenRefs?: React.MutableRefObject<Record<number, HTMLSpanElement | null>>;
    onSeekToken?: (tokenIndex: number) => void;
    /** Bôi đen / click phải từ → mở menu phiên âm */
    onPhoneticSelection?: (payload: {
        text: string;
        clientX: number;
        clientY: number;
    }) => void;
    /** Clip video 2s — beat thủ công đã đánh dấu, các từ trong beat bị khóa chọn */
    manualBeatMarks?: ManualBeatMark[];
    /** Bôi đen vùng chưa có beat → mở menu "Tạo beat" */
    onManualBeatSelection?: (payload: ManualBeatSelectionPayload) => void;
    /** Click vào từ chưa thuộc beat → dựng beat từ beat cuối đến vị trí con trỏ */
    onManualBeatCursorClick?: (payload: ManualBeatCursorClickPayload) => void;
    /** Click vào từ đã thuộc beat → mở menu xóa beat */
    onManualBeatMarkClick?: (payload: ManualBeatMarkClickPayload) => void;
    /** Vùng beat đang được preview (từ beat cuối đến con trỏ) sau khi click */
    pendingBeatRange?: ManualBeatTokenRange | null;
    /** Chỉ hiện audio script thuần (bỏ màu tier + nhãn whisper), tô dấu kết câu */
    plainScript?: boolean;
    compact?: boolean;
    maxHeight?: number | string;
};

function resolveWhisperLabel(
    token: CaptionAlignToken,
    whisperWords: WhisperWord[],
): string | undefined {
    return token.whisperText
        ?? (token.transcriptIndex != null ? whisperWords[token.transcriptIndex]?.text : undefined);
}

function shouldShowWhisperParen(token: CaptionAlignToken, whisperLabel?: string): boolean {
    if (!whisperLabel) {
        return false;
    }
    if (token.tier !== 'yellow' && token.tier !== 'red') {
        return false;
    }
    return scriptWhisperTextsDiffer(token.text, whisperLabel);
}

/** Dấu kết câu bọc trong label đỏ — chấm đỏ trơn quá nhỏ, khó thấy chỗ hết câu. */
function renderTokenTextWithSentenceMarks(text: string): React.ReactNode {
    const parts = String(text || '').split(/([.!?…]+)/u).filter((part) => part !== '');
    if (parts.length <= 1) {
        return text;
    }

    return parts.map((part, index) => (
        /[.!?…]/u.test(part) ? (
            <Box
                key={`mark-${index}`}
                component="span"
                sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '1.15em',
                    mx: 0.25,
                    px: 0.4,
                    color: 'common.white',
                    bgcolor: 'error.main',
                    border: '1px solid',
                    borderColor: 'error.dark',
                    borderRadius: '4px',
                    fontWeight: 700,
                    lineHeight: 1.3,
                }}
            >
                {part}
            </Box>
        ) : (
            <React.Fragment key={`txt-${index}`}>{part}</React.Fragment>
        )
    ));
}

function CompareWord({
    token,
    whisperWords,
    selected,
    isPlayingActive,
    dimmed,
    onSeek,
    onPhoneticSelection,
    phoneticSourceTerm,
    registerRef,
    suppressNextClickRef,
    beatMark,
    beatMarkIsStart,
    beatMarkIsEnd,
    onBeatMarkClick,
    onCursorClick,
    inPendingRange,
    isPendingCaret,
    plainScript,
}: {
    token: CaptionAlignToken;
    whisperWords: WhisperWord[];
    selected: boolean;
    isPlayingActive: boolean;
    dimmed: boolean;
    onSeek?: (tokenIndex: number) => void;
    onPhoneticSelection?: (payload: {
        text: string;
        clientX: number;
        clientY: number;
    }) => void;
    /** Term gốc trong dict (có thể là cụm dài) khi từ thuộc mark phiên âm */
    phoneticSourceTerm?: string;
    registerRef?: (node: HTMLSpanElement | null) => void;
    suppressNextClickRef?: React.MutableRefObject<boolean>;
    beatMark?: ManualBeatMark | null;
    beatMarkIsStart?: boolean;
    beatMarkIsEnd?: boolean;
    onBeatMarkClick?: (payload: ManualBeatMarkClickPayload) => void;
    onCursorClick?: (payload: ManualBeatCursorClickPayload) => void;
    inPendingRange?: boolean;
    isPendingCaret?: boolean;
    plainScript?: boolean;
}) {
    const style = WHISPER_TIER_STYLES[token.tier];
    const beatColor = beatMark ? manualBeatColor(beatMark.order) : null;
    const whisperLabel = resolveWhisperLabel(token, whisperWords);
    const showParen = !plainScript && shouldShowWhisperParen(token, whisperLabel);
    const term = String(token.text || '').replace(/[.,!?;:…]+$/u, '').trim();
    const editTerm = phoneticSourceTerm || term;
    const canSeek = Boolean(onSeek);
    const canEditPhonetic = Boolean(onPhoneticSelection && phoneticSourceTerm && editTerm);

    const handleClick = (event: React.MouseEvent) => {
        if (beatMark && onBeatMarkClick) {
            event.preventDefault();
            event.stopPropagation();
            onBeatMarkClick({ mark: beatMark, clientX: event.clientX, clientY: event.clientY });
            return;
        }
        // Click ngay sau bôi đen — giữ quick menu, đừng seek / mở edit từ lẻ
        if (suppressNextClickRef?.current) {
            suppressNextClickRef.current = false;
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        const sel = typeof window !== 'undefined' ? window.getSelection() : null;
        if (sel && !sel.isCollapsed && String(sel.toString() || '').trim()) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        if (onCursorClick) {
            event.preventDefault();
            event.stopPropagation();
            onCursorClick({
                tokenIndex: token.index,
                clientX: event.clientX,
                clientY: event.clientY,
            });
            return;
        }
        if (canEditPhonetic && onPhoneticSelection) {
            event.preventDefault();
            event.stopPropagation();
            onPhoneticSelection({
                text: editTerm,
                clientX: event.clientX,
                clientY: event.clientY,
            });
            return;
        }
        if (onSeek) {
            onSeek(token.index);
        }
    };

    const handleContextMenu = (event: React.MouseEvent) => {
        if (!onPhoneticSelection || !editTerm) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        onPhoneticSelection({
            text: editTerm,
            clientX: event.clientX,
            clientY: event.clientY,
        });
    };

    return (
        <Box
            component="span"
            ref={registerRef}
            {...{ [MANUAL_BEAT_TOKEN_ATTR]: token.index }}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            title={
                beatMark
                    ? `Đã thuộc beat ${beatMark.order} (${beatMark.durationSec.toFixed(2)}s) — click để xóa beat`
                    : onCursorClick
                        ? 'Click để tạo beat từ beat cuối cùng đến đây'
                        : canEditPhonetic
                            ? 'Click để sửa phiên âm · Click phải cũng mở menu'
                            : (canSeek ? 'Click để nghe đoạn audio' : undefined)
            }
            sx={{
                color: isPlayingActive
                    ? WHISPER_KARAOKE_ACTIVE_STYLE.color
                    : plainScript ? 'text.primary' : style.color,
                opacity: dimmed && !isPlayingActive ? 0.35 : 1,
                fontWeight: !plainScript && (token.tier !== 'green' || isPlayingActive)
                    || isPendingCaret ? 700 : 400,
                cursor: beatMark
                    ? 'pointer'
                    : onCursorClick || canSeek || canEditPhonetic || onPhoneticSelection ? 'pointer' : 'default',
                userSelect: beatMark ? 'none' : undefined,
                textDecoration: 'none',
                bgcolor: isPlayingActive
                    ? WHISPER_KARAOKE_ACTIVE_STYLE.bgcolor
                    : inPendingRange
                        ? (isPendingCaret ? 'rgba(25, 118, 210, 0.32)' : 'rgba(25, 118, 210, 0.16)')
                        : beatColor
                            ? beatColor.bg
                            : selected && !plainScript
                                ? style.bg
                                : 'transparent',
                borderTop: inPendingRange ? '1px dashed rgba(25, 118, 210, 0.7)' : (beatColor ? `1px solid ${beatColor.border}` : undefined),
                borderBottom: inPendingRange ? '1px dashed rgba(25, 118, 210, 0.7)' : (beatColor ? `1px solid ${beatColor.border}` : undefined),
                borderLeft: inPendingRange ? '1px solid rgba(25, 118, 210, 0.9)' : (beatColor && beatMarkIsStart ? `1px solid ${beatColor.border}` : undefined),
                borderRight: inPendingRange ? '1px solid rgba(25, 118, 210, 0.9)' : (beatColor && beatMarkIsEnd ? `1px solid ${beatColor.border}` : undefined),
                boxShadow: isPendingCaret
                    ? '0 0 0 1.5px #1976d2, 0 0 10px rgba(25, 118, 210, 0.55)'
                    : undefined,
                borderRadius: beatMark
                    ? `${beatMarkIsStart ? '4px' : '0'} ${beatMarkIsEnd ? '4px' : '0'} ${beatMarkIsEnd ? '4px' : '0'} ${beatMarkIsStart ? '4px' : '0'}`
                    : isPlayingActive || selected || inPendingRange ? '3px' : 0,
                px: beatMark || isPlayingActive || selected || inPendingRange ? 0.25 : 0,
                transition: 'background-color 0.12s ease, color 0.12s ease, box-shadow 0.12s ease',
                outline: !plainScript && !isPlayingActive && token.hasTimingGap
                    ? WHISPER_GAP_OUTLINE
                    : 'none',
                outlineOffset: 1,
                '&:hover': (canSeek || canEditPhonetic || beatMark || inPendingRange) && !isPlayingActive
                    ? {
                        bgcolor: inPendingRange
                            ? (isPendingCaret ? 'rgba(25, 118, 210, 0.42)' : 'rgba(25, 118, 210, 0.24)')
                            : beatColor
                                ? beatColor.hover
                                : plainScript ? 'action.hover' : (style.bg || 'action.hover'),
                    }
                    : undefined,
            }}
        >
            {isPendingCaret ? (
                <Box
                    component="span"
                    sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 3,
                        height: '1.1em',
                        mr: 0.35,
                        verticalAlign: 'middle',
                        borderRadius: '2px',
                        bgcolor: '#1976d2',
                        animation: 'beatCaretBlink 1.1s ease-in-out infinite',
                        '@keyframes beatCaretBlink': {
                            '0%, 100%': { opacity: 1 },
                            '50%': { opacity: 0.3 },
                        },
                    }}
                />
            ) : null}
            {beatMark && beatMarkIsStart ? (
                <Typography
                    component="span"
                    variant="inherit"
                    sx={{ color: beatColor?.label ?? 'primary.main', fontWeight: 700, fontSize: '0.75em', mr: 0.4 }}
                >
                    #{beatMark.order}
                </Typography>
            ) : null}
            {plainScript ? renderTokenTextWithSentenceMarks(token.text) : token.text}
            {showParen ? (
                <Typography
                    component="span"
                    variant="inherit"
                    sx={{
                        color: isPlayingActive
                            ? WHISPER_KARAOKE_ACTIVE_STYLE.parenColor
                            : 'text.secondary',
                        fontWeight: 400,
                        ml: 0.25,
                    }}
                >
                    ({whisperLabel})
                </Typography>
            ) : null}
        </Box>
    );
}

function renderLineTokens({
    lineTokens,
    marksByTokenIndex,
    whisperWords,
    selectedIndex,
    playingIndex,
    dimGreen,
    onSeekToken,
    onPhoneticSelection,
    tokenRefs,
    suppressNextClickRef,
    beatMarkByTokenIndex,
    onManualBeatMarkClick,
    onManualBeatCursorClick,
    pendingBeatRange,
    plainScript,
}: {
    lineTokens: CaptionAlignToken[];
    marksByTokenIndex: Map<number, PhoneticPhraseMark | null>;
    whisperWords: WhisperWord[];
    selectedIndex: number | null;
    playingIndex: number | null;
    dimGreen: boolean;
    onSeekToken?: (tokenIndex: number) => void;
    onPhoneticSelection?: (payload: {
        text: string;
        clientX: number;
        clientY: number;
    }) => void;
    tokenRefs?: React.MutableRefObject<Record<number, HTMLSpanElement | null>>;
    suppressNextClickRef?: React.MutableRefObject<boolean>;
    beatMarkByTokenIndex: Map<number, ManualBeatMark>;
    onManualBeatMarkClick?: (payload: ManualBeatMarkClickPayload) => void;
    onManualBeatCursorClick?: (payload: ManualBeatCursorClickPayload) => void;
    pendingBeatRange?: ManualBeatTokenRange | null;
    plainScript?: boolean;
}) {
    const nodes: React.ReactNode[] = [];
    let i = 0;
    let rendered = 0;

    const beatWordProps = (token: CaptionAlignToken) => {
        const mark = beatMarkByTokenIndex.get(token.index) ?? null;
        const inPending = Boolean(pendingBeatRange
            && token.index >= pendingBeatRange.startTokenIndex
            && token.index <= pendingBeatRange.endTokenIndex);
        return {
            beatMark: mark,
            beatMarkIsStart: mark ? mark.startTokenIndex === token.index : false,
            beatMarkIsEnd: mark ? mark.endTokenIndex === token.index : false,
            onBeatMarkClick: onManualBeatMarkClick,
            onCursorClick: onManualBeatCursorClick,
            inPendingRange: inPending,
            isPendingCaret: inPending && pendingBeatRange ? token.index === pendingBeatRange.endTokenIndex : false,
            plainScript,
        };
    };

    const pushSpace = () => {
        if (rendered > 0) {
            nodes.push(' ');
        }
    };

    while (i < lineTokens.length) {
        const token = lineTokens[i];
        const mark = marksByTokenIndex.get(token.index) ?? null;

        if (mark?.kind === 'start') {
            const count = Math.min(mark.tokenCount, lineTokens.length - i);
            const group = lineTokens.slice(i, i + count);
            pushSpace();
            nodes.push(
                <PhoneticMarkedWord
                    key={`ph-${token.index}`}
                    phonetic={mark.phonetic}
                    inheritColor
                >
                    {group.map((groupToken, groupOffset) => (
                        <React.Fragment key={`g-${groupToken.index}`}>
                            {groupOffset > 0 ? ' ' : null}
                            <CompareWord
                                token={groupToken}
                                whisperWords={whisperWords}
                                selected={selectedIndex === groupToken.index}
                                isPlayingActive={playingIndex === groupToken.index}
                                dimmed={dimGreen && groupToken.tier === 'green'}
                                onSeek={onSeekToken}
                                onPhoneticSelection={onPhoneticSelection}
                                phoneticSourceTerm={mark.sourceTerm}
                                suppressNextClickRef={suppressNextClickRef}
                                {...beatWordProps(groupToken)}
                                registerRef={tokenRefs ? (node) => {
                                    tokenRefs.current[groupToken.index] = node;
                                } : undefined}
                            />
                        </React.Fragment>
                    ))}
                </PhoneticMarkedWord>,
            );
            rendered += 1;
            i += count;
            continue;
        }

        // covered (cụm bắt đầu dòng trước) hoặc không có mark — vẫn hiện chữ
        pushSpace();
        nodes.push(
            <CompareWord
                key={`w-${token.index}`}
                token={token}
                whisperWords={whisperWords}
                selected={selectedIndex === token.index}
                isPlayingActive={playingIndex === token.index}
                dimmed={dimGreen && token.tier === 'green'}
                onSeek={onSeekToken}
                onPhoneticSelection={onPhoneticSelection}
                suppressNextClickRef={suppressNextClickRef}
                {...beatWordProps(token)}
                registerRef={tokenRefs ? (node) => {
                    tokenRefs.current[token.index] = node;
                } : undefined}
            />,
        );
        rendered += 1;
        i += 1;
    }

    return nodes;
}

export default function ShortVideoAgentWhisperCompareText({
    audioScript,
    tokens,
    whisperWords = [],
    phoneticDict = [],
    filter = 'all',
    selectedIndex = null,
    playingIndex = null,
    tokenRefs,
    onSeekToken,
    onPhoneticSelection,
    manualBeatMarks = [],
    onManualBeatSelection,
    onManualBeatMarkClick,
    onManualBeatCursorClick,
    pendingBeatRange = null,
    plainScript = false,
    compact = false,
    maxHeight,
}: Props) {
    const rootRef = React.useRef<HTMLDivElement | null>(null);
    /** mouseup vừa mở menu phiên âm → bỏ qua click ngay sau đó */
    const suppressNextClickRef = React.useRef(false);
    const lines = React.useMemo(
        () => buildScriptLinesWithTokens(audioScript, tokens),
        [audioScript, tokens],
    );

    const marksByTokenIndex = React.useMemo(() => {
        const resolved = resolvePhoneticPhraseMarks(
            tokens.map((token) => token.text),
            phoneticDict,
        );
        const map = new Map<number, PhoneticPhraseMark | null>();
        tokens.forEach((token, index) => {
            map.set(token.index, resolved[index] ?? null);
        });
        return map;
    }, [phoneticDict, tokens]);

    const beatMarkByTokenIndex = React.useMemo(
        () => buildManualBeatTokenMap(manualBeatMarks),
        [manualBeatMarks],
    );

    const dimGreen = filter === 'issues';

    const handleSeekToken = React.useCallback((tokenIndex: number) => {
        if (suppressNextClickRef.current) {
            suppressNextClickRef.current = false;
            return;
        }
        onSeekToken?.(tokenIndex);
    }, [onSeekToken]);

    const handleMouseUp = (event: React.MouseEvent<HTMLDivElement>) => {
        if (onManualBeatSelection && rootRef.current) {
            const range = resolveSelectionTokenRange(rootRef.current);
            if (range) {
                suppressNextClickRef.current = true;
                event.preventDefault();
                event.stopPropagation();
                onManualBeatSelection({
                    ...range,
                    clientX: event.clientX,
                    clientY: event.clientY,
                });
                return;
            }
        }
        if (!onPhoneticSelection || !rootRef.current) {
            return;
        }
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || selection.rangeCount < 1) {
            return;
        }
        const text = String(selection.toString() || '').replace(/\s+/g, ' ').trim();
        if (!text) {
            return;
        }
        const anchorNode = selection.anchorNode;
        const anchorEl = anchorNode?.nodeType === Node.ELEMENT_NODE
            ? (anchorNode as Element)
            : anchorNode?.parentElement;
        if (!anchorEl || !rootRef.current.contains(anchorEl)) {
            return;
        }
        // Chặn click ngay sau bôi đen (seek / mở edit từ lẻ → đóng menu)
        suppressNextClickRef.current = true;
        event.preventDefault();
        event.stopPropagation();
        onPhoneticSelection({
            text,
            clientX: event.clientX,
            clientY: event.clientY,
        });
    };

    if (filter === 'orphans') {
        return null;
    }

    return (
        <Box
            ref={rootRef}
            onMouseUp={handleMouseUp}
            sx={{
                maxHeight: maxHeight ?? undefined,
                overflow: maxHeight ? 'auto' : undefined,
                pr: maxHeight ? 0.5 : 0,
                userSelect: 'text',
            }}
        >
            {lines.map((line, lineIndex) => {
                if (line.isBlank) {
                    return <Box key={`blank-${lineIndex}`} sx={{ height: compact ? 12 : 18 }} />;
                }

                return (
                    <Typography
                        key={`line-${lineIndex}`}
                        component="p"
                        variant="body2"
                        sx={{
                            m: 0,
                            mb: compact ? 0.75 : 1.25,
                            fontSize: compact ? '0.8125rem' : '0.9375rem',
                            lineHeight: 1.65,
                            textAlign: 'left',
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                        }}
                    >
                        {renderLineTokens({
                            lineTokens: line.tokens,
                            marksByTokenIndex,
                            whisperWords,
                            selectedIndex,
                            playingIndex,
                            dimGreen,
                            onSeekToken: onSeekToken ? handleSeekToken : undefined,
                            onPhoneticSelection,
                            tokenRefs,
                            suppressNextClickRef,
                            beatMarkByTokenIndex,
                            onManualBeatMarkClick,
                            onManualBeatCursorClick,
                            pendingBeatRange,
                            plainScript,
                        })}
                    </Typography>
                );
            })}
        </Box>
    );
}
