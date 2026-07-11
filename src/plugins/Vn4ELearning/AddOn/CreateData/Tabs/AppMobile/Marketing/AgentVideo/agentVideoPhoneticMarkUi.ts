import type { TtsPhoneticDictEntry } from './agentVideoApi';
import {
    findPhoneticDictEntry,
    normalizePhoneticSourceTerm,
    sortDictEntriesLongestFirst,
} from './agentVideoPhoneticDictUi';

export type PhoneticScriptSegment = {
    text: string;
    phonetic?: string;
};

export type PhoneticPhraseMark = {
    kind: 'start';
    phonetic: string;
    sourceTerm: string;
    tokenCount: number;
} | {
    kind: 'covered';
};

function isWordChar(ch: string): boolean {
    return /[\p{L}\p{N}]/u.test(ch);
}

/**
 * Khớp term tại vị trí `start` — cho phép whitespace linh hoạt trong text.
 * Trả về index exclusive nếu khớp + word boundary; ngược lại null.
 */
export function matchPhoneticTermAt(
    text: string,
    start: number,
    sourceTerm: string,
): number | null {
    const term = normalizePhoneticSourceTerm(sourceTerm);
    if (!term || start < 0 || start >= text.length) {
        return null;
    }
    if (start > 0 && isWordChar(text[start - 1])) {
        return null;
    }

    const termLower = term.toLowerCase();
    let ti = 0;
    let j = start;

    while (ti < termLower.length && j < text.length) {
        const tc = termLower[ti];
        if (/\s/u.test(tc)) {
            if (!/\s/u.test(text[j])) {
                return null;
            }
            while (ti < termLower.length && /\s/u.test(termLower[ti])) {
                ti += 1;
            }
            while (j < text.length && /\s/u.test(text[j])) {
                j += 1;
            }
            continue;
        }

        const xc = text[j].toLowerCase();
        if (xc !== tc) {
            return null;
        }
        ti += 1;
        j += 1;
    }

    if (ti < termLower.length) {
        return null;
    }
    if (j < text.length && isWordChar(text[j])) {
        return null;
    }
    return j;
}

/**
 * Tách script thành segment; từ/cụm có trong dict gắn `phonetic`.
 * Longest-match: ưu tiên cụm nhiều token / dài hơn (vd. AI Agent > AI).
 * Bỏ qua nội dung trong marker [SFX:…] / [BGM:…] / [Dừng…].
 */
export function buildPhoneticMarkedSegments(
    script: string,
    dictEntries: TtsPhoneticDictEntry[] | undefined,
): PhoneticScriptSegment[] {
    const text = String(script ?? '');
    if (!text) {
        return [];
    }

    const entries = sortDictEntriesLongestFirst(dictEntries);
    if (!entries.length) {
        return [{ text }];
    }

    const segments: PhoneticScriptSegment[] = [];
    let i = 0;

    const pushPlain = (value: string) => {
        if (!value) return;
        const last = segments[segments.length - 1];
        if (last && !last.phonetic) {
            last.text += value;
            return;
        }
        segments.push({ text: value });
    };

    while (i < text.length) {
        if (text[i] === '[') {
            const close = text.indexOf(']', i + 1);
            if (close >= 0) {
                pushPlain(text.slice(i, close + 1));
                i = close + 1;
                continue;
            }
        }

        let matched: TtsPhoneticDictEntry | null = null;
        let matchEnd = -1;
        for (const entry of entries) {
            const end = matchPhoneticTermAt(text, i, entry.source_term);
            if (end == null) continue;
            matched = entry;
            matchEnd = end;
            break;
        }

        if (matched && matchEnd > i) {
            segments.push({
                text: text.slice(i, matchEnd),
                phonetic: String(matched.phonetic ?? '').trim(),
            });
            i = matchEnd;
            continue;
        }

        pushPlain(text[i]);
        i += 1;
    }

    return segments;
}

function stripTrailingPunct(word: string): string {
    return String(word ?? '').replace(/[.,!?;:…]+$/u, '').trim();
}

function normTokenForPhrase(word: string): string {
    return stripTrailingPunct(word)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\u0111/g, 'd');
}

function phraseTokensMatch(slice: string[], sourceTokens: string[]): boolean {
    if (slice.length !== sourceTokens.length) return false;
    return slice.every((token, index) => (
        normTokenForPhrase(token) === normTokenForPhrase(sourceTokens[index])
    ));
}

/**
 * Token UI sau collapse có thể là cả cụm (`"AI Agent"` = 1 token).
 * Khớp cả: N token rời = N source token, hoặc 1 token gộp = cả source_term.
 */
function matchPhraseEntryAt(
    words: string[],
    start: number,
    sourceTokens: string[],
): number | null {
    if (!sourceTokens.length || start < 0 || start >= words.length) {
        return null;
    }

    // 1) Cụm đã collapse thành 1 token hiển thị
    const collapsed = normalizePhoneticSourceTerm(stripTrailingPunct(words[start]));
    const sourceJoined = sourceTokens.join(' ');
    if (
        sourceTokens.length > 1
        && collapsed
        && normTokenForPhrase(collapsed) === normTokenForPhrase(sourceJoined)
    ) {
        return 1;
    }

    // 2) Cửa sổ token rời (AI + Agent)
    const slice = words.slice(start, start + sourceTokens.length).map(stripTrailingPunct);
    if (slice.length < sourceTokens.length) return null;
    if (!phraseTokensMatch(slice, sourceTokens)) return null;
    return sourceTokens.length;
}

/**
 * Gán mark phiên âm theo cửa sổ token (longest-match).
 * Index i = 'start' với tokenCount; các index bị bao = 'covered'.
 * Hỗ trợ token collapse (`text: "AI Agent"`) từ phonetic align.
 */
export function resolvePhoneticPhraseMarks(
    words: string[],
    dictEntries: TtsPhoneticDictEntry[] | undefined,
): Array<PhoneticPhraseMark | null> {
    const marks: Array<PhoneticPhraseMark | null> = words.map(() => null);
    const entries = sortDictEntriesLongestFirst(dictEntries);
    if (!entries.length || !words.length) {
        return marks;
    }

    let i = 0;
    while (i < words.length) {
        let matched: TtsPhoneticDictEntry | null = null;
        let tokenCount = 0;

        for (const entry of entries) {
            const sourceTokens = normalizePhoneticSourceTerm(entry.source_term)
                .split(' ')
                .filter(Boolean);
            if (!sourceTokens.length) continue;
            const count = matchPhraseEntryAt(words, i, sourceTokens);
            if (count == null) continue;
            matched = entry;
            tokenCount = count;
            break;
        }

        if (matched && tokenCount > 0) {
            marks[i] = {
                kind: 'start',
                phonetic: String(matched.phonetic ?? '').trim(),
                sourceTerm: normalizePhoneticSourceTerm(matched.source_term),
                tokenCount,
            };
            for (let k = 1; k < tokenCount; k += 1) {
                marks[i + k] = { kind: 'covered' };
            }
            i += tokenCount;
            continue;
        }

        i += 1;
    }

    return marks;
}

export function findPhoneticForDisplayWord(
    word: string,
    dictEntries: TtsPhoneticDictEntry[] | undefined,
): string | null {
    const entry = findPhoneticDictEntry(dictEntries, stripTrailingPunct(word));
    const phonetic = String(entry?.phonetic ?? '').trim();
    return phonetic || null;
}
