import { ajax } from 'hook/useApi';
import { writePromptTextToClipboard } from 'helpers/marketingShortVideoAgentPrompt';

export type WorkflowPromptItem = {
    label: string;
    file: string;
    exists: boolean;
    /** Key lưu output (từ dòng updateField trong index.md) — có key thì UI hiển thị nút update. */
    updateField: string;
    /** Loại nút update asset nhanh trong dialog (từ dòng buttonUpdate trong index.md):
     * characterUpdate | spaceUpdate. */
    buttonUpdate: string;
    /** Số beat mỗi lần chạy (từ dòng scriptBreakdown trong index.md) — 0 = tắt chia đoạn.
     * Khi > 0, UI tự chia audio script thành nhiều phần và render nhiều button copy. */
    scriptBreakdown: number;
    /** Ghi chú của prompt (từ dòng note trong index.md) — hiển thị nhỏ dưới button. */
    note: string;
};

export type WorkflowPromptStep = {
    title: string;
    prompt: string;
    promptExists: boolean;
    description: string[];
    result: string;
    note: string;
    prompts: WorkflowPromptItem[];
};

/** Outputs đã lưu theo workflow: {workflow: {KEY: value}} — key/value của updateField. */
export type WorkflowOutputsMap = Record<string, Record<string, string>>;

/**
 * Key đặc biệt thay bằng audio script của post short video hiện tại khi copy prompt:
 * mọi "[audio-script]" (không phân biệt hoa thường, cho phép "[ audio-script ]")
 * trong nội dung prompt được thay — nếu script trống thì key giữ nguyên.
 */
export const WORKFLOW_AUDIO_SCRIPT_KEY = 'audio-script';

/** Workflow step import xong image prompt cho beat → workspace reload manual beat marks. */
export const MANUAL_BEAT_PROMPTS_SAVED_EVENT = 'vn4-manual-beat-prompts-saved';

export type WorkflowDefinition = {
    key: string;
    title: string;
    background: string;
    steps: WorkflowPromptStep[];
};

const WORKFLOW_PROMPTS_PATH = 'plugin/vn4-e-learning/app-mobile/marketing/workflow-prompts';
const WORKFLOW_PROMPT_CONTENT_PATH = 'plugin/vn4-e-learning/app-mobile/marketing/workflow-prompt-content';
const WORKFLOW_OUTPUTS_PATH = 'plugin/vn4-e-learning/app-mobile/marketing/workflow-outputs';
const WORKFLOW_OUTPUTS_SAVE_PATH = 'plugin/vn4-e-learning/app-mobile/marketing/workflow-outputs-save';

let workflowListCache: WorkflowDefinition[] | null = null;
let workflowListPromise: Promise<WorkflowDefinition[]> | null = null;

function parseApiMessage(message: ANY): string {
    if (typeof message === 'string') {
        return message;
    }
    if (message && typeof message === 'object' && message.content) {
        return String(message.content);
    }
    return '';
}

function normalizeStep(raw: ANY): WorkflowPromptStep | null {
    const title = String(raw?.title || '').trim();
    const prompt = String(raw?.prompt || '').trim();
    const description = Array.isArray(raw?.description)
        ? raw.description.map((d: ANY) => String(d || '').trim()).filter(Boolean)
        : [];
    const result = String(raw?.result || '').trim();
    const note = String(raw?.note || '').trim();
    const prompts = (Array.isArray(raw?.prompts) ? raw.prompts : [])
        .map((item: ANY): WorkflowPromptItem | null => {
            const label = String(item?.label || '').trim();
            const file = String(item?.file || '').trim();
            if (!label && !file) {
                return null;
            }
            return {
                label: label || file,
                file,
                exists: item?.exists !== false,
                updateField: normalizeWorkflowUpdateFieldKey(String(item?.update_field || '')),
                buttonUpdate: String(item?.button_update || '').trim(),
                scriptBreakdown: Math.max(0, parseInt(String(item?.script_breakdown ?? ''), 10) || 0),
                note: String(item?.note || '').trim(),
            };
        })
        .filter(Boolean) as WorkflowPromptItem[];

    if (!title && !prompt && description.length === 0 && !result && !note && prompts.length === 0) {
        return null;
    }

    return {
        title,
        prompt,
        promptExists: raw?.prompt_exists !== false,
        description,
        result,
        note,
        prompts,
    };
}

function normalizeWorkflow(raw: ANY): WorkflowDefinition | null {
    const key = String(raw?.key || '').trim();
    if (!key) {
        return null;
    }

    const steps = (Array.isArray(raw?.steps) ? raw.steps : [])
        .map((step: ANY) => normalizeStep(step))
        .filter(Boolean) as WorkflowPromptStep[];

    const backgroundRaw = String(raw?.background || '').trim();

    return {
        key,
        title: String(raw?.title || '').trim() || key,
        background: /^#[0-9a-fA-F]{3,8}$/.test(backgroundRaw) ? backgroundRaw : '',
        steps,
    };
}

/**
 * Danh sách workflow đọc từ backend (cache ở module — thêm workflow mới chỉ cần
 * thêm thư mục + index.md ở <backend>/prompts/workflow rồi force reload).
 */
export async function fetchWorkflowDefinitions(force = false): Promise<WorkflowDefinition[]> {
    if (!force) {
        if (workflowListCache) {
            return workflowListCache;
        }
        if (workflowListPromise) {
            return workflowListPromise;
        }
    }

    workflowListCache = null;
    workflowListPromise = null;

    const request = ajax({
        url: WORKFLOW_PROMPTS_PATH,
        method: 'POST',
        data: {},
    }).then((res: ANY) => {
        const workflows = (Array.isArray(res?.workflows) ? res.workflows : [])
            .map((workflow: ANY) => normalizeWorkflow(workflow))
            .filter(Boolean) as WorkflowDefinition[];
        workflowListCache = workflows;
        return workflows;
    }).catch(() => {
        workflowListCache = [];
        return [] as WorkflowDefinition[];
    }).finally(() => {
        workflowListPromise = null;
    });

    workflowListPromise = request;

    return request;
}

export async function fetchWorkflowPromptContent(
    workflow: string,
    file: string,
): Promise<{ ok: boolean; content: string; message?: string }> {
    if (!workflow || !file) {
        return { ok: false, content: '', message: 'Thiếu workflow hoặc file prompt' };
    }

    const res = await ajax({
        url: WORKFLOW_PROMPT_CONTENT_PATH,
        method: 'POST',
        data: { workflow, file },
    });

    if (!res?.success || typeof res.content !== 'string' || !res.content.trim()) {
        return {
            ok: false,
            content: '',
            message: parseApiMessage(res?.message) || 'Không tải được nội dung prompt',
        };
    }

    return { ok: true, content: res.content };
}

export type WorkflowPromptContext = Record<string, string>;

/**
 * Chuẩn hóa tên key updateField — chấp nhận cả "KEY" lẫn "[KEY]":
 * bỏ ngoặc vuông 2 đầu, trim. Key này vừa là key lưu DB vừa là key thay [KEY] trong prompt.
 */
export function normalizeWorkflowUpdateFieldKey(value: string): string {
    return String(value || '').trim().replace(/^\[+|\]+$/g, '').trim();
}

/**
 * Đọc workflow outputs (key/value theo updateField) đã lưu của 1 short video.
 * Trả về {} khi lỗi/thiếu id — không throw để UI vẫn dùng được drawer.
 */
export async function fetchWorkflowOutputs(shortVideoId: number): Promise<WorkflowOutputsMap> {
    if (!shortVideoId || shortVideoId <= 0) {
        return {};
    }

    try {
        const res: ANY = await ajax({
            url: WORKFLOW_OUTPUTS_PATH,
            method: 'POST',
            data: { short_video_id: shortVideoId, id: shortVideoId },
        });
        const outputs = res?.outputs;
        if (!outputs || typeof outputs !== 'object' || Array.isArray(outputs)) {
            return {};
        }
        return outputs as WorkflowOutputsMap;
    } catch {
        return {};
    }
}

/** Lưu 1 key/value output (key = updateField) của 1 workflow vào short video. */
export async function saveWorkflowOutput(
    shortVideoId: number,
    workflow: string,
    key: string,
    value: string,
): Promise<{ ok: boolean; outputs?: WorkflowOutputsMap; message?: string }> {
    if (!shortVideoId || shortVideoId <= 0) {
        return { ok: false, message: 'Thiếu short_video_id — không lưu được output' };
    }
    const normalizedKey = normalizeWorkflowUpdateFieldKey(key);
    if (!workflow || !normalizedKey) {
        return { ok: false, message: 'Thiếu workflow hoặc key — không lưu được output' };
    }

    try {
        const res: ANY = await ajax({
            url: WORKFLOW_OUTPUTS_SAVE_PATH,
            method: 'POST',
            data: {
                short_video_id: shortVideoId,
                id: shortVideoId,
                workflow,
                key: normalizedKey,
                value,
            },
        });

        if (!res?.success) {
            return { ok: false, message: parseApiMessage(res?.message) || 'Không lưu được output' };
        }

        return {
            ok: true,
            outputs: (res.outputs && typeof res.outputs === 'object' ? res.outputs : undefined) as
                | WorkflowOutputsMap
                | undefined,
        };
    } catch {
        return { ok: false, message: 'Không lưu được output' };
    }
}

const REGEX_ESCAPE_RE = /[.*+?^${}()|[\]\\]/g;

/**
 * Thay các key dạng [key] trong nội dung prompt bằng giá trị từ context.
 * VD: context { topic: '...' } thay mọi "[topic]" (không phân biệt hoa thường,
 * cho phép khoảng trắng trong ngoặc "[ topic ]") bằng title của short video.
 * Key nào chưa có giá trị trong context sẽ được giữ nguyên.
 */
export function replaceWorkflowPromptKeys(
    content: string,
    context: WorkflowPromptContext = {},
): { content: string; replaced: string[] } {
    let result = content;
    const replaced: string[] = [];

    Object.entries(context).forEach(([rawKey, rawValue]) => {
        const key = String(rawKey || '').trim();
        const value = String(rawValue ?? '');

        if (!key || !value.trim()) {
            return;
        }

        const escapedKey = key.replace(REGEX_ESCAPE_RE, '\\$&');
        const pattern = `\\[\\s*${escapedKey}\\s*\\]`;

        if (new RegExp(pattern, 'i').test(result)) {
            result = result.replace(new RegExp(pattern, 'gi'), value);
            replaced.push(`[${key}]`);
        }
    });

    return { content: result, replaced };
}

export async function copyWorkflowPromptToClipboard(
    workflow: string,
    file: string,
    context: WorkflowPromptContext = {},
): Promise<{ ok: boolean; message: string }> {
    const res = await fetchWorkflowPromptContent(workflow, file);

    if (!res.ok) {
        return { ok: false, message: res.message || 'Không tải được prompt' };
    }

    const { content, replaced } = replaceWorkflowPromptKeys(res.content, context);
    const copied = await writePromptTextToClipboard(content);

    if (!copied) {
        return { ok: false, message: 'Không copy được — hãy copy thủ công' };
    }

    const replacedNote = replaced.length > 0 ? ` (đã thay ${replaced.join(', ')})` : '';

    return { ok: true, message: `Đã copy prompt vào clipboard${replacedNote}` };
}

/**
 * ---- scriptBreakdown: chia audio script thành nhiều phần để chạy từng lần ----
 *
 * index.md có thể khai báo `scriptBreakdown: N` cho 1 prompt: mỗi lần chỉ chạy N beat
 * (beat = dòng non-empty của audio script, khớp BEAT RULE trong prompt bước 3). UI tự
 * tính số phần và render nhiều button copy; user dán kết quả từng phần rồi nối lại.
 * Với prompt cần cả [audio-script] lẫn output dạng block BEAT (vd plan-prompt), các
 * output đó cũng được cắt theo đúng dải beat của từng phần.
 */

/** Mỗi dòng non-empty của audio script = 1 beat. */
export function splitWorkflowBeats(text: string): string[] {
    return String(text || '')
        .split(/\r\n|\r|\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
}

/** Chia list thành các đoạn size phần tử. */
export function chunkWorkflowList<T>(list: T[], size: number): T[][] {
    const chunkSize = Math.max(1, Math.floor(size));
    const chunks: T[][] = [];
    for (let i = 0; i < list.length; i += chunkSize) {
        chunks.push(list.slice(i, i + chunkSize));
    }
    return chunks;
}

/** 1 block BEAT trong output (BEAT B01 / BEAT 1 / BEAT #1 / ## BEAT B01). */
const WORKFLOW_BEAT_BLOCK_RE = /^[ \t]*(?:#{1,6}[ \t]*)?[-*•]?[ \t]*BEAT[ \t]+#?B?(\d+)\b[^\n]*$/gim;

/** 1 dòng header beat (giữ tiền tố markdown nếu có): BEAT B01 / BEAT 1: / ## BEAT B01. */
const WORKFLOW_BEAT_HEADER_RE = /^([ \t]*(?:#{1,6}[ \t]*)?[-*•]?[ \t]*BEAT[ \t]*[:#]?[ \t]*B?)(\d{1,4})([ \t]*:?[ \t]*)$/gimu;

/**
 * Đánh lại số header BEAT liên tục 1..N (giữ style tiền tố + zero-padding 2 chữ số).
 * Mỗi phần chạy AI sẽ tự đánh số từ B01; nối các phần phải renumber để backend import
 * đúng vị trí beat của clip (backend chặn trùng số / lệch số).
 */
export function renumberWorkflowBeatHeaders(text: string): string {
    let counter = 0;
    return String(text || '').replace(
        WORKFLOW_BEAT_HEADER_RE,
        (_match, prefix: string, _number: string, suffix: string) => {
            counter += 1;
            return `${prefix}${String(counter).padStart(2, '0')}${suffix}`;
        },
    );
}

/**
 * Cắt text output thành các block BEAT. Phần đầu trước block đầu tiên (vd dòng tiêu đề
 * "BEAT VISUAL PLAN") được gộp vào block đầu để nối lại không mất dữ liệu.
 */
export function splitWorkflowBeatBlocks(text: string): string[] {
    const source = String(text || '');
    if (!source.trim()) {
        return [];
    }
    const matches = Array.from(source.matchAll(WORKFLOW_BEAT_BLOCK_RE));
    if (matches.length === 0) {
        return [];
    }
    return matches.map((match, index) => {
        const start = index === 0 ? 0 : (match.index ?? 0);
        const end = index + 1 < matches.length
            ? (matches[index + 1].index ?? source.length)
            : source.length;
        return source.slice(start, end).trim();
    });
}

export type WorkflowBreakdownChunk = {
    index: number;
    total: number;
    /** Beat bắt đầu (1-based) trong toàn bộ audio script. */
    beatStart: number;
    /** Beat kết thúc (1-based, inclusive). */
    beatEnd: number;
    beatCount: number;
    /** Đoạn audio script của phần này. */
    audioScript: string;
    /** Context thay key cho phần này: [audio-script] + output block BEAT đã cắt theo dải beat. */
    context: WorkflowPromptContext;
};

export type WorkflowBreakdownPlan = {
    size: number;
    totalBeats: number;
    /** Số beat của từng phần (theo thứ tự) — dùng để chia output đã lưu về từng phần. */
    beatCounts: number[];
    chunks: WorkflowBreakdownChunk[];
};

/**
 * Tính kế hoạch chia audio script theo scriptBreakdown. Trả null khi tắt chia (size <= 0)
 * hoặc audio script không có beat.
 */
export function buildWorkflowBreakdownPlan(
    audioScript: string,
    size: number,
    baseContext: WorkflowPromptContext = {},
): WorkflowBreakdownPlan | null {
    const chunkSize = Math.floor(Number(size) || 0);
    if (chunkSize <= 0) {
        return null;
    }
    const beats = splitWorkflowBeats(audioScript);
    if (beats.length === 0) {
        return null;
    }

    const beatGroups = chunkWorkflowList(beats, chunkSize);

    // Các key output chứa block BEAT (vd plan-prompt) → cắt theo dải beat tương ứng.
    const blockSources = Object.entries(baseContext)
        .filter(([key]) => key !== WORKFLOW_AUDIO_SCRIPT_KEY)
        .map(([key, value]) => ({ key, blocks: splitWorkflowBeatBlocks(value) }))
        .filter((entry) => entry.blocks.length === beats.length);

    let offset = 0;
    const chunks: WorkflowBreakdownChunk[] = beatGroups.map((group, index) => {
        const beatStart = offset + 1;
        const beatEnd = offset + group.length;
        offset = beatEnd;

        const context: WorkflowPromptContext = { ...baseContext };
        context[WORKFLOW_AUDIO_SCRIPT_KEY] = group.join('\n');
        blockSources.forEach(({ key, blocks }) => {
            context[key] = blocks.slice(beatStart - 1, beatEnd).join('\n\n');
        });

        return {
            index,
            total: beatGroups.length,
            beatStart,
            beatEnd,
            beatCount: group.length,
            audioScript: group.join('\n'),
            context,
        };
    });

    return {
        size: chunkSize,
        totalBeats: beats.length,
        beatCounts: beatGroups.map((group) => group.length),
        chunks,
    };
}

/**
 * Chia output đã lưu (dạng block BEAT) về từng phần theo số beat mỗi phần.
 * Block dư (nếu có) gộp vào phần cuối; không parse được block thì để nguyên phần đầu.
 */
export function splitWorkflowOutputIntoParts(savedValue: string, beatCounts: number[]): string[] {
    const count = beatCounts.length;
    if (count === 0) {
        return [];
    }
    const source = String(savedValue || '').trim();
    const blocks = splitWorkflowBeatBlocks(source);

    if (blocks.length === 0) {
        const parts = beatCounts.map(() => '');
        if (source) {
            parts[0] = source;
        }
        return parts;
    }

    const parts: string[] = [];
    let cursor = 0;
    beatCounts.forEach((beatCount) => {
        const take = Math.max(1, Math.floor(beatCount) || 1);
        parts.push(blocks.slice(cursor, cursor + take).join('\n\n'));
        cursor += take;
    });
    if (cursor < blocks.length) {
        parts[count - 1] = [parts[count - 1], ...blocks.slice(cursor)]
            .filter((part) => part.trim().length > 0)
            .join('\n\n');
    }
    return parts;
}

/**
 * Chuẩn hóa text để so khớp beat — mirror backend
 * `marketing_short_video_manual_beat_list_content_key` (lowercase + chỉ giữ chữ/số).
 */
export function normalizeWorkflowScriptKey(text: string): string {
    return String(text || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

/** Bỏ prefix số thứ tự/gạch đầu dòng của 1 dòng beat ("1. ", "2) ", "1:", "-", "•"). */
export function stripWorkflowBeatPrefix(line: string): string {
    return String(line || '')
        .replace(/^\s*\d{1,4}\s*[.)]\s+/, '')
        .replace(/^\s*\d{1,4}\s*:\s*/, '')
        .replace(/^\s*\d{1,4}\s+-\s+/, '')
        .replace(/^\s*[-*•]\s+/, '')
        .trim();
}

const WORKFLOW_SECTION_NAMES = [
    'SCRIPT SENTENCE',
    'CORE MEANING',
    'CHARACTER USED',
    'CHARACTER ROLE',
    'VISUAL CONCEPT',
    'IMAGE PROMPT',
    'NEGATIVE PROMPT',
];

const WORKFLOW_SECTION_RE = new RegExp(
    `^\\s*(?:#{1,6}\\s*)?[-*•]?\\s*(${WORKFLOW_SECTION_NAMES.join('|')})\\s*:\\s*(.*)$`,
    'i',
);
const WORKFLOW_UNKNOWN_LABEL_RE = /^\s*(?:#{1,6}\s*)?[-*•]?\s*([A-Z][A-Z0-9 ()/\\-]{2,60})\s*:\s*(.*)$/;
const WORKFLOW_BEAT_HEADER_LINE_RE = /^\s*(?:#{1,6}\s*)?[-*•]?\s*BEAT\s*[:#]?\s*B?(\d{1,4})\s*:?\s*$/i;

/**
 * Parse section của 1 block BEAT (SCRIPT SENTENCE / IMAGE PROMPT / NEGATIVE PROMPT…).
 * Hỗ trợ cả 2 format: giá trị cùng dòng với label, hoặc các dòng kế tiếp.
 */
export function parseWorkflowBeatSections(blockText: string): { number: number; sections: Record<string, string> } {
    const text = String(blockText || '').replace(/\r\n|\r/g, '\n');
    const sections: Record<string, string> = {};
    let number = 0;
    let current = '';

    text.split('\n').forEach((line) => {
        const headerMatch = line.match(WORKFLOW_BEAT_HEADER_LINE_RE);
        if (headerMatch && number === 0) {
            number = parseInt(headerMatch[1], 10) || 0;
            return;
        }

        const sectionMatch = line.match(WORKFLOW_SECTION_RE);
        if (sectionMatch) {
            current = sectionMatch[1].toUpperCase().replace(/\s+/g, ' ');
            if (!(current in sections)) {
                sections[current] = '';
            }
            const inlineValue = (sectionMatch[2] || '').trim();
            if (inlineValue && !sections[current].trim()) {
                sections[current] = inlineValue;
            }
            return;
        }

        const unknownMatch = line.match(WORKFLOW_UNKNOWN_LABEL_RE);
        if (unknownMatch) {
            current = unknownMatch[1].toUpperCase().replace(/\s+/g, ' ');
            if (current && !(current in sections)) {
                sections[current] = '';
            }
            const inlineValue = (unknownMatch[2] || '').trim();
            if (inlineValue && current && !(sections[current] || '').trim()) {
                sections[current] = inlineValue;
            }
            return;
        }

        if (current) {
            sections[current] = `${sections[current] ? `${sections[current]}\n` : ''}${line}`;
        }
    });

    Object.keys(sections).forEach((key) => {
        sections[key] = sections[key].trim();
    });

    return { number, sections };
}

export type WorkflowBreakdownPartValidation = {
    ok: boolean;
    /** Số khối BEAT parse được từ nội dung đã dán. */
    beatCount: number;
    /** Số beat phần này phải có. */
    expectedBeatCount: number;
    errors: string[];
    /** Trích SCRIPT SENTENCE beat đầu — hiển thị ngắn để đối chiếu nhanh. */
    preview: string;
};

/**
 * Validate 1 phần đã dán trước khi gộp vào input tổng: đủ số beat, đúng thứ tự audio
 * (chống dán nhầm phần), đủ SCRIPT SENTENCE / IMAGE PROMPT / NEGATIVE PROMPT, prompt
 * không trùng trong phần. Mirror các check quan trọng của backend import-prompt-file.
 */
export function validateWorkflowBreakdownPart(
    partText: string,
    expectedBeats: string[],
): WorkflowBreakdownPartValidation {
    const expected = expectedBeats.map((beat) => normalizeWorkflowScriptKey(stripWorkflowBeatPrefix(beat)));
    const text = String(partText || '').trim();
    const base: WorkflowBreakdownPartValidation = {
        ok: false,
        beatCount: 0,
        expectedBeatCount: expected.length,
        errors: [],
        preview: '',
    };

    if (!text) {
        return { ...base, errors: ['Chưa có nội dung — bấm "Paste" để dán kết quả từ clipboard'] };
    }

    const blocks = splitWorkflowBeatBlocks(text);
    if (blocks.length === 0) {
        return {
            ...base,
            errors: ['Không tìm thấy khối "BEAT ..." — sai format hoặc dán nhầm nội dung'],
        };
    }

    const parsed = blocks.map((block) => parseWorkflowBeatSections(block));
    const errors: string[] = [];

    if (parsed.length !== expected.length) {
        errors.push(`Số beat không khớp: phần này cần ${expected.length} beat, nhận ${parsed.length} khối BEAT`);
    }

    const promptSignatures = new Map<string, number>();
    const limit = Math.min(parsed.length, expected.length);
    for (let index = 0; index < limit; index += 1) {
        const sections = parsed[index].sections;
        const script = (sections['SCRIPT SENTENCE'] || '').trim();
        const imagePrompt = (sections['IMAGE PROMPT'] || '').trim();
        const negativePrompt = (sections['NEGATIVE PROMPT'] || '').trim();

        if (!script) {
            errors.push(`Beat ${index + 1}: thiếu SCRIPT SENTENCE`);
        } else if (normalizeWorkflowScriptKey(stripWorkflowBeatPrefix(script)) !== expected[index]) {
            errors.push(`Beat ${index + 1}: SCRIPT SENTENCE không khớp audio — có thể dán nhầm phần`);
        }
        if (!imagePrompt) {
            errors.push(`Beat ${index + 1}: thiếu IMAGE PROMPT`);
        }
        if (!negativePrompt) {
            errors.push(`Beat ${index + 1}: thiếu NEGATIVE PROMPT`);
        }
        if (imagePrompt) {
            const signature = normalizeWorkflowScriptKey(imagePrompt);
            const duplicatedWith = promptSignatures.get(signature);
            if (duplicatedWith !== undefined) {
                errors.push(`Beat ${index + 1}: IMAGE PROMPT trùng với Beat ${duplicatedWith}`);
            } else {
                promptSignatures.set(signature, index + 1);
            }
        }
    }

    const preview = (parsed[0]?.sections['SCRIPT SENTENCE'] || '').trim().slice(0, 90);

    return {
        ok: errors.length === 0,
        beatCount: parsed.length,
        expectedBeatCount: expected.length,
        errors: Array.from(new Set(errors)),
        preview,
    };
}

/** Nối các phần output thành input tổng (bỏ phần trống) và đánh lại số BEAT liên tục. */
export function joinWorkflowBreakdownParts(parts: string[]): string {
    const joined = parts
        .map((part) => String(part || '').trim())
        .filter((part) => part.length > 0)
        .join('\n\n');
    return renumberWorkflowBeatHeaders(joined);
}

const STEP_TITLE_PREFIX_RE = /^(?:bước|step)\s*(\d+)\s*[:.\-–)]?\s*/i;

/** Tách "Bước 3: ..." thành số bước + tên bước. */
export function splitWorkflowStepTitle(title: string, fallbackNumber: number): { number: number; label: string } {
    const match = title.match(STEP_TITLE_PREFIX_RE);
    if (match) {
        return {
            number: parseInt(match[1], 10),
            label: title.slice(match[0].length).trim(),
        };
    }
    return { number: fallbackNumber, label: title };
}

/** Tính độ sáng tương đối (0–1) của màu hex — chọn màu chữ trắng/đen cho tương phản. */
function getHexLuminance(hex: string): number {
    const h = hex.replace(/^#/, '');
    if (h.length !== 6 && h.length !== 3) return 0.5;
    let r = 0, g = 0, b = 0;
    if (h.length === 6) {
        r = parseInt(h.slice(0, 2), 16) / 255;
        g = parseInt(h.slice(2, 4), 16) / 255;
        b = parseInt(h.slice(4, 6), 16) / 255;
    } else {
        r = parseInt(h[0] + h[0], 16) / 255;
        g = parseInt(h[1] + h[1], 16) / 255;
        b = parseInt(h[2] + h[2], 16) / 255;
    }
    const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    r = toLinear(r); g = toLinear(g); b = toLinear(b);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getWorkflowContrastTextColor(bgHex: string): string {
    return getHexLuminance(bgHex) > 0.4 ? '#1a1a1a' : '#ffffff';
}
