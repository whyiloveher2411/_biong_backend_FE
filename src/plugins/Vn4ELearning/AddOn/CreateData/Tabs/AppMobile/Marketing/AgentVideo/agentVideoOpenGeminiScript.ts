import { useFloatingMessages } from 'hook/useFloatingMessages';
import { openAgentAudioScriptGeminiFillOnly } from 'helpers/marketingAgentAudioScriptGeminiWorkflow';
import { buildImproveAudioScriptPrompt } from './agentVideoImproveScriptPrompt';

type OpenGeminiScriptInput = {
    shortVideoId: number;
    title: string;
    audioScript: string;
    hasScript: boolean;
    appMobileTitle?: string;
    marketingPostId?: number;
    /** Nội dung nguồn đã lưu (agent_source_content / content_plain khi không có post). */
    sourceContent?: string;
};

function resolveSourceContent(input: OpenGeminiScriptInput): string {
    return String(input.sourceContent || '').trim();
}

export function useAgentVideoOpenGeminiScriptActions() {
    const { showMessage } = useFloatingMessages();

    const assertSourceReady = (input: OpenGeminiScriptInput): boolean => {
        const marketingPostId = Number(input.marketingPostId || 0);
        if (marketingPostId > 0) {
            return true;
        }
        if (resolveSourceContent(input)) {
            return true;
        }
        showMessage(
            'Chưa có nội dung nguồn — mở tab Content, nhập nội dung hoặc fetch README rồi Lưu trước khi sinh/cải thiện script',
            'warning',
        );
        return false;
    };

    const openCreateScriptGemini = async (input: OpenGeminiScriptInput) => {
        if (!input.shortVideoId) {
            showMessage('Thiếu short_video_id', 'error');
            return;
        }
        if (!assertSourceReady(input)) {
            return;
        }
        try {
            await openAgentAudioScriptGeminiFillOnly({
                shortVideoId: input.shortVideoId,
                mode: 'create',
                autoSubmit: true,
            });
            showMessage(
                'Đã mở Gemini — kiểm tra tab mới, copy script rồi bấm Lưu script vào CMS',
                'success',
            );
        } catch (error) {
            showMessage(error instanceof Error ? error.message : String(error), 'error');
        }
    };

    const openImproveScriptGemini = async (input: OpenGeminiScriptInput) => {
        if (!input.hasScript || !input.audioScript.trim()) {
            showMessage('Chưa có audio script', 'warning');
            return;
        }
        if (!assertSourceReady(input)) {
            return;
        }
        const marketingPostId = Number(input.marketingPostId || 0);
        const improvePrompt = buildImproveAudioScriptPrompt({
            title: input.title,
            audioScript: input.audioScript,
            appMobileTitle: input.appMobileTitle,
            sourceContent: resolveSourceContent(input),
            hasMarketingPost: marketingPostId > 0,
        });
        if (!improvePrompt) {
            showMessage('Chưa có audio script', 'warning');
            return;
        }
        try {
            await openAgentAudioScriptGeminiFillOnly({
                shortVideoId: input.shortVideoId,
                mode: 'improve',
                improvePrompt,
                autoSubmit: true,
            });
            showMessage(
                'Đã mở Gemini cải thiện — copy script rồi bấm Lưu script vào CMS',
                'success',
            );
        } catch (error) {
            showMessage(error instanceof Error ? error.message : String(error), 'error');
        }
    };

    return {
        openCreateScriptGemini,
        openImproveScriptGemini,
    };
}
