import { ajax } from 'hook/useApi';
import { parseShortVideoApiMessage } from 'helpers/shortVideoApiMessage';

const STORAGE_CLEANUP_BASE =
    'plugin/vn4-e-learning/app-mobile/marketing/short-video/storage-cleanup';

export type StorageCleanupState = {
    status?: string;
    ran_at?: string;
    freed_bytes?: number;
    freed_human?: string;
    videos_cleaned?: number;
    orphans_removed?: number;
    paths_removed?: number;
    errors?: string[];
    duration_sec?: number;
};

export type StorageCleanupStatusResult = {
    success?: boolean;
    message?: string | { content?: string };
    state?: StorageCleanupState;
    job_id?: number;
    job_status?: string;
    running?: boolean;
};

export type StorageCleanupEnqueueResult = {
    success?: boolean;
    message?: string | { content?: string };
    job_id?: number;
    duplicate?: boolean;
};

/** Đưa job dọn file local (video đã post social + folder mồ côi) vào hàng đợi. */
export async function enqueueShortVideoStorageCleanup(): Promise<StorageCleanupEnqueueResult> {
    const result = (await ajax({
        url: `${STORAGE_CLEANUP_BASE}/enqueue`,
        method: 'POST',
        data: {},
        loading: false,
    })) as StorageCleanupEnqueueResult;

    if (!result?.success) {
        throw new Error(
            parseShortVideoApiMessage(result?.message, 'Không đưa được job dọn file vào hàng đợi')
        );
    }

    return result;
}

/** Lấy message dọn file gần nhất + trạng thái job active. */
export async function getShortVideoStorageCleanupStatus(): Promise<StorageCleanupStatusResult> {
    const result = (await ajax({
        url: `${STORAGE_CLEANUP_BASE}/status`,
        method: 'POST',
        data: {},
        loading: false,
    })) as StorageCleanupStatusResult;

    return result && typeof result === 'object' ? result : {};
}
