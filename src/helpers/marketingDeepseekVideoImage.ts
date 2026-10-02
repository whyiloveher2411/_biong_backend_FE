import { ajax } from 'hook/useApi';

const BASE_PATH = 'plugin/vn4-e-learning/app-mobile/marketing/short-video';

export type DeepseekVideoImageGenerateResponse = {
    success?: boolean;
    job_id?: number;
    status?: string;
    message?: string | { content?: string };
};

export type DeepseekVideoImageStatusResponse = {
    success?: boolean;
    status?: '' | 'queued' | 'processing' | 'done' | 'error';
    step?: '' | 'generate' | 'beat' | 'translate' | 'done';
    message?: string | { content?: string };
    job_id?: number;
    has_audio_script?: boolean;
    audio_script_length?: number;
};

/**
 * Enqueue job DeepSeek chạy Bước 1 workflow "video-image" (generate → chia beat → dịch)
 * trong CÙNG 1 luồng chat. Truyền 3 prompt ĐÃ thay [topic]/[script-style].
 */
export function startDeepseekVideoImage(payload: {
    shortVideoId: number;
    promptGenerate: string;
    promptBeat: string;
    promptTranslate: string;
    cookieId?: number;
    deepThink?: boolean;
    search?: boolean;
}): Promise<DeepseekVideoImageGenerateResponse> {
    return ajax({
        url: `${BASE_PATH}/deepseek-video-image-generate`,
        method: 'POST',
        loading: false,
        data: {
            short_video_id: payload.shortVideoId,
            id: payload.shortVideoId,
            prompt_generate: payload.promptGenerate,
            prompt_beat: payload.promptBeat,
            prompt_translate: payload.promptTranslate,
            cookie_id: payload.cookieId ?? 0,
            deep_think: payload.deepThink ?? true,
            search: payload.search ?? true,
        },
    }) as Promise<DeepseekVideoImageGenerateResponse>;
}

/** Trạng thái job DeepSeek Bước 1 (video-image) để poll. */
export function fetchDeepseekVideoImageStatus(
    shortVideoId: number,
): Promise<DeepseekVideoImageStatusResponse> {
    return ajax({
        url: `${BASE_PATH}/deepseek-video-image-status`,
        method: 'POST',
        loading: false,
        data: { short_video_id: shortVideoId, id: shortVideoId },
    }) as Promise<DeepseekVideoImageStatusResponse>;
}

export type DeepseekStep2StartResponse = {
    success?: boolean;
    index?: number;
    job_id?: number;
    status?: string;
    message?: string | { content?: string };
};

export type DeepseekStep2ChunkStatus = {
    index: number;
    status: '' | 'queued' | 'processing' | 'done' | 'error';
    message: string;
    start_order: number;
    /** Link chat DeepSeek của phần này (để mở kiểm tra khi lỗi). */
    chat_url?: string;
};

export type DeepseekStep2StatusResponse = {
    success?: boolean;
    chunks?: DeepseekStep2ChunkStatus[];
    total?: number;
    done?: number;
    error?: number;
    active?: number;
    message?: string | { content?: string };
};

/** Enqueue 1 phần (chunk) của Bước 2 — mỗi phần 1 luồng chat DeepSeek riêng. */
export function startDeepseekStep2Chunk(payload: {
    shortVideoId: number;
    index: number;
    startOrder: number;
    prompt: string;
    cookieId?: number;
    deepThink?: boolean;
    search?: boolean;
}): Promise<DeepseekStep2StartResponse> {
    return ajax({
        url: `${BASE_PATH}/deepseek-video-image-step2-generate`,
        method: 'POST',
        loading: false,
        data: {
            short_video_id: payload.shortVideoId,
            id: payload.shortVideoId,
            index: payload.index,
            start_order: payload.startOrder,
            prompt: payload.prompt,
            cookie_id: payload.cookieId ?? 0,
            deep_think: payload.deepThink ?? true,
            search: payload.search ?? true,
        },
    }) as Promise<DeepseekStep2StartResponse>;
}

/** Trạng thái tất cả phần Bước 2 để poll. */
export function fetchDeepseekStep2Status(shortVideoId: number): Promise<DeepseekStep2StatusResponse> {
    return ajax({
        url: `${BASE_PATH}/deepseek-video-image-step2-status`,
        method: 'POST',
        loading: false,
        data: { short_video_id: shortVideoId, id: shortVideoId },
    }) as Promise<DeepseekStep2StatusResponse>;
}
