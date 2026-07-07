import { useFloatingMessages } from 'hook/useFloatingMessages';
import { openAgentAudioScriptGeminiFillOnly } from 'helpers/marketingAgentAudioScriptGeminiWorkflow';
import { buildImproveAudioScriptPrompt } from './agentVideoImproveScriptPrompt';

type OpenGeminiScriptInput = {
    shortVideoId: number;
    title: string;
    audioScript: string;
    hasScript: boolean;
    appMobileTitle?: string;
};

export function useAgentVideoOpenGeminiScriptActions() {
    const { showMessage } = useFloatingMessages();

    const openCreateScriptGemini = async (input: OpenGeminiScriptInput) => {
        if (!input.shortVideoId) {
            showMessage('Thiếu short_video_id', 'error');
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
        const improvePrompt = buildImproveAudioScriptPrompt(
            input.title,
            input.audioScript,
            input.appMobileTitle,
        );
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
