import { getAdminApiPrefix } from 'helpers/apiHost';
import { getLanguage } from 'helpers/i18n';
import type { ImageObjectProps } from 'helpers/image';
import { convertToURL } from 'helpers/url';
import type { StoreScreenshotProjectResponse, StoreScreenshotTemplate } from './storeScreenshotTypes';
import { STORE_SCREENSHOT_API } from './storeScreenshotConstants';

const language = getLanguage();

type AjaxOptions = {
    url: string;
    data?: Record<string, unknown>;
    loading?: boolean;
};

async function postJson<T>(options: AjaxOptions): Promise<T> {
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Origin: '',
    };

    const token = localStorage.getItem('access_token');
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const data = {
        ...(options.data || {}),
        __l: window.btoa(`${language.code}#${Date.now()}`),
    };

    const response = await fetch(convertToURL(getAdminApiPrefix(), options.url), {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
    });

    const result = await response.json();
    if (result?.require_login) {
        throw new Error('Phiên đăng nhập hết hạn — hãy tải lại trang');
    }
    if (!response.ok || result?.success === false) {
        const message = typeof result?.message === 'string'
            ? result.message
            : result?.message?.text || 'Yêu cầu thất bại';
        throw new Error(message);
    }

    return result as T;
}

export async function fetchStoreScreenshotProject(appMobileId: number): Promise<StoreScreenshotProjectResponse> {
    return postJson<StoreScreenshotProjectResponse>({
        url: `${STORE_SCREENSHOT_API}/get-project`,
        data: { app_mobile: appMobileId },
    });
}

export async function saveStoreScreenshotActiveStep(
    appMobileId: number,
    activeStepId: string,
): Promise<StoreScreenshotProjectResponse> {
    return postJson<StoreScreenshotProjectResponse>({
        url: `${STORE_SCREENSHOT_API}/save-active-step`,
        data: {
            app_mobile: appMobileId,
            active_step_id: activeStepId,
        },
    });
}

export async function saveStoreScreenshotActiveScreenshot(
    appMobileId: number,
    screenshotId: string,
): Promise<StoreScreenshotProjectResponse> {
    return postJson<StoreScreenshotProjectResponse>({
        url: `${STORE_SCREENSHOT_API}/save-active-screenshot`,
        data: {
            app_mobile: appMobileId,
            active_mapping_screenshot_id: screenshotId,
        },
    });
}

export type StoreScreenshotMetadataInput = {
    description: string;
    promotional_text: string;
    keywords: string;
};

export async function saveStoreScreenshotMetadata(
    appMobileId: number,
    fields: StoreScreenshotMetadataInput,
): Promise<StoreScreenshotProjectResponse> {
    return postJson<StoreScreenshotProjectResponse>({
        url: `${STORE_SCREENSHOT_API}/save-metadata`,
        data: {
            app_mobile: appMobileId,
            description: fields.description,
            promotional_text: fields.promotional_text,
            keywords: fields.keywords,
        },
    });
}

export type StoreScreenshotCaptionPayload = {
    id: string;
    caption: string;
    copy_style_preset?: string;
};

export async function saveStoreScreenshotCaptions(
    appMobileId: number,
    captions: StoreScreenshotCaptionPayload[],
): Promise<StoreScreenshotProjectResponse> {
    return postJson<StoreScreenshotProjectResponse>({
        url: `${STORE_SCREENSHOT_API}/save-captions`,
        data: {
            app_mobile: appMobileId,
            captions,
        },
    });
}

export async function syncStoreScreenshotsFromImages(
    appMobileId: number,
    images: ImageObjectProps[],
): Promise<StoreScreenshotProjectResponse> {
    return postJson<StoreScreenshotProjectResponse>({
        url: `${STORE_SCREENSHOT_API}/sync-screenshots`,
        data: {
            app_mobile: appMobileId,
            images,
        },
    });
}

export async function deleteStoreScreenshot(
    appMobileId: number,
    screenshotId: string,
): Promise<StoreScreenshotProjectResponse> {
    return postJson<StoreScreenshotProjectResponse>({
        url: `${STORE_SCREENSHOT_API}/delete-screenshot`,
        data: { app_mobile: appMobileId, screenshot_id: screenshotId },
    });
}

export async function reorderStoreScreenshots(
    appMobileId: number,
    orders: string[],
): Promise<StoreScreenshotProjectResponse> {
    return postJson<StoreScreenshotProjectResponse>({
        url: `${STORE_SCREENSHOT_API}/reorder`,
        data: { app_mobile: appMobileId, orders },
    });
}

export async function saveStoreScreenshotTemplate(
    appMobileId: number,
    template: StoreScreenshotTemplate,
): Promise<StoreScreenshotProjectResponse> {
    return postJson<StoreScreenshotProjectResponse>({
        url: `${STORE_SCREENSHOT_API}/save-template`,
        data: {
            app_mobile: appMobileId,
            template,
        },
    });
}

export type StoreScreenshotAiContentPayload = {
    id: string;
    headline: Record<string, string>;
    subtitle: Record<string, string>;
    crop_target_size?: string;
    logo_placement?: string;
    floating_icons_enabled?: boolean;
    background_pattern?: string;
    feature_highlight?: string;
    background_color?: string;
    ai_prompt: string;
    ai_image?: ImageObjectProps | null;
};

export async function saveStoreScreenshotAiContent(
    appMobileId: number,
    screenshots: StoreScreenshotAiContentPayload[],
): Promise<StoreScreenshotProjectResponse> {
    return postJson<StoreScreenshotProjectResponse>({
        url: `${STORE_SCREENSHOT_API}/save-ai-content`,
        data: {
            app_mobile: appMobileId,
            screenshots,
        },
    });
}

export async function generateStoreScreenshots(
    appMobileId: number,
): Promise<StoreScreenshotProjectResponse> {
    return postJson<StoreScreenshotProjectResponse>({
        url: `${STORE_SCREENSHOT_API}/generate`,
        data: { app_mobile: appMobileId },
    });
}

export async function exportStoreScreenshots(
    appMobileId: number,
): Promise<StoreScreenshotProjectResponse> {
    return postJson<StoreScreenshotProjectResponse>({
        url: `${STORE_SCREENSHOT_API}/export`,
        data: { app_mobile: appMobileId },
    });
}

type FetchSourceImageResponse = {
    success?: boolean;
    content_type?: string;
    data_base64?: string;
    message?: string | { text?: string };
};

export async function fetchStoreScreenshotSourceImageBlob(
    appMobileId: number,
    screenshotId: string,
): Promise<Blob> {
    const result = await postJson<FetchSourceImageResponse>({
        url: `${STORE_SCREENSHOT_API}/fetch-source-image`,
        data: {
            app_mobile: appMobileId,
            screenshot_id: screenshotId,
        },
    });

    const base64 = String(result.data_base64 || '').trim();
    if (!base64) {
        throw new Error('API không trả dữ liệu ảnh');
    }

    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }

    return new Blob([bytes], { type: result.content_type || 'image/png' });
}

export async function fetchStoreScreenshotAppLogoBlob(appMobileId: number): Promise<Blob> {
    const result = await postJson<FetchSourceImageResponse>({
        url: `${STORE_SCREENSHOT_API}/fetch-app-logo`,
        data: {
            app_mobile: appMobileId,
        },
    });

    const base64 = String(result.data_base64 || '').trim();
    if (!base64) {
        throw new Error('API không trả dữ liệu logo');
    }

    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }

    return new Blob([bytes], { type: result.content_type || 'image/png' });
}
