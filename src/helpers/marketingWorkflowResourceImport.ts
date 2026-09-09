/**
 * Parse output "asset register" của workflow step (video-image) thành danh sách resource
 * để import nhanh vào quản lý resource của short video.
 *
 * Template:
 * - CHARACTER ASSET REGISTER (resource_character_temp.md):
 *     CHARACTER ID → resource_key, CHARACTER NAME → title,
 *     REFERENCE IMAGE PROMPT → prompt, REFERENCE IMAGE PURPOSE → description
 * - SPACE ASSET REGISTER (resouce_space.md):
 *     SPACE ID → resource_key, SPACE NAME → title,
 *     REFERENCE IMAGE PROMPT → prompt, REFERENCE IMAGE PURPOSE → description
 *
 * Chỉ lấy các field có hỗ trợ trong post type resource
 * (resource_key, title, prompt, description) — image chưa có thì để trống.
 */

export type WorkflowResourceKind = 'character' | 'space';

export type ParsedWorkflowResource = {
    resource_key: string;
    title: string;
    prompt: string;
    description: string;
};

type RegisterKindConfig = {
    /** Dòng mở đầu 1 asset block trong register. */
    marker: RegExp;
    keyLabel: RegExp;
    titleLabel: RegExp;
    promptLabel: RegExp;
    descriptionLabel: RegExp;
};

const REGISTER_KIND_CONFIG: Record<WorkflowResourceKind, RegisterKindConfig> = {
    character: {
        marker: /^CHARACTER\s+ASSET\s*$/i,
        keyLabel: /^CHARACTER\s+ID$/i,
        titleLabel: /^CHARACTER\s+NAME$/i,
        promptLabel: /^REFERENCE\s+IMAGE\s+PROMPT$/i,
        descriptionLabel: /^REFERENCE\s+IMAGE\s+PURPOSE$/i,
    },
    space: {
        marker: /^SPACE\s+ASSET\s*$/i,
        keyLabel: /^SPACE\s+ID$/i,
        titleLabel: /^SPACE\s+NAME$/i,
        promptLabel: /^REFERENCE\s+IMAGE\s+PROMPT$/i,
        descriptionLabel: /^REFERENCE\s+IMAGE\s+PURPOSE$/i,
    },
};

/** Dòng field "- LABEL: value" của 1 asset block. */
const FIELD_LINE_RE = /^[-*]\s*([A-Za-z0-9 _()/-]+?)\s*:\s*(.*)$/;

function stripHtmlComments(content: string): string {
    return content.replace(/<!--[\s\S]*?-->/g, '');
}

function parseRegisterBlock(
    blockLines: string[],
    config: RegisterKindConfig,
): ParsedWorkflowResource | null {
    const fields = new Map<string, string>();
    let lastLabel = '';

    blockLines.forEach((rawLine) => {
        const line = rawLine.trim();
        if (!line) {
            return;
        }

        const fieldMatch = line.match(FIELD_LINE_RE);
        if (fieldMatch) {
            const label = fieldMatch[1].trim();
            const value = fieldMatch[2].trim();
            fields.set(label, value);
            lastLabel = label;
            return;
        }

        // Dòng continuation của field trước (value dài xuống dòng) → nối vào field cuối.
        if (lastLabel) {
            const prev = fields.get(lastLabel) || '';
            fields.set(lastLabel, prev ? `${prev}\n${line}` : line);
        }
    });

    let resourceKey = '';
    let title = '';
    let prompt = '';
    let description = '';

    fields.forEach((value, label) => {
        if (config.keyLabel.test(label)) {
            resourceKey = value.replace(/\s+/g, ' ').trim();
        } else if (config.titleLabel.test(label)) {
            title = value.replace(/\s+/g, ' ').trim();
        } else if (config.promptLabel.test(label)) {
            prompt = value.trim();
        } else if (config.descriptionLabel.test(label)) {
            description = value.trim();
        }
    });

    if (!resourceKey) {
        return null;
    }

    return {
        resource_key: resourceKey,
        title: title || resourceKey,
        prompt,
        description,
    };
}

/**
 * Parse nội dung register theo loại. Bỏ qua block thiếu ID.
 */
export function parseWorkflowAssetRegister(
    kind: WorkflowResourceKind,
    content: string,
): ParsedWorkflowResource[] {
    const config = REGISTER_KIND_CONFIG[kind];
    if (!config) {
        return [];
    }

    const text = stripHtmlComments(String(content || ''));
    if (!text.trim()) {
        return [];
    }

    const lines = text.split(/\r\n|\r|\n/);
    const blocks: string[][] = [];
    let current: string[] | null = null;

    for (const line of lines) {
        if (config.marker.test(line.trim())) {
            if (current && current.length > 0) {
                blocks.push(current);
            }
            current = [];
            continue;
        }
        if (current) {
            current.push(line);
        }
    }
    if (current && current.length > 0) {
        blocks.push(current);
    }

    const resources: ParsedWorkflowResource[] = [];
    const seenKeys = new Set<string>();

    blocks.forEach((blockLines) => {
        const parsed = parseRegisterBlock(blockLines, config);
        if (!parsed || !parsed.resource_key) {
            return;
        }
        const normalizedKey = parsed.resource_key.toLowerCase();
        if (seenKeys.has(normalizedKey)) {
            return;
        }
        seenKeys.add(normalizedKey);
        resources.push(parsed);
    });

    return resources;
}

/** Nhận loại buttonUpdate từ index.md → kind parser (unknown → null). */
export function resolveWorkflowResourceKind(buttonUpdate: string): WorkflowResourceKind | null {
    const value = String(buttonUpdate || '').trim().toLowerCase();
    if (value === 'characterupdate' || value === 'character_update') {
        return 'character';
    }
    if (value === 'spaceupdate' || value === 'space_update') {
        return 'space';
    }
    return null;
}
