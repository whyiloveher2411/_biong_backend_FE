import type { ShortVideoManifestScene } from './shortVideoRenderManifestTypes';
import {
    resolveSceneVisualImageRef,
    resolveSceneVisualPlaybackUrl,
} from './shortVideoRenderManifest';
import { resolveVisualPlaybackPreviewUrl } from './shortVideoVisualClips';
import { isHttpsImageUrl } from './shortVideoYoutube';

/** URL hiển thị ảnh trong inspector / preview — ưu tiên playback đã proxy (render-cache API). */
export function resolveSceneImagePreviewUrl(scene: ShortVideoManifestScene): string {
    const playback = resolveSceneVisualPlaybackUrl(scene).trim();
    if (playback) {
        const resolved = resolveVisualPlaybackPreviewUrl(playback);
        if (resolved) {
            return resolved;
        }
    }
    const imageRef = resolveSceneVisualImageRef(scene).trim();
    if (imageRef && isHttpsImageUrl(imageRef) && !isLikelyHotlinkBlockedImageUrl(imageRef)) {
        return imageRef;
    }
    return '';
}

/** CDN bài báo (Yahoo/Zenfs…) thường chặn hotlink trong thẻ img — cần render-cache. */
function isLikelyHotlinkBlockedImageUrl(url: string): boolean {
    try {
        const host = new URL(url).hostname.toLowerCase();
        return host.includes('yimg.com')
            || host.includes('zenfs.com')
            || host.includes('yahoo.com');
    } catch {
        return false;
    }
}

export function sceneImagePreviewUrlIsLoadable(url: string): boolean {
    const trimmed = url.trim();
    if (!trimmed) {
        return false;
    }
    if (trimmed.includes('/render-cache-asset') || trimmed.includes('render-cache/')) {
        return true;
    }
    if (/^https?:\/\//i.test(trimmed)) {
        return isHttpsImageUrl(trimmed);
    }
    return false;
}
