import { getAccessToken } from 'store/user/user.reducers';
import { getApiHost } from 'helpers/apiHost';
import { convertToURL } from 'helpers/url';
import { waitForExtensionReady, openExternalTabViaExtension } from 'helpers/openExternalTabViaExtension';
import { dispatchCmsExtensionEvent } from 'helpers/cmsExtensionEventBridge';

const GEMINI_WEB_APP_URL = 'https://gemini.google.com/u/0/app?pageId=none';
const OPEN_AGENT_GITHUB_IMAGE_SHOTS_GEMINI_EVENT = 'vn4-open-agent-github-image-shots-gemini';
const OPEN_AGENT_GITHUB_IMAGE_SHOTS_GEMINI_RESULT_EVENT = 'vn4-open-agent-github-image-shots-gemini-result';
const MAX_PROMPT_CHARS = 12000;
const MAX_SCRIPT_CHARS = 2800;
const MAX_README_CHARS = 4500;

function pluginApiPath(suffix: string): string {
    return convertToURL(getApiHost(), `/api/admin/plugin/vn4-e-learning/app-mobile/marketing/${suffix}`);
}

export function agentGithubImageShotsSaveFromGeminiApiUrl(): string {
    return pluginApiPath('short-video/save-agent-github-image-shots-from-gemini');
}

function trimText(value: unknown, maxChars: number): string {
    const text = String(value || '').trim();
    if (text.length <= maxChars) {
        return text;
    }
    return `${text.slice(0, maxChars)}...`;
}

export function buildAgentGithubImageShotsPrompt(options: {
    shortVideoId: number;
    title?: string;
    appMobileTitle?: string;
    githubRepo?: string;
    audioScript?: string;
    sourceContent?: string;
}): string {
    const prompt = [
        'Bạn là trợ lý chuẩn bị hình ảnh chụp thật cho short video review GitHub / sản phẩm.',
        'Mục tiêu: đề xuất danh sách mô tả ảnh cần chụp (hoặc chụp màn hình) để user tự chuẩn bị trước khi render video.',
        'Yêu cầu:',
        '- Trả về đúng 6-10 mô tả ảnh.',
        '- Mỗi mô tả bằng tiếng Việt, cụ thể, ngắn gọn (1–2 câu), đủ để user biết cần chụp gì.',
        '- Ưu tiên: UI sản phẩm, màn hình chính, tính năng nổi bật, so sánh trước/sau, kết quả demo, logo/brand nếu phù hợp script.',
        '- Không trùng ý; không đề xuất ảnh stock chung chung.',
        '- Không trả markdown, không giải thích thêm.',
        '- Chỉ trả JSON theo đúng format:',
        '{"github_image_shots":["mô tả 1","mô tả 2"]}',
        '',
        `short_video_id: ${options.shortVideoId}`,
        `title: ${String(options.title || '').trim()}`,
        `app_mobile_title: ${String(options.appMobileTitle || '').trim()}`,
        `github_repo: ${String(options.githubRepo || '').trim()}`,
        '',
        'audio_script:',
        trimText(options.audioScript, MAX_SCRIPT_CHARS),
        '',
        'github_readme_or_source:',
        trimText(options.sourceContent, MAX_README_CHARS),
    ].join('\n');
    return trimText(prompt, MAX_PROMPT_CHARS);
}

export async function openAgentGithubImageShotsGemini(options: {
    shortVideoId: number;
    prompt: string;
    autoSubmit?: boolean;
}): Promise<void> {
    const accessToken = getAccessToken() ?? '';
    const saveApiUrl = agentGithubImageShotsSaveFromGeminiApiUrl();
    const extensionReady = await waitForExtensionReady(8000);
    if (extensionReady) {
        const result = await dispatchCmsExtensionEvent(
            OPEN_AGENT_GITHUB_IMAGE_SHOTS_GEMINI_EVENT,
            {
                short_video_id: options.shortVideoId,
                stage: 'agent_github_image_shots',
                save_api_url: saveApiUrl,
                access_token: accessToken,
                marketing_prompt: trimText(options.prompt, MAX_PROMPT_CHARS),
                auto_submit: options.autoSubmit !== false,
            },
            OPEN_AGENT_GITHUB_IMAGE_SHOTS_GEMINI_RESULT_EVENT,
            10000,
        );
        if (!result.ok) {
            throw new Error(result.error || 'Không mở được tab Gemini gợi ý image GitHub');
        }
        return;
    }

    const url = new URL(GEMINI_WEB_APP_URL);
    const hashParams = new URLSearchParams({
        copy_marketing_ai: '1',
        marketing_ai_provider: 'gemini',
        marketing_short_video_id: String(options.shortVideoId),
        marketing_stage: 'agent_github_image_shots',
        access_token: accessToken,
        api_url: saveApiUrl,
        content_type: 'agent_github_image_shots',
        fresh_session: '1',
        marketing_fill_only: '1',
        marketing_open_nonce: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    });

    if (options.autoSubmit !== false) {
        hashParams.set('marketing_auto_submit', '1');
    }

    const prompt = trimText(options.prompt, MAX_PROMPT_CHARS);
    if (prompt) {
        hashParams.set('marketing_prompt', encodeURIComponent(prompt));
    }

    url.hash = hashParams.toString();
    openExternalTabViaExtension(url.toString());
}
