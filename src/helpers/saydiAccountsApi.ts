import { ajax } from 'hook/useApi';
import { parseShortVideoApiMessage } from 'helpers/shortVideoApiMessage';

const SAYDI_ACCOUNTS_URL = 'plugin/vn4-e-learning/app-mobile/marketing/short-video/tts/saydi-accounts';

export type SaydiAccountStatus = 'active' | 'exhausted' | 'error' | 'disabled' | string;

export type SaydiAccountItem = {
    id: number;
    email: string;
    title: string;
    status: SaydiAccountStatus;
    is_primary: boolean;
    chars_used_today: number;
    chars_used_date: string;
    total_chars_used: number;
    daily_char_limit: number;
    quota_exhausted_at: string;
    last_used_at: string;
    last_error: string;
    registered_at: string;
    user_uid: string;
    has_access_token: boolean;
    has_refresh_token: boolean;
    has_cookie: boolean;
};

export type SaydiAccountsResult = {
    success?: boolean;
    message?: string | { content?: string };
    accounts?: SaydiAccountItem[];
    current_id?: number;
    daily_char_limit?: number;
    today?: string;
};

type SaydiAccountsAction = 'list' | 'set_status' | 'delete' | 'register' | 'seed';

async function callSaydiAccounts(
    action: SaydiAccountsAction,
    data: Record<string, unknown> = {}
): Promise<SaydiAccountsResult> {
    const result = (await ajax({
        url: SAYDI_ACCOUNTS_URL,
        data: { action, ...data },
        loading: false,
    })) as SaydiAccountsResult;

    if (!result?.success) {
        throw new Error(parseShortVideoApiMessage(result?.message, 'Thao tác tài khoản Saydi thất bại'));
    }

    return result;
}

export async function fetchSaydiAccounts(): Promise<SaydiAccountsResult> {
    return callSaydiAccounts('list');
}

export async function updateSaydiAccountStatus(
    accountId: number,
    status: Exclude<SaydiAccountStatus, ''>
): Promise<SaydiAccountsResult> {
    return callSaydiAccounts('set_status', { account_id: accountId, id: accountId, status });
}

export async function deleteSaydiAccount(accountId: number): Promise<SaydiAccountsResult> {
    return callSaydiAccounts('delete', { account_id: accountId, id: accountId });
}

export async function registerSaydiAccount(): Promise<SaydiAccountsResult> {
    return callSaydiAccounts('register');
}

export async function seedSaydiAccountsFromEnv(): Promise<SaydiAccountsResult> {
    return callSaydiAccounts('seed');
}
