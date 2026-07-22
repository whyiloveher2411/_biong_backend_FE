import { formatDurationSec } from './agentVideoHfPromptDuration';

export type BeatMapSection = {
    id: string;
    beat_id: string;
    startSec: number;
    endSec: number;
    durationSec: number;
    phrase_anchor: string;
    visual_description: string;
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

export type BeatQaActionStatus = 'approved' | 'needs_html_refill' | 'needs_visual_tweak';

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

export type BeatHtmlVisualState = 'missing' | 'ok' | 'error';

export const BEAT_QA_STATUSES: BeatQaActionStatus[] = [
    'approved',
    'needs_html_refill',
    'needs_visual_tweak',
];

export const BEAT_QA_STATUS_LABELS: Record<BeatQaActionStatus, string> = {
    approved: 'Ổn',
    needs_html_refill: 'Chưa ổn HTML',
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
): Record<'approved' | 'needs_html_refill' | 'needs_visual_tweak' | 'unreviewed', number> {
    const counts = {
        approved: 0,
        needs_html_refill: 0,
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

function stripJsonFences(text: string): string {
    const trimmed = String(text || '').trim();
    const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    return fenced ? fenced[1].trim() : trimmed;
}

function asNumber(value: unknown): number | null {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
}

export function validateBeatVisualDescription(value: unknown): string | null {
    const description = String(value ?? '').trim();
    const wordCount = description.split(/\s+/).filter(Boolean).length;
    if (!description || wordCount < 5 || wordCount > 150 || description.length > 1200) {
        return null;
    }
    // Visual descriptions are an English machine contract. Catalog IDs may contain "-" and "_".
    if (!/[A-Za-z]/.test(description) || /[À-ỹ]/.test(description)) {
        return null;
    }
    return description;
}

export function validateBeatBackground(value: unknown): string | null {
    const background = String(value ?? '').trim();
    const wordCount = background.split(/\s+/).filter(Boolean).length;
    if (!background || wordCount < 3 || wordCount > 60 || background.length > 400) {
        return null;
    }
    if (!/[A-Za-z]/.test(background) || /[À-ỹ]/.test(background)) {
        return null;
    }
    return background;
}

export function parseBeatMapJson(text: string): { map: BeatMap | null; errors: string[] } {
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
        if (!visualDescription) {
            errors.push(`${id || `Section #${index + 1}`}: visual_description phải là tiếng Anh, dài 5–150 từ`);
        }
        if (!background) {
            errors.push(`${id || `Section #${index + 1}`}: background phải là tiếng Anh, dài 3–60 từ`);
        }

        sections.push({
            id,
            beat_id: id,
            startSec: startSec ?? 0,
            endSec: endSec ?? 0,
            durationSec: durationSec ?? 0,
            phrase_anchor: phraseAnchor,
            visual_description: visualDescription ?? '',
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
    options?: { relaxDurationBounds?: boolean },
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
        if (!validateBeatVisualDescription(section.visual_description)) {
            errors.push(`${label}: visual_description phải là tiếng Anh, dài 5–150 từ`);
        }
        if (!validateBeatBackground(section.background)) {
            errors.push(`${label}: background phải là tiếng Anh, dài 3–60 từ`);
        }
        // 5–20s: chỉ khuyến nghị trong prompt chia beat — code không tách/gộp beat-map.
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
