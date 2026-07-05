export type WhisperPromptWord = {
    text: string;
    start: number;
    end: number;
};

const SENTENCE_END_RE = /[.!?…]["']?$/;
const PHRASE_GAP_SEC = 1.2;
const WORD_LINE_THRESHOLD = 48;

function roundSec(value: number): number {
    return Math.round(value * 10) / 10;
}

function normalizeWords(
    words: WhisperPromptWord[],
    timeOffsetSec = 0,
): WhisperPromptWord[] {
    return words
        .filter((word) => String(word.text || '').trim() !== '')
        .map((word) => ({
            text: String(word.text).trim(),
            start: roundSec(Math.max(0, word.start - timeOffsetSec)),
            end: roundSec(Math.max(0, word.end - timeOffsetSec)),
        }));
}

function groupWhisperPhrases(words: WhisperPromptWord[]): WhisperPromptWord[] {
    if (!words.length) {
        return [];
    }

    const phrases: WhisperPromptWord[] = [];
    let chunkWords: WhisperPromptWord[] = [];

    const flush = () => {
        if (!chunkWords.length) {
            return;
        }
        phrases.push({
            text: chunkWords.map((item) => item.text).join(' '),
            start: chunkWords[0].start,
            end: chunkWords[chunkWords.length - 1].end,
        });
        chunkWords = [];
    };

    for (const word of words) {
        if (chunkWords.length > 0) {
            const prev = chunkWords[chunkWords.length - 1];
            if (word.start - prev.end >= PHRASE_GAP_SEC) {
                flush();
            }
        }
        chunkWords.push(word);
        if (SENTENCE_END_RE.test(word.text)) {
            flush();
        }
    }

    flush();
    return phrases.length ? phrases : words;
}

function formatRange(start: number, end: number): string {
    return `${roundSec(start)}–${roundSec(end)}`;
}

function formatAsLines(words: WhisperPromptWord[]): string {
    return words
        .map((word) => `${formatRange(word.start, word.end)}  ${word.text}`)
        .join('\n');
}

function formatAsPhrases(words: WhisperPromptWord[]): string {
    return groupWhisperPhrases(words)
        .map((phrase) => `${formatRange(phrase.start, phrase.end)}  ${phrase.text}`)
        .join('\n');
}

/**
 * Whisper gọn cho prompt chatbot — giảm token so với JSON pretty-print.
 * ≤48 từ: từng dòng start–end; >48 từ: gom cụm theo câu / khoảng dừng.
 */
export function formatWhisperWordsForPrompt(
    words: WhisperPromptWord[],
    options?: { timeOffsetSec?: number },
): string {
    const normalized = normalizeWords(words, options?.timeOffsetSec ?? 0);
    if (!normalized.length) {
        return '(trống)';
    }

    const header = 'Format: `start–end  text` (giây, 1 chữ số thập phân). Chỉ pacing — không render text.';
    const body = normalized.length <= WORD_LINE_THRESHOLD
        ? formatAsLines(normalized)
        : formatAsPhrases(normalized);

    return `${header}\n${body}`;
}
