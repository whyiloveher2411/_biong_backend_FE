import type { ManualBeatMark } from './agentVideoManualBeats';

/** Bản dịch beat video 2s — key = thứ tự beat (mark.order, 1-based), value = câu tiếng Việt. */
export type BeatTranslationMap = Record<string, string>;

export type BeatTranslationEntry = {
    order: number;
    source: string;
    vi: string;
};

export type BeatTranslationPayload = {
    source_language: string;
    translations: BeatTranslationEntry[];
};

/** Prompt dịch audio script beat — output CHỈ JSON,フォーム cố định để validate. */
export function buildBeatTranslationPrompt(marks: ManualBeatMark[]): string {
    const lines = marks
        .map((mark) => `${mark.order}. [${mark.content.trim()}]`)
        .join('\n');
    return [
        'Dịch audio script TIỆNG VIỆT.',
        '',
        'INPUT: mỗi dòng là MỘT beat, format "<STT>. [nội dung beat]":',
        lines,
        '',
        'YÊU CẦU NGHIÊM KHẮT:',
        '- Bản dịch "vi" phải là TIẾNG VIỆT tự nhiên, dễ đọc.',
        '- Số beat (order) = số dòng input, ĐÚNG THỨ TỰ, KHÔNG bỏ/skip beat nào, KHÔNG thêm beat mới.',
        '- "source" = copy NGUYÊN VĂN nội dung trong [ ] của beat đó, không sửa chữ.',
        '- "vi" phải cùng số dòng/câu với "source": mỗi dòng của source → đúng một dòng của vi, KHÔNG gộp, KHÔNG tách, KHÔNG thêm bớt nội dung.',
        '- Giữ nguyên tên riêng, số, đơn vị và từ viết tắt.',
        '',
        'OUTPUT: CHỈ TRẢ VỀ MỘT JSON (không markdown, không giải thích), schema:',
        '{',
        '  "source_language": "<ngôn ngữ nguồn phát hiện được, viết tắt ISO: en/ru/zh...>",',
        '  "translations": [',
        '    { "order": 1, "source": "<nguyên văn beat 1>", "vi": "<bản dịch tiếng Việt beat 1>" }',
        '  ]',
        '}',
    ].join('\n');
}

/** Rút JSON ra khỏi text được dán (chấp nhận ```json fence, text thừa trước/sau). */
function extractJsonObject(text: string): string | null {
    const raw = String(text || '').replace(/\r\n?/g, '\n').trim();
    if (!raw) {
        return null;
    }
    const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw);
    const candidate = fence?.[1]?.trim() || raw;
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start < 0 || end <= start) {
        return null;
    }
    return candidate.slice(start, end + 1);
}

/** Chuẩn hóa để so khớp "source" trả về với beat gốc — bỏ khoảng trắng/punctuation. */
function normalizeSource(value: string): string {
    return String(value || '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export type BeatTranslationParseOk = {
    payload: BeatTranslationPayload;
    messages: string[];
};

/**
 * Validate JSON dán về: đủ beat (order 1..N khớp danh sách beat), source khớp
 * nguyên văn, vi khác rỗng và khác nguồn. Lỗi → throw với thông báo rõ.
 */
export function parseBeatTranslationClipboard(
    text: string,
    marks: ManualBeatMark[],
): BeatTranslationParseOk {
    const json = extractJsonObject(text);
    if (!json) {
        throw new Error('Clipboard không chứa JSON hợp lệ — hãy copy lại prompt và dán đủ kết quả');
    }
    let parsed: unknown;
    try {
        parsed = JSON.parse(json);
    } catch {
        throw new Error('JSON bị hỏng (parse lỗi) — hãy copy lại kết quả, đảm bảo AI trả về duy nhất 1 JSON');
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('JSON sai dạng — cần object có key "source_language" và "translations"');
    }
    const data = parsed as Record<string, unknown>;
    if (typeof data.source_language !== 'string' || !data.source_language.trim()) {
        throw new Error('JSON thiếu "source_language"');
    }
    if (!Array.isArray(data.translations) || data.translations.length === 0) {
        throw new Error('JSON thiếu mảng "translations"');
    }

    const translations: BeatTranslationEntry[] = data.translations.map((item, index) => {
        if (!item || typeof item !== 'object') {
            throw new Error(`Item "translations" thứ ${index + 1} sai dạng`);
        }
        const entry = item as Record<string, unknown>;
        return {
            order: Number(entry.order || 0),
            source: String(entry.source ?? '').trim(),
            vi: String(entry.vi ?? '').trim(),
        };
    });

    const messages: string[] = [];
    if (typeof data.source_language === 'string' && data.source_language.trim()) {
        messages.push(`Nguồn: ${data.source_language.trim()}`);
    }

    const expectedByOrder = new Map<number, ManualBeatMark>();
    marks.forEach((mark) => expectedByOrder.set(Number(mark.order || 0), mark));

    // Đủ beat? — số entry phải bằng số beat và order phủ đúng 1..N
    const seenOrders = new Set<number>();
    for (const entry of translations) {
        if (!Number.isFinite(entry.order) || entry.order < 1) {
            throw new Error('Một entry trong "translations" thiếu "order"');
        }
        if (seenOrders.has(entry.order)) {
            throw new Error(`Beat ${entry.order} bị trùng trong kết quả dịch`);
        }
        seenOrders.add(entry.order);
    }
    const missing = marks
        .map((mark) => Number(mark.order || 0))
        .filter((order) => !seenOrders.has(order));
    if (missing.length > 0) {
        throw new Error(`Thiếu bản dịch beat: ${missing.slice(0, 12).join(', ')}`);
    }
    if (translations.length !== marks.length) {
        throw new Error(`Kết quả có ${translations.length} beat — cần đúng ${marks.length} beat`);
    }

    // Siết: vi là tiếng Việt có chữ, khác nguồn; source khớp nguyên văn beat
    for (const entry of translations) {
        const mark = expectedByOrder.get(entry.order);
        if (!mark) {
            throw new Error(`Beat ${entry.order} không tồn tại trong danh sách beat hiện tại`);
        }
        const expected = normalizeSource(mark.content);
        const sourceNorm = normalizeSource(entry.source);
        if (sourceNorm && expected && sourceNorm !== expected) {
            throw new Error(`Beat ${entry.order}: "source" không khớp nguyên văn beat`);
        }
        if (!entry.vi) {
            throw new Error(`Beat ${entry.order}: "vi" rỗng`);
        }
        if (normalizeSource(entry.vi) === normalizeSource(entry.source)) {
            throw new Error(`Beat ${entry.order}: "vi" giống "source" — có vẻ chưa dịch`);
        }
    }

    return {
        payload: { source_language: data.source_language.trim(), translations },
        messages: messages.length ? [messages.join(' — ')] : [],
    };
}

/** Map translations → Record<string,string> lưu theo order beat string. */
export function beatTranslationsFromPayload(
    payload: BeatTranslationPayload,
): BeatTranslationMap {
    const map: BeatTranslationMap = {};
    for (const entry of payload.translations) {
        map[String(entry.order)] = entry.vi;
    }
    return map;
}

export function normalizeBeatTranslationMap(raw: unknown): BeatTranslationMap {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return {};
    }
    const source = raw as Record<string, unknown>;
    const map: BeatTranslationMap = {};
    Object.entries(source).forEach(([key, value]) => {
        const vi = typeof value === 'string'
            ? value
            : typeof value === 'object' && value
                ? String((value as Record<string, unknown>).vi ?? '')
                : '';
        const order = Number(key);
        if (!Number.isFinite(order) || order < 1 || !vi.trim()) {
            return;
        }
        map[String(order)] = vi.trim();
    });
    return map;
}
