import type { StoreMetadata, StoreScreenshotConfig, StoreScreenshotStepId } from './storeScreenshotTypes';
import { CROP_TARGET_SIZE_OPTIONS } from './storeScreenshotCropTarget';

export const STORE_SCREENSHOT_API = 'plugin/vn4-e-learning/app-mobile/store-screenshots';

export const STORE_SCREENSHOT_STEPS = [
    { id: 'metadata', label: 'Metadata', description: 'Nhập title, mô tả và từ khóa' },
    { id: 'template', label: 'Template', description: 'Phong cách ảnh, màu brand, font và kích thước target' },
    { id: 'mapping', label: 'Copy & ảnh AI', description: 'Upload ảnh, gợi ý Gemini, chỉnh copy/visual và upload ảnh AI' },
    { id: 'preview', label: 'Preview', description: 'Xem ảnh AI đã upload' },
    { id: 'export', label: 'Export', description: 'Tải bộ ảnh zip' },
] as const;

export const DEFAULT_STORE_SCREENSHOT_STEP_ID = STORE_SCREENSHOT_STEPS[0].id;

export function normalizeStoreScreenshotStepId(stepId?: string | null): StoreScreenshotStepId {
    const normalized = String(stepId || '').trim();
    if (normalized === 'upload') {
        return 'mapping';
    }
    if (normalized && STORE_SCREENSHOT_STEPS.some((step) => step.id === normalized)) {
        return normalized as StoreScreenshotStepId;
    }
    return DEFAULT_STORE_SCREENSHOT_STEP_ID;
}

export const DEFAULT_STORE_METADATA: StoreMetadata = {
    version: 1,
    title: '',
    subtitle: '',
    promotional_text: '',
    description: '',
    whats_new: '',
    keywords: '',
    raw_text: '',
    content_hash: '',
    updated_at: '',
};

export const DEFAULT_STORE_SCREENSHOT_CONFIG: StoreScreenshotConfig = {
    version: 1,
    status: 'draft',
    active_step_id: DEFAULT_STORE_SCREENSHOT_STEP_ID,
    active_mapping_screenshot_id: '',
    screenshots: [],
    template: {
        brand_color: '#1A73E8',
        font_family: 'inter',
        targets: ['app_store_iphone_67', 'google_play_phone'],
        style_preset: 'clean_professional',
        background_mode: 'brand_gradient',
        layout_style: 'centered_device',
        device_frame_style: 'iphone_modern',
        typography_style: 'bold_sans',
    },
    generated: [],
    export: {
        last_export_url: '',
        last_export_at: '',
    },
    updated_at: '',
};

export type AppleStoreScreenshotSizeChip = {
    label: string;
    ratio: string;
    orientation: 'Dọc' | 'Ngang';
    color: 'primary' | 'secondary' | 'info' | 'success';
};

export const APPLE_STORE_SCREENSHOT_SIZE_CHIPS: AppleStoreScreenshotSizeChip[] = CROP_TARGET_SIZE_OPTIONS.map(
    (option) => ({
        label: option.label,
        ratio: option.ratio,
        orientation: option.orientationLabel,
        color: option.color,
    }),
);

export const APPLE_STORE_SCREENSHOT_SIZES = CROP_TARGET_SIZE_OPTIONS.map(
    (option) => option.label,
);

export const HEADLINE_SOURCE_OPTIONS = [
    { value: 'promotional_text', label: 'Promotional text' },
    { value: 'subtitle', label: 'Subtitle' },
    { value: 'app_name', label: 'Tên app' },
    { value: 'description', label: 'Mô tả' },
] as const;
