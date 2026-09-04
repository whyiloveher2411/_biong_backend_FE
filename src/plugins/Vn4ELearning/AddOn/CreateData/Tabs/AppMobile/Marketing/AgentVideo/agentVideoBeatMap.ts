import { formatDurationSec } from './agentVideoHfPromptDuration';
import {
    WHITEBOARD_IMAGE_PROMPT_JSON_KEYS,
    WHITEBOARD_IMAGE_PROMPT_LEGACY_REQUIRED_KEYS,
    isWhiteboardObjectLayerPromptKey,
    whiteboardObjectLayerCountFromPrompt,
} from './agentVideoBeatDivisionWhiteboard';

export type BeatMapSection = {
    id: string;
    beat_id: string;
    startSec: number;
    endSec: number;
    durationSec: number;
    phrase_anchor: string;
    visual_description: string;
    /** Prompt ảnh — JSON object THẬT (mới); hỗ trợ string escaped (cũ). Bắt buộc khi whiteboard. */
    image_prompt?: Record<string, unknown> | string;
    /** Set dressing per beat (EN). Có thể rỗng trên map cũ trước khi chia lại. */
    background: string;
};

export type BeatMap = {
    schema_version: 2;
    totalVideoSec: number;
    source?: string;
    updated_at?: string;
    sections: BeatMapSection[];
};

export type BeatQaActionStatus = 'approved' | 'needs_html_refill' | 'needs_image_refill' | 'needs_visual_tweak';

export type BeatQaStatus = BeatQaActionStatus | '';

export type BeatHtmlEntry = {
    html: string;
    updated_at?: string;
    /** Prompt sáng tạo / refine — user hoặc pipeline AI ghi để dùng lại. */
    creative_prompt?: string;
    qa_status?: BeatQaStatus;
    qa_refine_note?: string;
    render_status?: 'error' | 'ok' | string;
    render_error?: string;
    render_error_code?: string;
    render_error_stage?: 'assemble' | 'render' | string;
    render_error_at?: string;
};

export type BeatImageEntry = {
    image_url: string;
    /**
     * Ảnh object layer thứ 2..N của beat (multi-image per beat) — ảnh 1 vẫn ở
     * `image_url` để beat cũ và mọi đường render legacy không đổi.
     */
    extra_image_urls?: string[];
    image_prompt?: string;
    /**
     * URL chat chatbot (Meta.ai / Duck.ai) đã tạo ảnh beat — user mở lại chat gốc
     * để xem/update ảnh ngay trong conversation đó.
     */
    chat_url?: string;
    updated_at?: string;
    creative_prompt?: string;
    qa_status?: BeatQaStatus;
    qa_refine_note?: string;
    render_status?: 'error' | 'ok' | string;
    render_error?: string;
    render_error_code?: string;
    render_error_stage?: 'assemble' | 'render' | string;
    render_error_at?: string;
};

/** Snapshot archive 1 beat — không thay working beat_map / beat_html. */
export type BeatVersion = {
    version_id: string;
    label: string;
    saved_at: string;
    id: string;
    beat_id: string;
    startSec: number;
    endSec: number;
    durationSec: number;
    phrase_anchor: string;
    visual_description: string;
    background: string;
    html?: string;
    image_url?: string;
    image_prompt?: string;
    creative_prompt?: string;
    qa_status?: BeatQaStatus;
    qa_refine_note?: string;
    updated_at?: string;
    render_status?: string;
    render_error?: string;
    render_error_code?: string;
    render_error_stage?: string;
    render_error_at?: string;
};

export type BeatVersionsByBeatId = Record<string, BeatVersion[]>;

/**
 * Working lệch version active (hoặc chưa có active) → cần snapshot trước quick iterate.
 * Chỉ so visual_description + html (không so QA note/status).
 */
export function isWorkingBeatDirtyVsActive(
    workingVisual: string,
    workingHtml: string,
    activeVersion: BeatVersion | null | undefined,
): boolean {
    if (!activeVersion) {
        return true;
    }
    return String(workingVisual || '').trim() !== String(activeVersion.visual_description || '').trim()
        || String(workingHtml || '').trim() !== String(activeVersion.html || '').trim();
}

/** Tìm version đã lưu khớp working (ưu tiên bản mới nhất). */
export function findBeatVersionMatchingWorking(
    versions: BeatVersion[] | null | undefined,
    workingVisual: string,
    workingHtml: string,
): BeatVersion | null {
    if (!Array.isArray(versions) || versions.length === 0) {
        return null;
    }
    const visual = String(workingVisual || '').trim();
    const html = String(workingHtml || '').trim();
    for (let i = versions.length - 1; i >= 0; i -= 1) {
        const version = versions[i];
        if (!version) {
            continue;
        }
        if (
            String(version.visual_description || '').trim() === visual
            && String(version.html || '').trim() === html
        ) {
            return version;
        }
    }
    return null;
}

export type BeatHtmlVisualState = 'missing' | 'ok' | 'error';

export const BEAT_QA_STATUSES: BeatQaActionStatus[] = [
    'approved',
    'needs_html_refill',
    'needs_image_refill',
    'needs_visual_tweak',
];

export const BEAT_QA_STATUS_LABELS: Record<BeatQaActionStatus, string> = {
    approved: 'Ổn',
    needs_html_refill: 'Chưa ổn HTML',
    needs_image_refill: 'Chưa ổn ảnh',
    needs_visual_tweak: 'Đổi visual',
};

export type BeatQaQuickNoteOption = {
    label: string;
    note: string;
};

export type BeatQaQuickNoteGroup = {
    id: 'visual_tweak' | 'html_refill';
    label: string;
    qaStatus: BeatQaActionStatus;
    options: BeatQaQuickNoteOption[];
};

export const BEAT_QA_QUICK_NOTE_GROUPS: BeatQaQuickNoteGroup[] = [
    {
        id: 'visual_tweak',
        label: BEAT_QA_STATUS_LABELS.needs_visual_tweak,
        qaStatus: 'needs_visual_tweak',
        options: [
            {
                label: 'Dùng ảnh/metaphor dễ hiểu',
                note: 'Ưu tiên metaphor hoặc minh họa trực quan — người xem hiểu trong 1–2 giây.',
            },
            {
                label: 'Không khớp nội dung thoại',
                note: 'Visual không phản ánh đúng phrase_anchor. Thiết kế lại scene theo ý chính đoạn thoại.',
            },
            {
                label: 'Quá trống, cần dày hơn',
                note: 'Beat quá sparse — thêm layer visual (badge, stat, chips, deco) nhưng giữ safe zone.',
            },
            {
                label: 'Hook chưa đủ mạnh',
                note: 'Beat hook cần impact cao: headline lớn, focal rõ, entrance mạnh trong 1–2 giây đầu.',
            },
            {
                label: 'Concept quá rối',
                note: 'Đơn giản hóa — một focal duy nhất, bỏ layer không phục vụ phrase_anchor.',
            },
        ],
    },
    {
        id: 'html_refill',
        label: BEAT_QA_STATUS_LABELS.needs_html_refill,
        qaStatus: 'needs_html_refill',
        options: [
            {
                label: 'Chữ khó đọc',
                note: 'Tăng contrast chữ vs nền — text-shadow hoặc plate nền mờ sau text chính.',
            },
            {
                label: 'Chữ quá nhỏ',
                note: 'Tăng cỡ headline/key claim trên 1080×1920, giữ hierarchy rõ.',
            },
            {
                label: 'Tràn khung / bị cắt',
                note: 'Element bị cắt — căn lại trong safe zone 9:16, padding 28–48px mép.',
            },
            {
                label: 'Frame trống',
                note: 'Có khoảng trống đầu/cuối — element visible từ t=0 đến hết DURATION.',
            },
            {
                label: 'Lệch nhịp thoại',
                note: 'Animation lệch Whisper — căn lại timing theo beat-timing JSON.',
            },
            {
                label: 'Hình ảnh bị lệch không ăn khớp',
                note: 'Hình ảnh bị lệch không ăn khớp — cần kiểm tra đúng vị trí của các chi tiết ăn khớp với nhau',
            },
        ],
    },
];

export function normalizeBeatQaStatus(raw: unknown): BeatQaStatus {
    const status = String(raw || '').trim();
    return BEAT_QA_STATUSES.includes(status as BeatQaActionStatus)
        ? status as BeatQaActionStatus
        : '';
}

export function countBeatQaByStatus(
    beatMap: BeatMap | null,
    beatHtml: Record<string, BeatHtmlEntry>,
): Record<'approved' | 'needs_html_refill' | 'needs_image_refill' | 'needs_visual_tweak' | 'unreviewed', number> {
    const counts = {
        approved: 0,
        needs_html_refill: 0,
        needs_image_refill: 0,
        needs_visual_tweak: 0,
        unreviewed: 0,
    };
    const sections = beatMap?.sections ?? [];
    sections.forEach((section) => {
        const status = normalizeBeatQaStatus(beatHtml[section.id]?.qa_status);
        if (!status) {
            counts.unreviewed += 1;
            return;
        }
        counts[status] += 1;
    });
    return counts;
}

export function parseBeatHtmlEntry(entry: unknown): BeatHtmlEntry | null {
    if (!entry || typeof entry !== 'object') {
        return null;
    }
    const raw = entry as Record<string, unknown>;
    const creativePrompt = raw.creative_prompt != null
        ? String(raw.creative_prompt)
        : undefined;
    const qaStatus = raw.qa_status != null
        ? normalizeBeatQaStatus(raw.qa_status)
        : undefined;
    const qaRefineNote = raw.qa_refine_note != null
        ? String(raw.qa_refine_note)
        : undefined;
    return {
        html: String(raw.html || ''),
        updated_at: raw.updated_at ? String(raw.updated_at) : undefined,
        creative_prompt: creativePrompt !== undefined ? creativePrompt : undefined,
        qa_status: qaStatus !== undefined && qaStatus !== '' ? qaStatus : undefined,
        qa_refine_note: qaRefineNote !== undefined ? qaRefineNote : undefined,
        render_status: raw.render_status ? String(raw.render_status) : undefined,
        render_error: raw.render_error ? String(raw.render_error) : undefined,
        render_error_code: raw.render_error_code ? String(raw.render_error_code) : undefined,
        render_error_stage: raw.render_error_stage ? String(raw.render_error_stage) : undefined,
        render_error_at: raw.render_error_at ? String(raw.render_error_at) : undefined,
    };
}

export function parseBeatVersion(entry: unknown): BeatVersion | null {
    if (!entry || typeof entry !== 'object') {
        return null;
    }
    const raw = entry as Record<string, unknown>;
    const versionId = String(raw.version_id || '').trim();
    const label = String(raw.label || '').trim();
    const beatId = String(raw.beat_id || raw.id || '').trim();
    const html = String(raw.html || '');
    const imageUrl = String(raw.image_url || '').trim();
    if (!versionId || !label || !beatId || (!html.trim() && !imageUrl)) {
        return null;
    }
    const startSec = Number(raw.startSec);
    const endSec = Number(raw.endSec);
    const durationSec = Number(raw.durationSec);
    const qaStatus = raw.qa_status != null
        ? normalizeBeatQaStatus(raw.qa_status)
        : undefined;
    return {
        version_id: versionId,
        label,
        saved_at: String(raw.saved_at || ''),
        id: String(raw.id || beatId),
        beat_id: beatId,
        startSec: Number.isFinite(startSec) ? startSec : 0,
        endSec: Number.isFinite(endSec) ? endSec : 0,
        durationSec: Number.isFinite(durationSec) ? durationSec : 0,
        phrase_anchor: String(raw.phrase_anchor || ''),
        visual_description: String(raw.visual_description || ''),
        background: String(raw.background || ''),
        html: html.trim() ? html : undefined,
        image_url: imageUrl || undefined,
        image_prompt: raw.image_prompt != null ? String(raw.image_prompt) : undefined,
        creative_prompt: raw.creative_prompt != null ? String(raw.creative_prompt) : undefined,
        qa_status: qaStatus || undefined,
        qa_refine_note: raw.qa_refine_note != null ? String(raw.qa_refine_note) : undefined,
        updated_at: raw.updated_at ? String(raw.updated_at) : undefined,
        render_status: raw.render_status ? String(raw.render_status) : undefined,
        render_error: raw.render_error ? String(raw.render_error) : undefined,
        render_error_code: raw.render_error_code ? String(raw.render_error_code) : undefined,
        render_error_stage: raw.render_error_stage ? String(raw.render_error_stage) : undefined,
        render_error_at: raw.render_error_at ? String(raw.render_error_at) : undefined,
    };
}

export function parseBeatVersionsBlock(raw: unknown): BeatVersionsByBeatId {
    if (!raw || typeof raw !== 'object') {
        return {};
    }
    const next: BeatVersionsByBeatId = {};
    Object.entries(raw as Record<string, unknown>).forEach(([beatId, list]) => {
        if (!/^beat_\d+$/.test(beatId) || !Array.isArray(list)) {
            return;
        }
        const versions = list
            .map((item) => parseBeatVersion(item))
            .filter((item): item is BeatVersion => item != null);
        if (versions.length > 0) {
            next[beatId] = versions;
        }
    });
    return next;
}

export function isBeatHtmlRenderError(beatHtml: Record<string, BeatHtmlEntry>, beatId: string): boolean {
    return beatHtml[beatId]?.render_status === 'error';
}

export function getBeatHtmlVisualState(
    beatHtml: Record<string, BeatHtmlEntry>,
    beatId: string,
): BeatHtmlVisualState {
    if (!String(beatHtml[beatId]?.html || '').trim()) {
        return 'missing';
    }
    if (isBeatHtmlRenderError(beatHtml, beatId)) {
        return 'error';
    }
    return 'ok';
}

export function countBeatRenderErrors(beatHtml: Record<string, BeatHtmlEntry>): number {
    return listBeatRenderErrorIds(beatHtml).length;
}

export function listBeatRenderErrorIds(beatHtml: Record<string, BeatHtmlEntry>): string[] {
    return Object.entries(beatHtml)
        .filter(([, entry]) => entry?.render_status === 'error')
        .map(([beatId]) => beatId)
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function getBeatRenderErrorMessage(beatHtml: Record<string, BeatHtmlEntry>, beatId: string): string {
    const entry = beatHtml[beatId];
    if (!entry?.render_error?.trim()) {
        return 'Beat lỗi render/assemble';
    }
    const stage = entry.render_error_stage ? ` (${entry.render_error_stage})` : '';
    return `${entry.render_error.trim()}${stage}`;
}

export type BeatMapValidation = {
    valid: boolean;
    errors: string[];
};

export function stripJsonFences(text: string): string {
    const trimmed = String(text || '').trim();
    const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    return fenced ? fenced[1].trim() : trimmed;
}

/**
 * Parse output giai đoạn 2 (visual per chunk): `{ "sections": [ { "id": "beat_N", "visual_description": "...", "image_prompt": {...} } ] }`
 * → map id → image_prompt + visual_description. KHÔNG cần schema_version/totalVideoSec (không phải beat-map đầy đủ).
 */
export function parseBeatVisualChunkJson(
    text: string,
    expectedIds: string[] = [],
): {
    imagePrompts: Record<string, Record<string, unknown>>;
    visualDescriptions: Record<string, string>;
    errors: string[];
} {
    const errors: string[] = [];
    const stripped = stripJsonFences(String(text || '').trim());
    const markerMatch = stripped.match(
        /###IMPORT_HTML_BEAT_MAP:RESULT:BEGIN###([\s\S]*?)###IMPORT_HTML_BEAT_MAP:RESULT:END###/i,
    );
    const raw = (markerMatch ? markerMatch[1].trim() : stripped).trim();
    if (!raw) {
        return { imagePrompts: {}, visualDescriptions: {}, errors: ['JSON trống'] };
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return { imagePrompts: {}, visualDescriptions: {}, errors: ['JSON không parse được'] };
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { imagePrompts: {}, visualDescriptions: {}, errors: ['Phải là JSON object'] };
    }

    const sections = (parsed as Record<string, unknown>).sections;
    if (!Array.isArray(sections) || sections.length === 0) {
        return { imagePrompts: {}, visualDescriptions: {}, errors: ['sections rỗng'] };
    }

    const imagePrompts: Record<string, Record<string, unknown>> = {};
    const visualDescriptions: Record<string, string> = {};
    sections.forEach((item, index) => {
        if (!item || typeof item !== 'object') {
            errors.push(`Chunk section #${index + 1} không hợp lệ`);
            return;
        }
        const obj = item as Record<string, unknown>;
        const id = String(obj.id || '').trim();
        if (!/^beat_\d+$/.test(id)) {
            errors.push(`Chunk section #${index + 1}: id phải dạng beat_N`);
            return;
        }
        if (expectedIds.length > 0 && !expectedIds.includes(id)) {
            errors.push(`${id}: ngoài danh sách chunk được cung cấp (expected: ${expectedIds.join(', ')})`);
            return;
        }
        const visualDescription = String(obj.visual_description || '').trim();
        const visualWordCount = visualDescription.split(/\s+/).filter(Boolean).length;
        if (
            !visualDescription
            || visualDescription.length > 200
            || visualWordCount < 2
            || visualWordCount > 20
            || /[À-ỹ]/u.test(visualDescription)
            || !/[A-Za-z]/.test(visualDescription)
        ) {
            errors.push(`${id}: visual_description phải là 1 câu tiếng Anh, 2–20 từ, chỉ từ phrase_anchor`);
            return;
        }
        const imagePrompt = normalizeBeatImagePrompt(obj.image_prompt);
        if (!imagePrompt) {
            errors.push(`${id}: thiếu image_prompt object (7 key)`);
            return;
        }
        // Validate đủ 7 key + không key thừa + field ≥2 ký tự — mirror validateBeatImagePrompt.
        const validated = validateBeatImagePrompt(imagePrompt);
        if (!validated) {
            const details = describeBeatImagePromptErrors(imagePrompt);
            errors.push(`${id}: image_prompt không hợp lệ — ${details.join('; ')}`);
            return;
        }
        imagePrompts[id] = imagePrompt;
        visualDescriptions[id] = visualDescription;
    });

    const missing = expectedIds.filter((id) => !(id in imagePrompts));
    if (missing.length > 0) {
        errors.push(`Thiếu image_prompt cho: ${missing.join(', ')}`);
    }

    return { imagePrompts, visualDescriptions, errors };
}

function asNumber(value: unknown): number | null {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
}

export function validateBeatVisualDescription(value: unknown): string | null {
    const description = String(value ?? '').trim();
    if (!description || description.length > 1200) {
        return null;
    }
    return description;
}

/** Chuẩn hóa image_prompt (object thật hoặc string escaped cũ) → object thật. */
export function normalizeBeatImagePrompt(value: unknown): Record<string, unknown> | null {
    if (!value) {
        return null;
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, unknown>;
    }
    const raw = String(value).trim();
    // Beat nhiều lớp ảnh (object_prompt_2..N) dài hơn beat 1 ảnh — trần cũ 2000 làm
    // prompt multi-layer parse fail và bị coi như beat 1 ảnh.
    if (!raw || raw.length > 20000) {
        return null;
    }
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed as Record<string, unknown>;
        }
    } catch {
        return null;
    }
    return null;
}

/** Key hợp lệ của image_prompt: 7 key chuẩn + `object_prompt_N` (lớp ảnh thêm). */
export function isAllowedBeatImagePromptKey(key: string): boolean {
    return (
        WHITEBOARD_IMAGE_PROMPT_JSON_KEYS.includes(key as (typeof WHITEBOARD_IMAGE_PROMPT_JSON_KEYS)[number])
        || isWhiteboardObjectLayerPromptKey(key)
    );
}

/**
 * Số object layer beat này cần: 1 (subject chính) + số `object_prompt_*` non-empty.
 * Mirror marketing_short_video_agent_beat_object_layer_count (PHP).
 */
export function beatSectionObjectLayerCount(section: BeatMapSection | null | undefined): number {
    return whiteboardObjectLayerCountFromPrompt(normalizeBeatImagePrompt(section?.image_prompt));
}

/**
 * Số object layer theo ĐÚNG prompt sẽ gửi đi sinh ảnh (beat_image override ưu tiên
 * hơn section) — tránh lệch giữa số ô upload và số ảnh AI được yêu cầu.
 */
export function beatImagePromptObjectLayerCount(prompt: unknown): number {
    return whiteboardObjectLayerCountFromPrompt(normalizeBeatImagePrompt(prompt));
}

export function validateBeatImagePrompt(value: unknown): string | null {
    const record = normalizeBeatImagePrompt(value);
    if (!record) {
        return null;
    }
    // Bắt buộc JSON object theo whitelist 7 key — image_prompt không còn chấp nhận text thuần.
    // `background_prompt` optional khi đọc để beat-map cũ (6 key) vẫn dùng được.
    const keys = Object.keys(record);
    if (keys.some((key) => !isAllowedBeatImagePromptKey(key))) {
        return null;
    }
    if (WHITEBOARD_IMAGE_PROMPT_LEGACY_REQUIRED_KEYS.some((key) => !keys.includes(key))) {
        return null;
    }
    // text_overlay được phép rỗng "" (một số trường hợp AI bỏ trống) nhưng ưu tiên có
    // 3–6 label từ khóa liên quan nội dung beat; các key khác bắt buộc non-empty.
    const nonEmptyOk = WHITEBOARD_IMAGE_PROMPT_JSON_KEYS
        .filter((key) => key !== 'text_overlay')
        .every((key) => !keys.includes(key) || String(record[key] ?? '').trim() !== '');
    if (!nonEmptyOk) {
        return null;
    }
    // Chặn placeholder 1 chữ cái ("D", "C", "M"...), subject/action sơ sài, text_overlay cắt cụt.
    if (!imagePromptFieldsQualityOk(record)) {
        return null;
    }
    return JSON.stringify(record);
}

/** Chặn image_prompt rác (1 ký tự) — mirror backend marketing_short_video_agent_image_prompt_fields_quality_ok. */
export function imagePromptFieldsQualityOk(record: Record<string, unknown>): boolean {
    for (const key of ['subject', 'action', 'scene', 'composition', 'must_avoid']) {
        const value = String(record[key] ?? '').trim();
        if (value === '' || value.length < 2) {
            return false;
        }
    }
    const textOverlay = String(record.text_overlay ?? '').trim();
    if (textOverlay !== '' && textOverlay.length < 2) {
        return false;
    }
    // background_prompt optional (beat-map cũ) — có thì phải là mô tả thật.
    if (Object.prototype.hasOwnProperty.call(record, 'background_prompt')) {
        if (String(record.background_prompt ?? '').trim().length < 2) {
            return false;
        }
    }
    return true;
}

/** Chuyển image_prompt (object thật hoặc string JSON) về text hiển thị/ghi — tránh "[object Object]". */
export function beatImagePromptToText(value: unknown): string {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        try {
            return JSON.stringify(value);
        } catch {
            return '';
        }
    }
    return String(value ?? '');
}

/** Liệt kê lỗi cụ thể của image_prompt (thiếu/thừa key, field rỗng/1 ký tự) — dùng cho message rõ ràng. */
export function describeBeatImagePromptErrors(value: unknown): string[] {
    const record = normalizeBeatImagePrompt(value);
    if (!record) {
        return ['image_prompt không phải JSON object'];
    }
    const errors: string[] = [];
    const keys = Object.keys(record);
    const missing = WHITEBOARD_IMAGE_PROMPT_LEGACY_REQUIRED_KEYS.filter((key) => !keys.includes(key));
    if (missing.length > 0) {
        errors.push(`thiếu key: ${missing.join(', ')}`);
    }
    if (!keys.includes('background_prompt')) {
        errors.push('thiếu background_prompt (beat-map cũ — cần chia beat lại để sinh nền riêng cho IMAGE 2)');
    }
    const extra = keys.filter((key) => !isAllowedBeatImagePromptKey(key));
    if (extra.length > 0) {
        errors.push(`key thừa (cấm): ${extra.join(', ')}`);
    }
    for (const key of WHITEBOARD_IMAGE_PROMPT_JSON_KEYS) {
        if (!keys.includes(key)) {
            continue;
        }
        const valueText = String(record[key] ?? '').trim();
        if (key === 'text_overlay') {
            if (valueText !== '' && valueText.length < 2) {
                errors.push(`text_overlay phải rỗng hoặc ≥2 ký tự`);
            }
            continue;
        }
        if (valueText === '') {
            errors.push(`${key} đang rỗng`);
        } else if (valueText.length < 2) {
            errors.push(`${key} quá ngắn (${valueText.length} ký tự)`);
        }
    }
    return errors;
}

export function parseBeatImageEntry(entry: unknown): BeatImageEntry | null {
    if (!entry || typeof entry !== 'object') {
        return null;
    }
    const raw = entry as Record<string, unknown>;
    const imageUrl = String(raw.image_url || '').trim();
    const chatUrl = String(raw.chat_url || '').trim();
    const imagePrompt = String(raw.image_prompt || '').trim();
    // Ảnh đã xóa nhưng còn metadata (prompt / chat_url) → vẫn parse để nút
    // "Mở url chatbot" dùng được; chỉ bỏ entry rỗng hoàn toàn.
    if (!imageUrl && !chatUrl && !imagePrompt) {
        return null;
    }
    const qaStatus = raw.qa_status != null ? normalizeBeatQaStatus(raw.qa_status) : undefined;
    const extraUrls = Array.isArray(raw.extra_image_urls)
        ? raw.extra_image_urls
            .map((item) => String(item || '').trim())
            .filter((item, index, list) => item !== '' && list.indexOf(item) === index)
        : [];
    return {
        image_url: imageUrl,
        extra_image_urls: extraUrls.length ? extraUrls : undefined,
        image_prompt: imagePrompt || undefined,
        chat_url: chatUrl || undefined,
        updated_at: raw.updated_at ? String(raw.updated_at) : undefined,
        creative_prompt: raw.creative_prompt != null ? String(raw.creative_prompt) : undefined,
        qa_status: qaStatus || undefined,
        qa_refine_note: raw.qa_refine_note != null ? String(raw.qa_refine_note) : undefined,
        render_status: raw.render_status ? String(raw.render_status) : undefined,
        render_error: raw.render_error ? String(raw.render_error) : undefined,
        render_error_code: raw.render_error_code ? String(raw.render_error_code) : undefined,
        render_error_stage: raw.render_error_stage ? String(raw.render_error_stage) : undefined,
        render_error_at: raw.render_error_at ? String(raw.render_error_at) : undefined,
    };
}

export function parseBeatImageBlock(raw: unknown): Record<string, BeatImageEntry> {
    if (!raw || typeof raw !== 'object') {
        return {};
    }
    const next: Record<string, BeatImageEntry> = {};
    Object.entries(raw as Record<string, unknown>).forEach(([beatId, entry]) => {
        if (!/^beat_\d+$/.test(beatId)) {
            return;
        }
        const parsed = parseBeatImageEntry(entry);
        if (parsed) {
            next[beatId] = parsed;
        }
    });
    return next;
}

export function getBeatImageVisualState(
    beatImage: Record<string, BeatImageEntry>,
    beatId: string,
    override?: { image_layers?: unknown } | null,
): BeatHtmlVisualState {
    const entry = beatImage[beatId];
    const hasEntryImage = Boolean(String(entry?.image_url || '').trim());
    // Ảnh beat có thể nằm trong override.image_layers (lưu qua extension) —
    // chỉ khi KHÔNG có ảnh ở cả hai nguồn mới tính là missing (timeline đỏ).
    const overrideLayers = Array.isArray(override?.image_layers) ? override.image_layers : [];
    const hasOverrideImage = overrideLayers.some(
        (layer) => String((layer as { image_url?: unknown } | null)?.image_url || '').trim() !== '',
    );
    if (!hasEntryImage && !hasOverrideImage) {
        return 'missing';
    }
    if (entry?.render_status === 'error') {
        return 'error';
    }
    return 'ok';
}

export function validateBeatBackground(value: unknown): string | null {
    const background = String(value ?? '').trim();
    const wordCount = background.split(/\s+/).filter(Boolean).length;
    if (!background || wordCount < 3 || wordCount > 60 || background.length > 400) {
        return null;
    }
    return background;
}

export function parseBeatMapJson(
    text: string,
    options?: { requireImagePrompt?: boolean; requireVisualDescription?: boolean },
): { map: BeatMap | null; errors: string[] } {
    const errors: string[] = [];
    const raw = stripJsonFences(text);
    if (!raw) {
        return { map: null, errors: ['JSON trống'] };
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return { map: null, errors: ['JSON không parse được'] };
    }

    if (!parsed || typeof parsed !== 'object') {
        return { map: null, errors: ['beat_map phải là object'] };
    }

    const obj = parsed as Record<string, unknown>;
    if (Number(obj.schema_version) !== 2) {
        return {
            map: null,
            errors: ['BeatMap schema v1 không còn được hỗ trợ — hãy chạy Chia beat lại để tạo schema_version=2'],
        };
    }
    const totalVideoSec = asNumber(obj.totalVideoSec);
    if (totalVideoSec == null || totalVideoSec <= 0) {
        errors.push('Thiếu totalVideoSec hợp lệ');
    }

    const sectionsRaw = obj.sections;
    if (!Array.isArray(sectionsRaw) || sectionsRaw.length === 0) {
        errors.push('sections rỗng');
        return { map: null, errors };
    }

    const sections: BeatMapSection[] = [];
    sectionsRaw.forEach((item, index) => {
        if (!item || typeof item !== 'object') {
            errors.push(`Section #${index + 1} không hợp lệ`);
            return;
        }
        const row = item as Record<string, unknown>;
        const allowedFields = new Set([
            'id',
            'beat_id',
            'startSec',
            'endSec',
            'durationSec',
            'phrase_anchor',
            'visual_description',
            'image_prompt',
            'background',
        ]);
        const unexpectedFields = Object.keys(row).filter((key) => !allowedFields.has(key));
        if (unexpectedFields.length > 0) {
            errors.push(
                `Section #${index + 1}: field không thuộc schema v2: ${unexpectedFields.join(', ')}`,
            );
        }
        const id = String(row.id ?? row.beat_id ?? '').trim();
        const startSec = asNumber(row.startSec);
        const endSec = asNumber(row.endSec);
        const durationSec = asNumber(row.durationSec) ?? (
            startSec != null && endSec != null ? endSec - startSec : null
        );
        const phraseAnchor = String(row.phrase_anchor ?? '').trim();
        const visualDescription = validateBeatVisualDescription(row.visual_description);
        const imagePrompt = validateBeatImagePrompt(row.image_prompt);
        const background = validateBeatBackground(row.background);

        if (!/^beat_\d+$/.test(id)) {
            errors.push(`${id || `Section #${index + 1}`}: id phải dạng beat_N`);
        }
        if (startSec == null || endSec == null || endSec <= startSec) {
            errors.push(`${id || `Section #${index + 1}`}: startSec/endSec không hợp lệ`);
        }
        if (durationSec == null || durationSec <= 0) {
            errors.push(`${id || `Section #${index + 1}`}: durationSec không hợp lệ`);
        }
        if (!phraseAnchor) {
            errors.push(`${id || `Section #${index + 1}`}: thiếu phrase_anchor`);
        }
        if (options?.requireVisualDescription !== false && !visualDescription) {
            errors.push(`${id || `Section #${index + 1}`}: visual_description không được để trống`);
        }
        // if (!background) {
        //     errors.push(`${id || `Section #${index + 1}`}: background không được để trống, dài 3–60 từ`);
        // }
        const hasImagePromptRaw = row.image_prompt != null && String(row.image_prompt).trim() !== '';
        if (options?.requireImagePrompt && !hasImagePromptRaw) {
            errors.push(`${id || `Section #${index + 1}`}: thiếu image_prompt cho whiteboard`);
        } else if (hasImagePromptRaw && !imagePrompt) {
            errors.push(`${id || `Section #${index + 1}`}: image_prompt không hợp lệ — phải là JSON đủ 7 field (subject, action, scene, text_overlay, composition, must_avoid, background_prompt)`);
        }

        sections.push({
            id,
            beat_id: id,
            startSec: startSec ?? 0,
            endSec: endSec ?? 0,
            durationSec: durationSec ?? 0,
            phrase_anchor: phraseAnchor,
            visual_description: visualDescription ?? '',
            image_prompt: imagePrompt ? JSON.parse(imagePrompt) as Record<string, unknown> : undefined,
            background: background ?? String(row.background ?? '').trim(),
        });
    });

    if (errors.length > 0) {
        return { map: null, errors };
    }

    return {
        map: {
            schema_version: 2,
            totalVideoSec: totalVideoSec ?? 0,
            source: String(obj.source ?? 'chatbot').trim() || 'chatbot',
            updated_at: String(obj.updated_at ?? '').trim() || undefined,
            sections,
        },
        errors: [],
    };
}

export function validateBeatMap(
    map: BeatMap,
    audioDurationSec: number,
    options?: {
        relaxDurationBounds?: boolean;
        requireImagePrompt?: boolean;
        requireVisualDescription?: boolean;
    },
): BeatMapValidation {
    const errors: string[] = [];
    const audioDur = Number(audioDurationSec) || 0;
    void options?.relaxDurationBounds;

    if (map.schema_version !== 2) {
        errors.push('BeatMap schema v1 không còn được hỗ trợ — hãy chạy Chia beat lại');
    }
    if (!map.sections.length) {
        return { valid: false, errors: ['sections rỗng'] };
    }

    if (audioDur > 0 && Math.abs(map.totalVideoSec - audioDur) > 1.5) {
        errors.push(`totalVideoSec (${formatDurationSec(map.totalVideoSec)}s) lệch audio (${formatDurationSec(audioDur)}s)`);
    }

    let expectedStart = 0;
    map.sections.forEach((section, index) => {
        const label = section.id || `beat_${index + 1}`;
        if (Math.abs(section.startSec - expectedStart) > 0.25) {
            errors.push(`${label}: không liên tục tại ${formatDurationSec(section.startSec)}s`);
        }
        if (Math.abs(section.durationSec - (section.endSec - section.startSec)) > 0.25) {
            errors.push(`${label}: durationSec không khớp end-start`);
        }
        if (section.durationSec <= 0) {
            errors.push(`${label}: durationSec phải > 0`);
        }
        if (options?.requireVisualDescription !== false && !validateBeatVisualDescription(section.visual_description)) {
            errors.push(`${label}: visual_description không được để trống`);
        }
        // if (!validateBeatBackground(section.background)) {
        //     errors.push(`${label}: background không được để trống, dài 3–60 từ`);
        // }
        const hasImagePromptRaw = String(section.image_prompt || '').trim() !== '';
        if (options?.requireImagePrompt && !hasImagePromptRaw) {
            errors.push(`${label}: thiếu image_prompt cho whiteboard`);
        } else if (hasImagePromptRaw && !validateBeatImagePrompt(section.image_prompt)) {
            errors.push(`${label}: image_prompt không hợp lệ — phải là JSON đủ 7 field (subject, action, scene, text_overlay, composition, must_avoid, background_prompt)`);
        }
        // Soft 8–30s / cắt hết ý: chỉ khuyến nghị trong prompt chia beat — code không tách/gộp beat-map.
        expectedStart = section.endSec;
    });

    if (audioDur > 0 && Math.abs(expectedStart - audioDur) > 1.5) {
        errors.push('Beat cuối không khớp thời lượng audio');
    }

    return { valid: errors.length === 0, errors };
}

export function beatMapToJson(map: BeatMap): string {
    return JSON.stringify(map, null, 2);
}

export type BeatBoundaryMarker = {
    timeSec: number;
    beatIndex: number;
};

export type BeatTimelineSegment = {
    beatId: string;
    beatIndex: number;
    startSec: number;
    endSec: number;
};

export function getBeatBoundaryMarkers(map: BeatMap | null): BeatBoundaryMarker[] {
    if (!map?.sections || map.sections.length < 2) {
        return [];
    }
    return map.sections.slice(1).map((section, index) => ({
        timeSec: section.startSec,
        beatIndex: index + 2,
    }));
}

/**
 * Tự động so khớp thời gian beat với beat trước/sau (mirror backend
 * marketing_short_video_agent_beat_map_align_timings):
 * - Beat đầu tiên: startSec = 0.
 * - Overlap (start < end beat trước) → đẩy start về đúng end beat trước.
 * - Gap (start > end beat trước) → kéo end beat trước lên đúng start beat sau.
 * - Beat cuối cùng: endSec = totalVideoSec (nếu có).
 * - Chỉ khi có thay đổi: tính lại durationSec = endSec - startSec cho mọi beat.
 */
export function normalizeBeatMapTimings(map: BeatMap): BeatMap {
    if (!map?.sections || map.sections.length === 0) {
        return map;
    }
    const sections = [...map.sections].sort(
        (a, b) => a.startSec - b.startSec || a.endSec - b.endSec,
    );
    const total = Number(map.totalVideoSec || 0);
    let changed = false;

    if (Math.abs(sections[0].startSec) > 0.001) {
        sections[0].startSec = 0;
        changed = true;
    }

    for (let i = 1; i < sections.length; i++) {
        const prev = sections[i - 1];
        const cur = sections[i];
        if (cur.startSec < prev.endSec - 0.001) {
            cur.startSec = prev.endSec;
            changed = true;
        } else if (cur.startSec > prev.endSec + 0.001) {
            prev.endSec = cur.startSec;
            changed = true;
        }
    }

    if (total > 0) {
        const last = sections[sections.length - 1];
        if (Math.abs(last.endSec - total) > 0.001) {
            last.endSec = total;
            changed = true;
        }
    }

    if (changed) {
        for (const section of sections) {
            section.durationSec = Math.round((section.endSec - section.startSec) * 100) / 100;
        }
    }

    return { ...map, sections };
}

export function getBeatTimelineSegments(map: BeatMap | null): BeatTimelineSegment[] {
    if (!map?.sections?.length) {
        return [];
    }
    return map.sections.map((section, index) => ({
        beatId: section.id,
        beatIndex: index + 1,
        startSec: section.startSec,
        endSec: section.endSec,
    }));
}

export function resolveActiveBeatSection(map: BeatMap | null, timeSec: number): BeatMapSection | null {
    if (!map?.sections?.length) {
        return null;
    }
    for (let i = map.sections.length - 1; i >= 0; i -= 1) {
        if (timeSec >= map.sections[i].startSec) {
            return map.sections[i];
        }
    }
    return map.sections[0];
}

export function isBeatHtmlMissing(beatHtml: Record<string, BeatHtmlEntry>, beatId: string): boolean {
    return !String(beatHtml[beatId]?.html || '').trim();
}

export function countMissingBeatHtml(map: BeatMap | null, beatHtml: Record<string, BeatHtmlEntry>): number {
    if (!map?.sections?.length) {
        return 0;
    }
    return map.sections.filter((section) => isBeatHtmlMissing(beatHtml, section.id)).length;
}

/**
 * Beat có `image_prompt.background_prompt` → cần đủ 2 ảnh (object layer + background plate).
 * Beat-map cũ 6 key → chỉ cần 1 ảnh như trước.
 * Mirror marketing_short_video_agent_beat_needs_background_layer (PHP).
 */
export function beatSectionNeedsBackgroundLayer(section: BeatMapSection | null | undefined): boolean {
    const record = normalizeBeatImagePrompt(section?.image_prompt);
    return !!record && String(record.background_prompt ?? '').trim() !== '';
}

export function isBeatImageMissing(
    beatImage: Record<string, BeatImageEntry>,
    beatId: string,
    dualLayer?: { section?: BeatMapSection | null; backgroundUrl?: string },
): boolean {
    if (!String(beatImage[beatId]?.image_url || '').trim()) {
        return true;
    }
    if (dualLayer) {
        // Beat nhiều lớp ảnh: cần đủ số object layer AI được yêu cầu sinh.
        const expected = beatSectionObjectLayerCount(dualLayer.section);
        if (expected > 1) {
            const have = 1 + (beatImage[beatId]?.extra_image_urls || [])
                .filter((url) => String(url || '').trim() !== '').length;
            if (have < expected) {
                return true;
            }
        }
        if (beatSectionNeedsBackgroundLayer(dualLayer.section)) {
            return !String(dualLayer.backgroundUrl || '').trim();
        }
    }
    return false;
}

export function countMissingBeatImage(
    map: BeatMap | null,
    beatImage: Record<string, BeatImageEntry>,
    backgroundUrls?: Record<string, string>,
): number {
    return listMissingBeatImageIds(map, beatImage, backgroundUrls).length;
}

export function listMissingBeatImageIds(
    map: BeatMap | null,
    beatImage: Record<string, BeatImageEntry>,
    backgroundUrls?: Record<string, string>,
): string[] {
    if (!map?.sections?.length) {
        return [];
    }
    return map.sections
        .filter((section) => isBeatImageMissing(
            beatImage,
            section.id,
            backgroundUrls ? { section, backgroundUrl: backgroundUrls[section.id] } : undefined,
        ))
        .map((section) => section.id);
}

export function listBeatIdsWithImage(beatImage: Record<string, BeatImageEntry>): string[] {
    return Object.entries(beatImage)
        .filter(([, entry]) => String(entry?.image_url || '').trim() !== '')
        .map(([beatId]) => beatId);
}

export function countBeatIdsWithImage(beatImage: Record<string, BeatImageEntry>): number {
    return listBeatIdsWithImage(beatImage).length;
}

export function getBeatImageRenderErrorMessage(
    beatImage: Record<string, BeatImageEntry>,
    beatId: string,
): string {
    const entry = beatImage[beatId];
    if (!entry?.render_error?.trim()) {
        return 'Beat lỗi render ảnh';
    }
    const stage = entry.render_error_stage ? ` (${entry.render_error_stage})` : '';
    return `${entry.render_error.trim()}${stage}`;
}

export function listBeatImageRenderErrorIds(beatImage: Record<string, BeatImageEntry>): string[] {
    return Object.entries(beatImage)
        .filter(([, entry]) => entry?.render_status === 'error')
        .map(([beatId]) => beatId)
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function listMissingBeatIds(map: BeatMap | null, beatHtml: Record<string, BeatHtmlEntry>): string[] {
    if (!map?.sections?.length) {
        return [];
    }
    return map.sections
        .filter((section) => isBeatHtmlMissing(beatHtml, section.id))
        .map((section) => section.id);
}

export function listBeatIdsWithHtml(beatHtml: Record<string, BeatHtmlEntry>): string[] {
    return Object.entries(beatHtml)
        .filter(([, entry]) => String(entry?.html || '').trim() !== '')
        .map(([beatId]) => beatId);
}

export function countBeatIdsWithHtml(beatHtml: Record<string, BeatHtmlEntry>): number {
    return listBeatIdsWithHtml(beatHtml).length;
}
