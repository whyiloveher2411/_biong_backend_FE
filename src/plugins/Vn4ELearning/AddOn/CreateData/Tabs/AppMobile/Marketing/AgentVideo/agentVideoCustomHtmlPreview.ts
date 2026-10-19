import React from 'react';
import { normalizeImportHtmlForAudio } from './agentVideoImportHtmlNormalize';
import {
    MODEL3D_BEAT_ASSET_CHANGED_EVENT,
    MODEL3D_LOCATE_ASSET_EVENT,
    buildModel3dAssetConfigUrl,
    buildModel3dRuntimeAssetUrl,
} from 'helpers/marketingShortVideoModel3dApi';

/**
 * Đếm số lần map asset 3D của beat thay đổi (lưu map / chọn-trước) → dùng làm
 * `revision` để preview tự reload iframe + fetch lại asset-config.
 */
export function useModel3dBeatAssetRevision(shortVideoId: number, beatId: string): number {
    const [revision, setRevision] = React.useState(0);
    const sid = Number(shortVideoId || 0);
    const bid = String(beatId || '');
    React.useEffect(() => {
        const onChanged = (event: Event) => {
            const detail = (event as CustomEvent<{ shortVideoId?: number; beatId?: string }>).detail || {};
            if (Number(detail.shortVideoId || 0) !== sid) {
                return;
            }
            if (String(detail.beatId || '') !== '' && String(detail.beatId) !== bid) {
                return;
            }
            setRevision((prev) => prev + 1);
        };
        document.addEventListener(MODEL3D_BEAT_ASSET_CHANGED_EVENT, onChanged);
        return () => document.removeEventListener(MODEL3D_BEAT_ASSET_CHANGED_EVENT, onChanged);
    }, [sid, bid]);
    return revision;
}

export {
    isImportHtmlDurationMismatch,
    normalizeImportHtmlForAudio,
    parseHtmlDataDurationSec,
} from './agentVideoImportHtmlNormalize';

export function ensureImportHtmlDataDuration(html: string, expectedDurationSec: number): string {
    return normalizeImportHtmlForAudio(html, expectedDurationSec).html;
}

/**
 * Nghe yêu cầu "định vị asset" → gửi postMessage vào iframe preview để runtime
 * bay camera tới model + highlight (slotId rỗng = bỏ định vị).
 */
export function useModel3dLocateAsset(
    iframeRef: React.RefObject<HTMLIFrameElement | null>,
    shortVideoId: number,
    beatId: string,
): void {
    const sid = Number(shortVideoId || 0);
    const bid = String(beatId || '');
    React.useEffect(() => {
        const onLocate = (event: Event) => {
            const detail = (event as CustomEvent<{ shortVideoId?: number; beatId?: string; slotId?: string }>).detail || {};
            if (Number(detail.shortVideoId || 0) !== sid) {
                return;
            }
            if (String(detail.beatId || '') !== '' && String(detail.beatId) !== bid) {
                return;
            }
            const win = iframeRef.current?.contentWindow;
            if (!win) {
                return;
            }
            const slotId = String(detail.slotId || '');
            try {
                win.postMessage(
                    slotId ? { type: 'hf-assets-focus', id: slotId } : { type: 'hf-assets-clear' },
                    '*',
                );
            } catch {
                // ignore
            }
        };
        document.addEventListener(MODEL3D_LOCATE_ASSET_EVENT, onLocate);
        return () => document.removeEventListener(MODEL3D_LOCATE_ASSET_EVENT, onLocate);
    }, [sid, bid, iframeRef]);
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
    ctx: { shortVideoId?: number; beatId?: string; revision?: number } = {},
): string {
    const source = String(html || '');
    if (!source || source.indexOf('assets/') === -1) {
        return source;
    }
    const runtimeUrl = buildModel3dRuntimeAssetUrl(Number(ctx.revision || 0));
    const configUrl = buildModel3dAssetConfigUrl(
        Number(ctx.shortVideoId || 0),
        String(ctx.beatId || ''),
        Number(ctx.revision || 0),
    );

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
