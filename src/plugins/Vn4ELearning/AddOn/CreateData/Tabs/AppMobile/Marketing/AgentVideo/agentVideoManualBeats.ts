import type { CaptionAlignToken } from './agentVideoCaptionScriptAlign';
import type { ManualBeatMarkPayload } from './agentVideoApi';

/** Beat thủ công clip video 2s — chỉ có content + timing, image_prompt điền sau. */
export type ManualBeatMark = {
    id: string;
    order: number;
    startTokenIndex: number;
    endTokenIndex: number;
    content: string;
    imagePrompt: string;
    startSec: number;
    endSec: number;
    durationSec: number;
    created_at?: string;
};

export type ManualBeatTokenRange = {
    startTokenIndex: number;
    endTokenIndex: number;
};

export const MANUAL_BEAT_TARGET_SEC = 2;
export const MANUAL_BEAT_TOLERANCE_SEC = 1;

export const MANUAL_BEAT_TOKEN_ATTR = 'data-token-index';

export const MANUAL_BEAT_COLORS: Array<{ bg: string; hover: string; border: string; label: string }> = [
    { bg: 'rgba(25, 118, 210, 0.16)', hover: 'rgba(25, 118, 210, 0.28)', border: 'rgba(25, 118, 210, 0.6)', label: '#1565c0' },
    { bg: 'rgba(46, 125, 50, 0.16)', hover: 'rgba(46, 125, 50, 0.28)', border: 'rgba(46, 125, 50, 0.6)', label: '#2e7d32' },
    { bg: 'rgba(237, 108, 2, 0.18)', hover: 'rgba(237, 108, 2, 0.3)', border: 'rgba(237, 108, 2, 0.6)', label: '#e65100' },
    { bg: 'rgba(123, 31, 162, 0.16)', hover: 'rgba(123, 31, 162, 0.28)', border: 'rgba(123, 31, 162, 0.6)', label: '#7b1fa2' },
    { bg: 'rgba(0, 131, 143, 0.16)', hover: 'rgba(0, 131, 143, 0.28)', border: 'rgba(0, 131, 143, 0.6)', label: '#00838f' },
    { bg: 'rgba(194, 24, 91, 0.16)', hover: 'rgba(194, 24, 91, 0.28)', border: 'rgba(194, 24, 91, 0.6)', label: '#c2185b' },
    { bg: 'rgba(85, 139, 47, 0.18)', hover: 'rgba(85, 139, 47, 0.3)', border: 'rgba(85, 139, 47, 0.6)', label: '#558b2f' },
    { bg: 'rgba(69, 90, 100, 0.18)', hover: 'rgba(69, 90, 100, 0.3)', border: 'rgba(69, 90, 100, 0.6)', label: '#455a64' },
];

export function manualBeatColor(order: number): typeof MANUAL_BEAT_COLORS[number] {
    const safe = Number.isFinite(order) && order > 0 ? Math.floor(order) : 1;
    return MANUAL_BEAT_COLORS[(safe - 1) % MANUAL_BEAT_COLORS.length];
}

function round3(value: number): number {
    return Math.round((Number(value) || 0) * 1000) / 1000;
}

export function normalizeManualBeatMarks(raw: unknown): ManualBeatMark[] {
    if (!Array.isArray(raw)) {
        return [];
    }

    const marks: ManualBeatMark[] = [];
    raw.forEach((item) => {
        if (!item || typeof item !== 'object') {
            return;
        }
        const source = item as Record<string, unknown>;
        const startTokenIndex = Number(source.startTokenIndex ?? source.start_token_index ?? -1);
        const endTokenIndex = Number(source.endTokenIndex ?? source.end_token_index ?? -1);
        if (!Number.isFinite(startTokenIndex) || !Number.isFinite(endTokenIndex)) {
            return;
        }
        if (startTokenIndex < 0 || endTokenIndex < startTokenIndex) {
            return;
        }
        const startSec = round3(Number(source.startSec ?? source.start_sec ?? 0));
        const endSecRaw = round3(Number(source.endSec ?? source.end_sec ?? 0));
        const endSec = endSecRaw < startSec ? startSec : endSecRaw;

        marks.push({
            id: String(source.id || ''),
            order: Number(source.order || 0),
            startTokenIndex: Math.floor(startTokenIndex),
            endTokenIndex: Math.floor(endTokenIndex),
            content: String(source.content ?? source.text ?? '').trim(),
            imagePrompt: String(source.image_prompt ?? source.imagePrompt ?? '').trim(),
            startSec,
            endSec,
            durationSec: round3(endSec - startSec),
            created_at: source.created_at ? String(source.created_at) : undefined,
        });
    });

    marks.sort((a, b) => a.startTokenIndex - b.startTokenIndex);

    return marks.map((mark, index) => ({
        ...mark,
        order: index + 1,
        id: `mark_${index + 1}`,
    }));
}

export function manualBeatMarksToPayload(marks: ManualBeatMark[]): ManualBeatMarkPayload[] {
    return marks.map((mark) => ({
        id: mark.id,
        order: mark.order,
        startTokenIndex: mark.startTokenIndex,
        endTokenIndex: mark.endTokenIndex,
        content: mark.content,
        image_prompt: mark.imagePrompt,
        startSec: mark.startSec,
        endSec: mark.endSec,
        durationSec: mark.durationSec,
        created_at: mark.created_at,
    }));
}

export function buildManualBeatTokenMap(marks: ManualBeatMark[]): Map<number, ManualBeatMark> {
    const map = new Map<number, ManualBeatMark>();
    marks.forEach((mark) => {
        for (let index = mark.startTokenIndex; index <= mark.endTokenIndex; index += 1) {
            map.set(index, mark);
        }
    });
    return map;
}

export function findManualBeatOverlap(
    range: ManualBeatTokenRange,
    marks: ManualBeatMark[],
): ManualBeatMark | null {
    return marks.find((mark) => (
        range.startTokenIndex <= mark.endTokenIndex && mark.startTokenIndex <= range.endTokenIndex
    )) ?? null;
}

export function isManualBeatRangeFree(range: ManualBeatTokenRange, marks: ManualBeatMark[]): boolean {
    return findManualBeatOverlap(range, marks) === null;
}

function tokenIndexFromNode(node: Node | null, root: HTMLElement): number | null {
    let current: Node | null = node;
    while (current && current !== root) {
        if (current.nodeType === Node.ELEMENT_NODE) {
            const raw = (current as Element).getAttribute(MANUAL_BEAT_TOKEN_ATTR);
            if (raw != null && raw !== '') {
                const value = Number(raw);
                if (Number.isFinite(value)) {
                    return value;
                }
            }
        }
        current = current.parentNode;
    }
    return null;
}

function firstTokenIndexInside(container: Element, root: HTMLElement): number | null {
    if (!root.contains(container)) {
        return null;
    }
    const node = container.querySelector(`[${MANUAL_BEAT_TOKEN_ATTR}]`);
    if (!node) {
        return null;
    }
    const value = Number(node.getAttribute(MANUAL_BEAT_TOKEN_ATTR));
    return Number.isFinite(value) ? value : null;
}

/** Selection của user → khoảng token nguyên từ (snap về từ đầu / từ cuối chạm tới). */
export function resolveSelectionTokenRange(root: HTMLElement | null): ManualBeatTokenRange | null {
    if (!root || typeof window === 'undefined') {
        return null;
    }
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount < 1) {
        return null;
    }
    const range = selection.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) {
        return null;
    }

    const indexes: number[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
        acceptNode: (node) => (
            (node as Element).hasAttribute(MANUAL_BEAT_TOKEN_ATTR)
                ? NodeFilter.FILTER_ACCEPT
                : NodeFilter.FILTER_SKIP
        ),
    });
    while (walker.nextNode()) {
        const element = walker.currentNode as Element;
        if (!range.intersectsNode(element)) {
            continue;
        }
        const value = Number(element.getAttribute(MANUAL_BEAT_TOKEN_ATTR));
        if (Number.isFinite(value)) {
            indexes.push(value);
        }
    }

    if (indexes.length === 0) {
        const start = tokenIndexFromNode(range.startContainer, root)
            ?? (range.startContainer.nodeType === Node.ELEMENT_NODE
                ? firstTokenIndexInside(range.startContainer as Element, root)
                : null);
        const end = tokenIndexFromNode(range.endContainer, root) ?? start;
        if (start == null || end == null) {
            return null;
        }
        return {
            startTokenIndex: Math.min(start, end),
            endTokenIndex: Math.max(start, end),
        };
    }

    return {
        startTokenIndex: Math.min(...indexes),
        endTokenIndex: Math.max(...indexes),
    };
}

export function buildManualBeatMark(
    range: ManualBeatTokenRange,
    tokens: CaptionAlignToken[],
    marks: ManualBeatMark[],
): ManualBeatMark | null {
    const selected = tokens.filter((token) => (
        token.index >= range.startTokenIndex && token.index <= range.endTokenIndex
    ));
    if (selected.length === 0) {
        return null;
    }

    const startSec = round3(Math.min(...selected.map((token) => Number(token.start) || 0)));
    const endSec = round3(Math.max(...selected.map((token) => Number(token.end) || 0)));
    const order = marks.length + 1;

    return {
        id: `mark_${order}`,
        order,
        startTokenIndex: selected[0].index,
        endTokenIndex: selected[selected.length - 1].index,
        content: selected.map((token) => token.text).join(' ').replace(/\s+/g, ' ').trim(),
        imagePrompt: '',
        startSec,
        endSec: endSec < startSec ? startSec : endSec,
        durationSec: round3(Math.max(0, endSec - startSec)),
    };
}

/**
 * Token có phải chỗ kết câu không: chấp nhận . ! ? ở CUỐI token, loại "...",
 * số thập phân (1.5), số thứ tự (1.), viết tắt 1 chữ cái (T.), phân cách nghìn (1.000).
 */
export function isSentenceEndToken(rawText: string): boolean {
    const text = String(rawText || '').trim();
    if (!text) {
        return false;
    }
    // Bỏ dấu đóng ngoặc / ngoặc kép bám sau dấu kết câu
    const trimmed = text.replace(/[)\]}"'»”’]+$/u, '');
    const match = /([.!?…]+)$/u.exec(trimmed);
    if (!match) {
        return false;
    }

    const marker = match[1];
    if (marker.includes('…')) {
        return false;
    }
    if (marker.startsWith('.') && marker.length > 1) {
        // "..." hoặc ".." — dấu lửng, không phải kết câu
        return false;
    }
    if (marker !== '.') {
        return true;
    }

    const body = trimmed.slice(0, trimmed.length - marker.length);
    if (!body) {
        return false;
    }
    // Số thứ tự / số đứng trước dấu chấm: "1." "2024."
    if (/^\d+$/u.test(body)) {
        return false;
    }
    // Số có phân cách: "1.000" "3.5"
    if (/\d[.,]\d/u.test(trimmed)) {
        return false;
    }
    // Viết tắt 1 ký tự: "T." "Q."
    if (/^\p{L}$/u.test(body)) {
        return false;
    }

    return true;
}

/**
 * Chia beat tự động theo dấu kết câu, chỉ trên các token chưa thuộc beat nào.
 * Trả về danh sách mark MỚI (chưa gộp với marks hiện có).
 */
export function buildSentenceBeatMarks(
    tokens: CaptionAlignToken[],
    marks: ManualBeatMark[],
): ManualBeatMark[] {
    if (!Array.isArray(tokens) || tokens.length === 0) {
        return [];
    }
    const taken = buildManualBeatTokenMap(marks);
    const added: ManualBeatMark[] = [];
    let buffer: CaptionAlignToken[] = [];

    const flush = () => {
        if (buffer.length === 0) {
            return;
        }
        const range = {
            startTokenIndex: buffer[0].index,
            endTokenIndex: buffer[buffer.length - 1].index,
        };
        const mark = buildManualBeatMark(range, buffer, [...marks, ...added]);
        if (mark) {
            added.push(mark);
        }
        buffer = [];
    };

    tokens.forEach((token) => {
        if (taken.has(token.index)) {
            // Chạm vùng đã có beat → cắt buffer đang gom, không nuốt qua beat cũ
            flush();
            return;
        }
        buffer.push(token);
        if (isSentenceEndToken(token.text)) {
            flush();
        }
    });
    flush();

    return added;
}

export function manualBeatDurationWarning(durationSec: number): string | null {
    const value = Number(durationSec) || 0;
    if (value <= 0) {
        return 'Đoạn chọn không có timing whisper';
    }
    if (value > MANUAL_BEAT_TARGET_SEC + MANUAL_BEAT_TOLERANCE_SEC) {
        return `Dài ${value.toFixed(2)}s — mục tiêu ~${MANUAL_BEAT_TARGET_SEC}s / ảnh`;
    }
    if (value < MANUAL_BEAT_TARGET_SEC - MANUAL_BEAT_TOLERANCE_SEC) {
        return `Ngắn ${value.toFixed(2)}s — mục tiêu ~${MANUAL_BEAT_TARGET_SEC}s / ảnh`;
    }
    return null;
}

export function manualBeatCoverageRatio(
    marks: ManualBeatMark[],
    tokens: CaptionAlignToken[],
): number {
    if (!tokens.length) {
        return 0;
    }
    const covered = buildManualBeatTokenMap(marks);
    const hit = tokens.filter((token) => covered.has(token.index)).length;
    return hit / tokens.length;
}

export function manualBeatsAllHavePrompt(marks: ManualBeatMark[]): boolean {
    return marks.length > 0 && marks.every((mark) => mark.imagePrompt.trim() !== '');
}
