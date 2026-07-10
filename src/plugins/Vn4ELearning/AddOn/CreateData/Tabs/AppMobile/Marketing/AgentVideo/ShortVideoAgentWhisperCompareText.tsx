import React from 'react';
import { Box, Typography } from '@mui/material';
import type { CaptionAlignToken } from './agentVideoCaptionScriptAlign';
import { scriptWhisperTextsDiffer } from './agentVideoCaptionScriptAlign';
import type { WhisperWord } from './agentVideoApi';
import { buildScriptLinesWithTokens } from './agentVideoWhisperScriptLayout';
import { WHISPER_GAP_OUTLINE, WHISPER_KARAOKE_ACTIVE_STYLE, WHISPER_TIER_STYLES, type WhisperCompareFilter } from './agentVideoWhisperCompareUi';

export const WHISPER_AUDIO_SEEK_PADDING_SEC = 1;

type Props = {
    audioScript: string;
    tokens: CaptionAlignToken[];
    whisperWords?: WhisperWord[];
    filter?: WhisperCompareFilter;
    selectedIndex?: number | null;
    playingIndex?: number | null;
    tokenRefs?: React.MutableRefObject<Record<number, HTMLSpanElement | null>>;
    onSeekToken?: (tokenIndex: number) => void;
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
    registerRef,
}: {
    token: CaptionAlignToken;
    whisperWords: WhisperWord[];
    selected: boolean;
    isPlayingActive: boolean;
    dimmed: boolean;
    onSeek?: (tokenIndex: number) => void;
    registerRef?: (node: HTMLSpanElement | null) => void;
}) {
    const style = WHISPER_TIER_STYLES[token.tier];
    const whisperLabel = resolveWhisperLabel(token, whisperWords);
    const showParen = shouldShowWhisperParen(token, whisperLabel);
    const clickable = (token.tier === 'yellow' || token.tier === 'red') && Boolean(onSeek);

    const handleClick = () => {
        if (clickable && onSeek) {
            onSeek(token.index);
        }
    };

    return (
        <Box
            component="span"
            ref={registerRef}
            onClick={handleClick}
            sx={{
                color: isPlayingActive ? WHISPER_KARAOKE_ACTIVE_STYLE.color : style.color,
                opacity: dimmed && !isPlayingActive ? 0.35 : 1,
                fontWeight: token.tier !== 'green' || isPlayingActive ? 600 : 400,
                cursor: clickable ? 'pointer' : 'default',
                textDecoration: clickable && !isPlayingActive ? 'underline' : 'none',
                textDecorationStyle: 'dotted',
                textUnderlineOffset: '3px',
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
                '&:hover': clickable && !isPlayingActive ? { bgcolor: style.bg } : undefined,
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

export default function ShortVideoAgentWhisperCompareText({
    audioScript,
    tokens,
    whisperWords = [],
    filter = 'all',
    selectedIndex = null,
    playingIndex = null,
    tokenRefs,
    onSeekToken,
    compact = false,
    maxHeight,
}: Props) {
    const lines = React.useMemo(
        () => buildScriptLinesWithTokens(audioScript, tokens),
        [audioScript, tokens],
    );

    const dimGreen = filter === 'issues';

    if (filter === 'orphans') {
        return null;
    }

    return (
        <Box
            sx={{
                maxHeight: maxHeight ?? undefined,
                overflow: maxHeight ? 'auto' : undefined,
                pr: maxHeight ? 0.5 : 0,
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
                        {line.tokens.map((token, wordIndex) => (
                            <React.Fragment key={`${lineIndex}-${token.index}-${wordIndex}`}>
                                {wordIndex > 0 ? ' ' : null}
                                <CompareWord
                                    token={token}
                                    whisperWords={whisperWords}
                                    selected={selectedIndex === token.index}
                                    isPlayingActive={playingIndex === token.index}
                                    dimmed={dimGreen && token.tier === 'green'}
                                    onSeek={onSeekToken}
                                    registerRef={tokenRefs ? (node) => {
                                        tokenRefs.current[token.index] = node;
                                    } : undefined}
                                />
                            </React.Fragment>
                        ))}
                    </Typography>
                );
            })}
        </Box>
    );
}
