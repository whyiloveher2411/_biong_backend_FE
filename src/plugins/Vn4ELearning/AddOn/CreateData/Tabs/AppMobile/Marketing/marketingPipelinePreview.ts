type PipelinePreview = {
    editorial_working_content?: string;
    drafts?: {
        editor_with_slots?: string;
        editor?: string;
        writer?: string;
    };
};

/** Markdown preview từ pipeline (trước khi finalize sang blocks). */
export function marketingPipelinePreviewMarkdown(
    pipeline: PipelinePreview,
    post?: Record<string, unknown>,
): string {
    const fromPipeline = String(
        pipeline.editorial_working_content
        || pipeline.drafts?.editor_with_slots
        || pipeline.drafts?.editor
        || pipeline.drafts?.writer
        || '',
    );
    if (fromPipeline.trim()) {
        return fromPipeline;
    }
    const ct = post?.content_text;
    if (typeof ct === 'string' && ct.trim() && !ct.trim().startsWith('[')) {
        return ct;
    }

    return '';
}

export type MarketingContentBlock = {
    _template: 'text' | 'image' | 'ad';
    format?: 'markdown' | 'html';
    data?: string;
    url?: string;
    caption?: string;
    ad_format?: string;
};

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
