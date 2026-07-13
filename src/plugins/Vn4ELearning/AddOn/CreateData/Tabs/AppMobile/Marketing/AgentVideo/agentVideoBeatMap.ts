import { isHfPromptTypeKey, type HfPromptTypeKey } from './agentVideoHfPromptCatalog';
import { formatDurationSec } from './agentVideoHfPromptDuration';

export type BeatMapSection = {
    id: string;
    beat_id: string;
    startSec: number;
    endSec: number;
    durationSec: number;
    phrase_anchor: string;
    hf_prompt_type: HfPromptTypeKey | string;
    image_url?: string;
    source?: string;
};

export type BeatMap = {
    totalVideoSec: number;
    source?: string;
    updated_at?: string;
    sections: BeatMapSection[];
};

export type BeatHtmlEntry = {
    html: string;
    updated_at?: string;
    /** Prompt sáng tạo / refine — user hoặc pipeline AI ghi để dùng lại. */
    creative_prompt?: string;
    render_status?: 'error' | 'ok' | string;
    render_error?: string;
    render_error_code?: string;
    render_error_stage?: 'assemble' | 'render' | string;
    render_error_at?: string;
};

export type BeatHtmlVisualState = 'missing' | 'ok' | 'error';

export function parseBeatHtmlEntry(entry: unknown): BeatHtmlEntry | null {
    if (!entry || typeof entry !== 'object') {
        return null;
    }
    const raw = entry as Record<string, unknown>;
    const creativePrompt = raw.creative_prompt != null
        ? String(raw.creative_prompt)
        : undefined;
    return {
        html: String(raw.html || ''),
        updated_at: raw.updated_at ? String(raw.updated_at) : undefined,
        creative_prompt: creativePrompt !== undefined ? creativePrompt : undefined,
        render_status: raw.render_status ? String(raw.render_status) : undefined,
        render_error: raw.render_error ? String(raw.render_error) : undefined,
        render_error_code: raw.render_error_code ? String(raw.render_error_code) : undefined,
        render_error_stage: raw.render_error_stage ? String(raw.render_error_stage) : undefined,
        render_error_at: raw.render_error_at ? String(raw.render_error_at) : undefined,
    };
}

export function isBeatHtmlRenderError(beatHtml: Record<string, BeatHtmlEntry>, beatId: string): boolean {
    return beatHtml[beatId]?.render_status === 'error';
}

export function getBeatHtmlVisualState(
    beatHtml: Record<string, BeatHtmlEntry>,
    beatId: string,
): BeatHtmlVisualState {
    if (!String(beatHtml[beatId]?.html || '').trim()) {
        return 'missing';
    }
    if (isBeatHtmlRenderError(beatHtml, beatId)) {
        return 'error';
    }
    return 'ok';
}

export function countBeatRenderErrors(beatHtml: Record<string, BeatHtmlEntry>): number {
    return listBeatRenderErrorIds(beatHtml).length;
}

export function listBeatRenderErrorIds(beatHtml: Record<string, BeatHtmlEntry>): string[] {
    return Object.entries(beatHtml)
        .filter(([, entry]) => entry?.render_status === 'error')
        .map(([beatId]) => beatId)
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function getBeatRenderErrorMessage(beatHtml: Record<string, BeatHtmlEntry>, beatId: string): string {
    const entry = beatHtml[beatId];
    if (!entry?.render_error?.trim()) {
        return 'Beat lỗi render/assemble';
    }
    const stage = entry.render_error_stage ? ` (${entry.render_error_stage})` : '';
    return `${entry.render_error.trim()}${stage}`;
}

export type BeatMapValidation = {
    valid: boolean;
    errors: string[];
};

function stripJsonFences(text: string): string {
    const trimmed = String(text || '').trim();
    const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    return fenced ? fenced[1].trim() : trimmed;
}

function asNumber(value: unknown): number | null {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
}

export function parseBeatMapJson(text: string): { map: BeatMap | null; errors: string[] } {
    const errors: string[] = [];
    const raw = stripJsonFences(text);
    if (!raw) {
        return { map: null, errors: ['JSON trống'] };
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return { map: null, errors: ['JSON không parse được'] };
    }

    if (!parsed || typeof parsed !== 'object') {
        return { map: null, errors: ['beat_map phải là object'] };
    }

    const obj = parsed as Record<string, unknown>;
    const totalVideoSec = asNumber(obj.totalVideoSec);
    if (totalVideoSec == null || totalVideoSec <= 0) {
        errors.push('Thiếu totalVideoSec hợp lệ');
    }

    const sectionsRaw = obj.sections;
    if (!Array.isArray(sectionsRaw) || sectionsRaw.length === 0) {
        errors.push('sections rỗng');
        return { map: null, errors };
    }

    const sections: BeatMapSection[] = [];
    sectionsRaw.forEach((item, index) => {
        if (!item || typeof item !== 'object') {
            errors.push(`Section #${index + 1} không hợp lệ`);
            return;
        }
        const row = item as Record<string, unknown>;
        const id = String(row.id ?? row.beat_id ?? '').trim();
        const startSec = asNumber(row.startSec);
        const endSec = asNumber(row.endSec);
        const durationSec = asNumber(row.durationSec) ?? (
            startSec != null && endSec != null ? endSec - startSec : null
        );
        const phraseAnchor = String(row.phrase_anchor ?? '').trim();
        const hfPromptType = String(row.hf_prompt_type ?? '').trim();
        const imageUrl = String(row.image_url ?? '').trim();

        if (!/^beat_\d+$/.test(id)) {
            errors.push(`${id || `Section #${index + 1}`}: id phải dạng beat_N`);
        }
        if (startSec == null || endSec == null || endSec <= startSec) {
            errors.push(`${id || `Section #${index + 1}`}: startSec/endSec không hợp lệ`);
        }
        if (durationSec == null || durationSec <= 0) {
            errors.push(`${id || `Section #${index + 1}`}: durationSec không hợp lệ`);
        }
        if (!phraseAnchor) {
            errors.push(`${id || `Section #${index + 1}`}: thiếu phrase_anchor`);
        }
        if (!hfPromptType || !isHfPromptTypeKey(hfPromptType)) {
            errors.push(`${id || `Section #${index + 1}`}: hf_prompt_type không hợp lệ`);
        }

        sections.push({
            id,
            beat_id: id,
            startSec: startSec ?? 0,
            endSec: endSec ?? 0,
            durationSec: durationSec ?? 0,
            phrase_anchor: phraseAnchor,
            hf_prompt_type: hfPromptType,
            image_url: imageUrl || undefined,
            source: String(row.source ?? '').trim() || undefined,
        });
    });

    if (errors.length > 0) {
        return { map: null, errors };
    }

    return {
        map: {
            totalVideoSec: totalVideoSec ?? 0,
            source: String(obj.source ?? 'chatbot').trim() || 'chatbot',
            updated_at: String(obj.updated_at ?? '').trim() || undefined,
            sections,
        },
        errors: [],
    };
}

export function validateBeatMap(
    map: BeatMap,
    audioDurationSec: number,
    options?: { relaxDurationBounds?: boolean },
): BeatMapValidation {
    const errors: string[] = [];
    const audioDur = Number(audioDurationSec) || 0;
    void options?.relaxDurationBounds;

    if (!map.sections.length) {
        return { valid: false, errors: ['sections rỗng'] };
    }

    if (audioDur > 0 && Math.abs(map.totalVideoSec - audioDur) > 1.5) {
        errors.push(`totalVideoSec (${formatDurationSec(map.totalVideoSec)}s) lệch audio (${formatDurationSec(audioDur)}s)`);
    }

    let expectedStart = 0;
    map.sections.forEach((section, index) => {
        const label = section.id || `beat_${index + 1}`;
        if (Math.abs(section.startSec - expectedStart) > 0.25) {
            errors.push(`${label}: không liên tục tại ${formatDurationSec(section.startSec)}s`);
        }
        if (Math.abs(section.durationSec - (section.endSec - section.startSec)) > 0.25) {
            errors.push(`${label}: durationSec không khớp end-start`);
        }
        if (section.durationSec <= 0) {
            errors.push(`${label}: durationSec phải > 0`);
        }
        // 5–20s: chỉ khuyến nghị trong prompt chia beat — code không tách/gộp beat-map.
        expectedStart = section.endSec;
    });

    if (audioDur > 0 && Math.abs(expectedStart - audioDur) > 1.5) {
        errors.push('Beat cuối không khớp thời lượng audio');
    }

    return { valid: errors.length === 0, errors };
}

export function beatMapToJson(map: BeatMap): string {
    return JSON.stringify(map, null, 2);
}

export type BeatBoundaryMarker = {
    timeSec: number;
    beatIndex: number;
};

export type BeatTimelineSegment = {
    beatId: string;
    beatIndex: number;
    startSec: number;
    endSec: number;
};

export function getBeatBoundaryMarkers(map: BeatMap | null): BeatBoundaryMarker[] {
    if (!map?.sections || map.sections.length < 2) {
        return [];
    }
    return map.sections.slice(1).map((section, index) => ({
        timeSec: section.startSec,
        beatIndex: index + 2,
    }));
}

export function getBeatTimelineSegments(map: BeatMap | null): BeatTimelineSegment[] {
    if (!map?.sections?.length) {
        return [];
    }
    return map.sections.map((section, index) => ({
        beatId: section.id,
        beatIndex: index + 1,
        startSec: section.startSec,
        endSec: section.endSec,
    }));
}

export function resolveActiveBeatSection(map: BeatMap | null, timeSec: number): BeatMapSection | null {
    if (!map?.sections?.length) {
        return null;
    }
    for (let i = map.sections.length - 1; i >= 0; i -= 1) {
        if (timeSec >= map.sections[i].startSec) {
            return map.sections[i];
        }
    }
    return map.sections[0];
}

export function isBeatHtmlMissing(beatHtml: Record<string, BeatHtmlEntry>, beatId: string): boolean {
    return !String(beatHtml[beatId]?.html || '').trim();
}

export function countMissingBeatHtml(map: BeatMap | null, beatHtml: Record<string, BeatHtmlEntry>): number {
    if (!map?.sections?.length) {
        return 0;
    }
    return map.sections.filter((section) => isBeatHtmlMissing(beatHtml, section.id)).length;
}

export function listMissingBeatIds(map: BeatMap | null, beatHtml: Record<string, BeatHtmlEntry>): string[] {
    if (!map?.sections?.length) {
        return [];
    }
    return map.sections
        .filter((section) => isBeatHtmlMissing(beatHtml, section.id))
        .map((section) => section.id);
}

export function listBeatIdsWithHtml(beatHtml: Record<string, BeatHtmlEntry>): string[] {
    return Object.entries(beatHtml)
        .filter(([, entry]) => String(entry?.html || '').trim() !== '')
        .map(([beatId]) => beatId);
}

export function countBeatIdsWithHtml(beatHtml: Record<string, BeatHtmlEntry>): number {
    return listBeatIdsWithHtml(beatHtml).length;
}

/** Gán hf_prompt_type cho mọi beat chưa có HTML (trước khi agent tự sinh). */
export function applyHfPromptTypeToMissingBeats(
    map: BeatMap,
    beatHtml: Record<string, BeatHtmlEntry>,
    hfPromptType: HfPromptTypeKey | string,
): BeatMap {
    const type = String(hfPromptType || '').trim();
    if (!type) {
        return map;
    }
    return {
        ...map,
        sections: map.sections.map((section) => (
            isBeatHtmlMissing(beatHtml, section.id)
                ? { ...section, hf_prompt_type: type }
                : section
        )),
    };
}
