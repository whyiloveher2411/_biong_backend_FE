/**
 * API check-queue để kiểm tra trạng thái job
 * job_status: 'pending' | 'processing' | 'failed' | 'completed'
 */
export const CHECK_QUEUE_API = 'plugin/vn4-e-learning/app-mobile/check-queue';

export type JobStatus = 'pending' | 'processing' | 'failed' | 'completed';

export interface CheckQueueResponse {
    success: boolean;
    job_status: JobStatus;
    [key: string]: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function pollCheckQueue(
    ajax: (options: { url: string; method: string; data: Record<string, unknown>; success: (result: CheckQueueResponse) => void; error?: () => void }) => void,
    jobId: number,
    options: {
        intervalMs?: number;
        onCompleted: (result: CheckQueueResponse) => void;
        onFailed?: () => void;
    }
): () => void {
    const { intervalMs = 5000, onCompleted, onFailed } = options;
    let cancelled = false;

    const poll = () => {
        if (cancelled) return;
        ajax({
            url: CHECK_QUEUE_API,
            method: 'POST',
            data: { job_id: jobId },
            success: (result: CheckQueueResponse) => {
                if (cancelled) return;
                if (result.success === false) {
                    // Job không tồn tại hoặc lỗi - ngưng poll
                    onFailed?.();
                    return;
                }
                if (result.job_status === 'completed') {
                    onCompleted(result);
                    return;
                }
                if (result.job_status === 'failed') {
                    onFailed?.();
                    return;
                }
                // pending | processing: tiếp tục poll
                setTimeout(poll, intervalMs);
            },
            error: () => {
                if (!cancelled) setTimeout(poll, intervalMs);
            }
        });
    };

    poll();

    return () => { cancelled = true; };
}
