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
    /** JSON/DevTools localStorage (chỉ DeepSeek Cookie dùng — token login nằm ở localStorage). */
    local_storage?: string;
    cookie_count?: number;
    cookies?: ShortVideoCookieRaw[];
    /** Unix giây — account hết quota, đang nghỉ tới mốc này (0 = bình thường). */
    cooldown_until?: number;
    /** Leonardo: số video đã generate trong ngày / giới hạn ngày / còn lại. */
    daily_used?: number;
    daily_limit?: number;
    daily_remaining?: number;
    created_at?: string;
    updated_at?: string;
};

export type ShortVideoCookieSavePayload = {
    id?: number;
    title: string;
    website: string;
    description?: string;
    cookie_value: string;
    local_storage?: string;
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
            local_storage: payload.local_storage ?? '',
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
 * Leonardo: đánh dấu / bỏ đánh dấu account "đã dùng hết lượt generate hôm nay" (để test).
 */
export function setLeonardoCookieUsage(
    cookieId: number,
    consumed: boolean,
    website = 'app.leonardo.ai',
): Promise<{
    success?: boolean;
    message?: string | { content?: string };
    cookie_id?: number;
    daily_used?: number;
    daily_limit?: number;
    daily_remaining?: number;
}> {
    return ajax({
        url: `${COOKIE_BASE_PATH}/leonardo-usage`,
        method: 'POST',
        loading: false,
        data: { cookie_id: cookieId, website, consumed: consumed ? 1 : 0 },
    }) as Promise<{
        success?: boolean;
        message?: string | { content?: string };
        cookie_id?: number;
        daily_used?: number;
        daily_limit?: number;
        daily_remaining?: number;
    }>;
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

/** Tên cột bảng cookie DevTools → key cookie. */
const DEVTOOLS_COOKIE_HEADER_KEYS: Record<string, string> = {
    name: 'name',
    value: 'value',
    domain: 'domain',
    path: 'path',
    expires: 'expires',
    size: 'size',
    httponly: 'httpOnly',
    secure: 'secure',
    samesite: 'sameSite',
};

function parseDevtoolsCookieBoolean(cell: string | undefined): boolean | undefined {
    const v = String(cell ?? '').trim().toLowerCase();
    if (!v) return undefined;
    if (v === '✓' || v === 'true' || v === 'yes' || v === '1') return true;
    if (v === 'false' || v === 'no' || v === '0') return false;
    return undefined;
}

/**
 * Parse bảng cookie copy từ Chrome DevTools (tab-separated). Cột mặc định:
 * Name, Value, Domain, Path, Expires, Size, HttpOnly, Secure, SameSite, …
 * (hỗ trợ cả khi có dòng header). Dùng cho site không export được cookie qua
 * extension (vd chat.deepseek.com — cookie httpOnly).
 */
export function parseDevtoolsCookieTable(text: string): ShortVideoCookieRaw[] {
    const lines = String(text || '')
        .split(/\r?\n/)
        .map((line) => line.replace(/\r$/, ''))
        .filter((line) => line.trim() !== '');
    if (lines.length === 0 || !lines.some((line) => line.includes('\t'))) {
        return [];
    }

    let indexMap: Record<string, number> | null = null;
    let start = 0;
    const firstCells = lines[0].split('\t').map((cell) => cell.trim().toLowerCase());
    if (
        firstCells.includes('name')
        && firstCells.includes('value')
        && (firstCells.includes('domain') || firstCells.includes('path'))
    ) {
        const headerIndexMap: Record<string, number> = {};
        firstCells.forEach((cell, i) => {
            const key = DEVTOOLS_COOKIE_HEADER_KEYS[cell.replace(/\s+/g, '')];
            if (key) {
                headerIndexMap[key] = i;
            }
        });
        indexMap = headerIndexMap;
        start = 1;
    }

    const out: ShortVideoCookieRaw[] = [];
    for (let i = start; i < lines.length; i++) {
        const cells = lines[i].split('\t');
        const get = (key: string, fallbackIndex: number): string => {
            const idx = indexMap && indexMap[key] !== undefined ? indexMap[key] : fallbackIndex;
            return String(cells[idx] ?? '').trim();
        };

        const name = get('name', 0);
        if (!name) {
            continue;
        }

        const cookie: ShortVideoCookieRaw = {
            name,
            value: get('value', 1),
            domain: get('domain', 2) || undefined,
            path: get('path', 3) || '/',
        };

        const expires = get('expires', 4);
        if (expires && !/^session$/i.test(expires)) {
            const ts = Date.parse(expires);
            if (!Number.isNaN(ts)) {
                cookie.expirationDate = Math.floor(ts / 1000);
            }
        }

        const httpOnly = parseDevtoolsCookieBoolean(get('httpOnly', 6));
        if (httpOnly !== undefined) {
            cookie.httpOnly = httpOnly;
        }
        const secure = parseDevtoolsCookieBoolean(get('secure', 7));
        if (secure !== undefined) {
            cookie.secure = secure;
        }
        const sameSite = get('sameSite', 8);
        if (sameSite) {
            cookie.sameSite = sameSite;
        }

        out.push(cookie);
    }

    return out;
}

/**
 * Chuẩn hoá cookie người dùng dán vào field: nhận JSON Cookie-Editor (array hoặc
 * map name=>value) HOẶC bảng tab-separated copy từ Chrome DevTools. Trả về danh sách
 * cookie + chuỗi JSON đã chuẩn hoá để lưu.
 */
export function normalizeShortVideoCookieValue(cookieValue: string): {
    ok: boolean;
    cookies: ShortVideoCookieRaw[];
    value: string;
    format: 'json' | 'devtools' | 'none';
    error?: string;
} {
    const text = String(cookieValue || '').trim();
    if (!text) {
        return { ok: false, cookies: [], value: '', format: 'none', error: 'Chưa nhập cookie' };
    }

    try {
        const decoded = JSON.parse(text);
        if (Array.isArray(decoded)) {
            const cookies = decoded.filter((item) => item && typeof item === 'object' && String((item as Record<string, unknown>).name || '').trim() && String((item as Record<string, unknown>).value || '').trim()) as ShortVideoCookieRaw[];
            if (cookies.length) {
                return { ok: true, cookies, value: JSON.stringify(cookies), format: 'json' };
            }
            return { ok: false, cookies: [], value: '', format: 'none', error: 'Cookie JSON không có cookie hợp lệ (name + value)' };
        }
        if (decoded && typeof decoded === 'object') {
            const cookies: ShortVideoCookieRaw[] = [];
            for (const [name, value] of Object.entries(decoded as Record<string, unknown>)) {
                if (!name.trim()) {
                    continue;
                }
                cookies.push({ name, value: typeof value === 'string' ? value : String(value) });
            }
            if (cookies.length) {
                return { ok: true, cookies, value: JSON.stringify(cookies), format: 'json' };
            }
            return { ok: false, cookies: [], value: '', format: 'none', error: 'Cookie JSON không có cookie hợp lệ (name + value)' };
        }
        return { ok: false, cookies: [], value: '', format: 'none', error: 'Cookie JSON phải là danh sách cookie hoặc map name=>value' };
    } catch {
        // Không phải JSON → thử bảng cookie DevTools.
    }

    const devtools = parseDevtoolsCookieTable(text);
    if (devtools.length) {
        return { ok: true, cookies: devtools, value: JSON.stringify(devtools), format: 'devtools' };
    }

    return {
        ok: false,
        cookies: [],
        value: '',
        format: 'none',
        error: 'Cookie không hợp lệ — dán JSON Cookie-Editor hoặc bảng cookie copy từ DevTools (tab-separated)',
    };
}

/** Validate cookie người dùng dán (JSON Cookie-Editor hoặc bảng DevTools). */
export function validateShortVideoCookieJson(cookieValue: string): {
    ok: boolean;
    cookies: ShortVideoCookieRaw[];
    error?: string;
} {
    const res = normalizeShortVideoCookieValue(cookieValue);
    return { ok: res.ok, cookies: res.cookies, error: res.error };
}

/**
 * Dựng fragment payload `metaai_cookie` cho event extension mở Meta.ai:
 * cookieId > 0 → cookie đã lưu với beat; ngược lại → round-robin.
 * KHÔNG swallow lỗi — nếu không load được cookie mà vẫn mở tab, extension sẽ
 * không set cookie và tab dùng cookie còn sót của beat trước → sai account.
 * Throw để caller đánh dấu beat lỗi thay vì mở tab cookie sai.
 */
export type LocalStorageEntry = { key: string; value: string };

/**
 * Chuẩn hoá localStorage user dán: JSON object {"k":"v"}, JSON array [{key/name,value}],
 * hoặc bảng "Key<TAB>Value" copy từ Chrome DevTools (Application → Local Storage).
 * value trả về là JSON object string để lưu vào field local_storage.
 */
export function normalizeShortVideoLocalStorage(text: string): {
    ok: boolean;
    entries: LocalStorageEntry[];
    value: string;
    error?: string;
} {
    const raw = String(text || '').trim();
    if (raw === '') {
        return { ok: true, entries: [], value: '' };
    }

    const entries: LocalStorageEntry[] = [];
    try {
        const decoded = JSON.parse(raw);
        if (Array.isArray(decoded)) {
            decoded.forEach((item) => {
                if (!item || typeof item !== 'object') {
                    return;
                }
                const rec = item as Record<string, unknown>;
                const key = String(rec.key ?? rec.name ?? '').trim();
                if (!key) {
                    return;
                }
                entries.push({ key, value: String(rec.value ?? '') });
            });
        } else if (decoded && typeof decoded === 'object') {
            Object.entries(decoded as Record<string, unknown>).forEach(([key, value]) => {
                if (!key.trim()) {
                    return;
                }
                entries.push({ key, value: typeof value === 'string' ? value : JSON.stringify(value) });
            });
        }
    } catch {
        const lines = raw
            .split(/\r?\n/)
            .map((line) => line.replace(/\r$/, ''))
            .filter((line) => line.trim() !== '');
        lines.forEach((line, index) => {
            if (!line.includes('\t')) {
                return;
            }
            const [keyPart, valuePart = ''] = line.split('\t');
            const key = keyPart.trim();
            if (!key) {
                return;
            }
            if (index === 0 && key.toLowerCase() === 'key' && valuePart.trim().toLowerCase() === 'value') {
                return;
            }
            entries.push({ key, value: valuePart });
        });
    }

    if (entries.length === 0) {
        // Token thô DeepSeek dán trực tiếp (userToken) — gói thành {userToken: <token>}.
        const looksLikeRawToken = !raw.includes('\t')
            && !raw.includes('\n')
            && !raw.includes('{')
            && raw.length >= 16;
        if (looksLikeRawToken) {
            return { ok: true, entries: [{ key: 'userToken', value: raw }], value: JSON.stringify({ userToken: raw }) };
        }
        return {
            ok: false,
            entries: [],
            value: '',
            error: 'LocalStorage không hợp lệ — dán JSON object, bảng Key/Value từ DevTools, hoặc token userToken',
        };
    }

    const map: Record<string, string> = {};
    entries.forEach((entry) => {
        map[entry.key] = entry.value;
    });

    return { ok: true, entries, value: JSON.stringify(map) };
}

export type CookieLoginProbeResult = {
    success?: boolean;
    logged_in?: boolean | null;
    url?: string;
    title?: string;
    cookie_count?: number;
    storage_keys?: string[];
    storage?: Record<string, string>;
    message?: string | { content?: string };
    error?: string;
};

/**
 * Probe đăng nhập (headless): BE mở browser với cookie + localStorage đã lưu, dò trạng thái
 * đăng nhập và trả về các key localStorage hiện có.
 */
export function probeShortVideoCookieLogin(
    cookieId: number,
    website = SUPPORTED_COOKIE_WEBSITE,
): Promise<CookieLoginProbeResult> {
    return ajax({
        url: `${COOKIE_BASE_PATH}/test-login-probe`,
        method: 'POST',
        loading: true,
        data: { cookie_id: cookieId, website },
    }) as Promise<CookieLoginProbeResult>;
}

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
    mode?: string;
    out_dir?: string;
    stdout_log?: string;
    stderr_log?: string;
    image_path?: string;
    beat_id?: string;
    short_video_id?: number;
    cookies_path?: string;
    cookie_count?: number;
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

/**
 * RECORDER ĐĂNG KÝ Canva (DEV): mở Chrome từ PROFILE SẠCH (không cần cookie pool) tại
 * trang signup để user ghi lại thao tác tạo tài khoản mới. Khi bấm "End test", runner lưu
 * log + cookies-export.json (cookie account vừa tạo) vào storage/logs/canva-record/.
 */
export function recordCanvaSignupFlow(): Promise<RecordCanvaFlowResult> {
    return ajax({
        url: `${COOKIE_BASE_PATH}/record-canva-signup`,
        method: 'POST',
        loading: false,
        data: {},
    }) as Promise<RecordCanvaFlowResult>;
}

/**
 * RECORDER Leonardo (DEV): mở Chrome GUI với cookie pool app.leonardo.ai và ghi lại thao
 * tác thủ công (upload ảnh beat → chọn model Video/Motion → Generate → Download). Người
 * dùng bấm "End test" trong overlay để lưu log vào storage/logs/leonardo-record/.
 */
export function recordLeonardoFlow(
    shortVideoId: number,
    beatId = '',
): Promise<RecordCanvaFlowResult> {
    return ajax({
        url: `${COOKIE_BASE_PATH}/record-leonardo`,
        method: 'POST',
        loading: false,
        data: { short_video_id: shortVideoId, beat_id: beatId },
    }) as Promise<RecordCanvaFlowResult>;
}

/**
 * RECORDER DeepSeek (DEV): mở Chrome GUI với cookie pool chat.deepseek.com và ghi lại thao
 * tác thủ công với website DeepSeek (gõ prompt → gửi → đợi phản hồi). Người dùng bấm "End
 * test" trong overlay để lưu log vào storage/logs/deepseek-record/.
 */
export function recordDeepseekFlow(
    shortVideoId = 0,
    beatId = '',
): Promise<RecordCanvaFlowResult> {
    return ajax({
        url: `${COOKIE_BASE_PATH}/record-deepseek`,
        method: 'POST',
        loading: false,
        data: { short_video_id: shortVideoId, beat_id: beatId },
    }) as Promise<RecordCanvaFlowResult>;
}

export type SignupCanvaResult = {
    success?: boolean;
    message?: string | { content?: string };
    email?: string;
    out_dir?: string;
    cookie_id?: number;
    cookie_count?: number;
    session_id?: string;
    otp?: string;
    subject?: string;
};

/** BƯỚC 1 (hybrid): mở browser đăng ký Canva + copy email vào clipboard. */
export function startCanvaSignupSession(email: string): Promise<SignupCanvaResult> {
    return ajax({
        url: `${COOKIE_BASE_PATH}/signup-canva-start`,
        method: 'POST',
        loading: false,
        data: { email },
    }) as Promise<SignupCanvaResult>;
}

/** BƯỚC 2 (hybrid): chờ + lấy OTP từ Gmail (poll 5s/lần, tối đa 60s). */
export function checkCanvaSignupOtp(payload: {
    session_id: string;
    gmail_password: string;
    label?: string;
}): Promise<SignupCanvaResult> {
    return ajax({
        url: `${COOKIE_BASE_PATH}/signup-canva-otp`,
        method: 'POST',
        loading: false,
        data: {
            session_id: payload.session_id,
            gmail_password: payload.gmail_password,
            label: payload.label ?? '',
        },
    }) as Promise<SignupCanvaResult>;
}

/** BƯỚC 3 (hybrid): lưu account + cookie từ browser đang mở. */
export function saveCanvaSignupAccount(payload: {
    session_id: string;
    email: string;
    label?: string;
}): Promise<SignupCanvaResult> {
    return ajax({
        url: `${COOKIE_BASE_PATH}/signup-canva-save`,
        method: 'POST',
        loading: false,
        data: {
            session_id: payload.session_id,
            email: payload.email,
            label: payload.label ?? '',
        },
    }) as Promise<SignupCanvaResult>;
}

/** Huỷ phiên đăng ký Canva (đóng browser). */
export function cancelCanvaSignupSession(sessionId: string): Promise<SignupCanvaResult> {
    return ajax({
        url: `${COOKIE_BASE_PATH}/signup-canva-cancel`,
        method: 'POST',
        loading: false,
        data: { session_id: sessionId },
    }) as Promise<SignupCanvaResult>;
}

export function shortVideoCookieApiUrl(suffix: string): string {
    return convertToURL(
        getAdminApiPrefix(),
        `plugin/vn4-e-learning/app-mobile/marketing/short-video/cookie/${suffix}`,
    );
}
