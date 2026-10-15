import type { AgentVideoSfxCue, AgentVideoSfxSummary } from './agentVideoApi';

export type SfxProgressPhase =
    | 'idle'
    | 'generating'
    | 'done';

export type SfxProgress = {
    total: number;
    completed: number;
    percent: number;
    activeCueId: string;
    failed: string[];
    pending: string[];
    phase: SfxProgressPhase;
    /** Hiển thị banner/strip khi đang sinh sound effect */
    active: boolean;
};

type DeriveInput = {
    /** `sfx` summary từ content endpoint (cue_count/ready_count/…). */
    summary?: AgentVideoSfxSummary | null;
    pipelineStep?: string | null;
    pipelineStatus?: string | null;
};

function toPositiveInt(value: unknown): number {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** Nhãn cue hiển thị: ưu tiên beat_id (người dùng nghĩ theo beat), fallback cue_id. */
function cueLabel(cue: AgentVideoSfxCue): string {
    const beatId = String(cue?.beat_id || '').trim();
    if (beatId !== '') {
        return beatId;
    }
    return String(cue?.cue_id || '').trim();
}

function cueStatus(cue: AgentVideoSfxCue): string {
    return String(cue?.status || 'pending').trim().toLowerCase();
}

/**
 * Progress sinh sound effect (SFX) theo completed/total cue.
 * Nguồn: `sfx` summary (cue_count + ready_count/skipped_count/error_count/items)
 * + bước pipeline hiện tại — giống Audio từng beat / Render ảnh beat.
 */
export function deriveSfxProgress(input: DeriveInput): SfxProgress {
    const summary = input.summary && typeof input.summary === 'object' ? input.summary : null;
    const items = Array.isArray(summary?.items) ? (summary?.items as AgentVideoSfxCue[]) : [];
    const step = String(input.pipelineStep || '').trim();
    const pipelineStatus = String(input.pipelineStatus || '').trim().toLowerCase();
    const pipelineRunning = pipelineStatus === 'running';

    const total = Math.max(
        items.length,
        toPositiveInt(summary?.cue_count),
    );

    const ready = toPositiveInt(summary?.ready_count);
    const skipped = toPositiveInt(summary?.skipped_count);

    const failed: string[] = [];
    const pending: string[] = [];
    let readyFromItems = 0;
    let skippedFromItems = 0;
    let firstGenerating = '';
    let firstPending = '';

    for (const cue of items) {
        const status = cueStatus(cue);
        const label = cueLabel(cue);
        if (status === 'error' || status === 'failed') {
            if (label !== '') {
                failed.push(label);
            }
            continue;
        }
        if (status === 'ready') {
            readyFromItems += 1;
            continue;
        }
        if (status === 'skipped') {
            skippedFromItems += 1;
            continue;
        }
        if (label !== '') {
            pending.push(label);
            if (!firstPending) {
                firstPending = label;
            }
            if (status === 'generating' && !firstGenerating) {
                firstGenerating = label;
            }
        }
    }

    const completed = Math.min(
        total > 0 ? total : Number.MAX_SAFE_INTEGER,
        Math.max(
            ready + skipped,
            readyFromItems + skippedFromItems,
        ),
    );
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const activeCueId = firstGenerating || firstPending;

    const allCuesDone = total > 0 && completed >= total && failed.length === 0;

    let phase: SfxProgressPhase = 'idle';
    if (step === 'sfx' && pipelineRunning) {
        phase = 'generating';
    } else if (pending.length > 0 || (completed > 0 && completed < total && failed.length === 0)) {
        phase = 'generating';
    } else if (allCuesDone) {
        phase = 'done';
    }

    // Sinh SFX thủ công 1 cue (không qua pipeline): vẫn hiện progress khi còn pending.
    if (phase === 'idle' && pending.length > 0) {
        phase = 'generating';
    }

    const active = phase === 'generating';

    return {
        total,
        completed,
        percent,
        activeCueId,
        failed,
        pending,
        phase,
        active,
    };
}

export function sfxProgressLabel(progress: SfxProgress): string {
    if (!progress.active && progress.phase === 'idle') {
        return '';
    }
    const count = progress.total > 0
        ? `${progress.completed}/${progress.total} (${progress.percent}%)`
        : '0%';
    const cueNote = progress.activeCueId ? ` · ${progress.activeCueId}` : '';
    return `Sound effect · ${count}${cueNote}`;
}

export function sfxProgressSubtitle(progress: SfxProgress): string {
    if (progress.phase === 'generating' && progress.activeCueId) {
        return `Đang tạo: ${progress.activeCueId}`;
    }
    if (progress.failed.length > 0) {
        return `${progress.failed.length} cue lỗi`;
    }
    return '';
}
