import type { TtsPhoneticDictEntry } from './agentVideoApi';

type ScriptSelectionField = HTMLInputElement | HTMLTextAreaElement;

/** Default đồng bộ backend `marketing_tts_phonetic_dict_default_map`. */
export const DEFAULT_TTS_PHONETIC_DICT: TtsPhoneticDictEntry[] = [
    { source_term: 'AI Agent', phonetic: 'Ei-Ai Êi-gừnt' },
    { source_term: 'HyperFrames', phonetic: 'Hai-pơ-phờ-reim' },
    { source_term: 'TikTok', phonetic: 'Tíc-tóc' },
    { source_term: 'API', phonetic: 'A-pi-ai' },
    { source_term: 'AI', phonetic: 'Ây ai' },
    { source_term: 'App', phonetic: 'Áp' },
];

/** Trim + gộp khoảng trắng — `AI  Agent` ≈ `AI Agent`. */
export function normalizePhoneticSourceTerm(sourceTerm?: string): string {
    return String(sourceTerm ?? '')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Đếm token của source_term (tách theo khoảng trắng sau normalize). */
export function countPhoneticSourceTokens(sourceTerm?: string): number {
    const normalized = normalizePhoneticSourceTerm(sourceTerm);
    if (!normalized) return 0;
    return normalized.split(' ').filter(Boolean).length;
}

/**
 * Ưu tiên cụm dài hơn: nhiều token hơn → chuỗi dài hơn → localeCompare.
 * Trả về < 0 nếu `a` được ưu tiên hơn `b` (dùng trong sort: a trước b).
 */
export function compareDictEntryPriority(
    a: Pick<TtsPhoneticDictEntry, 'source_term'> | { source_term?: string },
    b: Pick<TtsPhoneticDictEntry, 'source_term'> | { source_term?: string },
): number {
    const termA = normalizePhoneticSourceTerm(a?.source_term);
    const termB = normalizePhoneticSourceTerm(b?.source_term);
    const tokensA = countPhoneticSourceTokens(termA);
    const tokensB = countPhoneticSourceTokens(termB);
    if (tokensA !== tokensB) {
        return tokensB - tokensA;
    }
    if (termA.length !== termB.length) {
        return termB.length - termA.length;
    }
    return termA.localeCompare(termB);
}

/** Sort dict longest-first (token count rồi độ dài chuỗi). */
export function sortDictEntriesLongestFirst<T extends { source_term?: string; phonetic?: string }>(
    entries: T[] | undefined,
    options?: { requirePhonetic?: boolean },
): T[] {
    const requirePhonetic = options?.requirePhonetic !== false;
    return [...(entries ?? [])]
        .filter((entry) => {
            if (!normalizePhoneticSourceTerm(entry.source_term)) return false;
            if (requirePhonetic && !String(entry.phonetic ?? '').trim()) return false;
            return true;
        })
        .sort(compareDictEntryPriority);
}

/**
 * Gộp default + entries từ API (API thắng nếu trùng source_term).
 * Đảm bảo UI luôn có AI Agent dù cache/DB seed cũ thiếu.
 */
export function mergeTtsPhoneticDictEntries(
    entries: TtsPhoneticDictEntry[] | undefined,
): TtsPhoneticDictEntry[] {
    const map = new Map<string, TtsPhoneticDictEntry>();
    for (const entry of DEFAULT_TTS_PHONETIC_DICT) {
        const key = normalizePhoneticSourceTerm(entry.source_term).toLowerCase();
        if (key) map.set(key, { ...entry });
    }
    for (const entry of entries ?? []) {
        const key = normalizePhoneticSourceTerm(entry.source_term).toLowerCase();
        const phonetic = String(entry.phonetic ?? '').trim();
        if (!key || !phonetic) continue;
        map.set(key, {
            ...entry,
            source_term: normalizePhoneticSourceTerm(entry.source_term),
            phonetic,
        });
    }
    return sortDictEntriesLongestFirst(Array.from(map.values()));
}

export function comparePhoneticSourceTerm(a?: string, b?: string): boolean {
    const left = normalizePhoneticSourceTerm(a).toLowerCase();
    const right = normalizePhoneticSourceTerm(b).toLowerCase();
    return left !== '' && left === right;
}

export function findPhoneticDictEntry(
    entries: TtsPhoneticDictEntry[] | undefined,
    sourceTerm: string,
): TtsPhoneticDictEntry | null {
    const normalized = normalizePhoneticSourceTerm(sourceTerm);
    if (!normalized || !Array.isArray(entries)) {
        return null;
    }

    return entries.find((entry) => comparePhoneticSourceTerm(entry.source_term, normalized)) ?? null;
}

export function getTextareaSelectedText(field: ScriptSelectionField | null): string {
    if (!field) {
        return '';
    }

    const start = field.selectionStart ?? 0;
    const end = field.selectionEnd ?? 0;
    if (start === end) {
        return '';
    }

    return field.value.slice(Math.min(start, end), Math.max(start, end)).trim();
}

export type ScriptTextSelectionAnchor = {
    text: string;
    top: number;
    left: number;
};

export function buildSelectionAnchor(
    field: ScriptSelectionField,
    pointer?: { clientX: number; clientY: number } | null,
): ScriptTextSelectionAnchor | null {
    const text = getTextareaSelectedText(field);
    if (!text) {
        return null;
    }

    const rect = field.getBoundingClientRect();
    const left = pointer?.clientX ?? rect.left + rect.width / 2;
    const top = pointer?.clientY ?? rect.top + 24;

    return {
        text,
        left,
        top,
    };
}

/** Chuẩn hóa text bôi đen thành từ/cụm gốc (bỏ xuống dòng thừa). */
export function normalizeSelectedPhoneticTerm(raw: string): string {
    return normalizePhoneticSourceTerm(raw);
}

/**
 * Lấy selection DOM trong `root` (Whisper compare, overlay script, …).
 */
export function buildDomSelectionAnchor(
    root: HTMLElement | null | undefined,
    pointer?: { clientX: number; clientY: number } | null,
): ScriptTextSelectionAnchor | null {
    if (!root || typeof window === 'undefined') {
        return null;
    }

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount < 1) {
        return null;
    }

    const text = normalizeSelectedPhoneticTerm(selection.toString());
    if (!text) {
        return null;
    }

    const range = selection.getRangeAt(0);
    const common = range.commonAncestorContainer;
    const commonEl = common.nodeType === Node.ELEMENT_NODE
        ? (common as Element)
        : common.parentElement;
    if (!commonEl || !root.contains(commonEl)) {
        return null;
    }

    const rect = range.getBoundingClientRect();
    const left = pointer?.clientX ?? (rect.left + rect.width / 2);
    const top = pointer?.clientY ?? rect.top;

    return {
        text,
        left,
        top,
    };
}

export function buildPhoneticAnchorFromTerm(
    term: string,
    pointer?: { clientX: number; clientY: number } | null,
): ScriptTextSelectionAnchor | null {
    const text = normalizeSelectedPhoneticTerm(term);
    if (!text || !pointer) {
        return null;
    }
    return {
        text,
        left: pointer.clientX,
        top: pointer.clientY,
    };
}

/** Bỏ bôi đen textarea + selection DOM (đóng menu phiên âm). */
export function clearScriptTextSelection(field?: ScriptSelectionField | null): void {
    if (typeof window !== 'undefined') {
        window.getSelection()?.removeAllRanges();
    }
    if (!field || typeof field.selectionStart !== 'number') {
        return;
    }
    try {
        const pos = field.selectionEnd ?? field.selectionStart ?? 0;
        field.setSelectionRange(pos, pos);
    } catch {
        // input type không hỗ trợ setSelectionRange
    }
}
