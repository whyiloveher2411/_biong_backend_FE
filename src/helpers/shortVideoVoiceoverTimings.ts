import type { ShortVideoRenderWord } from 'helpers/shortVideoRenderJson';

export function tokenizeVoiceover(voiceover: string): string[] {
    const trimmed = voiceover.trim();
    if (!trimmed) {
        return [];
    }
    return trimmed.split(/\s+/u).filter(Boolean);
}

/**
 * Chia đều timestamp theo duration audio (fallback khi chưa có whisper trong render_json).
 */
export function buildVoiceoverPlaybackWordTimings(
    voiceover: string,
    durationSec: number
): ShortVideoRenderWord[] {
    const tokens = tokenizeVoiceover(voiceover);
    if (tokens.length === 0) {
        return [];
    }

    const total = Math.max(0.05, durationSec);
    const slot = total / tokens.length;
    const words: ShortVideoRenderWord[] = [];
    let cursor = 0;

    tokens.forEach((text, index) => {
        const start = cursor;
        const end = index === tokens.length - 1 ? total : Math.min(total, cursor + slot);
        words.push({
            text,
            start,
            end: Math.max(start + 0.05, end),
            source: 'playback',
        });
        cursor = end;
    });

    return words;
}
