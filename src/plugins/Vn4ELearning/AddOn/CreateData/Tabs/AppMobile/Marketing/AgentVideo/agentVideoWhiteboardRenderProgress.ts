import type { WhiteboardBeatRenderEntry } from './agentVideoApi';

export type WhiteboardRenderProgressPhase =
    | 'idle'
    | 'rendering'
    | 'concat'
    | 'mux'
    | 'done';

export type WhiteboardRenderProgress = {
    total: number;
    completed: number;
    percent: number;
    activeBeatId: string;
    failed: string[];
    pending: string[];
    phase: WhiteboardRenderProgressPhase;
    /** Hiển thị banner/strip khi đang render/concat/mux */
    active: boolean;
};

type SectionLike = { id?: string; beat_id?: string };

type DeriveInput = {
    sections?: SectionLike[] | null;
    renders?: Record<string, WhiteboardBeatRenderEntry> | null;
    pipelineStep?: string | null;
    pipelineStatus?: string | null;
};

function sectionBeatId(section: SectionLike): string {
    return String(section.id || section.beat_id || '').trim();
}

function entryStatus(entry: WhiteboardBeatRenderEntry | undefined): string {
    return String(entry?.status || 'none').trim().toLowerCase();
}

function entryHasVideo(entry: WhiteboardBeatRenderEntry | undefined): boolean {
    if (!entry) {
        return false;
    }
    const path = String(entry.video_path || entry.video_url || entry.silent_mp4 || '').trim();
    return path !== '';
}

/**
 * Progress render whiteboard theo completed/total beats (không trọng số concat/mux).
 */
export function deriveWhiteboardRenderProgress(input: DeriveInput): WhiteboardRenderProgress {
    const sections = Array.isArray(input.sections) ? input.sections : [];
    const renders = input.renders && typeof input.renders === 'object' ? input.renders : {};
    const step = String(input.pipelineStep || '').trim();
    const pipelineStatus = String(input.pipelineStatus || '').trim().toLowerCase();
    const pipelineRunning = pipelineStatus === 'running';

    const beatIds = sections
        .map(sectionBeatId)
        .filter((id) => id !== '');

    const total = beatIds.length;
    const failed: string[] = [];
    const pending: string[] = [];
    let completed = 0;
    let firstProcessing = '';
    let firstQueued = '';

    for (const beatId of beatIds) {
        const entry = renders[beatId];
        const status = entryStatus(entry);
        if (status === 'failed') {
            failed.push(beatId);
            continue;
        }
        if (status === 'completed' && entryHasVideo(entry)) {
            completed += 1;
            continue;
        }
        if (status === 'processing') {
            pending.push(beatId);
            if (!firstProcessing) {
                firstProcessing = beatId;
            }
            continue;
        }
        if (status === 'queued') {
            pending.push(beatId);
            if (!firstQueued) {
                firstQueued = beatId;
            }
            continue;
        }
        // none / unknown khi pipeline đang whiteboard_render → coi là missing/pending
        if (step === 'whiteboard_render' && pipelineRunning) {
            pending.push(beatId);
            if (!firstQueued) {
                firstQueued = beatId;
            }
        }
    }

    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const activeBeatId = firstProcessing || firstQueued;
    const allBeatsDone = total > 0 && completed === total && failed.length === 0 && pending.length === 0;

    let phase: WhiteboardRenderProgressPhase = 'idle';
    if (step === 'whiteboard_mux' && pipelineRunning) {
        phase = 'mux';
    } else if (step === 'whiteboard_render' && pipelineRunning) {
        phase = allBeatsDone ? 'concat' : 'rendering';
    } else if (pending.length > 0 || (completed > 0 && completed < total && failed.length === 0)) {
        phase = 'rendering';
    } else if (allBeatsDone && step === 'whiteboard_render') {
        phase = 'concat';
    } else if (allBeatsDone && (step === '' || step === 'upload' || !pipelineRunning)) {
        // Có thể vừa xong render — không ép done nếu idle
        phase = pipelineRunning ? 'done' : (completed > 0 && total > 0 && percent === 100 ? 'idle' : 'idle');
    }

    // Single-beat manual render: vẫn hiện progress nếu còn pending
    if (phase === 'idle' && pending.length > 0) {
        phase = 'rendering';
    }

    const active = phase === 'rendering' || phase === 'concat' || phase === 'mux';

    return {
        total,
        completed,
        percent: phase === 'concat' || phase === 'mux' ? Math.max(percent, total > 0 ? 100 : 0) : percent,
        activeBeatId,
        failed,
        pending,
        phase,
        active,
    };
}

export function whiteboardRenderProgressLabel(progress: WhiteboardRenderProgress): string {
    if (!progress.active && progress.phase === 'idle') {
        return '';
    }
    const count = progress.total > 0
        ? `${progress.completed}/${progress.total} (${progress.percent}%)`
        : '0%';
    if (progress.phase === 'mux') {
        return `Mux whiteboard · ${count}`;
    }
    if (progress.phase === 'concat') {
        return `Ghép silent · ${count}`;
    }
    const beatNote = progress.activeBeatId ? ` · ${progress.activeBeatId}` : '';
    return `Render whiteboard · ${count}${beatNote}`;
}

export function whiteboardRenderPhaseSubtitle(progress: WhiteboardRenderProgress): string {
    if (progress.phase === 'mux') {
        return 'Đang mux audio / captions…';
    }
    if (progress.phase === 'concat') {
        return 'Đang ghép silent các beat…';
    }
    if (progress.phase === 'rendering' && progress.activeBeatId) {
        return `Đang: ${progress.activeBeatId}`;
    }
    if (progress.failed.length > 0) {
        return `${progress.failed.length} beat lỗi`;
    }
    return '';
}
