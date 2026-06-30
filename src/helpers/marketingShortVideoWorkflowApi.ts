import { ajax } from 'hook/useApi';
import { parseShortVideoApiMessage } from 'helpers/shortVideoApiMessage';
import type { ShortVideoWorkflowProgress } from 'helpers/shortVideoWorkflowProgressTypes';

export type {
    ShortVideoWorkflowHistoryEntry,
    ShortVideoWorkflowProgress,
    ShortVideoWorkflowProgressStep,
} from 'helpers/shortVideoWorkflowProgressTypes';

export type ShortVideoWorkflowNextAction = {
    type?: string;
    short_video_id?: number;
    post_id?: number;
    target_lang?: string;
    can_run?: boolean;
    reason?: string;
};

export type ShortVideoWorkflowStatus = {
    success?: boolean;
    short_video_id?: number;
    stage?: string;
    has_script?: boolean;
    has_scene_audio?: boolean;
    has_manifest_cache?: boolean;
    manifest_stale?: boolean;
    script_source?: string;
    scenes_total?: number;
    scenes_audio_done?: number;
    pending_scene_ids?: string[];
    marketing_post_id?: number;
    lang?: string;
    next_action?: ShortVideoWorkflowNextAction;
    workflow_progress?: ShortVideoWorkflowProgress;
    pipeline_active_step?: string;
    message?: string | { content?: string };
};

export function resolveMarketingPostIdFromShortVideo(
    post: JsonFormat | Record<string, unknown> | null | undefined,
): number {
    if (!post) {
        return 0;
    }

    const raw = (post as Record<string, unknown>).marketing_post;
    const id = Number(raw);

    return Number.isFinite(id) && id > 0 ? id : 0;
}

export type ShortVideoWorkflowStepResult = ShortVideoWorkflowStatus & {
    step?: string;
    action?: string;
    completed?: boolean;
    video_url?: string;
    generate_status?: string;
    job_id?: number;
    /** Trạng thái queue job: pending | processing | completed | failed */
    status?: string;
    handler?: string;
    error_log?: string;
    workflow?: ShortVideoWorkflowStatus;
    validation?: {
        success?: boolean;
        errors?: string[];
        warnings?: string[];
    };
};

const WORKFLOW_STATUS_PATH =
    'plugin/vn4-e-learning/app-mobile/marketing/short-video/workflow/status';
const RUN_WORKFLOW_STEP_PATH =
    'plugin/vn4-e-learning/app-mobile/marketing/short-video/run-workflow-step';
const JOB_STATUS_PATH =
    'plugin/vn4-e-learning/app-mobile/marketing/short-video/job-status';

const PIPELINE_POLL_INTERVAL_MS = 2000;
const PIPELINE_STEP_MAX_WAIT_MS = 45 * 60 * 1000;

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function workflowHistoryLength(status: ShortVideoWorkflowStatus | null | undefined): number {
    return status?.workflow_progress?.workflow_history?.length ?? 0;
}

function normalizeWorkflowStepId(stepId: string | undefined): string {
    const key = String(stepId || '').trim().toLowerCase();
    if (key === 'scene_audio_vieneu') {
        return 'scene_audio';
    }
    return key;
}

function workflowStepOrderIndex(stepId: string | undefined): number {
    const order = ['script', 'scene_audio', 'timeline_plan', 'manifest', 'render'];
    return order.indexOf(normalizeWorkflowStepId(stepId));
}

function hasWorkflowStepCompleted(
    before: ShortVideoWorkflowStatus,
    after: ShortVideoWorkflowStatus
): boolean {
    if (isPipelineTerminalStage(after.stage)) {
        return true;
    }

    if (workflowHistoryLength(after) > workflowHistoryLength(before)) {
        return true;
    }

    const beforeStepId = normalizeWorkflowStepId(
        before.pipeline_active_step
            || before.workflow_progress?.current_step_id
            || before.stage
    );
    const afterStepId = normalizeWorkflowStepId(
        after.pipeline_active_step
            || after.workflow_progress?.current_step_id
            || after.stage
    );
    const beforeIdx = workflowStepOrderIndex(beforeStepId);
    const afterIdx = workflowStepOrderIndex(afterStepId);
    if (beforeIdx >= 0 && afterIdx > beforeIdx) {
        return true;
    }

    if (!before.has_scene_audio && after.has_scene_audio) {
        return true;
    }

    if (!before.has_manifest_cache && after.has_manifest_cache) {
        return true;
    }

    return false;
}

function isPipelineTerminalStage(stage: string | undefined): boolean {
    const key = (stage || '').trim().toLowerCase();
    return key === 'assets' || key === 'done';
}

function isWorkflowHardBlocked(status: ShortVideoWorkflowStatus | null | undefined): boolean {
    if (!status) {
        return false;
    }
    const stage = String(status.stage || '').trim().toLowerCase();
    if (stage !== 'blocked') {
        return false;
    }
    const reason = String(status.next_action?.reason || '').trim().toLowerCase();
    return reason !== 'pipeline_running';
}

function isWorkflowPipelineRunning(status: ShortVideoWorkflowStatus | null | undefined): boolean {
    if (!status) {
        return false;
    }
    if (String(status.pipeline_active_step || '').trim() !== '') {
        return true;
    }
    return String(status.next_action?.reason || '').trim().toLowerCase() === 'pipeline_running';
}

function canWorkflowContinue(status: ShortVideoWorkflowStatus | null | undefined): boolean {
    if (!status || isPipelineTerminalStage(status.stage)) {
        return false;
    }
    if (isWorkflowHardBlocked(status)) {
        return false;
    }
    return Boolean(status.next_action?.can_run) || isWorkflowPipelineRunning(status);
}

export function resolveWorkflowBlockedMessage(status: ShortVideoWorkflowStatus): string {
    const reason = String(status.next_action?.reason || '').trim().toLowerCase();
    const labels: Record<string, string> = {
        manual_script_missing: 'Thiếu script thủ công — hãy nhập script trước khi chạy pipeline',
        missing_marketing_post: 'Short video chưa liên kết bài marketing',
        missing_content_text: 'Bài marketing thiếu nội dung để sinh script',
        tts_unavailable: 'Chưa cấu hình TTS Saydi hoặc Vbee',
    };
    return labels[reason] || 'Pipeline bị chặn — không thể tiếp tục';
}

export async function fetchShortVideoWorkflowStatus(
    shortVideoId: number
): Promise<ShortVideoWorkflowStatus> {
    const id = Number(shortVideoId || 0);
    if (!Number.isInteger(id) || id <= 0) {
        throw new Error('Thiếu short video id');
    }

    const result = (await ajax({
        url: WORKFLOW_STATUS_PATH,
        data: { short_video_id: id, id },
    })) as ShortVideoWorkflowStatus;

    if (result?.success === false) {
        throw new Error(
            parseShortVideoApiMessage(result?.message, 'Không lấy được workflow status')
        );
    }

    return result;
}

export async function runShortVideoWorkflowStep(options: {
    shortVideoId: number;
    step?: string;
    runAll?: boolean;
    useQueue?: boolean;
    force?: boolean;
}): Promise<ShortVideoWorkflowStepResult> {
    const shortVideoId = Number(options.shortVideoId || 0);
    if (!Number.isInteger(shortVideoId) || shortVideoId <= 0) {
        throw new Error('Thiếu short video id');
    }

    const data: Record<string, unknown> = {
        short_video_id: shortVideoId,
        id: shortVideoId,
    };
    if (options.step) {
        data.step = options.step;
    }
    if (options.runAll) {
        data.run_all = 1;
    }
    if (options.useQueue) {
        data.use_queue = 1;
    }
    if (options.force) {
        data.force = 1;
    }

    const result = (await ajax({
        url: RUN_WORKFLOW_STEP_PATH,
        data,
    })) as ShortVideoWorkflowStepResult;

    if (!result?.success && !result?.completed) {
        throw new Error(
            parseShortVideoApiMessage(result?.message, 'Chạy workflow step thất bại')
        );
    }

    return result;
}

export async function fetchShortVideoJobStatus(jobId: number): Promise<ShortVideoWorkflowStepResult> {
    const id = Number(jobId || 0);
    if (!Number.isInteger(id) || id <= 0) {
        throw new Error('Thiếu job id');
    }

    const result = (await ajax({
        url: JOB_STATUS_PATH,
        data: { job_id: id },
    })) as ShortVideoWorkflowStepResult;

    if (!result?.success) {
        throw new Error(
            parseShortVideoApiMessage(result?.message, 'Không lấy được job status')
        );
    }

    return result;
}

export async function pollShortVideoJobUntilDone(
    jobId: number,
    options?: {
        intervalMs?: number;
        maxAttempts?: number;
        onProgress?: (status: ShortVideoWorkflowStatus) => void;
    }
): Promise<ShortVideoWorkflowStepResult> {
    const intervalMs = options?.intervalMs ?? 3000;
    const maxAttempts = options?.maxAttempts ?? 120;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const status = await fetchShortVideoJobStatus(jobId);
        if (status.workflow) {
            options?.onProgress?.(status.workflow);
        }
        if (status.status === 'completed' || status.status === 'failed') {
            return status;
        }
        await new Promise((resolve) => {
            setTimeout(resolve, intervalMs);
        });
    }

    throw new Error('Hết thời gian chờ job workflow');
}

async function resetShortVideoPipelineOnly(
    shortVideoId: number
): Promise<ShortVideoWorkflowStatus> {
    const result = (await ajax({
        url: RUN_WORKFLOW_STEP_PATH,
        data: {
            short_video_id: shortVideoId,
            id: shortVideoId,
            restart_pipeline: 1,
            reset_only: 1,
        },
    })) as ShortVideoWorkflowStepResult;

    if (!result?.success) {
        throw new Error(
            parseShortVideoApiMessage(result?.message, 'Reset pipeline thất bại')
        );
    }

    return result.workflow ?? result;
}

async function runWorkflowStepWithStatusPolling(
    shortVideoId: number,
    onProgress?: (status: ShortVideoWorkflowStatus) => void
): Promise<ShortVideoWorkflowStepResult> {
    const beforeStatus = await fetchShortVideoWorkflowStatus(shortVideoId);
    onProgress?.(beforeStatus);

    const stepPromise = runShortVideoWorkflowStep({ shortVideoId });
    const startedAt = Date.now();
    let latestStatus = beforeStatus;
    let stepResult: ShortVideoWorkflowStepResult | null = null;
    let stepError: unknown = null;

    stepPromise
        .then((result) => {
            stepResult = result;
        })
        .catch((error) => {
            stepError = error;
        });

    while (Date.now() - startedAt < PIPELINE_STEP_MAX_WAIT_MS) {
        try {
            latestStatus = await fetchShortVideoWorkflowStatus(shortVideoId);
            onProgress?.(latestStatus);
        } catch {
            if (stepResult || stepError) {
                break;
            }
            await delay(PIPELINE_POLL_INTERVAL_MS);
            continue;
        }

        if (isPipelineTerminalStage(latestStatus.stage)) {
            break;
        }

        if (isWorkflowHardBlocked(latestStatus)) {
            break;
        }

        if (hasWorkflowStepCompleted(beforeStatus, latestStatus)) {
            break;
        }

        if (stepResult) {
            break;
        }

        if (stepError && hasWorkflowStepCompleted(beforeStatus, latestStatus)) {
            break;
        }

        await delay(PIPELINE_POLL_INTERVAL_MS);
    }

    if (stepResult) {
        const resolved = stepResult as ShortVideoWorkflowStepResult;
        onProgress?.(resolved.workflow ?? latestStatus);
        return resolved;
    }

    if (stepError) {
        if (hasWorkflowStepCompleted(beforeStatus, latestStatus) || isWorkflowPipelineRunning(latestStatus)) {
            return { ...latestStatus, success: true };
        }
        throw stepError;
    }

    if (isWorkflowHardBlocked(latestStatus)) {
        throw new Error(resolveWorkflowBlockedMessage(latestStatus));
    }

    try {
        const resolved = await stepPromise;
        onProgress?.(resolved.workflow ?? latestStatus);
        return resolved;
    } catch (error) {
        const refreshed = await fetchShortVideoWorkflowStatus(shortVideoId);
        onProgress?.(refreshed);
        if (hasWorkflowStepCompleted(beforeStatus, refreshed) || isPipelineTerminalStage(refreshed.stage)) {
            return { ...refreshed, success: true };
        }
        throw error;
    }
}

export async function runShortVideoPipelineWithProgress(options: {
    shortVideoId: number;
    restart?: boolean;
    onProgress?: (status: ShortVideoWorkflowStatus) => void;
}): Promise<ShortVideoWorkflowStepResult> {
    const shortVideoId = Number(options.shortVideoId || 0);
    if (!Number.isInteger(shortVideoId) || shortVideoId <= 0) {
        throw new Error('Thiếu short video id');
    }

    let status = options.restart
        ? await resetShortVideoPipelineOnly(shortVideoId)
        : await fetchShortVideoWorkflowStatus(shortVideoId);
    options.onProgress?.(status);

    if (isWorkflowHardBlocked(status)) {
        throw new Error(resolveWorkflowBlockedMessage(status));
    }

    if (!canWorkflowContinue(status)) {
        return { ...status, success: true };
    }

    let lastResult: ShortVideoWorkflowStepResult = { ...status, success: true };

    while (canWorkflowContinue(status)) {
        let stepResult: ShortVideoWorkflowStepResult;
        try {
            stepResult = await runWorkflowStepWithStatusPolling(
                shortVideoId,
                options.onProgress
            );
        } catch (error) {
            status = await fetchShortVideoWorkflowStatus(shortVideoId);
            options.onProgress?.(status);
            if (isWorkflowHardBlocked(status)) {
                throw new Error(resolveWorkflowBlockedMessage(status));
            }
            if (!canWorkflowContinue(status)) {
                lastResult = { ...status, success: true };
                break;
            }
            throw error;
        }
        lastResult = stepResult;

        if (!stepResult.success && !stepResult.completed) {
            status = stepResult.workflow ?? (await fetchShortVideoWorkflowStatus(shortVideoId));
            options.onProgress?.(status);
            if (isWorkflowHardBlocked(status)) {
                throw new Error(resolveWorkflowBlockedMessage(status));
            }
            if (!canWorkflowContinue(status)) {
                break;
            }
            throw new Error(
                parseShortVideoApiMessage(stepResult.message, 'Chạy workflow step thất bại')
            );
        }

        status = stepResult.workflow ?? (await fetchShortVideoWorkflowStatus(shortVideoId));
        options.onProgress?.(status);

        if (stepResult.completed || isPipelineTerminalStage(status.stage)) {
            break;
        }
    }

    const finalStatus = await fetchShortVideoWorkflowStatus(shortVideoId);
    options.onProgress?.(finalStatus);

    return { ...lastResult, ...finalStatus, success: true };
}

export async function runShortVideoAutoPipeline(options: {
    shortVideoId: number;
    useQueue?: boolean;
    onProgress?: (status: ShortVideoWorkflowStatus) => void;
}): Promise<ShortVideoWorkflowStepResult> {
    const shortVideoId = Number(options.shortVideoId || 0);
    const useQueue = Boolean(options.useQueue);

    if (useQueue) {
        let status = await fetchShortVideoWorkflowStatus(shortVideoId);
        options.onProgress?.(status);

        while (status.next_action?.can_run) {
            const stepResult = await runShortVideoWorkflowStep({
                shortVideoId,
                useQueue: true,
            });
            if (!stepResult.job_id) {
                throw new Error('Queue không trả job_id');
            }
            const jobResult = await pollShortVideoJobUntilDone(stepResult.job_id, {
                onProgress: options.onProgress,
            });
            if (jobResult.status === 'failed') {
                throw new Error(
                    parseShortVideoApiMessage(jobResult.message, 'Pipeline queue thất bại')
                );
            }
            status = jobResult.workflow ?? (await fetchShortVideoWorkflowStatus(shortVideoId));
            options.onProgress?.(status);
            if (isPipelineTerminalStage(status.stage)) {
                break;
            }
        }

        const finalStatus = await fetchShortVideoWorkflowStatus(shortVideoId);
        options.onProgress?.(finalStatus);
        return { ...finalStatus, success: true };
    }

    return runShortVideoPipelineWithProgress({
        shortVideoId,
        restart: false,
        onProgress: options.onProgress,
    });
}

export async function restartShortVideoPipeline(options: {
    shortVideoId: number;
    onProgress?: (status: ShortVideoWorkflowStatus) => void;
}): Promise<ShortVideoWorkflowStepResult> {
    return runShortVideoPipelineWithProgress({
        shortVideoId: options.shortVideoId,
        restart: true,
        onProgress: options.onProgress,
    });
}
