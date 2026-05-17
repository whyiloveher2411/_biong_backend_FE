export const DISTRIBUTION_STAGES = [
    'plat_strategy',
    'plat_copy',
    'plat_polish',
    'plat_audience',
    'plat_media',
    'plat_preview',
] as const;

export type DistributionStage = typeof DISTRIBUTION_STAGES[number];

export const DISTRIBUTION_STAGE_LABELS: Record<DistributionStage, string> = {
    plat_strategy: 'Chiến lược',
    plat_copy: 'Copy đăng bài',
    plat_polish: 'Chỉnh sửa & tinh gọn',
    plat_audience: 'Phản hồi độc giả',
    plat_media: 'Media / ảnh',
    plat_preview: 'Xem trước & hoàn tất',
};

export const PLATFORM_LABELS: Record<string, string> = {
    facebook: 'Facebook',
    instagram: 'Instagram',
    tiktok: 'TikTok',
    youtube: 'YouTube',
    x: 'X (Twitter)',
    linkedin: 'LinkedIn',
    threads: 'Threads',
};

export const PLATFORM_COPY_LIMITS: Record<string, { limit: number; recommended?: number; titleLimit?: number }> = {
    facebook: { limit: 1250, recommended: 500 },
    instagram: { limit: 2200, recommended: 1500 },
    tiktok: { limit: 2200, recommended: 300 },
    youtube: { limit: 5000, recommended: 2000, titleLimit: 100 },
    x: { limit: 280, recommended: 250 },
    linkedin: { limit: 3000, recommended: 1300 },
    threads: { limit: 500, recommended: 400 },
};

export type PlatformDistributionEntry = {
    completed_stages?: string[];
    strategy?: Record<string, unknown>;
    copy?: Record<string, unknown>;
    media?: Record<string, unknown>;
    wizard_step_index?: number;
};

export type PlatformDistributionMap = Record<string, PlatformDistributionEntry>;
