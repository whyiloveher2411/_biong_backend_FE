import { ajax } from 'hook/useApi';
import { getAdminApiPrefix } from 'helpers/apiHost';
import { getLanguage } from 'helpers/i18n';
import { convertToURL } from 'helpers/url';
import { getAccessToken } from 'store/user/user.reducers';
import { dispatchCmsExtensionEvent } from 'helpers/cmsExtensionEventBridge';
import { waitForExtensionReady } from 'helpers/openExternalTabViaExtension';
import { metaaiCookiePayloadForOpen } from 'helpers/marketingShortVideoCookieApi';

const RESOURCE_BASE_PATH =
    'plugin/vn4-e-learning/app-mobile/marketing/short-video/resource';

const RESOURCE_METAAI_OPEN_EVENT = 'vn4-open-resource-metaai';
const RESOURCE_METAAI_OPEN_RESULT_EVENT = 'vn4-open-resource-metaai-result';

/** Extension lưu ảnh resource xong → notify CMS (content-script dispatch DOM event này). */
export const SHORT_VIDEO_RESOURCE_IMAGE_SAVED_EVENT = 'vn4-short-video-resource-image-saved';

function resourceApiUrl(suffix: string): string {
    return convertToURL(
        getAdminApiPrefix(),
        `plugin/vn4-e-learning/app-mobile/marketing/${suffix}`,
    );
}

export type ShortVideoResource = {
    id: number;
    title: string;
    resource_key: string;
    prompt: string;
    description: string;
    image_url: string;
    image_s3_key: string;
    /** URL chat Meta.ai đã render ảnh resource (pipeline headless lưu lại). */
    metaai_chat_url: string;
    /** ID cookie (Quản lý cookie) của account đã render chat trên. */
    metaai_cookie_id: number;
    short_video_id: number;
    created_at?: string;
    updated_at?: string;
};

export type ShortVideoResourceSavePayload = {
    id?: number;
    short_video_id: number;
    resource_key: string;
    title: string;
    prompt: string;
    description: string;
    image?: { url: string; s3_key: string } | null;
};

/** Resource được prompt generate image sử dụng (thứ tự = thứ tự xuất hiện trong prompt). */
export type ShortVideoPromptImageReference = {
    resource_id: number;
    resource_key: string;
    title: string;
    /** Ảnh đính kèm — rỗng khi resource chưa có ảnh (dùng prompt thay thế). */
    image_url: string;
    /** Prompt mô tả resource — thay ảnh khi image_url rỗng. */
    prompt: string;
    has_image: boolean;
};

export type ShortVideoPromptImageReferenceResult = {
    matched: boolean;
    /** Prompt gốc + "\n\nIMAGE REFERENCE:\n- …" (đã nối khi matched). */
    prompt_final: string;
    /** Section IMAGE REFERENCE (không kèm prompt gốc). */
    reference_text: string;
    references: ShortVideoPromptImageReference[];
};

/** Chuẩn hoá khoảng trắng của prompt thay thế — giữ danh sách IMAGE REFERENCE 1 dòng/resource. */
function normalizeResourceSubstitutePrompt(text: string): string {
    return String(text || '').replace(/\s+/g, ' ').trim();
}

/** Dựng section IMAGE REFERENCE từ danh sách reference (mirror PHP build_image_reference_text). */
function buildImageReferenceText(references: ShortVideoPromptImageReference[]): string {
    const lines: string[] = [];
    for (const reference of references) {
        const resourceKey = String(reference.resource_key || '').trim();
        if (!resourceKey) {
            continue;
        }
        const title = String(reference.title || '').trim();
        let line = `- ${title || resourceKey} (${resourceKey})`;
        if (!reference.has_image) {
            const substitute = normalizeResourceSubstitutePrompt(reference.prompt);
            if (substitute) {
                line += `: ${substitute}`;
            }
        }
        lines.push(line);
    }
    return lines.length ? `IMAGE REFERENCE:\n${lines.join('\n')}` : '';
}

/** Escape resource_key để dùng trong regex whole-word (C01, S01…). */
function escapeResourceKeyPattern(resourceKey: string): string {
    return resourceKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Resolve resource được prompt generate image sử dụng (chỉ RUNTIME — không ghi DB):
 * load tất cả resource của short video, quét mã (C01/S01…) trong prompt — match
 * whole-word case-insensitive, sắp theo vị trí xuất hiện ĐẦU TIÊN.
 * Mirror PHP marketing_short_video_resource_resolve_prompt_references().
 */
export async function resolveShortVideoPromptImageReferences(
    shortVideoId: number,
    prompt: string,
): Promise<ShortVideoPromptImageReferenceResult> {
    const sourcePrompt = String(prompt || '');
    const emptyResult: ShortVideoPromptImageReferenceResult = {
        matched: false,
        prompt_final: sourcePrompt,
        reference_text: '',
        references: [],
    };
    if (!shortVideoId || !sourcePrompt.trim()) {
        return emptyResult;
    }

    const listResult = await listShortVideoResources(shortVideoId);
    const resources = Array.isArray(listResult?.resources) ? listResult.resources : [];
    if (!resources.length) {
        return emptyResult;
    }

    const matches: Array<{ position: number; reference: ShortVideoPromptImageReference }> = [];
    for (const resource of resources) {
        const resourceKey = String(resource?.resource_key || '').replace(/\s+/g, ' ').trim();
        if (!resourceKey) {
            continue;
        }
        const pattern = new RegExp(
            `(?<![A-Za-z0-9])${escapeResourceKeyPattern(resourceKey)}(?![A-Za-z0-9])`,
            'i',
        );
        const match = pattern.exec(sourcePrompt);
        if (!match) {
            continue;
        }
        const imageUrl = String(resource?.image_url || '').trim();
        matches.push({
            position: match.index,
            reference: {
                resource_id: Number(resource?.id || 0),
                resource_key: resourceKey,
                title: String(resource?.title || '').trim(),
                image_url: imageUrl,
                prompt: String(resource?.prompt || ''),
                has_image: Boolean(imageUrl),
            },
        });
    }

    if (!matches.length) {
        return emptyResult;
    }

    matches.sort((a, b) => a.position - b.position);
    const references = matches.map((item) => item.reference);
    const referenceText = buildImageReferenceText(references);
    if (!referenceText) {
        return emptyResult;
    }

    return {
        matched: true,
        prompt_final: `${sourcePrompt.replace(/\s+$/, '')}\n\n${referenceText}`,
        reference_text: referenceText,
        references,
    };
}

type ApiMessageLike = { content?: string } | string | undefined;

/** Lấy message dạng string từ result API (message là string hoặc {content}). */
export function parseShortVideoResourceApiMessage(
    source: unknown,
    fallback = 'Yêu cầu thất bại',
): string {
    const record = source && typeof source === 'object' ? source as Record<string, unknown> : null;
    const message: ApiMessageLike = record ? record.message as ApiMessageLike : undefined;

    if (typeof message === 'string' && message.trim()) {
        return message;
    }
    if (message && typeof message === 'object' && typeof message.content === 'string' && message.content.trim()) {
        return message.content;
    }
    return fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

export function listShortVideoResources(shortVideoId: number): Promise<{
    success?: boolean;
    resources?: ShortVideoResource[];
}> {
    return ajax({
        url: `${RESOURCE_BASE_PATH}/list`,
        method: 'POST',
        loading: false,
        data: { short_video_id: shortVideoId },
    }) as Promise<{ success?: boolean; resources?: ShortVideoResource[] }>;
}

export function saveShortVideoResource(
    payload: ShortVideoResourceSavePayload,
): Promise<{
    success?: boolean;
    resource?: ShortVideoResource;
    resource_id?: number;
    duplicate_id?: number;
}> {
    const body: Record<string, unknown> = {
        id: payload.id ?? 0,
        short_video_id: payload.short_video_id,
        resource_key: payload.resource_key,
        title: payload.title,
        prompt: payload.prompt,
        description: payload.description,
    };
    if (payload.image !== undefined) {
        body.image = payload.image;
    }

    return ajax({
        url: `${RESOURCE_BASE_PATH}/save`,
        method: 'POST',
        loading: false,
        data: body,
    }) as Promise<{
        success?: boolean;
        resource?: ShortVideoResource;
        resource_id?: number;
        duplicate_id?: number;
    }>;
}

export function deleteShortVideoResource(resourceId: number): Promise<{
    success?: boolean;
    resource_id?: number;
}> {
    return ajax({
        url: `${RESOURCE_BASE_PATH}/delete`,
        method: 'POST',
        loading: false,
        data: { id: resourceId },
    }) as Promise<{ success?: boolean; resource_id?: number }>;
}

/** Xóa nhiều resource cùng lúc — BE xóa theo mảng ids. */
export function deleteShortVideoResources(resourceIds: number[]): Promise<{
    success?: boolean;
    deleted?: number;
    deleted_ids?: number[];
}> {
    return ajax({
        url: `${RESOURCE_BASE_PATH}/delete`,
        method: 'POST',
        loading: false,
        data: { ids: resourceIds },
    }) as Promise<{
        success?: boolean;
        deleted?: number;
        deleted_ids?: number[];
    }>;
}

/** Xóa ảnh resource (1 id hoặc mảng ids): xóa file S3 theo s3_key + clear field image. */
export function deleteShortVideoResourceImages(resourceIds: number | number[]): Promise<{
    success?: boolean;
    cleared?: number;
    cleared_ids?: number[];
    s3_deleted?: string[];
    errors?: string[];
}> {
    const ids = Array.isArray(resourceIds) ? resourceIds : [resourceIds];
    return ajax({
        url: `${RESOURCE_BASE_PATH}/delete-image`,
        method: 'POST',
        loading: false,
        data: { ids },
    }) as Promise<{
        success?: boolean;
        cleared?: number;
        cleared_ids?: number[];
        s3_deleted?: string[];
        errors?: string[];
    }>;
}

export type ShortVideoResourceImportItem = {
    resource_key: string;
    title: string;
    prompt: string;
    description?: string;
};

/**
 * Import nhanh danh sách resource (từ output workflow register) vào short video.
 * Upsert theo resource_key: trùng → update title/prompt (giữ image cũ), chưa có → thêm mới.
 * Không xóa resource hiện có.
 */
export function importShortVideoResources(
    shortVideoId: number,
    resources: ShortVideoResourceImportItem[],
): Promise<{
    success?: boolean;
    created?: number;
    updated?: number;
    skipped?: number;
    total?: number;
}> {
    return ajax({
        url: `${RESOURCE_BASE_PATH}/import`,
        method: 'POST',
        loading: false,
        data: { short_video_id: shortVideoId, resources },
    }) as Promise<{
        success?: boolean;
        created?: number;
        updated?: number;
        skipped?: number;
        total?: number;
    }>;
}

export async function uploadShortVideoResourceImage(
    shortVideoId: number,
    file: File,
): Promise<{ success?: boolean; url?: string; preview_url?: string; s3_key?: string }> {
    const formData = new FormData();
    formData.append('short_video_id', String(shortVideoId));
    formData.append('id', String(shortVideoId));
    formData.append('image', file);
    formData.append('__l', window.btoa(`${getLanguage().code}#${Date.now()}`));

    const headers: Record<string, string> = { Accept: 'application/json' };
    const token = getAccessToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
        convertToURL(
            getAdminApiPrefix(),
            'plugin/vn4-e-learning/app-mobile/marketing/short-video/resource/upload-image',
        ),
        {
            method: 'POST',
            headers,
            body: formData,
        },
    );

    const result = asRecord(await response.json());
    if (!response.ok && !result?.message) {
        throw new Error('Upload ảnh resource thất bại');
    }
    return result as { success?: boolean; url?: string; preview_url?: string; s3_key?: string };
}

export type OpenResourceMetaAiItem = {
    resourceId: number;
    resourceKey: string;
    resourceTitle?: string;
    prompt: string;
    imageUrl?: string;
    /** URL chat Meta.ai đã render resource này — extension mở lại đúng chat (update mode). */
    chatUrl?: string;
    /** ID cookie của account đã render chat trên — mở lại phải đúng account. */
    cookieId?: number;
};

export type OpenResourceMetaAiPayload = {
    shortVideoId: number;
    /** Resource đang focus khi bấm nút — panel mở đúng resource này trước. */
    activeResourceId: number;
    /** Danh sách resource (có prompt) — panel Prev/Next di chuyển trong 1 tab. */
    resources: OpenResourceMetaAiItem[];
    autoSubmit?: boolean;
};

/**
 * Mở tab Meta.ai workspace cho resource của short video — gửi CẢ DANH SÁCH resource.
 * Panel bên phải: Prev/Next chuyển resource (không auto-fill), nút chạy mở /create
 * mới rồi điền prompt (nguyên văn) + submit; download ảnh → tự upload vào resource
 * đang chọn (upload-image với resource_id → CMS lưu field image).
 *
 * Resource đã có chat Meta.ai (pipeline headless render trước đó) → mở ĐÚNG chat cũ
 * + cookie account đã render, KHÔNG auto điền/submit (user đang muốn update — panel
 * vẫn có nút Điền + Submit để chủ động update lại trong chat cũ).
 */
export async function openResourceMetaAi(
    payload: OpenResourceMetaAiPayload,
): Promise<void> {
    const shortVideoId = Number(payload.shortVideoId || 0);
    const activeResourceId = Number(payload.activeResourceId || 0);
    const resources = (Array.isArray(payload.resources) ? payload.resources : [])
        .map((item) => ({
            resource_id: Number(item.resourceId || 0),
            resource_key: String(item.resourceKey || '').trim(),
            resource_title: String(item.resourceTitle || '').trim(),
            image_prompt: String(item.prompt || '').trim(),
            image_url: String(item.imageUrl || '').trim(),
            chat_url: String(item.chatUrl || '').trim(),
            cookie_id: Number(item.cookieId || 0),
        }))
        .filter((item) => item.resource_id > 0 && item.image_prompt);

    if (!shortVideoId) {
        throw new Error('Thiếu short_video_id');
    }
    if (!resources.length) {
        throw new Error('Chưa có resource nào có prompt để mở Meta.ai');
    }
    if (!activeResourceId || !resources.some((item) => item.resource_id === activeResourceId)) {
        throw new Error('Resource đang chọn không có trong danh sách (thiếu prompt?)');
    }

    // Resource active đã có chat → update mode: mở chat cũ, không auto submit.
    const activeResource = resources.find((item) => item.resource_id === activeResourceId) || null;
    const hasExistingChat = Boolean(activeResource?.chat_url);
    const effectiveAutoSubmit = payload.autoSubmit !== false && !hasExistingChat;

    const extensionReady = await waitForExtensionReady(8000);
    if (!extensionReady) {
        throw new Error(
            'Cần Chrome extension VN4 trên tab CMS này. Reload extension (chrome://extensions) rồi F5 trang CMS.',
        );
    }

    // Cookie: resource đã render → dùng ĐÚNG cookie account của chat đó; chưa có → round-robin.
    const activeCookieId = Number(activeResource?.cookie_id || 0);

    const result = await dispatchCmsExtensionEvent(
        RESOURCE_METAAI_OPEN_EVENT,
        {
            short_video_id: shortVideoId,
            active_resource_id: activeResourceId,
            resources,
            access_token: getAccessToken() ?? '',
            upload_api_url: resourceApiUrl('short-video/resource/upload-image'),
            ...(await metaaiCookiePayloadForOpen(activeCookieId)),
            ...(effectiveAutoSubmit ? { auto_submit: true } : {}),
        },
        RESOURCE_METAAI_OPEN_RESULT_EVENT,
        12000,
    );

    if (!result.ok) {
        throw new Error(result.error || 'Không mở được tab Meta.ai');
    }
}
