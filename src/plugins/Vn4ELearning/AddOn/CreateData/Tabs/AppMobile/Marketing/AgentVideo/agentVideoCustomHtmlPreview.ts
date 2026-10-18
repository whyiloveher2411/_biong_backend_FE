import { normalizeImportHtmlForAudio } from './agentVideoImportHtmlNormalize';
import {
    buildModel3dAssetConfigUrl,
    buildModel3dRuntimeAssetUrl,
} from 'helpers/marketingShortVideoModel3dApi';

export {
    isImportHtmlDurationMismatch,
    normalizeImportHtmlForAudio,
    parseHtmlDataDurationSec,
} from './agentVideoImportHtmlNormalize';

export function ensureImportHtmlDataDuration(html: string, expectedDurationSec: number): string {
    return normalizeImportHtmlForAudio(html, expectedDurationSec).html;
}

export function seekCustomHtmlIframe(iframe: HTMLIFrameElement | null, timeSec: number): void {
    if (!iframe?.contentWindow) {
        return;
    }
    const nextSec = Math.max(0, Number(timeSec) || 0);
    try {
        iframe.contentWindow.dispatchEvent(new CustomEvent('hf-seek', {
            detail: { time: nextSec },
        }));
    } catch {
        /* cross-origin or sandbox */
    }
}

/**
 * Beat HTML sinh ra có thể tham chiếu Three.js qua CDN ngoài
 * (cdn.jsdelivr / unpkg …). Trong iframe preview, script ngoài có thể không tải
 * được (offline / adblock / mạng) → `window.THREE` undefined → preview trắng.
 * Rewrite sang bản Three.js tự phục vụ tại `/three.min.js` (public) để preview
 * luôn hoạt động. Không đụng tới các script ngoài khác.
 */
const EXTERNAL_THREE_SCRIPT_RE = /<script\b[^>]*\bsrc\s*=\s*["'][^"']*\/three(?:\.min)?\.js[^"']*["'][^>]*>\s*<\/script>/gi;

export function localizeImportHtmlExternalScripts(html: string): string {
    const source = String(html || '');
    if (!source || source.toLowerCase().indexOf('three') === -1) {
        return source;
    }
    return source.replace(EXTERNAL_THREE_SCRIPT_RE, '<script src="/three.min.js"></script>');
}

/**
 * Preview asset library: thay 2 thẻ script tương đối của scaffold
 * (`assets/dist/assets-config.js`, `assets/assets-runtime.js`) bằng URL tuyệt đối
 * same-origin (có access_token) để GLB + runtime tải được trong iframe preview.
 * Giữ nguyên các thẻ three/loader (CDN r147) để khớp phiên bản với runtime.
 */
export function localizeImportHtmlAssetScripts(
    html: string,
    ctx: { shortVideoId?: number; beatId?: string } = {},
): string {
    const source = String(html || '');
    if (!source || source.indexOf('assets/') === -1) {
        return source;
    }
    const runtimeUrl = buildModel3dRuntimeAssetUrl();
    const configUrl = buildModel3dAssetConfigUrl(Number(ctx.shortVideoId || 0), String(ctx.beatId || ''));

    return source
        .replace(
            /<script\b[^>]*\bsrc\s*=\s*["']assets\/dist\/assets-config\.js["'][^>]*>\s*<\/script>/gi,
            () => `<script src="${configUrl}"></script>`,
        )
        .replace(
            /<script\b[^>]*\bsrc\s*=\s*["']assets\/assets-runtime\.js["'][^>]*>\s*<\/script>/gi,
            () => `<script src="${runtimeUrl}"></script>`,
        );
}
