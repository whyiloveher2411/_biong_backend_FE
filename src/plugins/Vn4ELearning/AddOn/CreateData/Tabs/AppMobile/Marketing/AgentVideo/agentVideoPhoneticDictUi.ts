import type { TtsPhoneticDictEntry } from './agentVideoApi';

type ScriptSelectionField = HTMLInputElement | HTMLTextAreaElement;

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

/** Chuẩn hóa entries từ API — không seed/fallback mặc định. */
export function mergeTtsPhoneticDictEntries(
    entries: TtsPhoneticDictEntry[] | undefined,
): TtsPhoneticDictEntry[] {
    const fromApi = (entries ?? [])
        .map((entry) => {
            const source_term = normalizePhoneticSourceTerm(entry.source_term);
            const phonetic = String(entry.phonetic ?? '').trim();
            if (!source_term || !phonetic) return null;
            return {
                ...entry,
                source_term,
                phonetic,
                case_sensitive: Boolean(entry.case_sensitive),
            } as TtsPhoneticDictEntry;
        })
        .filter((entry): entry is TtsPhoneticDictEntry => entry != null);

    return sortDictEntriesLongestFirst(fromApi);
}

/**
 * So khớp source_term.
 * caseSensitive=true → AI ≠ ai.
 */
export function comparePhoneticSourceTerm(
    a?: string,
    b?: string,
    caseSensitive = false,
): boolean {
    const left = normalizePhoneticSourceTerm(a);
    const right = normalizePhoneticSourceTerm(b);
    if (!left || !right) return false;
    if (caseSensitive) return left === right;
    return left.toLowerCase() === right.toLowerCase();
}

export function findPhoneticDictEntry(
    entries: TtsPhoneticDictEntry[] | undefined,
    sourceTerm: string,
): TtsPhoneticDictEntry | null {
    const normalized = normalizePhoneticSourceTerm(sourceTerm);
    if (!normalized || !Array.isArray(entries)) {
        return null;
    }

    return entries.find((entry) => (
        comparePhoneticSourceTerm(
            entry.source_term,
            normalized,
            Boolean(entry.case_sensitive),
        )
    )) ?? null;
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
