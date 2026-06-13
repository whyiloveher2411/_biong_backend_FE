import { getAdminApiPrefix } from './apiHost';
import { getLanguage } from './i18n';
import { convertToURL, validURL } from "./url";

export interface ImageObjectProps {
    [key: string]: ANY,
    link: string,
    type_link: string,
    ext: string,
    width: number,
    height: number
}


export function getImageUrl(img?: string | ImageObjectProps): string {

    if (!img) {
        return '';
    }

    if (typeof img === 'string') {
        img = JSON.parse(img);
    }

    if (img && typeof img === 'object') {
        return validURL(img.link) ? img.link : convertToURL(process.env.REACT_APP_BASE_URL, img.link);
    }

    return '';
}

function loadImageElement(url: string, useCors: boolean): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        if (useCors) {
            img.crossOrigin = 'anonymous';
        }
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Không tải được ảnh'));
        img.src = url;
    });
}

async function imageElementToPngBlob(img: HTMLImageElement): Promise<Blob> {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Không tạo được canvas');
    }
    ctx.drawImage(img, 0, 0);

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob);
                return;
            }
            reject(new Error('Không chuyển ảnh sang PNG'));
        }, 'image/png');
    });
}

async function blobToPngBlob(blob: Blob): Promise<Blob> {
    if (blob.type === 'image/png') {
        return blob;
    }
    const objectUrl = URL.createObjectURL(blob);
    try {
        const img = await loadImageElement(objectUrl, false);
        return imageElementToPngBlob(img);
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

type FetchImageForClipboardResponse = {
    success?: boolean;
    require_login?: boolean;
    content_type?: string;
    data_base64?: string;
    message?: string | { text?: string; content?: string };
};

function extractApiErrorMessage(result: FetchImageForClipboardResponse | null): string {
    if (!result) {
        return 'Không tải được ảnh';
    }
    const { message } = result;
    if (typeof message === 'string' && message.trim()) {
        return message;
    }
    if (message && typeof message === 'object') {
        if (typeof message.content === 'string' && message.content.trim()) {
            return message.content;
        }
        if (typeof message.text === 'string' && message.text.trim()) {
            return message.text;
        }
    }
    return 'Không tải được ảnh';
}

function base64ToBlob(base64: string, contentType: string): Blob {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: contentType || 'image/png' });
}

async function fetchImageBlobViaAdminApi(url: string): Promise<Blob> {
    const language = getLanguage();
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Origin: '',
    };

    const token = localStorage.getItem('access_token');
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(convertToURL(getAdminApiPrefix(), 'image/fetch-for-clipboard'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
            url,
            __l: window.btoa(`${language.code}#${Date.now()}`),
        }),
    });

    const result = await response.json() as FetchImageForClipboardResponse;
    if (result?.require_login) {
        throw new Error('Phiên đăng nhập hết hạn — hãy tải lại trang');
    }
    if (!response.ok || result?.success === false) {
        throw new Error(extractApiErrorMessage(result));
    }

    const base64 = String(result.data_base64 || '').trim();
    if (!base64) {
        throw new Error('API không trả dữ liệu ảnh');
    }

    return base64ToBlob(base64, result.content_type || 'image/png');
}

function isSameOriginImageUrl(url: string): boolean {
    try {
        const parsed = new URL(url, window.location.origin);
        return parsed.origin === window.location.origin;
    } catch {
        return false;
    }
}

async function resolveImagePngBlob(url: string): Promise<Blob> {
    const trimmedUrl = String(url || '').trim();
    if (!trimmedUrl) {
        throw new Error('Thiếu URL ảnh');
    }

    if (isSameOriginImageUrl(trimmedUrl)) {
        try {
            const response = await fetch(trimmedUrl, { credentials: 'omit' });
            if (response.ok) {
                const blob = await response.blob();
                if (blob.type.startsWith('image/')) {
                    return blobToPngBlob(blob);
                }
            }
        } catch {
            // fallback API proxy
        }
    }

    try {
        const blob = await fetchImageBlobViaAdminApi(trimmedUrl);
        return blob.type === 'image/png' ? blob : blobToPngBlob(blob);
    } catch {
        // fallback Image() — thường fail nếu CDN không có CORS
    }

    const img = await loadImageElement(trimmedUrl, true);
    return imageElementToPngBlob(img);
}

export async function copyImageUrlToClipboard(url: string): Promise<void> {
    if (!navigator.clipboard?.write) {
        throw new Error('Trình duyệt không hỗ trợ copy ảnh');
    }
    const pngBlob = await resolveImagePngBlob(url);
    await navigator.clipboard.write([
        new ClipboardItem({
            'image/png': pngBlob,
        }),
    ]);
}

export function openImagePopup(url: string) {
    const width = 900;
    const height = 700;
    const left = Math.round(window.screenX + (window.outerWidth - width) / 2);
    const top = Math.round(window.screenY + (window.outerHeight - height) / 2);
    const features = [
        `width=${width}`,
        `height=${height}`,
        `left=${left}`,
        `top=${top}`,
        'menubar=no',
        'toolbar=no',
        'location=no',
        'status=no',
        'scrollbars=yes',
        'resizable=yes',
        'noopener',
        'noreferrer',
    ].join(',');

    window.open(url, 'imagePreview', features);
    window.focus();
}