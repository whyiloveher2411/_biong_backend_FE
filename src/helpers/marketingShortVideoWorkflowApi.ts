import { ajax } from 'hook/useApi';
import { parseShortVideoApiMessage } from 'helpers/shortVideoApiMessage';

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
    message?: string | { content?: string };
};

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
    options?: { intervalMs?: number; maxAttempts?: number }
): Promise<ShortVideoWorkflowStepResult> {
    const intervalMs = options?.intervalMs ?? 3000;
    const maxAttempts = options?.maxAttempts ?? 120;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const status = await fetchShortVideoJobStatus(jobId);
        if (status.status === 'completed' || status.status === 'failed') {
            return status;
        }
        await new Promise((resolve) => {
            setTimeout(resolve, intervalMs);
        });
    }

    throw new Error('Hết thời gian chờ job workflow');
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
            const jobResult = await pollShortVideoJobUntilDone(stepResult.job_id);
            if (jobResult.status === 'failed') {
                throw new Error(
                    parseShortVideoApiMessage(jobResult.message, 'Pipeline queue thất bại')
                );
            }
            status = jobResult.workflow ?? (await fetchShortVideoWorkflowStatus(shortVideoId));
            options.onProgress?.(status);
            if (status.stage === 'assets' || status.stage === 'done') {
                break;
            }
        }

        const finalStatus = await fetchShortVideoWorkflowStatus(shortVideoId);
        return { ...finalStatus, success: true };
    }

    const result = await runShortVideoWorkflowStep({
        shortVideoId,
        runAll: true,
    });
    options.onProgress?.(result.workflow ?? result);

    return result;
}

export async function restartShortVideoPipeline(options: {
    shortVideoId: number;
    onProgress?: (status: ShortVideoWorkflowStatus) => void;
}): Promise<ShortVideoWorkflowStepResult> {
    const shortVideoId = Number(options.shortVideoId || 0);
    if (!Number.isInteger(shortVideoId) || shortVideoId <= 0) {
        throw new Error('Thiếu short video id');
    }

    const result = (await ajax({
        url: RUN_WORKFLOW_STEP_PATH,
        data: {
            short_video_id: shortVideoId,
            id: shortVideoId,
            restart_pipeline: 1,
        },
    })) as ShortVideoWorkflowStepResult;

    if (!result?.success && !result?.completed) {
        throw new Error(
            parseShortVideoApiMessage(result?.message, 'Làm lại pipeline thất bại')
        );
    }

    const workflow = result.workflow ?? result;
    options.onProgress?.(workflow);

    return result;
}
