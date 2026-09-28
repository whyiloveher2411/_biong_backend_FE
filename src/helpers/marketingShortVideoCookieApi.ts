import { ajax } from 'hook/useApi';
import { getAdminApiPrefix } from 'helpers/apiHost';
import { convertToURL } from 'helpers/url';

const COOKIE_BASE_PATH = 'plugin/vn4-e-learning/app-mobile/marketing/short-video/cookie';

export const SUPPORTED_COOKIE_WEBSITE = 'meta.ai';

/** Cookie định dạng export Chrome (Cookie-Editor). */
export type ShortVideoCookieRaw = {
    name: string;
    value: string;
    domain?: string;
    path?: string;
    secure?: boolean;
    httpOnly?: boolean;
    expirationDate?: number;
    sameSite?: string;
};

export type ShortVideoCookie = {
    id: number;
    title: string;
    website: string;
    description: string;
    cookie_value: string;
    cookie_count?: number;
    cookies?: ShortVideoCookieRaw[];
    /** Unix giây — account hết quota, đang nghỉ tới mốc này (0 = bình thường). */
    cooldown_until?: number;
    created_at?: string;
    updated_at?: string;
};

export type ShortVideoCookieSavePayload = {
    id?: number;
    title: string;
    website: string;
    description?: string;
    cookie_value: string;
};

export type MetaaiCookiePayload = {
    id: number;
    website: string;
    cookies: ShortVideoCookieRaw[];
};

type ApiMessageLike = { content?: string } | string | undefined;

/** Lấy message dạng string từ result API (message là string hoặc {content}). */
export function parseShortVideoCookieApiMessage(
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

export function listShortVideoCookies(website = ''): Promise<{
    success?: boolean;
    website?: string;
    cookies?: ShortVideoCookie[];
}> {
    return ajax({
        url: `${COOKIE_BASE_PATH}/list`,
        method: 'POST',
        loading: false,
        data: { website },
    }) as Promise<{ success?: boolean; website?: string; cookies?: ShortVideoCookie[] }>;
}

export function saveShortVideoCookie(payload: ShortVideoCookieSavePayload): Promise<{
    success?: boolean;
    cookie?: ShortVideoCookie;
    cookie_id?: number;
}> {
    return ajax({
        url: `${COOKIE_BASE_PATH}/save`,
        method: 'POST',
        loading: false,
        data: {
            id: payload.id ?? 0,
            title: payload.title,
            website: payload.website,
            description: payload.description ?? '',
            cookie_value: payload.cookie_value,
        },
    }) as Promise<{ success?: boolean; cookie?: ShortVideoCookie; cookie_id?: number }>;
}

export function deleteShortVideoCookies(ids: number[], website = ''): Promise<{
    success?: boolean;
    deleted?: number;
    deleted_ids?: number[];
}> {
    return ajax({
        url: `${COOKIE_BASE_PATH}/delete`,
        method: 'POST',
        loading: false,
        data: { ids, website },
    }) as Promise<{ success?: boolean; deleted?: number; deleted_ids?: number[] }>;
}

/** Bỏ cooldown (hết quota) cho 1 cookie/account — dùng lại ngay. */
export function clearShortVideoCookieCooldown(cookieId: number, website = ''): Promise<{
    success?: boolean;
    message?: string | { content?: string };
    cookie_id?: number;
}> {
    return ajax({
        url: `${COOKIE_BASE_PATH}/clear-cooldown`,
        method: 'POST',
        loading: false,
        data: { cookie_id: cookieId, website },
    }) as Promise<{ success?: boolean; message?: string | { content?: string }; cookie_id?: number }>;
}

/**
 * Test đăng nhập 1 cookie Meta.ai: BE mở Chrome Ở CHẾ ĐỘ GUI (hiện cửa sổ) với đúng
 * cookie đã lưu để user tự đánh giá cookie còn dùng được hay không. Trả về ngay sau
 * khi khởi chạy (browser giữ mở tới khi user đóng).
 */
export function testLoginShortVideoCookie(
    cookieId: number,
    website = SUPPORTED_COOKIE_WEBSITE,
): Promise<{
    success?: boolean;
    message?: string | { content?: string };
    pid?: number;
    cookie_id?: number;
    log?: string;
}> {
    return ajax({
        url: `${COOKIE_BASE_PATH}/test-login`,
        method: 'POST',
        loading: false,
        data: { cookie_id: cookieId, website },
    }) as Promise<{
        success?: boolean;
        message?: string | { content?: string };
        pid?: number;
        cookie_id?: number;
        log?: string;
    }>;
}

/**
 * Cookie dùng cho luồng MỞ chatbot qua extension (tự set cookie trước khi mở tab):
 * - cookieId > 0 → dùng đúng cookie đã lưu với beat (mở lại chat cũ — session
 *   Meta gắn account);
 * - cookieId = 0 → round-robin (BE tăng con trỏ tuần tự).
 * Trả null khi chưa có cookie hợp lệ.
 */
export async function fetchShortVideoCookieForOpen(
    website = SUPPORTED_COOKIE_WEBSITE,
    cookieId = 0,
): Promise<MetaaiCookiePayload | null> {
    const result = (await ajax({
        url: `${COOKIE_BASE_PATH}/get`,
        method: 'POST',
        loading: false,
        data: { website, cookie_id: cookieId },
    })) as {
        success?: boolean;
        cookie?: { id?: number; website?: string; cookies?: ShortVideoCookieRaw[] };
    };

    const cookieRaw = result?.cookie;
    const rawCookies = cookieRaw?.cookies;
    const cookies = Array.isArray(rawCookies) ? rawCookies : [];
    if (!result?.success || !cookies.length) {
        return null;
    }

    return {
        id: Number(cookieRaw?.id || 0),
        website: String(cookieRaw?.website || website),
        cookies,
    };
}

/** Validate JSON cookie export (Cookie-Editor): danh sách cookie có name/value. */
export function validateShortVideoCookieJson(cookieValue: string): {
    ok: boolean;
    cookies: ShortVideoCookieRaw[];
    error?: string;
} {
    const text = String(cookieValue || '').trim();
    if (!text) {
        return { ok: false, cookies: [], error: 'Chưa nhập cookie JSON' };
    }
    let decoded: unknown;
    try {
        decoded = JSON.parse(text);
    } catch (e) {
        return { ok: false, cookies: [], error: 'Cookie JSON không hợp lệ' };
    }
    if (Array.isArray(decoded)) {
        const cookies = decoded.filter((item) => item && typeof item === 'object' && String((item as Record<string, unknown>).name || '').trim() && String((item as Record<string, unknown>).value || '').trim()) as ShortVideoCookieRaw[];
        if (!cookies.length) {
            return { ok: false, cookies: [], error: 'Cookie JSON không có cookie hợp lệ (name + value)' };
        }
        return { ok: true, cookies };
    }
    if (decoded && typeof decoded === 'object') {
        const cookies: ShortVideoCookieRaw[] = [];
        for (const [name, value] of Object.entries(decoded as Record<string, unknown>)) {
            if (!name.trim()) {
                continue;
            }
            cookies.push({ name, value: typeof value === 'string' ? value : String(value) });
        }
        if (!cookies.length) {
            return { ok: false, cookies: [], error: 'Cookie JSON không có cookie hợp lệ (name + value)' };
        }
        return { ok: true, cookies };
    }
    return { ok: false, cookies: [], error: 'Cookie JSON phải là danh sách cookie hoặc map name=>value' };
}

/**
 * Dựng fragment payload `metaai_cookie` cho event extension mở Meta.ai:
 * cookieId > 0 → cookie đã lưu với beat; ngược lại → round-robin.
 * KHÔNG swallow lỗi — nếu không load được cookie mà vẫn mở tab, extension sẽ
 * không set cookie và tab dùng cookie còn sót của beat trước → sai account.
 * Throw để caller đánh dấu beat lỗi thay vì mở tab cookie sai.
 */
export async function metaaiCookiePayloadForOpen(cookieId = 0): Promise<Record<string, unknown>> {
    let cookie: MetaaiCookiePayload | null = null;
    try {
        cookie = await fetchShortVideoCookieForOpen(SUPPORTED_COOKIE_WEBSITE, cookieId);
    } catch (e) {
        throw new Error(
            `Cookie meta.ai (id ${cookieId}) — ${
                e instanceof Error && e.message ? e.message : 'không load được cookie'
            }`,
        );
    }
    if (!cookie) {
        throw new Error(
            `Không load được cookie meta.ai (id ${cookieId}) — kiểm tra Quản lý cookie hoặc cookie_id của beat`,
        );
    }
    return { metaai_cookie: cookie };
}

export type RecordCanvaFlowResult = {
    success?: boolean;
    message?: string | { content?: string };
    pid?: number;
    out_dir?: string;
    stdout_log?: string;
    stderr_log?: string;
    image_path?: string;
    beat_id?: string;
    short_video_id?: number;
};

/**
 * RECORDER Canva (DEV): mở Chrome GUI với cookie pool canva.com và ghi lại thao tác thủ
 * công (upload ảnh beat → Image to Video → Generate → Download). Người dùng bấm "End test"
 * trong overlay để lưu log vào storage/logs/canva-record/. Trả về ngay sau khi mở browser.
 */
export function recordCanvaFlow(
    shortVideoId: number,
    beatId = '',
): Promise<RecordCanvaFlowResult> {
    return ajax({
        url: `${COOKIE_BASE_PATH}/record-canva`,
        method: 'POST',
        loading: false,
        data: { short_video_id: shortVideoId, beat_id: beatId },
    }) as Promise<RecordCanvaFlowResult>;
}

export function shortVideoCookieApiUrl(suffix: string): string {
    return convertToURL(
        getAdminApiPrefix(),
        `plugin/vn4-e-learning/app-mobile/marketing/short-video/cookie/${suffix}`,
    );
}
