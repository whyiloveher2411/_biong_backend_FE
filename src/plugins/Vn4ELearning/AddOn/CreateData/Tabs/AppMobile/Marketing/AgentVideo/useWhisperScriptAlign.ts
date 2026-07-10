import React from 'react';
import type { CaptionAlignOverride, WhisperWord } from './agentVideoApi';
import {
    buildCaptionAlignResult,
    type CaptionAlignResult,
    type CaptionAlignToken,
} from './agentVideoCaptionScriptAlign';

type UseWhisperScriptAlignArgs = {
    audioScript: string;
    whisperWords: WhisperWord[];
    overrides?: Record<number, CaptionAlignOverride>;
};

export function useWhisperScriptAlign({
    audioScript,
    whisperWords,
    overrides,
}: UseWhisperScriptAlignArgs) {
    return React.useMemo(() => {
        if (!audioScript.trim() || whisperWords.length === 0) {
            return null;
        }
        return buildCaptionAlignResult(audioScript, whisperWords, overrides);
    }, [audioScript, overrides, whisperWords]);
}

export function listIssueTokenIndexes(tokens: CaptionAlignToken[]): number[] {
    return tokens
        .map((token, index) => ({ token, index }))
        .filter(({ token }) => token.tier === 'yellow' || token.tier === 'red')
        .map(({ index }) => index);
}

export function applyTokenOverride(
    result: CaptionAlignResult,
    tokenIndex: number,
    choice: 'script' | 'whisper',
    whisperWords: WhisperWord[],
): Record<number, CaptionAlignOverride> {
    const token = result.tokens[tokenIndex];
    if (!token) {
        return {};
    }

    const whisperText = token.whisperText
        ?? (token.transcriptIndex != null ? whisperWords[token.transcriptIndex]?.text : undefined)
        ?? token.text;

    const nextText = choice === 'whisper' ? whisperText : token.text;
    const override: CaptionAlignOverride = {
        index: tokenIndex,
        text: nextText,
        whisperText,
        matchType: choice === 'whisper' ? 'manual-whisper' : token.matchType,
        start: token.start,
        end: token.end,
        useWhisperText: choice === 'whisper',
    };

    return { [tokenIndex]: override };
}

export function mergeCaptionOverrides(
    current: Record<number, CaptionAlignOverride>,
    patch: Record<number, CaptionAlignOverride>,
): Record<number, CaptionAlignOverride> {
    return { ...current, ...patch };
}

export function hasCaptionOverrideChanges(
    overrides: Record<number, CaptionAlignOverride>,
): boolean {
    return Object.keys(overrides).length > 0;
}

export function buildCaptionSyncPayload(result: CaptionAlignResult) {
    return {
        exact_ratio: result.stats.exactRatio,
        trusted_ratio: result.stats.trustedRatio,
        max_gap_sec: result.stats.maxGapSec,
        large_gap_count: result.stats.largeGapCount,
        karaoke_quality: result.stats.karaokeQuality,
    };
}

export function overridesToList(
    overrides: Record<number, CaptionAlignOverride>,
): CaptionAlignOverride[] {
    return Object.values(overrides).sort((a, b) => a.index - b.index);
}
