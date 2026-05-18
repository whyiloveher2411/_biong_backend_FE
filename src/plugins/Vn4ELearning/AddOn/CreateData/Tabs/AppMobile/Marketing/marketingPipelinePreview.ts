type PipelinePreview = {
    editorial_working_content?: string;
    image_placements?: ImagePlacement[];
    drafts?: {
        editor_with_slots?: string;
        editor?: string;
        writer?: string;
    };
};

export type ImagePlacement = {
    id?: string;
    url?: string;
    alt_text?: string;
    alt?: string;
    role?: string;
};

/** Markdown preview từ pipeline (trước khi finalize sang blocks). */
export function marketingPipelinePreviewMarkdown(
    pipeline: PipelinePreview,
    post?: Record<string, unknown>,
): string {
    const fromPipeline = buildMarketingPreviewMarkdown(pipeline);
    if (fromPipeline.trim()) {
        return fromPipeline;
    }
    const ct = post?.content_text;
    if (typeof ct === 'string' && ct.trim() && !ct.trim().startsWith('[')) {
        return ct;
    }

    return '';
}

/** Markdown đã gắn URL ảnh (giống `marketing_ai_build_long_form_body` trên backend). */
export function buildMarketingPreviewMarkdown(pipeline: PipelinePreview): string {
    const placements = Array.isArray(pipeline.image_placements) ? pipeline.image_placements : [];
    const drafts = pipeline.drafts ?? {};
    const withSlots = String(drafts.editor_with_slots ?? '').trim();
    const editor = String(drafts.editor ?? '').trim();
    const working = String(pipeline.editorial_working_content ?? '').trim();

    if (working) {
        return applyImageUrlsToMarkdown(working, placements);
    }
    if (withSlots && placements.length > 0) {
        return applyImageUrlsToMarkdown(withSlots, placements);
    }
    if (withSlots) {
        return withSlots;
    }
    if (editor && placements.length > 0) {
        return applyImageUrlsToMarkdown(editor, placements);
    }
    if (editor) {
        return editor;
    }

    return '';
}

function applyImageUrlsToMarkdown(markdown: string, placements: ImagePlacement[]): string {
    if (!markdown || placements.length === 0) {
        return markdown;
    }
    const byId: Record<string, ImagePlacement> = {};
    placements.forEach((p) => {
        const id = String(p.id ?? '').trim();
        if (id) {
            byId[id] = p;
        }
    });

    return markdown.replace(/\{\{IMG:([a-zA-Z0-9_-]+)\}\}/g, (full, id) => {
        const p = byId[id];
        if (!p) {
            return full;
        }
        const alt = String(p.alt_text ?? p.alt ?? 'Ảnh minh họa').trim() || 'Ảnh minh họa';
        const url = String(p.url ?? '').trim();
        if (url && url !== '#' && !url.toLowerCase().includes('chưa có url')) {
            return `![${escapeMdAlt(alt)}](${url})`;
        }
        return `{{IMG:${id}}}`;
    });
}

function escapeMdAlt(alt: string): string {
    return alt.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
}

export type MarketingContentBlock = {
    _template: 'text' | 'image' | 'ad';
    format?: 'markdown' | 'html';
    data?: string;
    url?: string;
    caption?: string;
    ad_format?: string;
};

/** Blocks xem trước: text + image, bỏ qua quảng cáo. */
export function buildMarketingPreviewBlocks(
    pipeline: PipelinePreview,
    post?: Record<string, unknown>,
): MarketingContentBlock[] {
    const fromPost = parseMarketingBlocksFromPost(post);
    if (fromPost.length > 0) {
        return fromPost.filter((b) => b._template !== 'ad');
    }

    const md = buildMarketingPreviewMarkdown(pipeline);
    if (!md.trim()) {
        return [];
    }

    const placements = Array.isArray(pipeline.image_placements) ? pipeline.image_placements : [];
    return splitMarkdownToPreviewBlocks(md, placements).filter((b) => b._template !== 'ad');
}

export function parseMarketingBlocksFromPost(post?: Record<string, unknown>): MarketingContentBlock[] {
    if (!post) {
        return [];
    }
    const raw = post.content_text;
    let blocks: unknown[] | null = null;
    if (Array.isArray(raw)) {
        blocks = raw;
    } else if (typeof raw === 'string' && raw.trim().startsWith('[')) {
        try {
            const parsed = JSON.parse(raw) as unknown;
            blocks = Array.isArray(parsed) ? parsed : null;
        } catch {
            blocks = null;
        }
    }
    if (!blocks) {
        return [];
    }

    const out: MarketingContentBlock[] = [];
    blocks.forEach((item) => {
        if (!item || typeof item !== 'object') {
            return;
        }
        const b = item as Record<string, unknown>;
        const tpl = String(b._template ?? b.type ?? '').toLowerCase();
        if (tpl === 'text') {
            const data = String(b.data ?? '').trim();
            if (data) {
                out.push({
                    _template: 'text',
                    format: (b.format === 'html' ? 'html' : 'markdown') as 'markdown' | 'html',
                    data,
                });
            }
        } else if (tpl === 'image') {
            const url = String(b.url ?? '').trim();
            out.push({
                _template: 'image',
                url,
                caption: String(b.caption ?? '').trim(),
            });
        }
    });

    return out;
}

function splitMarkdownToPreviewBlocks(
    markdown: string,
    placements: ImagePlacement[],
): MarketingContentBlock[] {
    const byId: Record<string, ImagePlacement> = {};
    placements.forEach((p) => {
        const id = String(p.id ?? '').trim();
        if (id) {
            byId[id] = p;
        }
    });

    const pattern = /(\{\{IMG:([a-zA-Z0-9_-]+)\}\}|!\[([^\]]*)\]\(([^)]+)\))/gu;
    const blocks: MarketingContentBlock[] = [];
    let offset = 0;
    let match: RegExpExecArray | null;

    const pushText = (chunk: string) => {
        const data = chunk.trim();
        if (!data) {
            return;
        }
        const last = blocks[blocks.length - 1];
        if (last?._template === 'text' && last.format === 'markdown') {
            last.data = `${last.data}\n\n${data}`;
        } else {
            blocks.push({ _template: 'text', format: 'markdown', data });
        }
    };

    const pushImage = (url: string, caption: string, placementId?: string) => {
        const trimmedUrl = url.trim();
        const isPlaceholder = !trimmedUrl
            || trimmedUrl === '#'
            || trimmedUrl.toLowerCase().includes('chưa có url');
        if (isPlaceholder && placementId && byId[placementId]) {
            const p = byId[placementId];
            blocks.push({
                _template: 'image',
                url: '',
                caption: caption || String(p.alt_text ?? p.alt ?? 'Ảnh minh họa'),
            });
            return;
        }
        if (isPlaceholder) {
            return;
        }
        blocks.push({
            _template: 'image',
            url: trimmedUrl,
            caption: caption || 'Ảnh minh họa',
        });
    };

    while ((match = pattern.exec(markdown)) !== null) {
        const start = match.index;
        if (start > offset) {
            pushText(markdown.slice(offset, start));
        }

        if (match[2]) {
            const id = match[2];
            const p = byId[id];
            const alt = String(p?.alt_text ?? p?.alt ?? 'Ảnh minh họa').trim() || 'Ảnh minh họa';
            const url = String(p?.url ?? '').trim();
            pushImage(url, alt, id);
        } else {
            const alt = String(match[3] ?? '').trim();
            const url = String(match[4] ?? '').trim();
            pushImage(url, alt || 'Ảnh minh họa');
        }

        offset = start + match[0].length;
    }

    if (offset < markdown.length) {
        pushText(markdown.slice(offset));
    }

    if (blocks.length === 0 && markdown.trim()) {
        blocks.push({ _template: 'text', format: 'markdown', data: markdown.trim() });
    }

    return blocks;
}

export function countMarketingContentBlocks(raw: unknown): number {
    if (Array.isArray(raw)) {
        return raw.length;
    }
    if (typeof raw === 'string' && raw.trim().startsWith('[')) {
        try {
            const parsed = JSON.parse(raw) as unknown[];
            return Array.isArray(parsed) ? parsed.length : 0;
        } catch {
            return 0;
        }
    }

    return 0;
}
