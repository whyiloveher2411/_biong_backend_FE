import type {
    AgentVideoBeatAudioItem,
    AgentVideoBeatAudioQueueProgress,
} from './agentVideoApi';

export type BeatAudioProgressPhase =
    | 'idle'
    | 'generating'
    | 'merging'
    | 'done';

export type BeatAudioProgress = {
    total: number;
    completed: number;
    percent: number;
    activeBeatId: string;
    failed: string[];
    pending: string[];
    phase: BeatAudioProgressPhase;
    /** Hiển thị banner/strip khi đang tạo / ghép audio từng beat */
    active: boolean;
};

type DeriveInput = {
    items?: AgentVideoBeatAudioItem[] | null;
    /** Tổng số beat của beat-map — làm mẫu số khi item chưa đủ. */
    totalBeats?: number | null;
    /** `beat_audio.total` (backend luôn trả, kể cả khi items chưa cập nhật). */
    stateTotal?: number | null;
    /** `beat_audio.ready` (số beat đã có audio). */
    stateReady?: number | null;
    /** `beat_audio.queue.progress` — beat đang/ sắp tạo + đếm từ backend. */
    queueProgress?: AgentVideoBeatAudioQueueProgress | null;
    pipelineStep?: string | null;
    pipelineStatus?: string | null;
};

function toPositiveInt(value: unknown): number {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** beat_N từ order (1-based) — fallback mark_id khi thiếu order. */
function itemBeatLabel(item: AgentVideoBeatAudioItem): string {
    const order = Number(item?.order || 0);
    if (order > 0) {
        return `beat_${order}`;
    }
    const markId = String(item?.mark_id || '').trim();
    const digits = markId.replace(/\D+/g, '');
    return digits ? `beat_${digits}` : markId;
}

function itemStatus(item: AgentVideoBeatAudioItem): string {
    return String(item?.status || 'pending').trim().toLowerCase();
}

/**
 * Progress audio từng beat theo completed/total (không trọng số ghép audio).
 * Nguồn: `beat_audio.items` + `beat_audio.total/ready` + `queue.progress.beat_id`
 * (backend cập nhật sau mỗi beat) + bước pipeline hiện tại.
 */
export function deriveBeatAudioProgress(input: DeriveInput): BeatAudioProgress {
    const items = Array.isArray(input.items) ? input.items : [];
    const step = String(input.pipelineStep || '').trim();
    const pipelineStatus = String(input.pipelineStatus || '').trim().toLowerCase();
    const pipelineRunning = pipelineStatus === 'running';

    const queueProgress = input.queueProgress && typeof input.queueProgress === 'object'
        ? input.queueProgress
        : {};
    const queueTotal = toPositiveInt(queueProgress.total);
    const queueSucceeded = toPositiveInt(queueProgress.succeeded);
    const queueBeatId = String(queueProgress.beat_id || '').trim();
    const queueFailed = Array.isArray(queueProgress.failed)
        ? queueProgress.failed.map((id) => String(id || '').trim()).filter(Boolean)
        : [];

    const total = Math.max(
        items.length,
        toPositiveInt(input.totalBeats),
        toPositiveInt(input.stateTotal),
        queueTotal,
    );

    const sorted = [...items].sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0));

    const failed: string[] = [];
    const pending: string[] = [];
    let readyFromItems = 0;
    let firstGenerating = '';
    let firstPending = '';

    for (const item of sorted) {
        const beatId = itemBeatLabel(item);
        const status = itemStatus(item);
        if (status === 'error' || status === 'failed') {
            failed.push(beatId);
            continue;
        }
        if (status === 'ready') {
            readyFromItems += 1;
            continue;
        }
        pending.push(beatId);
        if (status === 'generating' && !firstGenerating) {
            firstGenerating = beatId;
        }
        if (!firstPending) {
            firstPending = beatId;
        }
    }

    if (queueFailed.length > 0) {
        queueFailed.forEach((beatId) => {
            if (!failed.includes(beatId)) {
                failed.push(beatId);
            }
        });
    }

    const completed = Math.min(
        total > 0 ? total : Number.MAX_SAFE_INTEGER,
        Math.max(
            readyFromItems,
            toPositiveInt(input.stateReady),
            queueSucceeded,
        ),
    );
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Ưu tiên beat đang generating (items) → beat kế tiếp từ queue → beat pending đầu.
    let activeBeatId = firstGenerating || queueBeatId || firstPending;
    if (!activeBeatId && total > 0 && completed < total && failed.length === 0) {
        activeBeatId = `beat_${Math.min(completed + 1, total)}`;
    }

    const allBeatsDone = total > 0 && completed >= total && failed.length === 0;

    let phase: BeatAudioProgressPhase = 'idle';
    if (step === 'beat_audio' && pipelineRunning) {
        phase = allBeatsDone ? 'merging' : 'generating';
    } else if (pending.length > 0 || (completed > 0 && completed < total && failed.length === 0)) {
        phase = 'generating';
    } else if (allBeatsDone) {
        phase = 'done';
    }

    // Audio thủ công 1 beat (không qua pipeline): vẫn hiện progress khi còn pending.
    if (phase === 'idle' && pending.length > 0) {
        phase = 'generating';
    }

    const active = phase === 'generating' || phase === 'merging';

    return {
        total,
        completed,
        percent: phase === 'merging' ? Math.max(percent, total > 0 ? 100 : 0) : percent,
        activeBeatId,
        failed,
        pending,
        phase,
        active,
    };
}

export function beatAudioProgressLabel(progress: BeatAudioProgress): string {
    if (!progress.active && progress.phase === 'idle') {
        return '';
    }
    const count = progress.total > 0
        ? `${progress.completed}/${progress.total} (${progress.percent}%)`
        : '0%';
    if (progress.phase === 'merging') {
        return `Ghép audio · ${count}`;
    }
    const beatNote = progress.activeBeatId ? ` · ${progress.activeBeatId}` : '';
    return `Audio từng beat · ${count}${beatNote}`;
}

export function beatAudioProgressSubtitle(progress: BeatAudioProgress): string {
    if (progress.phase === 'merging') {
        return 'Đang ghép audio từng beat…';
    }
    if (progress.phase === 'generating' && progress.activeBeatId) {
        return `Đang tạo: ${progress.activeBeatId}`;
    }
    if (progress.failed.length > 0) {
        return `${progress.failed.length} beat lỗi`;
    }
    return '';
}
