import { ajax } from 'hook/useApi';

/**
 * Phong cách script (script style) — dùng lại post type `audio_script_style`.
 * Mỗi phong cách chỉ lưu: title + hướng dẫn (cột style_prompt_template).
 * Mỗi short video thuộc về 1 script style (agent_video_json.audio_script_style_id).
 */
const SCRIPT_STYLE_BASE_PATH = 'plugin/vn4-e-learning/app-mobile/marketing/short-video';

export type ShortVideoScriptStyle = {
    id: number;
    title: string;
    /** Hướng dẫn phong cách script. */
    guide: string;
    /** ready sau khi lưu thủ công. */
    status: string;
};

type ApiMessageLike = { content?: string } | string | undefined;

/** Lấy message dạng string từ result API (message là string hoặc {content}). */
export function parseShortVideoScriptStyleApiMessage(
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

export function listShortVideoScriptStyles(): Promise<{
    success?: boolean;
    styles?: ShortVideoScriptStyle[];
}> {
    return ajax({
        url: `${SCRIPT_STYLE_BASE_PATH}/get-audio-script-styles`,
        method: 'POST',
        loading: false,
        data: {},
    }) as Promise<{ success?: boolean; styles?: ShortVideoScriptStyle[] }>;
}

export function saveShortVideoScriptStyle(payload: {
    id?: number;
    title: string;
    guide: string;
}): Promise<{ success?: boolean; message?: ApiMessageLike; style?: ShortVideoScriptStyle; style_id?: number }> {
    return ajax({
        url: `${SCRIPT_STYLE_BASE_PATH}/save-audio-script-style`,
        method: 'POST',
        loading: false,
        data: {
            id: payload.id ?? 0,
            title: payload.title,
            guide: payload.guide,
        },
    }) as Promise<{ success?: boolean; message?: ApiMessageLike; style?: ShortVideoScriptStyle; style_id?: number }>;
}

export function deleteShortVideoScriptStyle(id: number): Promise<{
    success?: boolean;
    message?: ApiMessageLike;
}> {
    return ajax({
        url: `${SCRIPT_STYLE_BASE_PATH}/delete-audio-script-style`,
        method: 'POST',
        loading: false,
        data: { id },
    }) as Promise<{ success?: boolean; message?: ApiMessageLike }>;
}

/** Gắn/bỏ script style cho short video (0 = bỏ chọn). */
export function saveShortVideoAgentScriptStyle(
    shortVideoId: number,
    styleId: number,
): Promise<{ success?: boolean; message?: ApiMessageLike; audio_script_style_id?: number | null }> {
    return ajax({
        url: `${SCRIPT_STYLE_BASE_PATH}/save-agent-script-style`,
        method: 'POST',
        loading: false,
        data: { short_video_id: shortVideoId, audio_script_style_id: styleId },
    }) as Promise<{ success?: boolean; message?: ApiMessageLike; audio_script_style_id?: number | null }>;
}

/**
 * Hướng dẫn của script style video đang dùng — thay [script-style] khi copy prompt
 * workflow. Trả null khi chưa chọn style / lỗi.
 */
export async function fetchShortVideoAgentScriptStyle(
    shortVideoId: number,
): Promise<{ styleId: number; title: string; guide: string } | null> {
    if (shortVideoId <= 0) {
        return null;
    }
    try {
        const result = (await ajax({
            url: `${SCRIPT_STYLE_BASE_PATH}/get-agent-script-style`,
            method: 'POST',
            loading: false,
            data: { short_video_id: shortVideoId },
        })) as { success?: boolean; style_id?: number; title?: string; guide?: string };
        if (!result?.success) {
            return null;
        }
        return {
            styleId: Number(result.style_id || 0),
            title: String(result.title || ''),
            guide: String(result.guide || ''),
        };
    } catch {
        return null;
    }
}
