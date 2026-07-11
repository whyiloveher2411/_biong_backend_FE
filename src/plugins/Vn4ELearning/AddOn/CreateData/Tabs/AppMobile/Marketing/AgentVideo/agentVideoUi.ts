import type { HfThemeCatalogItem } from './agentVideoApi';
import { formatOmnivoiceVoiceDesignVi } from './omnivoiceVoiceDesignLabels';
import { voiceAvatarColor, voiceInitials } from './ShortVideoAgentOmnivoiceVoicePicker';

export const TTS_PLATFORM_OPTIONS = [
    { key: 'omnivoice_local', label: 'OmniVoice (local)' },
    { key: 'vieneu', label: 'VieNeu (local)' },
    { key: 'saydi', label: 'Saydi (API)' },
    { key: 'vbee', label: 'Vbee (API)' },
] as const;

/** Thứ tự ưu tiên đầy đủ (dùng khi sắp xếp lựa chọn user). */
export const TTS_PLATFORM_KEYS = TTS_PLATFORM_OPTIONS.map((item) => item.key);

/** Mặc định khi tạo mới / chưa cấu hình: chỉ OmniVoice. */
export const DEFAULT_TTS_PLATFORMS: string[] = ['omnivoice_local'];

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
    geminiFillStatus?: string;
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
    if (input.geminiFillStatus === 'queued' || input.geminiFillStatus === 'processing') {
        return { label: 'Đang fill HTML beat (Gemini queue)…', color: 'info' };
    }
    if (input.geminiFillStatus === 'completed') {
        return { label: 'HTML beat sẵn sàng — kiểm tra lại', color: 'success' };
    }
    if (input.geminiFillStatus === 'failed') {
        return { label: 'Fill HTML beat thất bại', color: 'error' };
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
    return { label: 'Chưa có script — mở Gemini sinh script', color: 'default' };
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
        description: 'Mở Gemini sinh script → Lưu script vào CMS → duyệt ở cột trái.',
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

export function whisperStatusLabel(status: string): string {
    switch (status) {
        case 'completed':
            return 'Whisper sẵn sàng';
        case 'processing':
            return 'Đang chạy whisper…';
        case 'failed':
            return 'Whisper lỗi';
        default:
            return 'Chưa có whisper';
    }
}

export function whisperStatusColor(status: string): 'default' | 'success' | 'warning' | 'error' | 'info' {
    switch (status) {
        case 'completed':
            return 'success';
        case 'processing':
            return 'info';
        case 'failed':
            return 'error';
        default:
            return 'default';
    }
}

export type OmnivoiceDisplaySummary = {
    displayName: string;
    initials: string;
    avatarColor: string;
    isDesignMode: boolean;
};

export function resolveOmnivoiceDisplaySummary(input: {
    voiceKey: string;
    voiceMode: 'clone' | 'design';
    voiceDesign: string;
    catalog: Array<{ key: string; label?: string }>;
}): OmnivoiceDisplaySummary {
    const isDesignMode = input.voiceMode === 'design';
    const catalog = input.catalog.length > 0
        ? input.catalog
        : [{ key: 'minh_quân', label: 'minh quân' }];
    const selectedKey = input.voiceKey || 'minh_quân';
    const selected = catalog.find((item) => item.key === selectedKey) || catalog[0];
    const cloneDisplayName = selected?.label || selectedKey.replace(/_/g, ' ');

    const designDisplayName = formatOmnivoiceVoiceDesignVi(
        input.voiceDesign || 'male, middle-aged, very low pitch',
    );

    return {
        displayName: isDesignMode ? `Thiết kế giọng · ${designDisplayName}` : cloneDisplayName,
        initials: isDesignMode ? 'VD' : voiceInitials(selected?.label || selectedKey),
        avatarColor: isDesignMode
            ? '#5e35b1'
            : voiceAvatarColor(selectedKey, catalog.map((item) => item.key)),
        isDesignMode,
    };
}
