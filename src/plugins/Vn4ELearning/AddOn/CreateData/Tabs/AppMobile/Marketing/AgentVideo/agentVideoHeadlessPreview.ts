import type { ImportHtmlGeminiJobBlock, ImportHtmlSummary } from './agentVideoApi';

export function isActiveGeminiJobStatus(status: string | undefined): boolean {
    const normalized = String(status || '').trim().toLowerCase();
    return normalized === 'queued' || normalized === 'processing';
}

/**
 * Mirror backend `marketing_short_video_agent_headless_browser_active`.
 * Ưu tiên flag server (đã phân biệt API-first vs Puppeteer thật).
 * Fallback FE chỉ cho bước chắc chắn mở browser (script / division).
 */
export function resolveHeadlessBrowserActive(
    summary: ImportHtmlSummary | null | undefined,
    extras?: {
        geminiScriptStatus?: string;
        geminiScriptPhoneticStatus?: string;
        geminiImageFillStatus?: string;
        pipelineHeadlessActive?: boolean;
    },
): boolean {
    if (summary?.headless_browser_active === true) {
        return true;
    }
    if (extras?.pipelineHeadlessActive === true) {
        return true;
    }
    // Script create/improve vẫn qua Gemini Web — phonetic có thể API-only.
    if (isActiveGeminiJobStatus(extras?.geminiScriptStatus)) {
        return true;
    }
    if (isActiveGeminiJobStatus(extras?.geminiImageFillStatus)) {
        return true;
    }
    void extras?.geminiScriptPhoneticStatus;
    if (!summary) {
        return false;
    }
    const browserRequiredBlocks: Array<ImportHtmlGeminiJobBlock | undefined> = [
        summary.gemini_division,
        summary.gemini_image_fill,
    ];
    for (let i = 0; i < browserRequiredBlocks.length; i += 1) {
        if (isActiveGeminiJobStatus(browserRequiredBlocks[i]?.status)) {
            return true;
        }
    }
    return false;
}
