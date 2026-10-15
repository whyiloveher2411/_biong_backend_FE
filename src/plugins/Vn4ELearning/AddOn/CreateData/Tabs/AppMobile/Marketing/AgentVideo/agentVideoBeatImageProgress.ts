export type BeatImageProgressPhase =
    | 'idle'
    | 'generating'
    | 'done';

export type BeatImageProgress = {
    total: number;
    completed: number;
    percent: number;
    activeBeatId: string;
    failed: string[];
    phase: BeatImageProgressPhase;
    /** Hiển thị banner/strip khi đang render ảnh beat */
    active: boolean;
};

type ProgressLike = {
    current?: number;
    total?: number;
    beatId?: string;
    succeeded?: number;
    failed?: string[];
};

type DeriveInput = {
    /** `geminiFillProgress` — tiến độ render ảnh beat (Meta.ai). */
    progress?: ProgressLike | null;
    /** `gemini_image_fill.status` (queued/processing/done…). */
    status?: string | null;
    pipelineStep?: string | null;
    pipelineStatus?: string | null;
    /** Số beat của beat-map — làm mẫu số khi progress chưa có total. */
    totalBeats?: number | null;
};

function toPositiveInt(value: unknown): number {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * Progress render ảnh beat (beat_image_fill) theo completed/total beat —
 * cùng pattern với Render ảnh beat / Audio từng beat / Sound effect.
 */
export function deriveBeatImageProgress(input: DeriveInput): BeatImageProgress {
    const progress = input.progress && typeof input.progress === 'object' ? input.progress : null;
    const status = String(input.status || 'none').trim().toLowerCase();
    const step = String(input.pipelineStep || '').trim();
    const pipelineStatus = String(input.pipelineStatus || '').trim().toLowerCase();
    const pipelineRunning = pipelineStatus === 'running';
    const jobActive = status === 'queued' || status === 'processing';

    const total = Math.max(
        toPositiveInt(progress?.total),
        toPositiveInt(input.totalBeats),
    );
    const completed = Math.min(
        total > 0 ? total : Number.MAX_SAFE_INTEGER,
        Math.max(
            toPositiveInt(progress?.current),
            toPositiveInt(progress?.succeeded),
        ),
    );
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const activeBeatId = String(progress?.beatId || '').trim();
    const failedRaw = progress?.failed;
    const failed = Array.isArray(failedRaw)
        ? failedRaw.map((id) => String(id || '').trim()).filter(Boolean)
        : [];

    let phase: BeatImageProgressPhase = 'idle';
    if (jobActive || (step === 'beat_image_fill' && pipelineRunning)) {
        phase = 'generating';
    } else if (total > 0 && completed >= total && failed.length === 0) {
        phase = 'done';
    }

    const active = phase === 'generating';

    return {
        total,
        completed,
        percent,
        activeBeatId,
        failed,
        phase,
        active,
    };
}

export function beatImageProgressLabel(progress: BeatImageProgress): string {
    if (!progress.active && progress.phase === 'idle') {
        return '';
    }
    const count = progress.total > 0
        ? `${progress.completed}/${progress.total} (${progress.percent}%)`
        : '0%';
    const beatNote = progress.activeBeatId ? ` · ${progress.activeBeatId}` : '';
    return `Ảnh beat · ${count}${beatNote}`;
}

export function beatImageProgressSubtitle(progress: BeatImageProgress): string {
    if (progress.phase === 'generating' && progress.activeBeatId) {
        return `Đang tạo: ${progress.activeBeatId}`;
    }
    if (progress.failed.length > 0) {
        return `${progress.failed.length} beat lỗi`;
    }
    if (progress.phase === 'generating') {
        return 'Đang render ảnh beat…';
    }
    return '';
}
