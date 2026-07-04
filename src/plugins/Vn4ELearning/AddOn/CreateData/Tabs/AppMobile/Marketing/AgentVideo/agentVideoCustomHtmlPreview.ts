import { normalizeImportHtmlForAudio } from './agentVideoImportHtmlNormalize';

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
