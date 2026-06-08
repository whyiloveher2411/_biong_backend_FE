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

async function blobToPngBlob(blob: Blob): Promise<Blob> {
    if (blob.type === 'image/png') {
        return blob;
    }
    const objectUrl = URL.createObjectURL(blob);
    try {
        const img = await loadImageElement(objectUrl, false);
        if (!img.naturalWidth || !img.naturalHeight) {
            throw new Error('Logo không đọc được — hãy dùng file PNG hoặc JPG cho logo app');
        }
        return imageElementToPngBlob(img);
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

export type StoreScreenshotImageBlobOptions = {
    imageUrl?: string;
    getImageBlob?: () => Promise<Blob>;
    /** Chỉ dùng getImageBlob — không fallback fetch URL (tránh CORS logo local). */
    proxyOnly?: boolean;
};

/**
 * Lấy PNG blob — ưu tiên API proxy same-origin (không phụ thuộc CORS CDN).
 */
export async function resolveStoreScreenshotImagePngBlob(
    options: StoreScreenshotImageBlobOptions,
): Promise<Blob> {
    if (options.getImageBlob) {
        try {
            const blob = await options.getImageBlob();
            return blobToPngBlob(blob);
        } catch (error) {
            if (options.proxyOnly || !String(options.imageUrl || '').trim()) {
                throw error;
            }
        }
    }

    const url = String(options.imageUrl || '').trim();
    if (!url) {
        throw new Error('Thiếu URL ảnh');
    }

    try {
        const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
        if (response.ok) {
            const blob = await response.blob();
            if (blob.type.startsWith('image/')) {
                return blobToPngBlob(blob);
            }
        }
    } catch {
        // fallback Image() — thường fail nếu CDN không có CORS
    }

    const img = await loadImageElement(url, true);
    return imageElementToPngBlob(img);
}

export async function copyImageBlobToClipboard(blob: Blob): Promise<void> {
    if (!navigator.clipboard?.write) {
        throw new Error('Trình duyệt không hỗ trợ copy ảnh');
    }
    const pngBlob = blob.type === 'image/png' ? blob : await blobToPngBlob(blob);
    await navigator.clipboard.write([
        new ClipboardItem({
            'image/png': pngBlob,
        }),
    ]);
}

export async function copyStoreScreenshotImageToClipboard(
    options: StoreScreenshotImageBlobOptions,
): Promise<void> {
    const blob = await resolveStoreScreenshotImagePngBlob(options);
    await copyImageBlobToClipboard(blob);
}

export type CopyPromptWithImageResult = {
    textCopied: boolean;
    imageCopied: boolean;
    imageError?: string;
};

export async function copyTextToClipboard(text: string): Promise<void> {
    const value = String(text || '').trim();
    if (!value) {
        return;
    }
    try {
        await navigator.clipboard.writeText(value);
    } catch {
        const ta = document.createElement('textarea');
        ta.value = value;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    }
}

/**
 * Sao chép prompt + ảnh PNG vào clipboard (paste vào AI sẽ attach ảnh như screenshot).
 */
export async function copyPromptWithImageToClipboard(
    promptText: string,
    options: StoreScreenshotImageBlobOptions,
): Promise<CopyPromptWithImageResult> {
    const text = String(promptText || '').trim();
    if (!text) {
        return { textCopied: false, imageCopied: false };
    }

    let imageBlob: Blob | null = null;
    let imageError: string | undefined;

    if (options.getImageBlob || String(options.imageUrl || '').trim()) {
        try {
            imageBlob = await resolveStoreScreenshotImagePngBlob(options);
        } catch (error) {
            imageError = error instanceof Error ? error.message : 'Không copy được ảnh';
        }
    }

    if (imageBlob && navigator.clipboard?.write) {
        try {
            const pngBlob = imageBlob.type === 'image/png' ? imageBlob : await blobToPngBlob(imageBlob);
            await navigator.clipboard.write([
                new ClipboardItem({
                    'text/plain': new Blob([text], { type: 'text/plain' }),
                    'image/png': pngBlob,
                }),
            ]);
            return { textCopied: true, imageCopied: true };
        } catch (error) {
            imageError = error instanceof Error ? error.message : 'Không ghi clipboard ảnh';
        }
    }

    await copyTextToClipboard(text);
    return {
        textCopied: true,
        imageCopied: false,
        imageError,
    };
}
