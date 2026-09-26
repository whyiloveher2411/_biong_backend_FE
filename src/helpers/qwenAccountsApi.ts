import { ajax } from 'hook/useApi';
import { parseShortVideoApiMessage } from 'helpers/shortVideoApiMessage';

const QWEN_ACCOUNTS_URL = 'plugin/vn4-e-learning/app-mobile/marketing/short-video/tts/qwen-accounts';

export type QwenAccountStatus = 'active' | 'exhausted' | 'error' | 'disabled' | string;

export type QwenAccountItem = {
    id: number;
    email: string;
    title: string;
    status: QwenAccountStatus;
    is_primary: boolean;
    video_used_today: number;
    video_used_date: string;
    total_video_used: number;
    cooldown_until: string;
    cooldown_remaining_sec: number;
    last_used_at: string;
    last_error: string;
    registered_at: string;
    has_token: boolean;
    has_password: boolean;
    has_cookie: boolean;
    token_expires_at: number;
};

export type QwenAccountsResult = {
    success?: boolean;
    message?: string | { content?: string };
    accounts?: QwenAccountItem[];
    current_id?: number;
    cooldown_sec?: number;
    today?: string;
    logged_in?: boolean;
    valid?: boolean;
};

type QwenAccountsAction = 'list' | 'add' | 'update' | 'set_status' | 'delete' | 'seed' | 'login_test';

async function callQwenAccounts(
    action: QwenAccountsAction,
    data: Record<string, unknown> = {},
): Promise<QwenAccountsResult> {
    const result = (await ajax({
        url: QWEN_ACCOUNTS_URL,
        data: { action, ...data },
        loading: false,
    })) as QwenAccountsResult;

    if (!result?.success) {
        throw new Error(parseShortVideoApiMessage(result?.message, 'Thao tác tài khoản Qwen thất bại'));
    }

    return result;
}

export async function fetchQwenAccounts(): Promise<QwenAccountsResult> {
    return callQwenAccounts('list');
}

export async function addQwenAccount(payload: {
    email: string;
    password?: string;
    token?: string;
    cookie?: string;
}): Promise<QwenAccountsResult> {
    return callQwenAccounts('add', payload);
}

export async function updateQwenAccount(
    accountId: number,
    payload: { email: string; password?: string; token?: string; cookie?: string },
): Promise<QwenAccountsResult> {
    return callQwenAccounts('update', { account_id: accountId, id: accountId, ...payload });
}

export async function updateQwenAccountStatus(
    accountId: number,
    status: Exclude<QwenAccountStatus, ''>,
): Promise<QwenAccountsResult> {
    return callQwenAccounts('set_status', { account_id: accountId, id: accountId, status });
}

export async function deleteQwenAccount(accountId: number): Promise<QwenAccountsResult> {
    return callQwenAccounts('delete', { account_id: accountId, id: accountId });
}

export async function seedQwenAccountsFromEnv(): Promise<QwenAccountsResult> {
    return callQwenAccounts('seed');
}

/**
 * Test login 1 tài khoản (cookie, nếu hỏng thì email/password) rồi cập nhật cookie/token mới.
 * Chạy browser nên có thể lâu — tuân thủ setting "hiển thị browser khi convert".
 */
export async function loginTestQwenAccount(accountId: number): Promise<QwenAccountsResult> {
    return callQwenAccounts('login_test', { account_id: accountId, id: accountId });
}
