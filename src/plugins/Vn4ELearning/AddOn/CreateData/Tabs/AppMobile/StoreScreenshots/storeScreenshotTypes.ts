import type { ImageObjectProps } from 'helpers/image';
import type { CopyStylePresetId } from './storeScreenshotCopyStyleOptions';
import type { StoreScreenshotMultilangText } from './storeScreenshotMultilang';

export type HeadlineCopyVariant = {
    copy_style_id: CopyStylePresetId;
    headline: StoreScreenshotMultilangText;
    subtitle: StoreScreenshotMultilangText;
};

export type StoreScreenshotStatus =
    | 'draft'
    | 'metadata_saved'
    | 'screenshots_uploaded'
    | 'template_saved'
    | 'ai_content_saved'
    | 'ai_images_ready'
    | 'mapping_ready'
    | 'generating'
    | 'generated'
    | 'exported'
    | 'stale';

export type StoreMetadata = {
    version: number;
    title: string;
    subtitle: string;
    promotional_text: string;
    description: string;
    whats_new: string;
    keywords: string;
    raw_text: string;
    content_hash: string;
    updated_at: string;
};

export type StoreScreenshotItem = {
    id: string;
    source_url: string;
    source_key: string;
    width: number;
    height: number;
    order: number;
    caption: string;
    copy_style_preset: string;
    crop_target_size?: string;
    logo_placement?: string;
    floating_icons_enabled?: boolean;
    background_pattern?: string;
    /** Mô tả floating icons từ Gemini (mỗi phần tử gồm icon + style). */
    icons?: string[];
    /** Mô tả họa tiết nền cụ thể (hình dạng, vị trí). */
    background_motifs?: string[];
    /** @deprecated Dùng background_pattern — giữ để migrate dữ liệu cũ */
    background_motifs_enabled?: boolean;
    feature_highlight?: string;
    background_color?: string;
    headline: StoreScreenshotMultilangText | string;
    subtitle: StoreScreenshotMultilangText | string;
    headline_variants?: HeadlineCopyVariant[];
    ai_prompt: string;
    ai_image_url: string;
    ai_image_key: string;
    ai_image_width?: number;
    ai_image_height?: number;
    ai_image_original_url?: string;
    ai_image_original_key?: string;
    gemini_logo_removed?: boolean;
    ai_image_version?: number;
    status: string;
};

export type StoreScreenshotAiContentInput = {
    id: string;
    headline: StoreScreenshotMultilangText | string;
    subtitle: StoreScreenshotMultilangText | string;
    ai_prompt: string;
    ai_image?: ImageObjectProps | null;
};

export type StoreScreenshotTemplate = {
    brand_color: string;
    font_family?: string;
    targets: string[];
    style_preset?: string;
    background_mode?: string;
    layout_style?: string;
    device_frame_style?: string;
    typography_style?: string;
    device_frame_ios?: string;
    device_frame_android?: string;
    headline_source?: 'promotional_text' | 'subtitle' | 'app_name' | 'description';
    show_headline?: boolean;
    show_caption?: boolean;
};

export type StoreScreenshotGenerated = {
    screenshot_id: string;
    target: string;
    url: string;
    key: string;
    generated_at: string;
};

export type StoreScreenshotExport = {
    last_export_url: string;
    last_export_at: string;
};

export type StoreScreenshotStepId =
    | 'metadata'
    | 'mapping'
    | 'template'
    | 'preview'
    | 'export';

export type StoreScreenshotConfig = {
    version: number;
    status: StoreScreenshotStatus;
    active_step_id?: StoreScreenshotStepId;
    /** ID screenshot đang chỉnh ở bước Copy & ảnh AI */
    active_mapping_screenshot_id?: string;
    screenshots: StoreScreenshotItem[];
    template: StoreScreenshotTemplate;
    generated: StoreScreenshotGenerated[];
    export: StoreScreenshotExport;
    updated_at: string;
};

export type StoreScreenshotTarget = {
    label: string;
    width: number;
    height: number;
    frame: string;
    folder: string;
};

export type StoreScreenshotGeminiRemoverStatus = {
    ready: boolean;
    message?: string;
};

export type StoreScreenshotGeminiLogoResult = {
    screenshot_id: string;
    status: string;
    error?: string;
};

export type StoreScreenshotProjectResponse = {
    success?: boolean;
    message?: string | { text?: string };
    config: StoreScreenshotConfig;
    store_metadata: StoreMetadata;
    app: {
        id: number;
        title: string;
        logo: string;
        description: string;
    };
    targets: Record<string, StoreScreenshotTarget>;
    gemini_remover?: StoreScreenshotGeminiRemoverStatus;
    processed?: number;
    results?: StoreScreenshotGeminiLogoResult[];
};
