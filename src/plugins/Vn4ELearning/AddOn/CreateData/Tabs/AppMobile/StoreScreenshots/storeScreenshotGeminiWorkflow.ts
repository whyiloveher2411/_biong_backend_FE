import { getAccessToken } from 'store/user/user.reducers';
import { getApiHost } from 'helpers/apiHost';
import {
    openExternalTabViaExtension,
    queryStoreScreenshotGeminiEnabled,
    waitForExtensionReady,
} from 'helpers/openExternalTabViaExtension';
import { copyTextToClipboard } from './storeScreenshotClipboard';
import { normalizeFloatingIconsEnabled } from './storeScreenshotDecorOptions';
import { encodeExternalImageUrl } from './storeScreenshotImageUtils';
import { parseDecorStringListForSave } from './storeScreenshotVisualDecorCatalog';

const GEMINI_WEB_APP_URL = 'https://gemini.google.com/u/0/app?pageId=none';

export function resolveFloatingIconsForGemini(input: {
    floating_icons_enabled?: boolean;
    icons?: string[];
    iconsText?: string;
}): string[] {
    const fromArray = (input.icons ?? [])
        .map((item) => String(item || '').trim())
        .filter(Boolean);
    if (fromArray.length > 0) {
        return fromArray;
    }

    return parseDecorStringListForSave(String(input.iconsText || ''), 3);
}

export function buildGeminiStoreScreenshotUrl(input: {
    appMobileId: number;
    screenshotId: string;
    sourceImageUrl: string;
    logoImageUrl?: string;
    layoutReferenceImageUrl?: string;
    usesLogo: boolean;
    headlineOnly?: boolean;
    floatingIconsEnabled?: boolean;
    floatingIcons?: string[];
    headline?: string;
    subtitle?: string;
    brandColor?: string;
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

    if (input.headlineOnly) {
        hashParams.set('store_screenshot_headline_only', '1');
    }

    const floatingIconsEnabled = normalizeFloatingIconsEnabled(input.floatingIconsEnabled);
    hashParams.set('store_screenshot_floating_icons_enabled', floatingIconsEnabled ? '1' : '0');
    if (floatingIconsEnabled) {
        const floatingIcons = (input.floatingIcons ?? [])
            .map((item) => String(item || '').trim())
            .filter(Boolean);
        if (floatingIcons.length > 0) {
            hashParams.set(
                'store_screenshot_floating_icons',
                encodeURIComponent(JSON.stringify(floatingIcons)),
            );
        }
    }

    const headline = String(input.headline || '').trim();
    const subtitle = String(input.subtitle || '').trim();
    const brandColor = String(input.brandColor || '').trim();
    if (headline) {
        hashParams.set('store_screenshot_headline', encodeURIComponent(headline));
    }
    if (subtitle) {
        hashParams.set('store_screenshot_subtitle', encodeURIComponent(subtitle));
    }
    if (brandColor) {
        hashParams.set('store_screenshot_brand_color', encodeURIComponent(brandColor));
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
    headlineOnly?: boolean;
    floatingIconsEnabled?: boolean;
    floatingIcons?: string[];
    headline?: string;
    subtitle?: string;
    brandColor?: string;
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
        headlineOnly: input.headlineOnly,
        floatingIconsEnabled: input.floatingIconsEnabled,
        floatingIcons: input.floatingIcons,
        headline: input.headline,
        subtitle: input.subtitle,
        brandColor: input.brandColor,
    });

    openExternalTabViaExtension(geminiUrl);
}
