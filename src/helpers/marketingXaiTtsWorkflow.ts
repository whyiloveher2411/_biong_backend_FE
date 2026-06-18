import { getAccessToken } from 'store/user/user.reducers';
import { getApiHost } from 'helpers/apiHost';
import { convertToURL } from 'helpers/url';
import {
    openExternalTabViaExtension,
    waitForExtensionTabBridge,
} from 'helpers/openExternalTabViaExtension';

const XAI_PLAYGROUND_URL = 'https://console.x.ai/playground/voice/text-to-speech';

function pluginApiPath(suffix: string): string {
    return convertToURL(
        getApiHost(),
        `/api/admin/plugin/vn4-e-learning/app-mobile/marketing/tts/${suffix}`
    );
}

export function marketingXaiTtsPayloadApiUrl(): string {
    return pluginApiPath('get-xai-browser-payload');
}

export function marketingXaiTtsUploadApiUrl(): string {
    return pluginApiPath('upload-from-xai-browser');
}

export function marketingXaiTtsUploadPartApiUrl(): string {
    return pluginApiPath('upload-from-xai-browser-part');
}

export type MarketingXaiTtsPayload = {
    success?: boolean;
    message?: string;
    open_link?: string;
    marketing_post_id?: number;
    target_lang?: string;
    langs_pending?: string[];
    langs_remaining?: string[];
    chunk_count?: number;
};

export async function openMarketingXaiTtsWorkflow(options: {
    postId: number;
    targetLang?: string | null;
}): Promise<MarketingXaiTtsPayload> {
    const postId = Number(options.postId || 0);
    if (!Number.isInteger(postId) || postId <= 0) {
        throw new Error('Thiếu post id');
    }

    const token = getAccessToken() ?? '';
    const url = new URL(marketingXaiTtsPayloadApiUrl());
    url.searchParams.set('marketing_post_id', String(postId));
    const targetLang = String(options.targetLang || '').trim().toLowerCase();
    if (targetLang) {
        url.searchParams.set('target_lang', targetLang);
    }
    if (token) {
        url.searchParams.set('access_token', token);
    }

    const res = await fetch(url.toString(), {
        method: 'GET',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const json = (await res.json()) as MarketingXaiTtsPayload;
    if (!json?.success || !json.open_link) {
        throw new Error(json?.message || 'Không mở được xAI Playground');
    }

    await waitForExtensionTabBridge(3000);
    openExternalTabViaExtension(json.open_link);
    return json;
}

export function buildMarketingXaiTtsOpenLink(options: {
    postId: number;
    targetLang: string;
    accessToken?: string;
}): string {
    const { postId, targetLang } = options;
    const accessToken = options.accessToken ?? getAccessToken() ?? '';
    const hashParams = new URLSearchParams({
        copy_xai_tts: '1',
        marketing_post_id: String(postId),
        target_lang: targetLang.trim().toLowerCase(),
        payload_api_url: marketingXaiTtsPayloadApiUrl(),
    });
    if (accessToken) {
        hashParams.set('access_token', accessToken);
    }
    return `${XAI_PLAYGROUND_URL}#${hashParams.toString()}`;
}
