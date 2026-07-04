import { getAccessToken } from 'store/user/user.reducers';
import { getApiHost } from 'helpers/apiHost';
import { convertToURL } from 'helpers/url';

const GEMINI_WEB_APP_URL = 'https://gemini.google.com/u/0/app?pageId=none';

export const IMPORT_HTML_PIPELINE_FILTER_NAME =
    'Pipeline HTML chatbot (whisper + chia beat + HTML beat)';
export const IMPORT_HTML_PIPELINE_FILTER_NAME_ASC =
    'Pipeline HTML chatbot (whisper + chia beat + HTML beat, id tăng dần)';

export type ImportHtmlWorkflowAction =
    | 'import_html_whisper'
    | 'import_html_beat_division'
    | 'import_html_beat_html'
    | 'import_html_ready';

export type ImportHtmlWorkflowNextAction = {
    type: string;
    short_video_id?: number;
    beat_id?: string;
    can_run?: boolean;
    reason?: string;
    beats_html_completed?: number;
    beats_html_total?: number;
    import_html_ready?: boolean;
};

export type ImportHtmlWorkflowStatus = {
    success?: boolean;
    stage?: string;
    next_action?: ImportHtmlWorkflowNextAction;
    import_html?: Record<string, unknown>;
    render_mode?: string;
};

function apiHost(): string {
    return getApiHost();
}

function pluginApiPath(suffix: string): string {
    return convertToURL(apiHost(), `/api/admin/plugin/vn4-e-learning/app-mobile/marketing/${suffix}`);
}

export function importHtmlWorkflowStatusApiUrl(shortVideoId: number): string {
    const url = new URL(pluginApiPath('short-video/import-html-workflow/status'));
    url.searchParams.set('short_video_id', String(shortVideoId));
    const token = getAccessToken();
    if (token) {
        url.searchParams.set('access_token', token);
    }
    return url.toString();
}

export function importHtmlBeatDivisionSaveApiUrl(): string {
    return pluginApiPath('short-video/import-html-workflow/save-beat-map-from-gemini');
}

export function importHtmlBeatHtmlSaveApiUrl(): string {
    return pluginApiPath('short-video/import-html-workflow/save-beat-html-from-gemini');
}

export async function fetchImportHtmlBeatDivisionPrompt(
    shortVideoId: number,
): Promise<{ success?: boolean; prompt?: string; message?: { content?: string } | string }> {
    const token = getAccessToken() ?? '';
    const res = await fetch(pluginApiPath('short-video/import-html-workflow/get-beat-division-prompt'), {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
            short_video_id: shortVideoId,
            id: shortVideoId,
            access_token: token,
        }),
    });
    return res.json();
}

export async function fetchImportHtmlBeatHtmlPrompt(
    shortVideoId: number,
    beatId: string,
): Promise<{ success?: boolean; prompt?: string; message?: { content?: string } | string }> {
    const token = getAccessToken() ?? '';
    const res = await fetch(pluginApiPath('short-video/import-html-workflow/get-beat-html-prompt'), {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
            short_video_id: shortVideoId,
            beat_id: beatId,
            id: shortVideoId,
            access_token: token,
        }),
    });
    return res.json();
}

export function buildImportHtmlGeminiWorkflowUrl(options: {
    shortVideoId: number;
    stage: 'import_html_beat_division' | 'import_html_beat_html';
    beatId?: string;
    prompt: string;
    auto?: boolean;
}): string {
    const { shortVideoId, stage, beatId, prompt, auto } = options;
    const accessToken = getAccessToken() ?? '';
    const apiUrl = stage === 'import_html_beat_division'
        ? importHtmlBeatDivisionSaveApiUrl()
        : importHtmlBeatHtmlSaveApiUrl();

    const url = new URL(GEMINI_WEB_APP_URL);
    const hashParams = new URLSearchParams({
        copy_marketing_ai: '1',
        marketing_short_video_id: String(shortVideoId),
        marketing_stage: stage,
        access_token: accessToken,
        api_url: apiUrl,
        content_type: stage,
        fresh_session: '1',
    });

    if (beatId) {
        hashParams.set('beat_id', beatId);
    }

    if (auto) {
        hashParams.set('marketing_workflow_auto', '1');
        hashParams.set('marketing_workflow_step', stage);
    }

    const promptTrimmed = prompt.trim();
    if (promptTrimmed) {
        hashParams.set('marketing_prompt', encodeURIComponent(promptTrimmed));
    }

    url.hash = hashParams.toString();
    return url.toString();
}

export async function openImportHtmlGeminiWorkflow(options: {
    shortVideoId: number;
    action: ImportHtmlWorkflowAction;
    beatId?: string;
    auto?: boolean;
}): Promise<void> {
    const shortVideoId = Number(options.shortVideoId || 0);
    if (!shortVideoId) {
        window.alert('Thiếu short_video_id');
        return;
    }

    if (options.action === 'import_html_whisper' || options.action === 'import_html_ready') {
        window.alert('Bước này không dùng Gemini — bật Auto HTML chatbot trong extension.');
        return;
    }

    const beatId = String(options.beatId || '').trim();
    if (options.action === 'import_html_beat_html' && !beatId) {
        window.alert('Thiếu beat_id');
        return;
    }

    const res = options.action === 'import_html_beat_division'
        ? await fetchImportHtmlBeatDivisionPrompt(shortVideoId)
        : await fetchImportHtmlBeatHtmlPrompt(shortVideoId, beatId);

    if (!res?.success) {
        const msg = typeof res?.message === 'object'
            ? res.message?.content
            : typeof res?.message === 'string'
              ? res.message
              : 'Không tạo được prompt HTML chatbot';
        window.alert(msg || 'Không tạo được prompt HTML chatbot');
        return;
    }

    const prompt = String(res.prompt || '').trim();
    if (!prompt) {
        window.alert('Prompt HTML chatbot trống');
        return;
    }

    const geminiUrl = buildImportHtmlGeminiWorkflowUrl({
        shortVideoId,
        stage: options.action,
        beatId: beatId || undefined,
        prompt,
        auto: options.auto,
    });

    window.open(geminiUrl, '_blank', 'noopener,noreferrer');
}
