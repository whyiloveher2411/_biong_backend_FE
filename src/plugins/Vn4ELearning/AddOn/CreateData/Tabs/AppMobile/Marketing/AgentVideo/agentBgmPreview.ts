import type { AgentBgmSearchItem, ImportHtmlBgmSegment } from './agentVideoApi';

export function isDirectAudioUrl(url: string): boolean {
    const trimmed = String(url || '').trim();
    if (!/^https?:\/\//i.test(trimmed)) {
        return false;
    }
    if (/\.(mp3|wav|m4a|ogg)(\?|$)/i.test(trimmed)) {
        return true;
    }
    return /cdn\.pixabay\.com\/(download\/)?audio\//i.test(trimmed);
}

export function bgmPreviewUrl(item: { preview_url?: string; download_url?: string }): string {
    const candidates = [item.preview_url, item.download_url].map((value) => String(value || '').trim());
    for (const url of candidates) {
        if (url && isDirectAudioUrl(url)) {
            return url;
        }
    }
    return '';
}

export function formatBgmDuration(sec: number): string {
    const value = Number(sec || 0);
    if (!(value > 0)) {
        return '—';
    }
    if (value < 60) {
        return `${value.toFixed(0)}s`;
    }
    const minutes = Math.floor(value / 60);
    const seconds = Math.round(value % 60);
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function probeAudioDurationSec(url: string): Promise<number> {
    const audioUrl = String(url || '').trim();
    if (!audioUrl || !isDirectAudioUrl(audioUrl)) {
        return Promise.resolve(0);
    }

    return new Promise((resolve) => {
        const audio = new Audio();
        let settled = false;
        const finish = (duration: number) => {
            if (settled) {
                return;
            }
            settled = true;
            window.clearTimeout(timer);
            audio.src = '';
            resolve(duration > 0 && Number.isFinite(duration) ? duration : 0);
        };

        const timer = window.setTimeout(() => finish(0), 12000);
        audio.preload = 'metadata';
        audio.onloadedmetadata = () => finish(audio.duration);
        audio.onerror = () => finish(0);
        audio.src = audioUrl;
    });
}

export async function enrichBgmSearchItems(items: AgentBgmSearchItem[]): Promise<AgentBgmSearchItem[]> {
    return Promise.all(items.map(async (item) => {
        if (Number(item.duration_sec || 0) > 0) {
            return item;
        }
        const previewUrl = bgmPreviewUrl(item);
        if (!previewUrl) {
            return item;
        }
        const probed = await probeAudioDurationSec(previewUrl);
        if (!(probed > 0)) {
            return item;
        }
        return { ...item, duration_sec: probed };
    }));
}

export async function enrichBgmSegments(segments: ImportHtmlBgmSegment[]): Promise<ImportHtmlBgmSegment[]> {
    return Promise.all(segments.map(async (segment) => {
        if (Number(segment.duration_sec || 0) > 0) {
            return segment;
        }
        const previewUrl = bgmPreviewUrl(segment);
        if (!previewUrl) {
            return segment;
        }
        const probed = await probeAudioDurationSec(previewUrl);
        if (!(probed > 0)) {
            return segment;
        }
        return { ...segment, duration_sec: probed };
    }));
}
