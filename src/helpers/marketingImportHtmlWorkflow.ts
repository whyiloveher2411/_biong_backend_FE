import { getAccessToken } from 'store/user/user.reducers';
import { getApiHost } from 'helpers/apiHost';
import { convertToURL } from 'helpers/url';
import { waitForExtensionReady } from 'helpers/openExternalTabViaExtension';
import { dispatchCmsExtensionEvent } from 'helpers/cmsExtensionEventBridge';

const GEMINI_WEB_APP_URL = 'https://gemini.google.com/u/0/app?pageId=none';

const OPEN_IMPORT_HTML_GEMINI_EVENT = 'vn4-open-import-html-beat-gemini';
const OPEN_IMPORT_HTML_GEMINI_RESULT_EVENT = 'vn4-open-import-html-beat-gemini-result';

/** Extension dispatch sau khi lưu beat HTML từ Gemini — drawer Agent Video lắng nghe để reload. */
export const IMPORT_HTML_BEAT_HTML_SAVED_EVENT = 'vn4-import-html-beat-html-saved';

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

/** Full API: Puppeteer Gemini Web → extract HTML → save CMS (headed lúc debug). */
export async function generateBeatHtmlViaGeminiWeb(
    shortVideoId: number,
    beatId: string,
    options?: {
        mode?: 'create' | 'refine';
        userPrompt?: string;
        existingHtml?: string;
        persistHtml?: boolean;
        persistPrompt?: boolean;
    },
): Promise<{
    success?: boolean;
    beat_id?: string;
    html?: string;
    mode?: string;
    persisted_html?: boolean;
    message?: { content?: string } | string;
    attempts?: number;
    raw_preview?: string;
}> {
    const token = getAccessToken() ?? '';
    try {
        const res = await fetch(
            pluginApiPath('short-video/import-html-workflow/generate-beat-html-via-gemini-web'),
            {
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
                    mode: options?.mode || 'create',
                    user_prompt: options?.userPrompt || '',
                    existing_html: options?.existingHtml || '',
                    // 0/1 — tránh framework bỏ qua boolean false trong has()
                    persist_html: options?.persistHtml === false ? 0 : 1,
                    persist_prompt: options?.persistPrompt === false
                        ? 0
                        : (options?.persistPrompt === true || options?.mode === 'refine' ? 1 : undefined),
                }),
            },
        );
        const data = await res.json().catch(() => null);
        if (!res.ok) {
            return {
                success: false,
                message:
                    (data && (data.message || data.error)) ||
                    `HTTP ${res.status}: Gemini Headless thất bại`,
            };
        }
        return data ?? { success: false, message: 'Phản hồi rỗng từ server' };
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/socket hang up|Failed to fetch|NetworkError|aborted|ECONNRESET/i.test(msg)) {
            return {
                success: false,
                message:
                    'Mất kết nối tới server khi chạy Gemini Headless (timeout/socket hang up). Thử lại — tránh chạy Crawl song song.',
            };
        }
        return { success: false, message: msg };
    }
}

function resolveImportHtmlGeminiStage(
    action: ImportHtmlWorkflowAction,
): 'import_html_beat_division' | 'import_html_beat_html' | null {
    if (action === 'import_html_beat_division') {
        return 'import_html_beat_division';
    }
    if (action === 'import_html_beat_html') {
        return 'import_html_beat_html';
    }
    return null;
}

function resolveImportHtmlSaveApiUrl(
    stage: 'import_html_beat_division' | 'import_html_beat_html',
): string {
    return stage === 'import_html_beat_division'
        ? importHtmlBeatDivisionSaveApiUrl()
        : importHtmlBeatHtmlSaveApiUrl();
}

function dispatchOpenImportHtmlGeminiEvent(detail: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
    return dispatchCmsExtensionEvent(
        OPEN_IMPORT_HTML_GEMINI_EVENT,
        detail,
        OPEN_IMPORT_HTML_GEMINI_RESULT_EVENT,
        12000,
    );
}

const BULK_OPEN_IMPORT_HTML_GEMINI_DELAY_MS = 500;

function sleepMs(ms: number): Promise<void> {
    return new Promise((resolve) => {
        window.setTimeout(resolve, ms);
    });
}

export async function openImportHtmlBeatGeminiFillOnly(options: {
    shortVideoId: number;
    beatId?: string;
    stage?: 'import_html_beat_division' | 'import_html_beat_html';
    autoSubmit?: boolean;
}): Promise<void> {
    const shortVideoId = Number(options.shortVideoId || 0);
    if (!shortVideoId) {
        throw new Error('Thiếu short_video_id');
    }

    const beatId = String(options.beatId || '').trim();
    const stage = options.stage
        ?? (beatId ? 'import_html_beat_html' : 'import_html_beat_division');

    if (stage === 'import_html_beat_html' && !beatId) {
        throw new Error('Thiếu beat_id');
    }

    const extensionReady = await waitForExtensionReady(8000);
    if (!extensionReady) {
        throw new Error(
            'Cần Chrome extension VN4 trên tab CMS này. Reload extension (chrome://extensions) rồi F5 trang CMS.',
        );
    }

    const saveApiUrl = resolveImportHtmlSaveApiUrl(stage);
    const accessToken = getAccessToken() ?? '';
    const result = await dispatchOpenImportHtmlGeminiEvent({
        short_video_id: shortVideoId,
        beat_id: beatId,
        stage,
        save_api_url: saveApiUrl,
        access_token: accessToken,
        ...(options.autoSubmit ? { auto_submit: true } : {}),
    });

    if (!result.ok) {
        throw new Error(result.error || 'Không mở được tab Gemini');
    }
}

export async function openImportHtmlBeatGeminiForMissingBeats(options: {
    shortVideoId: number;
    beatIds: string[];
    autoSubmit?: boolean;
}): Promise<{ opened: number; failed: string[] }> {
    const shortVideoId = Number(options.shortVideoId || 0);
    const beatIds = (options.beatIds || []).map((id) => String(id).trim()).filter(Boolean);
    if (!shortVideoId) {
        throw new Error('Thiếu short_video_id');
    }
    if (!beatIds.length) {
        return { opened: 0, failed: [] };
    }

    const failed: string[] = [];
    let opened = 0;

    for (let i = 0; i < beatIds.length; i += 1) {
        if (i > 0) {
            await sleepMs(BULK_OPEN_IMPORT_HTML_GEMINI_DELAY_MS);
        }
        const beatId = beatIds[i];
        try {
            await openImportHtmlBeatGeminiFillOnly({
                shortVideoId,
                beatId,
                stage: 'import_html_beat_html',
                autoSubmit: options.autoSubmit,
            });
            opened += 1;
        } catch {
            failed.push(beatId);
        }
    }

    if (opened === 0 && failed.length > 0) {
        throw new Error(`Không mở được tab Gemini cho beat: ${failed.join(', ')}`);
    }

    return { opened, failed };
}

/** @deprecated Chỉ giữ metadata URL — prompt không gắn hash. Dùng openImportHtmlBeatGeminiFillOnly. */
export function buildImportHtmlGeminiWorkflowUrl(options: {
    shortVideoId: number;
    stage: 'import_html_beat_division' | 'import_html_beat_html';
    beatId?: string;
    auto?: boolean;
}): string {
    const { shortVideoId, stage, beatId, auto } = options;
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
        marketing_fill_only: '1',
    });

    if (beatId) {
        hashParams.set('beat_id', beatId);
    }

    if (auto) {
        hashParams.set('marketing_workflow_auto', '1');
        hashParams.set('marketing_workflow_step', stage);
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

    const stage = resolveImportHtmlGeminiStage(options.action);
    if (!stage) {
        window.alert('Hành động HTML chatbot không hợp lệ');
        return;
    }

    const beatId = String(options.beatId || '').trim();
    if (stage === 'import_html_beat_html' && !beatId) {
        window.alert('Thiếu beat_id');
        return;
    }

    if (options.auto) {
        window.alert('Auto HTML chatbot chạy qua extension trên list Short video — không mở tab thủ công.');
        return;
    }

    try {
        await openImportHtmlBeatGeminiFillOnly({
            shortVideoId,
            beatId: beatId || undefined,
            stage,
        });
    } catch (e) {
        window.alert(e instanceof Error ? e.message : String(e));
    }
}
