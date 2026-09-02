import type { CaptionAlignToken } from './agentVideoCaptionScriptAlign';
import type { ManualBeatMarkPayload } from './agentVideoApi';
import type { BeatMap, BeatMapSection } from './agentVideoBeatMap';

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
    /** Beat đã xác nhận timeline thủ công (timing là chuẩn, không bị realign whisper đè). */
    timelineConfirmed?: boolean;
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
    { bg: 'rgba(13, 71, 161, 0.2)', hover: 'rgba(13, 71, 161, 0.34)', border: 'rgba(13, 71, 161, 0.85)', label: '#0d47a1' },
    { bg: 'rgba(27, 94, 32, 0.2)', hover: 'rgba(27, 94, 32, 0.34)', border: 'rgba(27, 94, 32, 0.85)', label: '#1b5e20' },
    { bg: 'rgba(191, 54, 12, 0.22)', hover: 'rgba(191, 54, 12, 0.36)', border: 'rgba(191, 54, 12, 0.85)', label: '#bf360c' },
    { bg: 'rgba(74, 20, 140, 0.2)', hover: 'rgba(74, 20, 140, 0.34)', border: 'rgba(74, 20, 140, 0.85)', label: '#4a148c' },
    { bg: 'rgba(0, 96, 100, 0.2)', hover: 'rgba(0, 96, 100, 0.34)', border: 'rgba(0, 96, 100, 0.85)', label: '#006064' },
    { bg: 'rgba(136, 14, 79, 0.2)', hover: 'rgba(136, 14, 79, 0.34)', border: 'rgba(136, 14, 79, 0.85)', label: '#880e4f' },
    { bg: 'rgba(51, 105, 30, 0.22)', hover: 'rgba(51, 105, 30, 0.36)', border: 'rgba(51, 105, 30, 0.85)', label: '#33691e' },
    { bg: 'rgba(38, 50, 56, 0.22)', hover: 'rgba(38, 50, 56, 0.36)', border: 'rgba(38, 50, 56, 0.85)', label: '#263238' },
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
            timelineConfirmed: Boolean(
                source.timeline_confirmed ?? source.timelineConfirmed ?? false,
            ),
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
        timeline_confirmed: Boolean(mark.timelineConfirmed),
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

export type ManualBeatCursorDraft = {
    range?: ManualBeatTokenRange;
    /** Vị trí con trỏ (token user vừa click) — dùng để đánh dấu caret nổi bật */
    cursorTokenIndex: number;
    /** Lý do không tạo được beat từ con trỏ này */
    blockedReason?: string;
};

/**
 * Click con trỏ vào một từ → dựng beat từ token ngay sau beat cuối cùng đến con trỏ.
 * Luôn phủ đầy tuần tự (full coverage): nếu click vào vùng đã có beat hoặc trước
 * điểm kết thúc của beat cuối cùng → chặn kèm lý do. Nếu chưa có beat nào thì
 * bắt đầu từ token đầu tiên của kịch bản.
 */
export function buildManualBeatRangeFromCursor(
    cursorTokenIndex: number,
    tokens: CaptionAlignToken[],
    marks: ManualBeatMark[],
): ManualBeatCursorDraft {
    const cursor = Number(cursorTokenIndex);
    if (!Number.isFinite(cursor) || tokens.length === 0) {
        return { cursorTokenIndex: cursor, blockedReason: 'Không có dữ liệu whisper để chia beat' };
    }

    if (marks.length === 0) {
        const firstIndex = tokens[0].index;
        if (cursor < firstIndex) {
            return { cursorTokenIndex: cursor, blockedReason: 'Vị trí con trỏ không hợp lệ' };
        }
        return { range: { startTokenIndex: firstIndex, endTokenIndex: cursor }, cursorTokenIndex: cursor };
    }

    const lastBeat = [...marks].sort((a, b) => a.endTokenIndex - b.endTokenIndex)[marks.length - 1];
    const nextStart = lastBeat.endTokenIndex + 1;

    if (cursor < nextStart) {
        return {
            cursorTokenIndex: cursor,
            blockedReason: `Đặt sau beat cuối cùng (#${lastBeat.order}) để tạo beat mới`,
        };
    }

    // Kiểm tra vùng từ sau beat cuối đến con trỏ có đè lên beat khác không
    const covered = buildManualBeatTokenMap(marks);
    for (let index = nextStart; index <= cursor; index += 1) {
        const conflict = covered.get(index);
        if (conflict && conflict.id !== lastBeat.id) {
            return {
                cursorTokenIndex: cursor,
                blockedReason: `Đoạn từ beat ${lastBeat.order} đến đây đè lên beat ${conflict.order}`,
            };
        }
    }

    return {
        range: { startTokenIndex: nextStart, endTokenIndex: cursor },
        cursorTokenIndex: cursor,
    };
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

/**
 * Gộp các beat (theo id, đã chọn liên tục) thành 1. Giữ mốc thời gian bao trùm,
 * nối content cách 1 dấu cách; giữ image_prompt nếu TẤT CẢ đều có prompt.
 * Trả về danh sách mark mới đã normalize + re-order.
 */
export function mergeManualBeatMarks(marks: ManualBeatMark[], ids: string[]): ManualBeatMark[] {
    const idSet = new Set(ids);
    const selected = marks.filter((mark) => idSet.has(mark.id));
    if (selected.length < 2) {
        return marks;
    }
    const selectedByStart = [...selected].sort((a, b) => a.startTokenIndex - b.startTokenIndex);
    const merged: ManualBeatMark = {
        id: `merged_${Date.now()}`,
        order: 0,
        startTokenIndex: Math.min(...selectedByStart.map((mark) => mark.startTokenIndex)),
        endTokenIndex: Math.max(...selectedByStart.map((mark) => mark.endTokenIndex)),
        content: selectedByStart
            .map((mark) => mark.content.trim())
            .filter((text) => text !== '')
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim(),
        imagePrompt: selectedByStart.every((mark) => mark.imagePrompt.trim() !== '')
            ? selectedByStart[0].imagePrompt
            : '',
        startSec: Math.min(...selectedByStart.map((mark) => mark.startSec)),
        endSec: Math.max(...selectedByStart.map((mark) => mark.endSec)),
        durationSec: 0,
        timelineConfirmed: false,
    };
    merged.durationSec = Math.max(0, merged.endSec - merged.startSec);

    const next = marks
        .filter((mark) => !idSet.has(mark.id))
        .concat(merged);
    return normalizeManualBeatMarks(next);
}

/** Beat nào < 2s → cần gộp để dựng ảnh (1 ảnh/beat): tô đậm background. */
export function isManualBeatTooShort(durationSec: number): boolean {
    return Number(durationSec) > 0 && Number(durationSec) < MANUAL_BEAT_TARGET_SEC;
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

/** Meta.ai video 2s trả prompt plain text — bọc thành JSON object đủ 7 key cho beat_map. */
export function wrapVideo2sPlainImagePrompt(plain: string, content: string): Record<string, string> {
    const normalized = String(plain || '').trim();
    let subject = normalized;
    const imageMatch = /IMAGE PROMPT:\s*\n?([\s\S]*?)(?:\n\s*NEGATIVE PROMPT:|$)/i.exec(normalized);
    if (imageMatch?.[1]) {
        subject = imageMatch[1].trim();
    } else {
        const visualMatch = /VISUAL CONCEPT:\s*\n?([\s\S]*?)(?:\n\s*IMAGE PROMPT:|$)/i.exec(normalized);
        if (visualMatch?.[1]) {
            subject = visualMatch[1].trim();
        }
    }
    let mustAvoid = 'watermark, logo, photorealism, 3D render, dense text';
    const negativeMatch = /NEGATIVE PROMPT:\s*\n?([\s\S]*)$/i.exec(normalized);
    if (negativeMatch?.[1]) {
        mustAvoid = negativeMatch[1].trim().slice(0, 400);
    }
    if (!subject) {
        subject = content.trim() || 'illustrate script beat';
    }
    if (subject.length > 1800) {
        subject = subject.slice(0, 1800);
    }
    let scene = content.trim() || 'documentary scene';
    if (scene.length > 400) {
        scene = scene.slice(0, 400);
    }
    return {
        subject,
        action: 'illustrate the script moment',
        scene,
        text_overlay: '',
        composition: 'clean 2D documentary illustration, centered subject, white background',
        must_avoid: mustAvoid,
    };
}

/** Mirror backend align_timings — nối liền gap nhỏ giữa các beat thủ công. */
export function alignManualBeatMapTimings(beatMap: BeatMap): BeatMap {
    const sections = [...beatMap.sections].sort((a, b) => a.startSec - b.startSec);
    if (sections.length === 0) {
        return beatMap;
    }
    if (Math.abs(sections[0].startSec) > 0.001) {
        sections[0] = { ...sections[0], startSec: 0 };
    }
    for (let i = 1; i < sections.length; i += 1) {
        const prevEnd = sections[i - 1].endSec;
        const curStart = sections[i].startSec;
        if (curStart > prevEnd + 0.001) {
            sections[i - 1] = {
                ...sections[i - 1],
                endSec: curStart,
                durationSec: round3(curStart - sections[i - 1].startSec),
            };
        } else if (curStart < prevEnd - 0.001) {
            sections[i] = {
                ...sections[i],
                startSec: prevEnd,
                durationSec: round3(sections[i].endSec - prevEnd),
            };
        }
    }
    const total = beatMap.totalVideoSec;
    if (total > 0) {
        const lastIdx = sections.length - 1;
        if (Math.abs(sections[lastIdx].endSec - total) > 0.001) {
            sections[lastIdx] = {
                ...sections[lastIdx],
                endSec: total,
                durationSec: round3(total - sections[lastIdx].startSec),
            };
        }
    }
    return { ...beatMap, sections };
}

/** Video 2s: đồng bộ beat thủ công → beat_map để timeline / edit beat hoạt động. */
export function buildBeatMapFromManualMarks(
    marks: ManualBeatMark[],
    totalVideoSec: number,
): BeatMap | null {
    if (!marks.length) {
        return null;
    }
    const total = totalVideoSec > 0
        ? totalVideoSec
        : Math.max(...marks.map((mark) => mark.endSec));
    const sections: BeatMapSection[] = marks.map((mark, index) => {
        const id = `beat_${index + 1}`;
        const content = mark.content.trim();
        const visualDescription = content.length > 200 ? `${content.slice(0, 197)}...` : content;
        const section: BeatMapSection = {
            id,
            beat_id: id,
            startSec: mark.startSec,
            endSec: mark.endSec,
            durationSec: mark.durationSec,
            phrase_anchor: content,
            visual_description: visualDescription || `Beat ${index + 1}`,
            background: '',
        };
        if (mark.imagePrompt.trim()) {
            section.image_prompt = wrapVideo2sPlainImagePrompt(mark.imagePrompt, content);
        }
        return section;
    });
    return alignManualBeatMapTimings({
        schema_version: 2,
        totalVideoSec: round3(total),
        source: 'video_2s_manual',
        sections,
    });
}
