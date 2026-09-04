import { ajax } from 'hook/useApi';
import { writePromptTextToClipboard } from 'helpers/marketingShortVideoAgentPrompt';

export type WorkflowPromptStep = {
    title: string;
    prompt: string;
    description: string[];
    result: string;
    note: string;
};

export type WorkflowDefinition = {
    key: string;
    title: string;
    background: string;
    steps: WorkflowPromptStep[];
};

const WORKFLOW_PROMPTS_PATH = 'plugin/vn4-e-learning/app-mobile/marketing/workflow-prompts';
const WORKFLOW_PROMPT_CONTENT_PATH = 'plugin/vn4-e-learning/app-mobile/marketing/workflow-prompt-content';

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

    if (!title && !prompt && description.length === 0 && !result && !note) {
        return null;
    }

    return { title, prompt, description, result, note };
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

export async function copyWorkflowPromptToClipboard(
    workflow: string,
    file: string,
): Promise<{ ok: boolean; message: string }> {
    const res = await fetchWorkflowPromptContent(workflow, file);

    if (!res.ok) {
        return { ok: false, message: res.message || 'Không tải được prompt' };
    }

    const copied = await writePromptTextToClipboard(res.content);

    if (!copied) {
        return { ok: false, message: 'Không copy được — hãy copy thủ công' };
    }

    return { ok: true, message: 'Đã copy prompt vào clipboard' };
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
