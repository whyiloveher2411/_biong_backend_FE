import React from 'react';
import { Box, Typography } from '@mui/material';
import type { CaptionAlignToken } from './agentVideoCaptionScriptAlign';
import { scriptWhisperTextsDiffer } from './agentVideoCaptionScriptAlign';
import type { TtsPhoneticDictEntry, WhisperWord } from './agentVideoApi';
import { buildScriptLinesWithTokens } from './agentVideoWhisperScriptLayout';
import { WHISPER_GAP_OUTLINE, WHISPER_KARAOKE_ACTIVE_STYLE, WHISPER_TIER_STYLES, type WhisperCompareFilter } from './agentVideoWhisperCompareUi';
import { resolvePhoneticPhraseMarks, type PhoneticPhraseMark } from './agentVideoPhoneticMarkUi';
import PhoneticMarkedWord from './PhoneticMarkedWord';

export const WHISPER_AUDIO_SEEK_PADDING_SEC = 1;

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
}) {
    const style = WHISPER_TIER_STYLES[token.tier];
    const whisperLabel = resolveWhisperLabel(token, whisperWords);
    const showParen = shouldShowWhisperParen(token, whisperLabel);
    const term = String(token.text || '').replace(/[.,!?;:…]+$/u, '').trim();
    const editTerm = phoneticSourceTerm || term;
    const canSeek = Boolean(onSeek);
    const canEditPhonetic = Boolean(onPhoneticSelection && phoneticSourceTerm && editTerm);

    const handleClick = (event: React.MouseEvent) => {
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
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            title={
                canEditPhonetic
                    ? 'Click để sửa phiên âm · Click phải cũng mở menu'
                    : (canSeek ? 'Click để nghe đoạn audio' : undefined)
            }
            sx={{
                color: isPlayingActive ? WHISPER_KARAOKE_ACTIVE_STYLE.color : style.color,
                opacity: dimmed && !isPlayingActive ? 0.35 : 1,
                fontWeight: token.tier !== 'green' || isPlayingActive ? 600 : 400,
                cursor: (canSeek || canEditPhonetic || onPhoneticSelection) ? 'pointer' : 'default',
                textDecoration: 'none',
                bgcolor: isPlayingActive
                    ? WHISPER_KARAOKE_ACTIVE_STYLE.bgcolor
                    : selected
                        ? style.bg
                        : 'transparent',
                borderRadius: isPlayingActive || selected ? '3px' : 0,
                px: isPlayingActive || selected ? 0.25 : 0,
                transition: 'background-color 0.12s ease, color 0.12s ease',
                outline: !isPlayingActive && token.hasTimingGap ? WHISPER_GAP_OUTLINE : 'none',
                outlineOffset: 1,
                '&:hover': (canSeek || canEditPhonetic) && !isPlayingActive
                    ? { bgcolor: style.bg || 'action.hover' }
                    : undefined,
            }}
        >
            {token.text}
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
}) {
    const nodes: React.ReactNode[] = [];
    let i = 0;
    let rendered = 0;

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

    const dimGreen = filter === 'issues';

    const handleSeekToken = React.useCallback((tokenIndex: number) => {
        if (suppressNextClickRef.current) {
            suppressNextClickRef.current = false;
            return;
        }
        onSeekToken?.(tokenIndex);
    }, [onSeekToken]);

    const handleMouseUp = (event: React.MouseEvent<HTMLDivElement>) => {
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
                        })}
                    </Typography>
                );
            })}
        </Box>
    );
}
