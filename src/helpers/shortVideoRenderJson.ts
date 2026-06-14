export type ShortVideoRenderWord = {
    text: string;
    start: number;
    end: number;
    source?: string;
};

function parseJsonField(raw: unknown): Record<string, unknown> | null {
    if (raw === null || raw === undefined) {
        return null;
    }
    if (typeof raw === 'object' && !Array.isArray(raw)) {
        return raw as Record<string, unknown>;
    }
    if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (!trimmed || trimmed === '{}' || trimmed === '[]') {
            return null;
        }
        try {
            const decoded = JSON.parse(trimmed);
            return decoded && typeof decoded === 'object' && !Array.isArray(decoded)
                ? (decoded as Record<string, unknown>)
                : null;
        } catch {
            return null;
        }
    }
    return null;
}

function normalizeWord(row: unknown): ShortVideoRenderWord | null {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
        return null;
    }
    const w = row as Record<string, unknown>;
    const text = String(w.text ?? '').trim();
    if (!text) {
        return null;
    }
    const start = Number(w.start ?? 0);
    const end = Number(w.end ?? 0);
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
        return null;
    }
    const source = typeof w.source === 'string' ? w.source : undefined;

    return { text, start, end, source };
}

/**
 * Words từ render_json (whisper align) theo scene id — sau render video TikTok.
 */
export function parseShortVideoRenderJsonSceneWords(
    renderJsonRaw: unknown,
    sceneId: string
): ShortVideoRenderWord[] {
    const decoded = parseJsonField(renderJsonRaw);
    if (!decoded || !sceneId.trim()) {
        return [];
    }

    const scenes = decoded.scenes;
    if (!scenes || typeof scenes !== 'object' || Array.isArray(scenes)) {
        return [];
    }

    const sceneEntry = (scenes as Record<string, unknown>)[sceneId.trim()];
    if (!sceneEntry || typeof sceneEntry !== 'object' || Array.isArray(sceneEntry)) {
        return [];
    }

    const scene = sceneEntry as Record<string, unknown>;
    const words = scene.words;
    if (!Array.isArray(words)) {
        return [];
    }

    const result: ShortVideoRenderWord[] = [];
    words.forEach((item) => {
        const word = normalizeWord(item);
        if (word) {
            result.push(word);
        }
    });

    return result;
}

export function shortVideoRenderJsonHasWhisperWords(words: ShortVideoRenderWord[]): boolean {
    if (words.length === 0) {
        return false;
    }
    return words.some(
        (w) =>
            w.source === 'whisper' ||
            (Number.isFinite(w.start) && Number.isFinite(w.end) && w.end > w.start)
    );
}

export function buildShortVideoRenderJsonSceneWordsMap(
    renderJsonRaw: unknown
): Record<string, ShortVideoRenderWord[]> {
    const decoded = parseJsonField(renderJsonRaw);
    if (!decoded) {
        return {};
    }

    const map: Record<string, ShortVideoRenderWord[]> = {};
    const scenes = decoded.scenes;
    if (!scenes) {
        return map;
    }

    if (Array.isArray(scenes)) {
        scenes.forEach((item) => {
            if (!item || typeof item !== 'object' || Array.isArray(item)) {
                return;
            }
            const scene = item as Record<string, unknown>;
            const sceneId = String(scene.id ?? '').trim();
            if (!sceneId) {
                return;
            }
            const words = scene.words;
            if (!Array.isArray(words)) {
                return;
            }
            const parsed: ShortVideoRenderWord[] = [];
            words.forEach((row) => {
                const word = normalizeWord(row);
                if (word) {
                    parsed.push(word);
                }
            });
            if (parsed.length > 0) {
                map[sceneId] = parsed;
            }
        });
        return map;
    }

    if (typeof scenes === 'object') {
        Object.keys(scenes as Record<string, unknown>).forEach((sceneId) => {
            map[sceneId] = parseShortVideoRenderJsonSceneWords(renderJsonRaw, sceneId);
        });
    }

    return map;
}
