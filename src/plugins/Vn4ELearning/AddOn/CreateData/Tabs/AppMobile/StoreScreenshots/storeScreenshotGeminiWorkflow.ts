import { getAccessToken } from 'store/user/user.reducers';
import { getApiHost } from 'helpers/apiHost';
import {
    openExternalTabViaExtension,
    queryStoreScreenshotGeminiEnabled,
    waitForExtensionReady,
} from 'helpers/openExternalTabViaExtension';
import { copyTextToClipboard } from './storeScreenshotClipboard';
import { encodeExternalImageUrl } from './storeScreenshotImageUtils';

const GEMINI_WEB_APP_URL = 'https://gemini.google.com/u/1/app?pageId=none';

export function buildGeminiStoreScreenshotUrl(input: {
    appMobileId: number;
    screenshotId: string;
    sourceImageUrl: string;
    logoImageUrl?: string;
    layoutReferenceImageUrl?: string;
    usesLogo: boolean;
}): string {
    const url = new URL(GEMINI_WEB_APP_URL);
    const accessToken = getAccessToken() ?? '';
    const hashParams = new URLSearchParams({
        copy_store_screenshot_gemini: '1',
        store_screenshot_fill_only: '1',
        store_screenshot_prompt_from_clipboard: '1',
        app_mobile: String(input.appMobileId),
        screenshot_id: input.screenshotId,
        store_screenshot_open_nonce: String(Date.now()),
        store_screenshot_uses_logo: input.usesLogo ? '1' : '0',
        store_screenshot_source_url: encodeExternalImageUrl(input.sourceImageUrl),
        cms_api_host: getApiHost(),
    });

    if (accessToken) {
        hashParams.set('access_token', accessToken);
    }

    if (input.usesLogo && input.logoImageUrl) {
        hashParams.set('store_screenshot_logo_url', encodeExternalImageUrl(input.logoImageUrl));
    }

    const layoutReferenceImageUrl = String(input.layoutReferenceImageUrl || '').trim();
    if (layoutReferenceImageUrl) {
        hashParams.set(
            'store_screenshot_layout_ref_url',
            encodeExternalImageUrl(layoutReferenceImageUrl),
        );
    }

    url.hash = hashParams.toString();
    return url.toString();
}

export type OpenStoreScreenshotGeminiInput = {
    appMobileId: number;
    screenshotId: string;
    prompt: string;
    sourceImageUrl: string;
    logoImageUrl?: string;
    layoutReferenceImageUrl?: string;
    usesLogo: boolean;
};

export async function openStoreScreenshotGemini(input: OpenStoreScreenshotGeminiInput): Promise<void> {
    const prompt = String(input.prompt || '').trim();
    if (!prompt) {
        throw new Error('Prompt trống — hãy điền headline/subtitle trước');
    }

    const sourceImageUrl = String(input.sourceImageUrl || '').trim();
    if (!sourceImageUrl) {
        throw new Error('Screenshot chưa có URL ảnh gốc');
    }

    if (input.usesLogo && !String(input.logoImageUrl || '').trim()) {
        throw new Error('Screenshot cần logo nhưng app chưa có logo');
    }

    const extensionReady = await waitForExtensionReady(8000);
    if (!extensionReady) {
        throw new Error(
            'Chưa phát hiện extension Chrome trên tab CMS này. Hãy reload extension (chrome://extensions), F5 trang CMS (ưu tiên localhost:3030 hoặc local-cms.spacedev.vn), hoặc dùng nút sao chép thủ công.',
        );
    }

    const toggleEnabled = await queryStoreScreenshotGeminiEnabled(4000);
    if (!toggleEnabled) {
        throw new Error(
            'Hãy bật "Store screenshot Gemini" trong extension (nhóm Marketing) rồi thử lại.',
        );
    }

    await copyTextToClipboard(prompt);
    await new Promise((resolve) => window.setTimeout(resolve, 120));

    const geminiUrl = buildGeminiStoreScreenshotUrl({
        appMobileId: input.appMobileId,
        screenshotId: input.screenshotId,
        sourceImageUrl,
        logoImageUrl: input.logoImageUrl,
        layoutReferenceImageUrl: input.layoutReferenceImageUrl,
        usesLogo: input.usesLogo,
    });

    openExternalTabViaExtension(geminiUrl);
}
