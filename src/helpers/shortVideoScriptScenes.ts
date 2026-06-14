export type ShortVideoScriptScene = {
    id: string;
    voiceover: string;
    on_screen_text: string;
    duration_hint_sec: number;
    visual: {
        type: string;
        ref: string;
        motion: string;
    };
};

export type ShortVideoSceneAudioEntry = {
    url?: string;
    status?: string;
    duration_sec?: number;
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

export function parseShortVideoScriptScenes(raw: unknown): ShortVideoScriptScene[] {
    const decoded = parseJsonField(raw);
    if (!decoded) {
        return [];
    }
    const scenes = decoded.scenes;
    if (!Array.isArray(scenes)) {
        return [];
    }

    const result: ShortVideoScriptScene[] = [];
    scenes.forEach((item, idx) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
            return;
        }
        const scene = item as Record<string, unknown>;
        let id = String(scene.id ?? '').trim();
        if (!id) {
            id = `s${idx + 1}`;
        }
        const visualRaw =
            scene.visual && typeof scene.visual === 'object' && !Array.isArray(scene.visual)
                ? (scene.visual as Record<string, unknown>)
                : {};
        result.push({
            id,
            voiceover: String(scene.voiceover ?? '').trim(),
            on_screen_text: String(scene.on_screen_text ?? '').trim(),
            duration_hint_sec: Math.max(0, Number(scene.duration_hint_sec ?? 0) || 0),
            visual: {
                type: String(visualRaw.type ?? '').trim(),
                ref: String(visualRaw.ref ?? '').trim(),
                motion: String(visualRaw.motion ?? '').trim(),
            },
        });
    });

    return result;
}

export function parseShortVideoSceneAudioMap(raw: unknown): Record<string, ShortVideoSceneAudioEntry> {
    const decoded = parseJsonField(raw);
    if (!decoded) {
        return {};
    }
    const scenes = decoded.scenes;
    if (!scenes || typeof scenes !== 'object' || Array.isArray(scenes)) {
        return {};
    }
    const map: Record<string, ShortVideoSceneAudioEntry> = {};
    Object.keys(scenes as Record<string, unknown>).forEach((key) => {
        const entry = (scenes as Record<string, unknown>)[key];
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            return;
        }
        const row = entry as Record<string, unknown>;
        map[key] = {
            url: typeof row.url === 'string' ? row.url : undefined,
            status: typeof row.status === 'string' ? row.status : undefined,
            duration_sec:
                typeof row.duration_sec === 'number' && Number.isFinite(row.duration_sec)
                    ? row.duration_sec
                    : undefined,
        };
    });
    return map;
}

export function shortVideoScenePreviewText(scene: ShortVideoScriptScene): string {
    const onScreen = scene.on_screen_text.trim();
    if (onScreen) {
        return onScreen;
    }
    return scene.voiceover.trim();
}
