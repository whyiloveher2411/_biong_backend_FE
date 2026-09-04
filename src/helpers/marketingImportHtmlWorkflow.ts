import { getAccessToken } from 'store/user/user.reducers';
import { getApiHost } from 'helpers/apiHost';
import { convertToURL } from 'helpers/url';
import { waitForExtensionReady } from 'helpers/openExternalTabViaExtension';
import { dispatchCmsExtensionEvent } from 'helpers/cmsExtensionEventBridge';
import {
    WHITEBOARD_CENTRAL_SAFE_AREA_RULE,
    WHITEBOARD_DUAL_LAYER_OUTPUT_RULE,
    whiteboardOutputRuleForPrompt,
    whiteboardSafeAreaRuleForPrompt,
} from 'plugins/Vn4ELearning/AddOn/CreateData/Tabs/AppMobile/Marketing/AgentVideo/agentVideoBeatDivisionWhiteboard';

const GEMINI_WEB_APP_URL = 'https://gemini.google.com/u/0/app?pageId=none';

const OPEN_IMPORT_HTML_GEMINI_EVENT = 'vn4-open-import-html-beat-gemini';
const OPEN_IMPORT_HTML_GEMINI_RESULT_EVENT = 'vn4-open-import-html-beat-gemini-result';
const OPEN_IMPORT_HTML_AISTUDIO_EVENT = 'vn4-open-import-html-beat-aistudio';
const OPEN_IMPORT_HTML_AISTUDIO_RESULT_EVENT = 'vn4-open-import-html-beat-aistudio-result';
const OPEN_IMPORT_HTML_DUCKAI_EVENT = 'vn4-open-import-html-beat-duckai';
const OPEN_IMPORT_HTML_DUCKAI_RESULT_EVENT = 'vn4-open-import-html-beat-duckai-result';
const OPEN_IMPORT_HTML_METAAI_EVENT = 'vn4-open-import-html-beat-metaai';
const OPEN_IMPORT_HTML_METAAI_RESULT_EVENT = 'vn4-open-import-html-beat-metaai-result';
const OPEN_VIDEO_2S_PROMPT_METAAI_EVENT = 'vn4-open-video-2s-beat-prompt-metaai';
const OPEN_VIDEO_2S_PROMPT_METAAI_RESULT_EVENT = 'vn4-open-video-2s-beat-prompt-metaai-result';

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

/** Nối dòng phong cách image vào prompt trước khi dispatch mở tab. Prompt JSON → thêm key `style` vào trong JSON. */
/** Rule an toàn mép ảnh — luôn tự động thêm vào MỌI prompt sinh ảnh (không cần chia beat lại). */
const IMAGE_SAFE_AREA_SUFFIX = WHITEBOARD_CENTRAL_SAFE_AREA_RULE;

function withImageStyleSuffix(
    prompt: string,
    suffix?: string,
    aspectSuffix?: string,
    textLangRule?: string,
    voiceContent?: string,
): string {
    if (!prompt) {
        return prompt;
    }
    try {
        const parsed = JSON.parse(prompt);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            const next = { ...parsed };
            if (suffix) next.style = suffix;
            if (aspectSuffix) next.aspect = aspectSuffix;
            if (textLangRule && !String(next.text_language || '').trim()) {
                next.text_language = textLangRule;
            }
            if (voiceContent && !String(next.voice_content || '').trim()) {
                next.voice_content = voiceContent;
            }
            // Beat nhiều lớp ảnh (`object_prompt_N`) cần rule N object + 1 background
            // và safe-area nói đúng IMAGE 1…N; beat 1 ảnh giữ rule 2 ảnh.
            next.safe_area = whiteboardSafeAreaRuleForPrompt(next);
            next.output_images = whiteboardOutputRuleForPrompt(next);
            return JSON.stringify(next, null, 2);
        }
    } catch {
        // Không phải JSON → fallback nối suffix sau dấu phẩy như cũ.
    }
    const parts = [suffix, aspectSuffix, textLangRule, IMAGE_SAFE_AREA_SUFFIX].filter(Boolean);
    let out = `${prompt.replace(/[, ]+$/u, '')}, ${parts.join(', ')}`;
    if (voiceContent) {
        out += `, the voiceover for this beat says: "${voiceContent}"`;
    }
    return `${out}\n\n${WHITEBOARD_DUAL_LAYER_OUTPUT_RULE}`;
}

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

function dispatchOpenImportHtmlAiStudioEvent(detail: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
    return dispatchCmsExtensionEvent(
        OPEN_IMPORT_HTML_AISTUDIO_EVENT,
        detail,
        OPEN_IMPORT_HTML_AISTUDIO_RESULT_EVENT,
        12000,
    );
}

function dispatchOpenImportHtmlDuckAiEvent(detail: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
    return dispatchCmsExtensionEvent(
        OPEN_IMPORT_HTML_DUCKAI_EVENT,
        detail,
        OPEN_IMPORT_HTML_DUCKAI_RESULT_EVENT,
        12000,
    );
}

function dispatchOpenImportHtmlMetaAiEvent(detail: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
    return dispatchCmsExtensionEvent(
        OPEN_IMPORT_HTML_METAAI_EVENT,
        detail,
        OPEN_IMPORT_HTML_METAAI_RESULT_EVENT,
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

export async function openImportHtmlBeatAiStudioFillOnly(options: {
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
    const result = await dispatchOpenImportHtmlAiStudioEvent({
        short_video_id: shortVideoId,
        beat_id: beatId,
        stage,
        save_api_url: saveApiUrl,
        access_token: accessToken,
        ...(options.autoSubmit ? { auto_submit: true } : {}),
    });

    if (!result.ok) {
        throw new Error(result.error || 'Không mở được tab AI Studio');
    }
}

export async function openImportHtmlBeatAiStudioForMissingBeats(options: {
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
    const failReasons: string[] = [];
    let opened = 0;

    for (let i = 0; i < beatIds.length; i += 1) {
        if (i > 0) {
            await sleepMs(BULK_OPEN_IMPORT_HTML_GEMINI_DELAY_MS);
        }
        const beatId = beatIds[i];
        try {
            await openImportHtmlBeatAiStudioFillOnly({
                shortVideoId,
                beatId,
                stage: 'import_html_beat_html',
                autoSubmit: options.autoSubmit,
            });
            opened += 1;
        } catch (e) {
            failed.push(beatId);
            failReasons.push(`${beatId}: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    if (opened === 0 && failed.length > 0) {
        throw new Error(
            failReasons[0]
                || `Không mở được tab AI Studio cho beat: ${failed.join(', ')}`,
        );
    }

    return { opened, failed };
}

export async function openImportHtmlBeatDuckAiFillOnly(options: {
    shortVideoId: number;
    beatId: string;
    imagePrompt: string;
    beatIndex?: number;
    title?: string;
    imageUrl?: string;
    /** Ảnh object 1..N đã có (beat nhiều lớp ảnh) — panel dùng để biết ô nào còn trống. */
    imageUrls?: string[];
    /** Số lớp ảnh object beat cần (từ `object_prompt_N` trong image_prompt). */
    objectLayerCount?: number;
    /** Ảnh background plate đã có — panel dùng để biết còn thiếu ảnh nào. */
    backgroundImageUrl?: string;
    autoSubmit?: boolean;
    imageStyleSuffix?: string;
    imageAspectSuffix?: string;
    imageTextLangRule?: string;
    imageVoiceContent?: string;
}): Promise<void> {
    const shortVideoId = Number(options.shortVideoId || 0);
    const beatId = String(options.beatId || '').trim();
    const imagePrompt = withImageStyleSuffix(
        String(options.imagePrompt || '').trim(),
        options.imageStyleSuffix,
        options.imageAspectSuffix,
        options.imageTextLangRule,
        options.imageVoiceContent,
    );
    if (!shortVideoId) {
        throw new Error('Thiếu short_video_id');
    }
    if (!beatId) {
        throw new Error('Thiếu beat_id');
    }
    if (!imagePrompt) {
        throw new Error('Thiếu image_prompt');
    }

    const extensionReady = await waitForExtensionReady(8000);
    if (!extensionReady) {
        throw new Error(
            'Cần Chrome extension VN4 trên tab CMS này. Reload extension (chrome://extensions) rồi F5 trang CMS.',
        );
    }

    const accessToken = getAccessToken() ?? '';
    const result = await dispatchOpenImportHtmlDuckAiEvent({
        short_video_id: shortVideoId,
        beat_id: beatId,
        beat_index: Number.isFinite(Number(options.beatIndex)) ? Number(options.beatIndex) : 0,
        image_prompt: imagePrompt,
        image_url: String(options.imageUrl || '').trim(),
        image_urls: (options.imageUrls ?? []).map((url) => String(url || '').trim()).filter(Boolean),
        object_layer_count: Math.max(1, Number(options.objectLayerCount || 0) || 1),
        background_image_url: String(options.backgroundImageUrl || '').trim(),
        title: String(options.title || '').trim(),
        access_token: accessToken,
        save_api_url: pluginApiPath('short-video/save-agent-import-html'),
        upload_api_url: pluginApiPath('short-video/upload-agent-visual-image'),
        ...(options.autoSubmit === false ? {} : { auto_submit: true }),
    });
    if (!result.ok) {
        throw new Error(result.error || 'Không mở được tab Duck.ai');
    }
}

export type DuckAiWorkspaceBeat = {
    beatId: string;
    beatIndex: number;
    imagePrompt: string;
    imageUrl?: string;
    /** Ảnh object 1..N đã có (beat nhiều lớp ảnh). */
    imageUrls?: string[];
    /** Số lớp ảnh object beat cần. */
    objectLayerCount?: number;
    /** Ảnh background plate — beat chỉ đủ khi có đủ N ảnh object + background. */
    backgroundImageUrl?: string;
    missingImage?: boolean;
    imageVoiceContent?: string;
};

/** Mở 1 tab Duck.ai cho 1 beat (activeBeatId hoặc beat đầu). */
export async function openImportHtmlBeatDuckAiWorkspace(options: {
    shortVideoId: number;
    title?: string;
    beats: DuckAiWorkspaceBeat[];
    activeBeatId?: string;
    autoSubmit?: boolean;
    imageStyleSuffix?: string;
    imageAspectSuffix?: string;
}): Promise<void> {
    const shortVideoId = Number(options.shortVideoId || 0);
    if (!shortVideoId) {
        throw new Error('Thiếu short_video_id');
    }
    const beats = Array.isArray(options.beats)
        ? options.beats
            .map((item) => ({
                beatId: String(item?.beatId || '').trim(),
                beatIndex: Number.isFinite(Number(item?.beatIndex)) ? Number(item.beatIndex) : 0,
                imagePrompt: String(item?.imagePrompt || '').trim(),
                imageUrl: String(item?.imageUrl || '').trim(),
                imageUrls: (item?.imageUrls ?? []).map((url) => String(url || '').trim()).filter(Boolean),
                objectLayerCount: Math.max(1, Number(item?.objectLayerCount || 0) || 1),
                backgroundImageUrl: String(item?.backgroundImageUrl || '').trim(),
                missingImage: Boolean(item?.missingImage),
            }))
            .filter((item) => item.beatId && item.imagePrompt)
        : [];
    if (!beats.length) {
        throw new Error('Không có beat hợp lệ để mở Duck.ai');
    }
    const activeBeatId = String(options.activeBeatId || '').trim();
    const target = beats.find((b) => b.beatId === activeBeatId) || beats[0];
    await openImportHtmlBeatDuckAiFillOnly({
        shortVideoId,
        beatId: target.beatId,
        beatIndex: target.beatIndex,
        imagePrompt: target.imagePrompt,
        imageUrl: target.imageUrl,
        imageUrls: target.imageUrls,
        objectLayerCount: target.objectLayerCount,
        backgroundImageUrl: target.backgroundImageUrl,
        title: options.title,
        autoSubmit: options.autoSubmit,
        imageStyleSuffix: options.imageStyleSuffix,
        imageAspectSuffix: options.imageAspectSuffix,
    });
}

export async function openImportHtmlBeatDuckAiForMissingBeats(options: {
    shortVideoId: number;
    beats: DuckAiWorkspaceBeat[];
    title?: string;
    activeBeatId?: string;
    autoSubmit?: boolean;
    imageStyleSuffix?: string;
    imageAspectSuffix?: string;
    imageTextLangRule?: string;
}): Promise<{ opened: number; failed: string[] }> {
    const shortVideoId = Number(options.shortVideoId || 0);
    const beats = Array.isArray(options.beats)
        ? options.beats
            .map((item) => ({
                beatId: String(item?.beatId || '').trim(),
                beatIndex: Number.isFinite(Number(item?.beatIndex)) ? Number(item.beatIndex) : 0,
                imagePrompt: String(item?.imagePrompt || '').trim(),
                imageUrl: String(item?.imageUrl || '').trim(),
                imageUrls: (item?.imageUrls ?? []).map((url) => String(url || '').trim()).filter(Boolean),
                objectLayerCount: Math.max(1, Number(item?.objectLayerCount || 0) || 1),
                backgroundImageUrl: String(item?.backgroundImageUrl || '').trim(),
                missingImage: Boolean(item?.missingImage),
                imageVoiceContent: String(item?.imageVoiceContent || '').trim(),
            }))
            .filter((item) => item.beatId && item.imagePrompt)
        : [];
    if (!shortVideoId) {
        throw new Error('Thiếu short_video_id');
    }
    if (!beats.length) {
        return { opened: 0, failed: [] };
    }

    const openList = beats.filter((b) => b.missingImage === true || !String(b.imageUrl || '').trim());
    if (!openList.length) {
        return { opened: 0, failed: [] };
    }

    const failed: string[] = [];
    let opened = 0;
    for (let i = 0; i < openList.length; i += 1) {
        if (i > 0) {
            await sleepMs(BULK_OPEN_IMPORT_HTML_GEMINI_DELAY_MS);
        }
        const beat = openList[i];
        try {
            await openImportHtmlBeatDuckAiFillOnly({
                shortVideoId,
                beatId: beat.beatId,
                beatIndex: beat.beatIndex,
                imagePrompt: beat.imagePrompt,
                imageUrl: beat.imageUrl,
                imageUrls: beat.imageUrls,
                objectLayerCount: beat.objectLayerCount,
                backgroundImageUrl: beat.backgroundImageUrl,
                title: options.title,
                autoSubmit: options.autoSubmit !== false,
                imageStyleSuffix: options.imageStyleSuffix,
                imageAspectSuffix: options.imageAspectSuffix,
                imageTextLangRule: options.imageTextLangRule,
                imageVoiceContent: beat.imageVoiceContent,
            });
            opened += 1;
        } catch (e) {
            failed.push(beat.beatId);
            console.warn('[Duck.ai] open beat failed', beat.beatId, e);
        }
    }

    if (opened === 0 && failed.length > 0) {
        throw new Error(`Không mở được tab Duck.ai cho beat: ${failed.join(', ')}`);
    }

    return { opened, failed };
}

export async function openImportHtmlBeatMetaAiFillOnly(options: {
    shortVideoId: number;
    beatId: string;
    imagePrompt: string;
    beatIndex?: number;
    title?: string;
    imageUrl?: string;
    /** Ảnh object 1..N đã có (beat nhiều lớp ảnh) — panel dùng để biết ô nào còn trống. */
    imageUrls?: string[];
    /** Số lớp ảnh object beat cần (từ `object_prompt_N` trong image_prompt). */
    objectLayerCount?: number;
    /** Ảnh background plate đã có — panel dùng để biết còn thiếu ảnh nào. */
    backgroundImageUrl?: string;
    autoSubmit?: boolean;
    imageStyleSuffix?: string;
    imageAspectSuffix?: string;
    imageTextLangRule?: string;
    imageVoiceContent?: string;
    /**
     * Video 2s: 1 ảnh/beat — prompt string nguyên văn từ bước "Ảnh beat",
     * KHÔNG nối style suffix / dual-layer, panel không đòi background.
     */
    video2s?: boolean;
}): Promise<void> {
    const shortVideoId = Number(options.shortVideoId || 0);
    const beatId = String(options.beatId || '').trim();
    const video2s = options.video2s === true;
    const imagePrompt = video2s
        ? String(options.imagePrompt || '').trim()
        : withImageStyleSuffix(
            String(options.imagePrompt || '').trim(),
            options.imageStyleSuffix,
            options.imageAspectSuffix,
            options.imageTextLangRule,
            options.imageVoiceContent,
        );
    if (!shortVideoId) {
        throw new Error('Thiếu short_video_id');
    }
    if (!beatId) {
        throw new Error('Thiếu beat_id');
    }
    if (!imagePrompt) {
        throw new Error('Thiếu image_prompt');
    }

    const extensionReady = await waitForExtensionReady(8000);
    if (!extensionReady) {
        throw new Error(
            'Cần Chrome extension VN4 trên tab CMS này. Reload extension (chrome://extensions) rồi F5 trang CMS.',
        );
    }

    const accessToken = getAccessToken() ?? '';
    const result = await dispatchOpenImportHtmlMetaAiEvent({
        short_video_id: shortVideoId,
        beat_id: beatId,
        beat_index: Number.isFinite(Number(options.beatIndex)) ? Number(options.beatIndex) : 0,
        image_prompt: imagePrompt,
        image_url: String(options.imageUrl || '').trim(),
        image_urls: (options.imageUrls ?? []).map((url) => String(url || '').trim()).filter(Boolean),
        object_layer_count: video2s ? 1 : Math.max(1, Number(options.objectLayerCount || 0) || 1),
        background_image_url: video2s ? '' : String(options.backgroundImageUrl || '').trim(),
        title: String(options.title || '').trim(),
        access_token: accessToken,
        save_api_url: pluginApiPath('short-video/save-agent-import-html'),
        upload_api_url: pluginApiPath('short-video/upload-agent-visual-image'),
        ...(video2s ? { video_2s: 1 } : {}),
        ...(options.autoSubmit === false ? {} : { auto_submit: true }),
    });
    if (!result.ok) {
        throw new Error(result.error || 'Không mở được tab Meta.ai');
    }
}

export type Video2sPromptBeat = {
    markId: string;
    order: number;
    content: string;
    imagePrompt?: string;
    startSec?: number;
    endSec?: number;
};

/**
 * Clip video 2s — mở 1 tab Meta.ai làm workspace sinh prompt ảnh: panel tự dán
 * master prompt art-director rồi hiện danh sách beat để user copy content / dán
 * prompt trả về từ clipboard.
 */
export async function openVideo2sBeatPromptMetaAi(options: {
    shortVideoId: number;
    masterPrompt: string;
    beats: Video2sPromptBeat[];
    title?: string;
}): Promise<void> {
    const shortVideoId = Number(options.shortVideoId || 0);
    const masterPrompt = String(options.masterPrompt || '').trim();
    const beats = (Array.isArray(options.beats) ? options.beats : [])
        .map((beat) => ({
            mark_id: String(beat?.markId || '').trim(),
            order: Number(beat?.order || 0),
            content: String(beat?.content || '').trim(),
            image_prompt: String(beat?.imagePrompt || '').trim(),
            start_sec: Number(beat?.startSec || 0),
            end_sec: Number(beat?.endSec || 0),
        }))
        .filter((beat) => beat.mark_id && beat.content);

    if (!shortVideoId) {
        throw new Error('Thiếu short_video_id');
    }
    if (!masterPrompt) {
        throw new Error('Thiếu master prompt (prompts/video-2s/prompt-sinh-image.md)');
    }
    if (!beats.length) {
        throw new Error('Chưa có beat nào để sinh prompt');
    }

    const extensionReady = await waitForExtensionReady(8000);
    if (!extensionReady) {
        throw new Error(
            'Cần Chrome extension VN4 trên tab CMS này. Reload extension (chrome://extensions) rồi F5 trang CMS.',
        );
    }

    const result = await dispatchCmsExtensionEvent(
        OPEN_VIDEO_2S_PROMPT_METAAI_EVENT,
        {
            short_video_id: shortVideoId,
            title: String(options.title || '').trim(),
            master_prompt: masterPrompt,
            beats,
            access_token: getAccessToken() ?? '',
            save_prompt_api_url: pluginApiPath('short-video/manual-beat/save-mark-prompt'),
            get_marks_api_url: pluginApiPath('short-video/manual-beat/get-marks'),
            clear_all_prompts_api_url: pluginApiPath('short-video/manual-beat/clear-all-prompts'),
        },
        OPEN_VIDEO_2S_PROMPT_METAAI_RESULT_EVENT,
        12000,
    );
    if (!result.ok) {
        throw new Error(result.error || 'Không mở được tab Meta.ai');
    }
}

export type MetaAiWorkspaceBeat = DuckAiWorkspaceBeat;

export async function openImportHtmlBeatMetaAiForMissingBeats(options: {
    shortVideoId: number;
    beats: MetaAiWorkspaceBeat[];
    title?: string;
    activeBeatId?: string;
    autoSubmit?: boolean;
    imageStyleSuffix?: string;
    imageAspectSuffix?: string;
    imageTextLangRule?: string;
    /** Video 2s: 1 ảnh/beat, prompt string nguyên văn — không style suffix / background. */
    video2s?: boolean;
}): Promise<{ opened: number; failed: string[] }> {
    const shortVideoId = Number(options.shortVideoId || 0);
    const video2s = options.video2s === true;
    const beats = Array.isArray(options.beats)
        ? options.beats
            .map((item) => ({
                beatId: String(item?.beatId || '').trim(),
                beatIndex: Number.isFinite(Number(item?.beatIndex)) ? Number(item.beatIndex) : 0,
                imagePrompt: String(item?.imagePrompt || '').trim(),
                imageUrl: String(item?.imageUrl || '').trim(),
                imageUrls: (item?.imageUrls ?? []).map((url) => String(url || '').trim()).filter(Boolean),
                objectLayerCount: video2s
                    ? 1
                    : Math.max(1, Number(item?.objectLayerCount || 0) || 1),
                backgroundImageUrl: video2s ? '' : String(item?.backgroundImageUrl || '').trim(),
                missingImage: Boolean(item?.missingImage),
                imageVoiceContent: String(item?.imageVoiceContent || '').trim(),
            }))
            .filter((item) => item.beatId && item.imagePrompt)
        : [];
    if (!shortVideoId) {
        throw new Error('Thiếu short_video_id');
    }
    if (!beats.length) {
        return { opened: 0, failed: [] };
    }

    const openList = beats.filter((b) => b.missingImage === true || !String(b.imageUrl || '').trim());
    if (!openList.length) {
        return { opened: 0, failed: [] };
    }

    const failed: string[] = [];
    let opened = 0;
    for (let i = 0; i < openList.length; i += 1) {
        if (i > 0) {
            await sleepMs(BULK_OPEN_IMPORT_HTML_GEMINI_DELAY_MS);
        }
        const beat = openList[i];
        try {
            await openImportHtmlBeatMetaAiFillOnly({
                shortVideoId,
                beatId: beat.beatId,
                beatIndex: beat.beatIndex,
                imagePrompt: beat.imagePrompt,
                imageUrl: beat.imageUrl,
                imageUrls: beat.imageUrls,
                objectLayerCount: beat.objectLayerCount,
                backgroundImageUrl: beat.backgroundImageUrl,
                title: options.title,
                autoSubmit: options.autoSubmit !== false,
                imageStyleSuffix: options.imageStyleSuffix,
                imageAspectSuffix: options.imageAspectSuffix,
                imageTextLangRule: options.imageTextLangRule,
                imageVoiceContent: beat.imageVoiceContent,
                video2s,
            });
            opened += 1;
        } catch (e) {
            failed.push(beat.beatId);
            console.warn('[Meta.ai] open beat failed', beat.beatId, e);
        }
    }

    if (opened === 0 && failed.length > 0) {
        throw new Error(`Không mở được tab Meta.ai cho beat: ${failed.join(', ')}`);
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
