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
