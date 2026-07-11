import {
    alignScriptToWhisper,
    analyzeCaptionTimingGaps,
    DEFAULT_LOOKAHEAD,
    isTrustedCaptionMatch,
    repairUntrustedNeighborTiming,
    stripPunct,
    stripScriptMarkers,
    tokenizeScript,
    toCaptionWords,
    totalVideoSec,
} from './captionAlign/captionScriptAlign';
import {
    alignScriptToWhisperWithPhoneticDict,
    type PhoneticDictEntry,
} from './captionAlign/phoneticDictHelpers';

export type WhisperWord = {
    text: string;
    start: number;
    end: number;
};

export type CaptionAlignToken = {
    index: number;
    text: string;
    start: number;
    end: number;
    matchType: string;
    whisperText?: string;
    corrected?: boolean;
    transcriptIndex?: number | null;
    transcriptIndexes?: number[];
    tier: CaptionAlignTier;
    hasTimingGap?: boolean;
    gapSec?: number;
};

export type CaptionAlignTier = 'green' | 'yellow' | 'red' | 'grey';

export type CaptionAlignStats = {
    total: number;
    green: number;
    yellow: number;
    red: number;
    trustedRatio: number;
    exactRatio: number;
    largeGapCount: number;
    maxGapSec: number;
    karaokeQuality: 'ok' | 'poor';
};

export type CaptionAlignOverride = {
    index: number;
    text: string;
    whisperText?: string;
    matchType?: string;
    start: number;
    end: number;
    useWhisperText?: boolean;
};

export type CaptionAlignResult = {
    tokens: CaptionAlignToken[];
    orphans: WhisperWord[];
    stats: CaptionAlignStats;
    captionWords: Array<{ text: string; start: number; end: number }>;
    corrections: Array<{ index: number; script: string; whisper: string; matchType: string }>;
};

type MappedAlignWord = {
    text: string;
    start: number;
    end: number;
    matchType?: string | null;
    whisperText?: string;
    corrected?: boolean;
    transcriptIndex?: number | null;
    transcriptIndexes?: number[];
};

const RED_MATCH_TYPES = new Set(['interpolate', 'positional', 'positional-gap', 'phonetic-dict-interpolate']);

export function stripPunctForCompare(text?: string): string {
    return stripPunct(String(text ?? '')).toLowerCase();
}

export function scriptWhisperTextsDiffer(scriptText?: string, whisperText?: string): boolean {
    if (!whisperText || !scriptText) {
        return false;
    }
    return stripPunctForCompare(scriptText) !== stripPunctForCompare(whisperText);
}

export function resolveTokenTier(
    matchType: string,
    whisperText?: string,
    scriptText?: string,
): CaptionAlignTier {
    if (RED_MATCH_TYPES.has(matchType)) {
        return 'red';
    }
    if (matchType === 'phonetic-dict-exact') {
        return 'green';
    }
    if (
        matchType === 'fuzzy'
        || matchType.startsWith('cluster')
        || matchType.startsWith('phonetic-dict')
        || scriptWhisperTextsDiffer(scriptText, whisperText)
    ) {
        return 'yellow';
    }
    return 'green';
}

export function computeAlignStats(tokens: CaptionAlignToken[]): CaptionAlignStats {
    const compared = tokens.filter((token) => token.tier !== 'grey');
    const total = compared.length;
    const green = compared.filter((token) => token.tier === 'green').length;
    const yellow = compared.filter((token) => token.tier === 'yellow').length;
    const red = compared.filter((token) => token.tier === 'red').length;
    const exactCount = compared.filter((token) => token.matchType === 'exact').length;
    const trustedCount = compared.filter((token) => isTrustedCaptionMatch(token.matchType)).length;
    const captionWords = compared.map(({ text, start, end }) => ({ text, start, end }));
    const timingGaps = analyzeCaptionTimingGaps(captionWords);
    const exactRatio = total > 0 ? +(exactCount / total).toFixed(4) : 0;
    const trustedRatio = total > 0 ? +(trustedCount / total).toFixed(4) : 0;
    const karaokeQuality = timingGaps.largeGapCount > 0 || exactRatio < 0.7 ? 'poor' : 'ok';

    return {
        total,
        green,
        yellow,
        red,
        trustedRatio,
        exactRatio,
        largeGapCount: timingGaps.largeGapCount,
        maxGapSec: timingGaps.maxGapSec,
        karaokeQuality,
    };
}

export function extractOrphanWhisperWords(
    tokens: CaptionAlignToken[],
    whisperWords: WhisperWord[],
): WhisperWord[] {
    const used = new Set<number>();
    for (const token of tokens) {
        if (Array.isArray(token.transcriptIndexes)) {
            for (const index of token.transcriptIndexes) {
                if (typeof index === 'number' && index >= 0) {
                    used.add(index);
                }
            }
        }
        if (typeof token.transcriptIndex === 'number' && token.transcriptIndex >= 0) {
            used.add(token.transcriptIndex);
        }
    }
    return whisperWords.filter((_, index) => !used.has(index));
}

export function buildCaptionAlignResult(
    audioScript: string,
    whisperWords: WhisperWord[],
    overrides?: Record<number, CaptionAlignOverride>,
    phoneticDict?: PhoneticDictEntry[],
): CaptionAlignResult {
    const scriptWords = tokenizeScript(audioScript);
    const {
        mapped: aligned,
        exactCount,
        corrections,
        transcriptPointerEnd,
    } = alignScriptToWhisperWithPhoneticDict(
        scriptWords,
        whisperWords,
        phoneticDict ?? [],
        alignScriptToWhisper,
        {
            lookahead: DEFAULT_LOOKAHEAD,
        },
    );

    const { mapped: repaired } = repairUntrustedNeighborTiming(aligned) as { mapped: MappedAlignWord[] };
    const duration = totalVideoSec(whisperWords, repaired);

    const gapByIndex = new Map<number, number>();
    const captionForGaps = repaired.map((word: MappedAlignWord) => ({
        text: word.text,
        start: word.start,
        end: word.end,
    }));
    const timingGaps = analyzeCaptionTimingGaps(captionForGaps);
    timingGaps.largeGaps.forEach((gap) => {
        gapByIndex.set(gap.index, gap.gapSec);
    });

    const tokens: CaptionAlignToken[] = repaired.map((entry: MappedAlignWord, index: number) => {
        const override = overrides?.[index];
        const text = override?.text ?? entry.text;
        const whisperText = override?.whisperText ?? entry.whisperText;
        const matchType = override?.matchType ?? entry.matchType ?? 'interpolate';
        const tier = resolveTokenTier(matchType, whisperText, text);

        const transcriptIndexes = Array.isArray(entry.transcriptIndexes)
            ? entry.transcriptIndexes.filter((item): item is number => typeof item === 'number' && item >= 0)
            : (
                typeof entry.transcriptIndex === 'number' && entry.transcriptIndex >= 0
                    ? [entry.transcriptIndex]
                    : []
            );

        return {
            index,
            text,
            start: override?.start ?? entry.start,
            end: override?.end ?? entry.end,
            matchType,
            whisperText,
            corrected: entry.corrected,
            transcriptIndex: transcriptIndexes[0] ?? entry.transcriptIndex ?? null,
            transcriptIndexes,
            tier,
            hasTimingGap: gapByIndex.has(index),
            gapSec: gapByIndex.get(index),
        };
    });

    const orphans = extractOrphanWhisperWords(tokens, whisperWords.slice(0, transcriptPointerEnd || whisperWords.length));
    const stats = computeAlignStats(tokens);
    const captionWords = toCaptionWords(
        tokens.map(({ text, start, end }) => ({ text, start, end })),
        duration,
    );

    return {
        tokens,
        orphans,
        stats: {
            ...stats,
            exactRatio: scriptWords.length > 0 ? +(exactCount / scriptWords.length).toFixed(4) : stats.exactRatio,
        },
        captionWords,
        corrections: (corrections as Array<{
            index: number;
            script: string;
            whisper: string;
            matchType?: string | null;
        }>).map((item) => ({
            index: item.index,
            script: String(item.script ?? ''),
            whisper: String(item.whisper ?? ''),
            matchType: String(item.matchType ?? ''),
        })),
    };
}

export {
    alignScriptToWhisper,
    analyzeCaptionTimingGaps,
    isTrustedCaptionMatch,
    repairUntrustedNeighborTiming,
    stripPunct,
    stripScriptMarkers,
    tokenizeScript,
    toCaptionWords,
    totalVideoSec,
};
