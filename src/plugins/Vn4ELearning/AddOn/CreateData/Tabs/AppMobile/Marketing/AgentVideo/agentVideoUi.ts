import type { HfThemeCatalogItem } from './agentVideoApi';

export const TTS_PLATFORM_OPTIONS = [
    { key: 'omnivoice_local', label: 'OmniVoice (local)' },
    { key: 'vieneu', label: 'VieNeu (local)' },
    { key: 'saydi', label: 'Saydi (API)' },
    { key: 'vbee', label: 'Vbee (API)' },
] as const;

export const DEFAULT_TTS_PLATFORMS = TTS_PLATFORM_OPTIONS.map((item) => item.key);

export type AgentWorkflowPhase =
    | 'pending'
    | 'script_ready'
    | 'script_approved'
    | 'tts_processing'
    | 'audio_ready'
    | 'rendering'
    | 'video_completed';

export type WorkflowChip = {
    label: string;
    color: 'default' | 'warning' | 'success' | 'info' | 'error';
};

export type PreviewPlaceholder = {
    severity: 'info' | 'warning' | 'error';
    title: string;
    description?: string;
    loading?: boolean;
};

export function hfThemeLabel(key: string, catalog?: HfThemeCatalogItem[]): string {
    const fromCatalog = catalog?.find((item) => item.key === key)?.label;
    if (fromCatalog) {
        return fromCatalog;
    }
    if (key === 'auto') {
        return 'Tự động (agent)';
    }
    return key;
}

export function platformLabel(key: string): string {
    return TTS_PLATFORM_OPTIONS.find((item) => item.key === key)?.label ?? key;
}

export function formatTtsChain(chain: string[]): string {
    if (chain.length === 0) {
        return 'Chưa chọn nền tảng';
    }
    return chain.map(platformLabel).join(' → ');
}

export function resolveWorkflowChip(input: {
    hasScript: boolean;
    scriptApproved: boolean;
    hasAudio: boolean;
    hasAgentVideo: boolean;
    ttsPending: boolean;
    ttsFailed: boolean;
    agentVideoStatus: string;
}): WorkflowChip {
    if (input.hasAgentVideo) {
        return { label: 'Video HyperFrames sẵn sàng', color: 'success' };
    }
    if (input.agentVideoStatus === 'processing') {
        return { label: 'Agent đang render HyperFrames…', color: 'info' };
    }
    if (input.agentVideoStatus === 'failed') {
        return { label: 'Render video thất bại', color: 'error' };
    }
    if (input.hasAudio) {
        return { label: 'Audio sẵn sàng — chờ render video', color: 'success' };
    }
    if (input.ttsFailed) {
        return { label: 'Sinh TTS thất bại — thử lại hoặc upload MP3', color: 'error' };
    }
    if (input.ttsPending) {
        return { label: 'Đang sinh audio TTS…', color: 'info' };
    }
    if (input.hasScript && input.scriptApproved) {
        return { label: 'Script đã duyệt — chờ TTS hoặc upload MP3', color: 'warning' };
    }
    if (input.hasScript) {
        return { label: 'Chờ admin duyệt script', color: 'warning' };
    }
    return { label: 'Chưa có script — chạy agent bước 1', color: 'default' };
}

export function resolvePreviewPlaceholder(input: {
    agentVideoUrl: string;
    agentVideoStatus: string;
    phase?: string;
    hasScript: boolean;
    scriptApproved: boolean;
    hasAudio: boolean;
    ttsPending: boolean;
    lastError: string;
}): PreviewPlaceholder | null {
    if (input.agentVideoUrl.trim() !== '') {
        return null;
    }

    if (input.agentVideoStatus === 'processing' || input.phase === 'rendering') {
        return {
            severity: 'info',
            title: 'Agent đang render HyperFrames…',
            description: 'Video MP4 sẽ hiển thị ở đây khi agent upload xong.',
            loading: true,
        };
    }

    if (input.agentVideoStatus === 'failed') {
        return {
            severity: 'error',
            title: 'Render video thất bại',
            description: input.lastError || 'Kiểm tra log agent và thử lại prompt bước 2.',
        };
    }

    if (input.hasAudio) {
        return {
            severity: 'info',
            title: 'Sẵn sàng render video',
            description: 'Copy prompt bước 2 và chạy agent HyperFrames trong Cursor.',
        };
    }

    if (input.ttsPending || input.phase === 'tts_processing') {
        return {
            severity: 'info',
            title: 'Đang sinh audio TTS',
            description: 'CMS đang tạo MP3 — preview video sẽ có sau khi render xong.',
            loading: true,
        };
    }

    if (input.scriptApproved) {
        return {
            severity: 'warning',
            title: 'Chờ audio MP3',
            description: 'CMS queue TTS sau duyệt, hoặc upload MP3 thủ công ở cột trái.',
        };
    }

    if (input.hasScript) {
        return {
            severity: 'warning',
            title: 'Chờ duyệt script',
            description: 'Duyệt audio script ở cột trái trước khi tiếp tục.',
        };
    }

    return {
        severity: 'info',
        title: 'Chưa có video',
        description: 'Copy prompt bước 1 và chạy agent để sinh audio script.',
    };
}

export function phaseLabel(phase?: string): string {
    switch (phase) {
        case 'script_ready':
            return 'Script sẵn sàng';
        case 'script_approved':
            return 'Script đã duyệt';
        case 'tts_processing':
            return 'Đang TTS';
        case 'audio_ready':
            return 'Audio sẵn sàng';
        case 'rendering':
            return 'Đang render';
        case 'video_completed':
            return 'Video hoàn tất';
        case 'pending':
        default:
            return 'Chưa bắt đầu';
    }
}
