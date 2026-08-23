import type { BeatRegion } from './agentVideoApi';

type Word = { index: number; text: string; start: number };

function finiteSec(value: unknown): number | null {
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? num : null;
}

/** Thời điểm từ whisper (scene-relative trong beat). */
export function wordTimeInBeat(
    wordIndex: number | null | undefined,
    beatWords: Word[],
    beatStartSec: number,
    maxSec: number,
): number | null {
    if (wordIndex == null || !Number.isFinite(wordIndex) || wordIndex < 0) {
        return null;
    }
    const word = beatWords.find((item) => item.index === wordIndex);
    if (!word) {
        return null;
    }
    return Math.max(0, Math.min(maxSec, word.start - beatStartSec));
}

/**
 * Mốc BẮT ĐẦU render vùng — mirror PHP whiteboard_regions_scene_payload:
 * ưu tiên start_sec user kéo, fallback script_start_word.
 */
export function resolveRegionStartSec(
    region: BeatRegion,
    beatWords: Word[],
    beatStartSec: number,
    beatDurationSec: number,
): number {
    const maxSec = Math.max(0.1, beatDurationSec);
    const fromSec = finiteSec(region.start_sec);
    if (fromSec != null) {
        return Math.max(0, Math.min(maxSec, fromSec));
    }
    const fromWord = wordTimeInBeat(region.script_start_word, beatWords, beatStartSec, maxSec);
    return fromWord != null ? fromWord : 0;
}

/**
 * Mốc render XONG (complete_by) — mirror PHP:
 * ưu tiên end_sec user kéo, fallback script_end_word, cuối beat.
 */
export function resolveRegionEndSec(
    region: BeatRegion,
    beatWords: Word[],
    beatStartSec: number,
    beatDurationSec: number,
): number {
    const maxSec = Math.max(0.1, beatDurationSec);
    const fromSec = finiteSec(region.end_sec);
    if (fromSec != null) {
        return Math.max(0, Math.min(maxSec, fromSec));
    }
    const fromWord = wordTimeInBeat(region.script_end_word, beatWords, beatStartSec, maxSec);
    return fromWord != null ? fromWord : maxSec;
}

/** Patch khi user kéo marker giây — bỏ mốc whisper cũ để không fallback lệch. */
export function regionTimingPatchFromDrag(startSec: number, endSec: number): Partial<BeatRegion> {
    return {
        start_sec: Math.round(startSec * 100) / 100,
        end_sec: Math.round(endSec * 100) / 100,
        script_start_word: null,
        script_end_word: null,
    };
}

/** Intro cố định đầu video scene — khớp engine `intro_sec_fixed`. */
export const WHITEBOARD_SCENE_INTRO_SEC = {
    withRegions: 0.15,
    default: 0.3,
} as const;

/**
 * Map playhead timeline beat → `video.currentTime`.
 *
 * File beat = scene + transition-out (render.py ghép beat_i.mp4).
 * Playhead timeline chạy trên cửa sổ beat đầy đủ — sau intro map 1:1:
 *   videoTime = intro + playhead (kể cả vùng chuyển cảnh cuối beat).
 *
 * Scene events (vùng/zoom) vẫn tính trên scene_budget = beat − transition.
 */
export function beatPlayheadToVideoSec(
    beatPlayheadSec: number,
    beatWindowSec: number,
    videoIntroSec: number,
): number {
    const window = Math.max(0.1, beatWindowSec);
    const t = Math.max(0, Math.min(window, beatPlayheadSec));
    return Math.max(0, videoIntroSec + t);
}

/** Chuẩn hóa khi load — nếu đã có giây thì bỏ script word stale (vd. script_end_word: 0). */
export function normalizeRegionTimingFields(region: BeatRegion): BeatRegion {
    const hasStart = finiteSec(region.start_sec) != null;
    const hasEnd = finiteSec(region.end_sec) != null;
    if (!hasStart && !hasEnd) {
        return region;
    }
    return {
        ...region,
        ...(hasStart ? { script_start_word: null } : {}),
        ...(hasEnd ? { script_end_word: null } : {}),
    };
}
