import { ajax } from 'hook/useApi';
import { getAdminApiPrefix } from 'helpers/apiHost';
import { getLanguage } from 'helpers/i18n';
import { convertToURL } from 'helpers/url';
import { getAccessToken } from 'store/user/user.reducers';

const MODEL_3D_BASE_PATH = 'plugin/vn4-e-learning/app-mobile/marketing/short-video/model-3d';

/** Model 3D — post type spacedev_app_short_video_model_3d (thư viện toàn cục). */
export type ShortVideoModel3d = {
    id: number;
    title: string;
    /** ID catalog (^[a-z0-9_]+$) dùng cho runtime Assets. */
    slug: string;
    /** prop (vật thể) | person (nhân vật có animation). */
    kind: 'prop' | 'person' | string;
    license: string;
    source: string;
    /** Chiều cao (mét) — auto điền từ bounding box khi upload. */
    height: number;
    description: string;
    /** Danh sách tên material, mỗi dòng 1 tên. */
    materials: string;
    /** Danh sách tên clip/animation, mỗi dòng 1 tên. */
    clips: string;
    model_url: string;
    model_s3_key: string;
    file_name: string;
    file_size: number;
    file_format: string;
    /** Ảnh thumbnail tự chụp từ preview 3D. */
    thumbnail_url: string;
    thumbnail_s3_key: string;
    created_at?: string;
    updated_at?: string;
};

export type ShortVideoModel3dSavePayload = {
    id?: number;
    title: string;
    slug?: string;
    kind?: string;
    license?: string;
    source?: string;
    height?: number;
    description?: string;
    materials?: string;
    clips?: string;
    /** JSON media {link, s3_key, file_name, file_size, file_format} hoặc URL. */
    model?: string | Record<string, unknown> | null;
    /** JSON media {link, s3_key} của thumbnail hoặc URL. */
    thumbnail?: string | Record<string, unknown> | null;
};

export type ShortVideoModel3dUploadResult = {
    success?: boolean;
    url?: string;
    s3_key?: string;
    file_name?: string;
    file_size?: number;
    file_format?: string;
    height?: number;
    materials?: string;
    clips?: string;
    model?: ShortVideoModel3d;
    model_saved?: boolean;
    message?: unknown;
};

type ApiMessageLike = { content?: string } | string | undefined;

/** Lấy message dạng string từ result API (message là string hoặc {content}). */
export function parseShortVideoModel3dApiMessage(
    source: unknown,
    fallback = 'Yêu cầu thất bại',
): string {
    const record = source && typeof source === 'object' ? (source as Record<string, unknown>) : null;
    const message: ApiMessageLike = record ? (record.message as ApiMessageLike) : undefined;
    if (typeof message === 'string' && message.trim()) {
        return message;
    }
    if (message && typeof message === 'object' && typeof message.content === 'string' && message.content.trim()) {
        return message.content;
    }
    return fallback;
}

export function listShortVideoModel3ds(): Promise<{
    success?: boolean;
    models?: ShortVideoModel3d[];
}> {
    return ajax({
        url: `${MODEL_3D_BASE_PATH}/list`,
        method: 'POST',
        loading: false,
        data: {},
    }) as Promise<{ success?: boolean; models?: ShortVideoModel3d[] }>;
}

export function saveShortVideoModel3d(payload: ShortVideoModel3dSavePayload): Promise<{
    success?: boolean;
    model?: ShortVideoModel3d;
    model_id?: number;
}> {
    const model = payload.model ?? '';
    const thumbnail = payload.thumbnail ?? '';
    return ajax({
        url: `${MODEL_3D_BASE_PATH}/save`,
        method: 'POST',
        loading: false,
        data: {
            id: payload.id ?? 0,
            title: payload.title,
            slug: payload.slug ?? '',
            kind: payload.kind ?? 'prop',
            license: payload.license ?? '',
            source: payload.source ?? '',
            height: payload.height ?? 0,
            description: payload.description ?? '',
            materials: payload.materials ?? '',
            clips: payload.clips ?? '',
            model: model && typeof model === 'object' ? JSON.stringify(model) : model,
            thumbnail: thumbnail && typeof thumbnail === 'object' ? JSON.stringify(thumbnail) : thumbnail,
        },
    }) as Promise<{ success?: boolean; model?: ShortVideoModel3d; model_id?: number }>;
}

/** Lấy danh sách model 3D đã chọn cho 1 beat (đọc từ BE — không phụ thuộc beat_map phía FE). */
export function getShortVideoModel3dBeatIds(shortVideoId: number, beatId: string): Promise<{
    success?: boolean;
    beat_id?: string;
    model_3d_ids?: number[];
}> {
    return ajax({
        url: `${MODEL_3D_BASE_PATH}/get-beat`,
        method: 'POST',
        loading: false,
        data: {
            short_video_id: shortVideoId,
            beat_id: beatId,
        },
    }) as Promise<{ success?: boolean; beat_id?: string; model_3d_ids?: number[] }>;
}

/** Lưu danh sách model 3D đã chọn cho 1 beat (field model_3d_ids trong beat_map section). */
export function saveShortVideoModel3dBeatIds(shortVideoId: number, beatId: string, modelIds: number[]): Promise<{
    success?: boolean;
    beat_id?: string;
    model_3d_ids?: number[];
}> {
    return ajax({
        url: `${MODEL_3D_BASE_PATH}/save-beat`,
        method: 'POST',
        loading: false,
        data: {
            short_video_id: shortVideoId,
            beat_id: beatId,
            model_3d_ids: modelIds,
        },
    }) as Promise<{ success?: boolean; beat_id?: string; model_3d_ids?: number[] }>;
}

export function deleteShortVideoModel3ds(ids: number[]): Promise<{
    success?: boolean;
    deleted?: number;
    deleted_ids?: number[];
}> {
    return ajax({
        url: `${MODEL_3D_BASE_PATH}/delete`,
        method: 'POST',
        loading: false,
        data: { ids },
    }) as Promise<{ success?: boolean; deleted?: number; deleted_ids?: number[] }>;
}

/**
 * Upload file model .glb/.gltf lên R2 (multipart). BE tự parse để trả về
 * height/materials/clips để FE tự điền form.
 * modelId > 0 → BE tự cập nhật field model của model đó sau khi upload.
 */
export async function uploadShortVideoModel3dFile(
    file: File,
    modelId = 0,
): Promise<ShortVideoModel3dUploadResult> {
    const formData = new FormData();
    formData.append('model_id', String(modelId));
    formData.append('model_file', file);
    formData.append('__l', window.btoa(`${getLanguage().code}#${Date.now()}`));

    const headers: Record<string, string> = { Accept: 'application/json' };
    const token = getAccessToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
        convertToURL(
            getAdminApiPrefix(),
            'plugin/vn4-e-learning/app-mobile/marketing/short-video/model-3d/upload',
        ),
        {
            method: 'POST',
            headers,
            body: formData,
        },
    );

    const result = await response.json();
    if (!response.ok && !(result && typeof result === 'object' && result.message)) {
        throw new Error('Upload file model thất bại');
    }
    return (result || {}) as ShortVideoModel3dUploadResult;
}

/**
 * URL proxy same-origin để three.js/GLTFLoader load file model (tránh CORS của R2).
 * access_token gắn vào query cho route checkUserAdmin.
 */
export function buildModel3dPreviewUrl(modelUrl: string): string {
    const raw = String(modelUrl || '').trim();
    if (!raw) {
        return '';
    }
    const streamUrl = convertToURL(
        getAdminApiPrefix(),
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/model-3d/stream',
    );
    const token = getAccessToken() || '';
    const separator = streamUrl.includes('?') ? '&' : '?';
    return `${streamUrl}${separator}url=${encodeURIComponent(raw)}&access_token=${encodeURIComponent(token)}`;
}

/**
 * Upload ảnh thumbnail (blob PNG chụp từ preview) lên R2.
 * modelId > 0 → BE ghi luôn field thumbnail của model.
 */
export async function uploadShortVideoModel3dThumbnail(
    blob: Blob,
    modelId = 0,
): Promise<{ success?: boolean; url?: string; s3_key?: string; model?: ShortVideoModel3d }> {
    const formData = new FormData();
    formData.append('model_id', String(modelId));
    formData.append('thumbnail', blob, 'thumbnail.png');
    formData.append('__l', window.btoa(`${getLanguage().code}#${Date.now()}`));

    const headers: Record<string, string> = { Accept: 'application/json' };
    const token = getAccessToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
        convertToURL(
            getAdminApiPrefix(),
            'plugin/vn4-e-learning/app-mobile/marketing/short-video/model-3d/upload-thumbnail',
        ),
        {
            method: 'POST',
            headers,
            body: formData,
        },
    );

    const result = await response.json();
    if (!response.ok && !(result && typeof result === 'object' && result.message)) {
        throw new Error('Upload thumbnail thất bại');
    }
    return (result || {}) as { success?: boolean; url?: string; s3_key?: string; model?: ShortVideoModel3d };
}

/** URL tuyệt đối tới assets-runtime.js (same-origin, có access_token) cho preview. */
export function buildModel3dRuntimeAssetUrl(): string {
    const url = convertToURL(
        getAdminApiPrefix(),
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/model-3d/runtime',
    );
    const token = getAccessToken() || '';
    const separator = url.includes('?') ? '&' : '?';
    return token ? `${url}${separator}access_token=${encodeURIComponent(token)}` : url;
}

/** URL tuyệt đối tới asset-config (window.HF_ASSETS) cho 1 beat (same-origin, có token). */
export function buildModel3dAssetConfigUrl(shortVideoId: number, beatId: string): string {
    const url = convertToURL(
        getAdminApiPrefix(),
        'plugin/vn4-e-learning/app-mobile/marketing/short-video/model-3d/asset-config',
    );
    const params = new URLSearchParams();
    params.set('short_video_id', String(shortVideoId || 0));
    params.set('beat_id', String(beatId || ''));
    const token = getAccessToken() || '';
    if (token) {
        params.set('access_token', token);
    }
    return `${url}?${params.toString()}`;
}
