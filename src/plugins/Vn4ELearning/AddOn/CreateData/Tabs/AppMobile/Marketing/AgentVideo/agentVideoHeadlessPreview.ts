import type { ImportHtmlGeminiJobBlock, ImportHtmlSummary } from './agentVideoApi';

export function isActiveGeminiJobStatus(status: string | undefined): boolean {
    const normalized = String(status || '').trim().toLowerCase();
    return normalized === 'queued' || normalized === 'processing';
}

/**
 * Mirror backend `marketing_short_video_agent_headless_browser_active` —
 * dựa trên block gemini / queue job state, không map cứng pipeline step.
 */
export function resolveHeadlessBrowserActive(
    summary: ImportHtmlSummary | null | undefined,
    extras?: {
        geminiScriptStatus?: string;
        geminiScriptPhoneticStatus?: string;
        pipelineHeadlessActive?: boolean;
    },
): boolean {
    if (summary?.headless_browser_active === true) {
        return true;
    }
    if (extras?.pipelineHeadlessActive === true) {
        return true;
    }
    if (isActiveGeminiJobStatus(extras?.geminiScriptStatus)) {
        return true;
    }
    if (isActiveGeminiJobStatus(extras?.geminiScriptPhoneticStatus)) {
        return true;
    }
    if (!summary) {
        return false;
    }
    const blocks: Array<ImportHtmlGeminiJobBlock | undefined> = [
        summary.gemini_fill,
        summary.gemini_division,
        summary.gemini_refine_visual,
        summary.gemini_refine_html,
        summary.gemini_thumbnail_fill,
        summary.thumbnail?.gemini_fill,
    ];
    for (let i = 0; i < blocks.length; i += 1) {
        if (isActiveGeminiJobStatus(blocks[i]?.status)) {
            return true;
        }
    }
    return false;
}
