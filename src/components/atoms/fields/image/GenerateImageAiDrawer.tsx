import React, { useState } from 'react';
import DrawerCustom from 'components/molecules/DrawerCustom';
import {
    Box,
    TextField,
    Button,
    FormControl,
    FormLabel,
    InputLabel,
    Select,
    MenuItem,
    Autocomplete,
    OutlinedInput,
    Chip,
    Grid,
    SelectChangeEvent,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import FieldForm from 'components/atoms/fields/FieldForm';
import useAjax from 'hook/useApi';
import { ImageObjectProps } from 'helpers/image';
import { validURL, convertToURL } from 'helpers/url';

interface GenerateImageAiDrawerProps {
    open: boolean;
    onClose: () => void;
    onSuccess: (image: ImageObjectProps) => void;
    /** URL API tạo ảnh AI, mặc định: post-type/image/generate-image */
    apiUrl?: string;
}

/**
 * Style Presets - Chọn nhanh cấu hình có sẵn.
 * Chỉ dùng cho UI, không gửi lên API.
 * Dễ mở rộng: thêm object mới vào mảng STYLE_PRESETS.
 */
const STYLE_PRESETS = [
    {
        id: 'logo',
        label: 'Logo (Khóa học, thương hiệu)',
        values: {
            imageType: 'ui_ux_design',
            artStyle: 'vector_art',
            lighting: 'studio_lighting',
            mood: 'vibrant',
            cameraAngle: '',
            lens: '',
            colorPalette: 'cool_tones',
            subject: 'abstract',
            era: 'futuristic',
            background: 'simple',
            infographicLayout: '',
            infographicStructure: '',
            infographicColor: '',
            aspectRatio: '1:1',
            quality: '512',
            negativePrompts: ['low_quality_deformed', 'text_watermark', 'blurry'],
            promptSuggestion: 'Logo đơn giản, hiện đại, dễ nhận diện',
        },
    },
    {
        id: 'infographic',
        label: 'Infographic (Đồ họa thông tin)',
        values: {
            imageType: 'infographic',
            artStyle: 'flat_design',
            lighting: '',
            mood: '',
            cameraAngle: '',
            lens: '',
            colorPalette: 'vibrant',
            subject: 'abstract',
            era: 'modern',
            background: 'simple',
            infographicLayout: 'flat_design',
            infographicStructure: 'process_flow',
            infographicColor: 'corporate',
            aspectRatio: '16:9',
            quality: '1024',
            negativePrompts: ['low_quality_deformed', 'text_watermark', 'blurry'],
            promptSuggestion: 'Infographic trình bày thông tin rõ ràng, dễ hiểu',
        },
    },
    {
        id: 'mindmap',
        label: 'Mindmap / Sơ đồ tư duy',
        values: {
            imageType: 'mindmap_diagram',
            artStyle: '',
            lighting: '',
            mood: '',
            cameraAngle: '',
            lens: '',
            colorPalette: 'vibrant_pastel',
            subject: 'abstract',
            era: 'modern',
            background: 'simple',
            infographicLayout: 'hand_drawn',
            infographicStructure: 'hierarchical',
            infographicColor: 'vibrant_pastel',
            aspectRatio: '1:1',
            quality: '1024',
            negativePrompts: ['low_quality_deformed', 'text_watermark'],
            promptSuggestion: 'Sơ đồ tư duy, mindmap sáng tạo, dễ đọc',
        },
    },
    {
        id: 'thumbnail',
        label: 'Thumbnail (Youtube, bài viết)',
        values: {
            imageType: 'general_art',
            artStyle: '3d_render_octane',
            lighting: 'neon_lights',
            mood: 'vibrant',
            cameraAngle: 'close_up',
            lens: 'wide_angle',
            colorPalette: 'vibrant',
            subject: 'abstract',
            era: 'futuristic',
            background: 'gradient',
            infographicLayout: '',
            infographicStructure: '',
            infographicColor: '',
            aspectRatio: '16:9',
            quality: '1024',
            negativePrompts: ['low_quality_deformed', 'text_watermark', 'blurry'],
            promptSuggestion: 'Thumbnail bắt mắt, thu hút click',
        },
    },
    {
        id: 'portrait',
        label: 'Chân dung / Portrait',
        values: {
            imageType: 'general_art',
            artStyle: 'portrait',
            lighting: 'studio_lighting',
            mood: 'serene',
            cameraAngle: 'close_up',
            lens: 'bokeh',
            colorPalette: 'warm_tones',
            subject: 'person',
            era: 'modern',
            background: 'blurred',
            infographicLayout: '',
            infographicStructure: '',
            infographicColor: '',
            aspectRatio: '1:1',
            quality: '1024',
            negativePrompts: ['low_quality_deformed', 'extra_fingers', 'bad_anatomy', 'ugly_face'],
            promptSuggestion: 'Chân dung chuyên nghiệp, ánh sáng đẹp',
        },
    },
];

// Loại hình ảnh (Image Type / Visual Format)
const IMAGE_TYPE_OPTIONS = [
    { value: 'general_art', label: 'General Art (Ảnh nghệ thuật/đời thực)', default: true },
    { value: 'infographic', label: 'Infographic (Đồ họa thông tin)' },
    { value: 'mindmap_diagram', label: 'Mindmap/Diagram (Sơ đồ tư duy, sơ đồ luồng)' },
    { value: 'technical_drawing', label: 'Technical Drawing (Bản vẽ kỹ thuật, kiến trúc)' },
    { value: 'ui_ux_design', label: 'UI/UX Design (Giao diện web/app)' },
];

// Sub-options cho Infographic & Mindmap
const INFOGRAPHIC_LAYOUT_OPTIONS = [
    { value: 'flat_design', label: 'Flat Design (Thiết kế phẳng hiện đại)' },
    { value: 'isometric', label: 'Isometric (Dạng 3D thu nhỏ)' },
    { value: 'minimalist', label: 'Minimalist (Tối giản, nhiều khoảng trắng)' },
    { value: 'hand_drawn', label: 'Hand-drawn/Sketchy (Vẽ tay, phù hợp Mindmap)' },
];

const INFOGRAPHIC_STRUCTURE_OPTIONS = [
    { value: 'timeline', label: 'Timeline (Biểu đồ thời gian)' },
    { value: 'comparison', label: 'Comparison (So sánh A vs B)' },
    { value: 'process_flow', label: 'Process/Flow (Quy trình theo bước 1, 2, 3...)' },
    { value: 'hierarchical', label: 'Hierarchical (Phân cấp từ trên xuống dưới)' },
];

const INFOGRAPHIC_COLOR_OPTIONS = [
    { value: 'corporate', label: 'Corporate (Xanh dương, xám, trắng - Chuyên nghiệp)' },
    { value: 'vibrant_pastel', label: 'Vibrant/Pastel (Màu sắc rực rỡ hoặc nhẹ - Sáng tạo)' },
    { value: 'monochromatic', label: 'Monochromatic (Đơn sắc - Trắng đen hoặc một tông)' },
];

/**
 * Cấu hình input bổ sung theo từng image type.
 * Mỗi image type có các field riêng, tập hợp vào image_type_add (key: labelKey tiếng Anh, value: option label).
 * Dễ mở rộng: thêm image type mới hoặc thêm field cho type có sẵn.
 */
const IMAGE_TYPE_ADD_CONFIG: Record<string, { key: string; labelKey: string; options: { value: string; label: string }[] }[]> = {
    infographic: [
        { key: 'infographic_layout', labelKey: 'Layout Style', options: INFOGRAPHIC_LAYOUT_OPTIONS },
        { key: 'infographic_structure', labelKey: 'Structure', options: INFOGRAPHIC_STRUCTURE_OPTIONS },
        { key: 'infographic_color', labelKey: 'Infographic Color Palette', options: INFOGRAPHIC_COLOR_OPTIONS },
    ],
    mindmap_diagram: [
        { key: 'infographic_layout', labelKey: 'Layout Style', options: INFOGRAPHIC_LAYOUT_OPTIONS },
        { key: 'infographic_structure', labelKey: 'Structure', options: INFOGRAPHIC_STRUCTURE_OPTIONS },
        { key: 'infographic_color', labelKey: 'Infographic Color Palette', options: INFOGRAPHIC_COLOR_OPTIONS },
    ],
    technical_drawing: [],
    ui_ux_design: [],
    general_art: [],
};

function buildImageTypeAdd(
    imageType: string,
    formValues: Record<string, string | undefined>
): Record<string, string> {
    const fields = IMAGE_TYPE_ADD_CONFIG[imageType] || [];
    const result: Record<string, string> = {};
    for (const field of fields) {
        const value = formValues[field.key];
        if (value) {
            const opt = field.options.find((o) => o.value === value);
            if (opt) result[field.labelKey] = opt.label;
        }
    }
    return result;
}

function imageTypeAddToPromptString(imageTypeAdd: Record<string, string>): string {
    return Object.entries(imageTypeAdd)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
}

// Phong cách nghệ thuật - Image Cards
const ART_STYLE_OPTIONS = [
    { value: 'realistic', label: 'Realistic (Chân thực)', group: 'Photography' },
    { value: 'macro', label: 'Macro (Siêu cận)', group: 'Photography' },
    { value: 'portrait', label: 'Portrait (Chân dung)', group: 'Photography' },
    { value: 'street_photography', label: 'Street Photography (Nhiếp ảnh đường phố)', group: 'Photography' },
    { value: 'landscape', label: 'Landscape (Phong cảnh)', group: 'Photography' },
    { value: 'wildlife', label: 'Wildlife (Động vật hoang dã)', group: 'Photography' },
    { value: 'fashion', label: 'Fashion (Thời trang)', group: 'Photography' },
    { value: 'aerial', label: 'Aerial (Chụp từ trên cao)', group: 'Photography' },
    { value: 'cyberpunk', label: 'Cyberpunk (Khoa học viễn tưởng tương lai)', group: 'Digital Art' },
    { value: 'synthwave', label: 'Synthwave (Phong cách retro 80s)', group: 'Digital Art' },
    { value: '3d_render_octane', label: '3D Render (Octane) (Kết xuất 3D)', group: 'Digital Art' },
    { value: 'vector_art', label: 'Vector Art (Đồ họa vector)', group: 'Digital Art' },
    { value: 'pixel_art', label: 'Pixel Art (Đồ họa pixel)', group: 'Digital Art' },
    { value: 'isometric', label: 'Isometric (Đồ họa đẳng cự)', group: 'Digital Art' },
    { value: 'concept_art', label: 'Concept Art (Nghệ thuật khái niệm)', group: 'Digital Art' },
    { value: 'flat_design', label: 'Flat Design (Thiết kế phẳng)', group: 'Digital Art' },
    { value: 'oil_painting', label: 'Oil Painting (Sơn dầu)', group: 'Traditional Art' },
    { value: 'watercolor', label: 'Watercolor (Màu nước)', group: 'Traditional Art' },
    { value: 'sketch', label: 'Sketch (Phác thảo)', group: 'Traditional Art' },
    { value: 'ukiyo_e', label: 'Ukiyo-e (Tranh khắc gỗ Nhật Bản)', group: 'Traditional Art' },
    { value: 'charcoal', label: 'Charcoal (Than chì)', group: 'Traditional Art' },
    { value: 'ink_wash', label: 'Ink Wash (Mực nho)', group: 'Traditional Art' },
    { value: 'pastel', label: 'Pastel (Phấn màu)', group: 'Traditional Art' },
    { value: 'studio_ghibli', label: 'Studio Ghibli style (Phong cách anime Ghibli)', group: 'Anime/Manga' },
    { value: '90s_anime', label: '90s Anime (Anime thập niên 90)', group: 'Anime/Manga' },
    { value: 'modern_shonen', label: 'Modern Shonen (Shonen hiện đại)', group: 'Anime/Manga' },
    { value: 'chibi', label: 'Chibi (Nhân vật dễ thương)', group: 'Anime/Manga' },
    { value: 'comic_book', label: 'Comic Book (Truyện tranh)', group: 'Illustration' },
    { value: 'children_book', label: "Children's Book (Sách thiếu nhi)", group: 'Illustration' },
    { value: 'editorial', label: 'Editorial (Minh họa biên tập)', group: 'Illustration' },
];

// Ánh sáng & Tâm trạng
const LIGHTING_OPTIONS = [
    { value: 'cinematic', label: 'Cinematic (Điện ảnh)' },
    { value: 'golden_hour', label: 'Golden Hour (Nắng chiều)' },
    { value: 'blue_hour', label: 'Blue Hour (Hoàng hôn xanh)' },
    { value: 'neon_lights', label: 'Neon Lights (Đèn neon)' },
    { value: 'studio_lighting', label: 'Studio Lighting (Ánh sáng studio)' },
    { value: 'soft_lighting', label: 'Soft Lighting (Ánh sáng mềm)' },
    { value: 'dramatic', label: 'Dramatic (Kịch tính)' },
    { value: 'natural', label: 'Natural (Tự nhiên)' },
    { value: 'rembrandt', label: 'Rembrandt (Tam giác sáng)' },
    { value: 'rim_light', label: 'Rim Light (Viền sáng)' },
    { value: 'backlit', label: 'Backlit (Ngược sáng)' },
    { value: 'candlelight', label: 'Candlelight (Ánh nến)' },
    { value: 'moonlight', label: 'Moonlight (Ánh trăng)' },
];

const MOOD_OPTIONS = [
    { value: 'gloomy', label: 'Gloomy (U ám)' },
    { value: 'vibrant', label: 'Vibrant (Rực rỡ)' },
    { value: 'epic', label: 'Epic (Hùng vĩ)' },
    { value: 'mysterious', label: 'Mysterious (Huyền bí)' },
    { value: 'peaceful', label: 'Peaceful (Bình yên)' },
    { value: 'romantic', label: 'Romantic (Lãng mạn)' },
    { value: 'energetic', label: 'Energetic (Tràn đầy năng lượng)' },
    { value: 'dark', label: 'Dark (Tối tăm)' },
    { value: 'nostalgic', label: 'Nostalgic (Hoài niệm)' },
    { value: 'joyful', label: 'Joyful (Vui tươi)' },
    { value: 'serene', label: 'Serene (Thanh tịnh)' },
    { value: 'dramatic', label: 'Dramatic (Kịch tính)' },
];

// Bố cục & Góc máy
const CAMERA_ANGLE_OPTIONS = [
    { value: 'eye_level', label: 'Eye Level (Ngang mắt)' },
    { value: 'birds_eye', label: "Bird's Eye View (Từ trên cao)" },
    { value: 'low_angle', label: 'Low Angle (Từ dưới lên)' },
    { value: 'close_up', label: 'Close-up (Cận cảnh)' },
    { value: 'dutch_angle', label: 'Dutch Angle (Góc nghiêng)' },
    { value: 'over_shoulder', label: 'Over-the-shoulder (Qua vai)' },
    { value: 'panoramic', label: 'Panoramic (Toàn cảnh)' },
    { value: 'symmetry', label: 'Symmetry (Đối xứng)' },
];

const LENS_OPTIONS = [
    { value: 'wide_angle', label: 'Wide Angle (Góc rộng)' },
    { value: 'macro', label: 'Macro (Siêu cận)' },
    { value: 'bokeh', label: 'Bokeh (Xóa phông)' },
    { value: 'telephoto', label: 'Telephoto (Tele)' },
    { value: 'fisheye', label: 'Fisheye (Mắt cá)' },
    { value: 'tilt_shift', label: 'Tilt-shift (Miniature)' },
];

// Màu sắc
const COLOR_PALETTE_OPTIONS = [
    { value: 'monochrome', label: 'Monochrome (Đơn sắc)' },
    { value: 'warm_tones', label: 'Warm Tones (Tông ấm)' },
    { value: 'cool_tones', label: 'Cool Tones (Tông lạnh)' },
    { value: 'pastel', label: 'Pastel (Pastel)' },
    { value: 'vibrant', label: 'Vibrant (Rực rỡ)' },
    { value: 'muted', label: 'Muted (Tông trầm)' },
    { value: 'sepia', label: 'Sepia (Nâu cổ điển)' },
    { value: 'high_contrast', label: 'High Contrast (Tương phản cao)' },
    { value: 'desaturated', label: 'Desaturated (Giảm bão hòa)' },
];

// Chủ đề / Đối tượng
const SUBJECT_OPTIONS = [
    { value: 'person', label: 'Person (Con người)' },
    { value: 'landscape', label: 'Landscape (Phong cảnh)' },
    { value: 'product', label: 'Product (Sản phẩm)' },
    { value: 'abstract', label: 'Abstract (Trừu tượng)' },
    { value: 'architecture', label: 'Architecture (Kiến trúc)' },
    { value: 'animal', label: 'Animal (Động vật)' },
    { value: 'food', label: 'Food (Ẩm thực)' },
    { value: 'nature', label: 'Nature (Thiên nhiên)' },
    { value: 'urban', label: 'Urban (Đô thị)' },
];

// Thời đại / Phong cách thời gian
const ERA_OPTIONS = [
    { value: 'modern', label: 'Modern (Hiện đại)' },
    { value: 'vintage', label: 'Vintage (Cổ điển)' },
    { value: 'retro', label: 'Retro (Hồi cổ)' },
    { value: 'futuristic', label: 'Futuristic (Tương lai)' },
    { value: 'medieval', label: 'Medieval (Trung cổ)' },
    { value: 'art_deco', label: 'Art Deco (Thập niên 20)' },
    { value: 'minimalist', label: 'Minimalist (Tối giản)' },
];

// Nền / Background
const BACKGROUND_OPTIONS = [
    { value: 'simple', label: 'Simple (Đơn giản)' },
    { value: 'gradient', label: 'Gradient (Chuyển màu)' },
    { value: 'nature', label: 'Nature (Thiên nhiên)' },
    { value: 'urban', label: 'Urban (Đô thị)' },
    { value: 'minimal', label: 'Minimal (Tối giản)' },
    { value: 'blurred', label: 'Blurred (Mờ nền)' },
    { value: 'transparent', label: 'Transparent (Trong suốt)' },
];

// Thông số kỹ thuật
const ASPECT_RATIO_OPTIONS = [
    { value: '1:1', label: '1:1 (Vuông)' },
    { value: '16:9', label: '16:9 (Ngang - Youtube/Phim)' },
    { value: '9:16', label: '9:16 (Dọc - TikTok/Story)' },
    { value: '4:3', label: '4:3 (Màn hình cũ)' },
    { value: '3:2', label: '3:2 (Máy ảnh)' },
    { value: '4:5', label: '4:5 (Instagram)' },
    { value: '2:3', label: '2:3 (Dọc)' },
];

const QUALITY_OPTIONS = [
    { value: '128', label: '128px (Nhỏ - Icon, thumbnail)' },
    { value: '256', label: '256px (Nhỏ)' },
    { value: '512', label: '512px (Trung bình)' },
    { value: '768', label: '768px' },
    { value: '1024', label: '1024px' },
    { value: 'high_definition', label: 'High Definition (HD)' },
    { value: '4k', label: '4K' },
    { value: '8k', label: '8K' },
    { value: 'masterpiece', label: 'Masterpiece' },
];

// Bộ lọc loại bỏ (Negative Prompt)
const NEGATIVE_PROMPT_OPTIONS = [
    { value: 'low_quality_deformed', label: 'Xấu, biến dạng (Low quality, deformed)' },
    { value: 'extra_fingers', label: 'Thừa ngón tay (Extra fingers)' },
    { value: 'text_watermark', label: 'Chữ viết lộn xộn (Text, watermark)' },
    { value: 'blurry', label: 'Mờ nhòe (Blurry)' },
    { value: 'bad_anatomy', label: 'Giải phẫu sai (Bad anatomy)' },
    { value: 'ugly_face', label: 'Khuôn mặt xấu (Ugly face)' },
    { value: 'amputation', label: 'Cụt chi (Amputation)' },
    { value: 'cropped', label: 'Bị cắt (Cropped)' },
    { value: 'duplicate', label: 'Trùng lặp (Duplicate)' },
    { value: 'oversaturated', label: 'Bão hòa quá (Oversaturated)' },
];

// Model AI
const MODEL_ID_OPTIONS = [
    { value: 'z-image', label: 'Z-Image' },
    { value: 'stable-diffusion-3.5-large-turbo', label: 'Stable Diffusion 3.5 Large Turbo' },
];

const QUALITY_KEYWORDS: Record<string, string> = {
    '128': '128x128, sharp focus',
    '256': '256x256, sharp focus',
    '512': '512x512, detailed, sharp focus',
    '768': '768x768, detailed, sharp focus',
    '1024': '1024x1024, highly detailed, sharp focus',
    high_definition: 'highly detailed, sharp focus',
    '4k': '4k, highly detailed, sharp focus',
    '8k': '8k, ultra detailed, sharp focus',
    masterpiece: 'masterpiece, best quality, highly detailed, sharp focus',
};

const NEGATIVE_KEYWORDS: Record<string, string> = {
    low_quality_deformed: 'low quality, deformed',
    extra_fingers: 'extra fingers, mutated hands',
    text_watermark: 'text, watermark, signature',
    blurry: 'blurry, out of focus',
    bad_anatomy: 'bad anatomy',
    ugly_face: 'ugly face',
    amputation: 'amputation',
    cropped: 'cropped',
    duplicate: 'duplicate',
    oversaturated: 'oversaturated',
};

function getOptionLabel(options: { value: string; label: string }[], value: string): string {
    const opt = options.find((o) => o.value === value);
    return opt?.label || '';
}

function buildPrompt(
    prompt: string,
    imageType: string,
    artStyle: string,
    lighting: string,
    mood: string,
    cameraAngle: string,
    lens: string,
    colorPalette: string,
    subject: string,
    era: string,
    background: string,
    imageTypeAdd: Record<string, string>,
    aspectRatio: string,
    quality: string,
    negativePrompts: string[]
): { prompt: string; negativePrompt: string } {
    const parts: string[] = [prompt];

    if (imageType) parts.push(getOptionLabel(IMAGE_TYPE_OPTIONS, imageType));
    if (artStyle) parts.push(getOptionLabel(ART_STYLE_OPTIONS, artStyle));

    const isInfographicType = imageType === 'infographic' || imageType === 'mindmap_diagram';
    if (isInfographicType && Object.keys(imageTypeAdd).length > 0) {
        parts.push(imageTypeAddToPromptString(imageTypeAdd));
    } else if (!isInfographicType) {
        if (lighting) parts.push(getOptionLabel(LIGHTING_OPTIONS, lighting));
        if (mood) parts.push(getOptionLabel(MOOD_OPTIONS, mood));
        if (cameraAngle) parts.push(getOptionLabel(CAMERA_ANGLE_OPTIONS, cameraAngle));
        if (lens) parts.push(getOptionLabel(LENS_OPTIONS, lens));
    }

    if (colorPalette) parts.push(getOptionLabel(COLOR_PALETTE_OPTIONS, colorPalette));
    if (subject) parts.push(getOptionLabel(SUBJECT_OPTIONS, subject));
    if (era) parts.push(getOptionLabel(ERA_OPTIONS, era));
    if (background) parts.push(getOptionLabel(BACKGROUND_OPTIONS, background));
    if (quality && QUALITY_KEYWORDS[quality]) {
        parts.push(QUALITY_KEYWORDS[quality]);
    }

    const fullPrompt = parts.filter(Boolean).join(', ');
    const negativeParts = negativePrompts.map((v) => NEGATIVE_KEYWORDS[v]).filter(Boolean);
    const negativePrompt = negativeParts.join(', ');

    return { prompt: fullPrompt, negativePrompt };
}

export default function GenerateImageAiDrawer({ open, onClose, onSuccess, apiUrl = 'post-type/generate-image' }: GenerateImageAiDrawerProps) {
    const api = useAjax();
    const [modelId, setModelId] = useState('z-image');
    const [prompt, setPrompt] = useState('');
    const [imageType, setImageType] = useState('general_art');
    const [artStyle, setArtStyle] = useState('');
    const [lighting, setLighting] = useState('');
    const [mood, setMood] = useState('');
    const [cameraAngle, setCameraAngle] = useState('');
    const [lens, setLens] = useState('');
    const [colorPalette, setColorPalette] = useState('');
    const [subject, setSubject] = useState('');
    const [era, setEra] = useState('');
    const [background, setBackground] = useState('');
    const [infographicLayout, setInfographicLayout] = useState('');
    const [infographicStructure, setInfographicStructure] = useState('');
    const [infographicColor, setInfographicColor] = useState('');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [quality, setQuality] = useState('512');
    const [negativePrompts, setNegativePrompts] = useState<string[]>([]);
    const [selectedPreset, setSelectedPreset] = useState('');
    const [referenceImagePost, setReferenceImagePost] = useState<{ reference_image?: ImageObjectProps | null }>({ reference_image: null });
    const [loading, setLoading] = useState(false);

    const isInfographicType = imageType === 'infographic' || imageType === 'mindmap_diagram';

    const handleApplyPreset = (presetId: string) => {
        setSelectedPreset(presetId);
        if (!presetId) return;
        const preset = STYLE_PRESETS.find((p) => p.id === presetId);
        if (!preset) return;
        const v = preset.values;
        setImageType(v.imageType);
        setArtStyle(v.artStyle);
        setLighting(v.lighting);
        setMood(v.mood);
        setCameraAngle(v.cameraAngle);
        setLens(v.lens);
        setColorPalette(v.colorPalette);
        setSubject(v.subject);
        setEra(v.era);
        setBackground(v.background);
        setInfographicLayout(v.infographicLayout);
        setInfographicStructure(v.infographicStructure);
        setInfographicColor(v.infographicColor);
        setAspectRatio(v.aspectRatio);
        setQuality(v.quality);
        setNegativePrompts(v.negativePrompts || []);
        if (v.promptSuggestion) setPrompt(v.promptSuggestion);
    };

    const handleSubmit = () => {
        if (!prompt.trim()) {
            api.showMessage('Vui lòng nhập mô tả hình ảnh (Prompt)', 'error');
            return;
        }

        const imageTypeAdd = buildImageTypeAdd(imageType, {
            infographic_layout: infographicLayout,
            infographic_structure: infographicStructure,
            infographic_color: infographicColor,
        });

        const { prompt: fullPrompt, negativePrompt } = buildPrompt(
            prompt,
            imageType,
            artStyle,
            lighting,
            mood,
            cameraAngle,
            lens,
            colorPalette,
            subject,
            era,
            background,
            imageTypeAdd,
            aspectRatio,
            quality,
            negativePrompts
        );

        const refImg = referenceImagePost?.reference_image;
        const referenceImage = refImg?.link
            ? (validURL(refImg.link) ? refImg.link : convertToURL(process.env.REACT_APP_BASE_URL, refImg.link))
            : undefined;

        setLoading(true);
        api.ajax({
            url: apiUrl,
            method: 'POST',
            data: {
                model_id: modelId,
                prompt: fullPrompt,
                negative_prompt: negativePrompt,
                aspect_ratio: aspectRatio,
                quality,
                reference_image: referenceImage,
                image_type: getOptionLabel(IMAGE_TYPE_OPTIONS, imageType) || imageType,
                image_type_add: imageTypeAddToPromptString(imageTypeAdd),
                art_style: artStyle,
                lighting,
                mood,
                camera_angle: cameraAngle,
                lens,
                color_palette: colorPalette,
                subject,
                era,
                background,
                prompt_raw: prompt,
            },
            success: (result: ANY) => {
                setLoading(false);
                const imageUrl = result.image_url || result.src || result.data?.src || result.data?.image_url || result.link;
                if (imageUrl) {
                    let link = imageUrl;
                    let type_link = 'local';
                    if (validURL(imageUrl)) {
                        if (process.env.REACT_APP_BASE_URL && imageUrl.search(process.env.REACT_APP_BASE_URL) > -1) {
                            link = imageUrl.replace(process.env.REACT_APP_BASE_URL, '/');
                        } else {
                            type_link = 'external';
                        }
                    } else {
                        link = (link || '').replace(process.env.REACT_APP_BASE_URL ?? '', '/');
                    }
                    const imageData: ImageObjectProps = {
                        link: link.replace(/^\/\//, '/'),
                        type_link,
                        ext: (imageUrl.split('.').pop() as string) || 'png',
                        width: 0,
                        height: 0,
                    };
                    onSuccess(imageData);
                    onClose();
                } else {
                    api.showMessage('Không nhận được hình ảnh từ AI', 'error');
                }
            },
            error: () => {
                setLoading(false);
            },
        });
    };

    const handleReset = () => {
        setSelectedPreset('');
        setModelId('z-image');
        setReferenceImagePost({ reference_image: null });
        setPrompt('');
        setImageType('general_art');
        setArtStyle('');
        setLighting('');
        setMood('');
        setCameraAngle('');
        setLens('');
        setColorPalette('');
        setSubject('');
        setEra('');
        setBackground('');
        setInfographicLayout('');
        setInfographicStructure('');
        setInfographicColor('');
        setAspectRatio('1:1');
        setQuality('512');
        setNegativePrompts([]);
    };

    return (
        <DrawerCustom
            title="Tạo hình ảnh bằng AI"
            open={open}
            onClose={onClose}
            width={700}
            headerAction={
                <FormControl size="small" sx={{ minWidth: 220 }}>
                    <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Model</InputLabel>
                    <Select
                        value={modelId}
                        label="Model"
                        onChange={(e: SelectChangeEvent<string>) => setModelId(e.target.value)}
                        sx={{ color: 'inherit', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' }, '& .MuiSvgIcon-root': { color: 'inherit' } }}
                    >
                        {MODEL_ID_OPTIONS.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            }
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: 2, pt: 3 }}>
                {/* 0. Chọn nhanh style */}
                <FormControl fullWidth size="small">
                    <InputLabel>Chọn nhanh style</InputLabel>
                    <Select
                        value={selectedPreset}
                        label="Chọn nhanh style"
                        onChange={(e: SelectChangeEvent<string>) => handleApplyPreset(e.target.value)}
                    >
                        <MenuItem value=""><em>Tuỳ chỉnh thủ công</em></MenuItem>
                        {STYLE_PRESETS.map((preset) => (
                            <MenuItem key={preset.id} value={preset.id}>{preset.label}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* 1. Prompt */}
                <FormControl fullWidth>
                    <FormLabel sx={{ mb: 1 }}>Nội dung chính (Prompt)</FormLabel>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        placeholder="Mô tả chi tiết hình ảnh bạn muốn tạo..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        variant="outlined"
                    />
                </FormControl>

                {/* 1b. Ảnh tham khảo */}
                <FieldForm
                    component="image"
                    config={{
                        title: 'Ảnh tham khảo (Reference Image)',
                        disableGenerateAi: true,
                        note: 'Chọn ảnh để AI tham khảo phong cách, bố cục...',
                    }}
                    post={referenceImagePost}
                    name="reference_image"
                    onReview={(value) => setReferenceImagePost((prev) => ({ ...prev, reference_image: value }))}
                />

                {/* 2. Loại hình ảnh (Image Type) */}
                <FormControl fullWidth size="small">
                    <InputLabel>Loại hình ảnh (Image Type)</InputLabel>
                    <Select
                        value={imageType}
                        label="Loại hình ảnh (Image Type)"
                        onChange={(e: SelectChangeEvent<string>) => {
                            const val = e.target.value;
                            setImageType(val);
                            if (val !== 'infographic' && val !== 'mindmap_diagram') {
                                setInfographicLayout('');
                                setInfographicStructure('');
                                setInfographicColor('');
                            }
                        }}
                    >
                        {IMAGE_TYPE_OPTIONS.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* 2b. Sub-options cho Infographic & Mindmap */}
                {isInfographicType && (
                    <Box sx={{ pl: 2, borderLeft: '3px solid', borderColor: 'primary.main', display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Phong cách trình bày (Layout Style)</InputLabel>
                            <Select
                                value={infographicLayout}
                                label="Phong cách trình bày (Layout Style)"
                                onChange={(e: SelectChangeEvent<string>) => setInfographicLayout(e.target.value)}
                            >
                                <MenuItem value=""><em>Không chọn</em></MenuItem>
                                {INFOGRAPHIC_LAYOUT_OPTIONS.map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth size="small">
                            <InputLabel>Cấu trúc thông tin (Structure)</InputLabel>
                            <Select
                                value={infographicStructure}
                                label="Cấu trúc thông tin (Structure)"
                                onChange={(e: SelectChangeEvent<string>) => setInfographicStructure(e.target.value)}
                            >
                                <MenuItem value=""><em>Không chọn</em></MenuItem>
                                {INFOGRAPHIC_STRUCTURE_OPTIONS.map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth size="small">
                            <InputLabel>Bảng màu Infographic</InputLabel>
                            <Select
                                value={infographicColor}
                                label="Bảng màu Infographic"
                                onChange={(e: SelectChangeEvent<string>) => setInfographicColor(e.target.value)}
                            >
                                <MenuItem value=""><em>Không chọn</em></MenuItem>
                                {INFOGRAPHIC_COLOR_OPTIONS.map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                )}

                {/* 3. Phong cách nghệ thuật */}
                <FormControl fullWidth size="small">
                    <Autocomplete
                        size="small"
                        options={ART_STYLE_OPTIONS}
                        groupBy={(option) => option.group}
                        getOptionLabel={(option) => option.label}
                        value={ART_STYLE_OPTIONS.find((o) => o.value === artStyle) || null}
                        onChange={(_, newValue) => setArtStyle(newValue?.value ?? '')}
                        renderInput={(params) => (
                            <TextField {...params} label="Phong cách nghệ thuật (Art Style)" />
                        )}
                        isOptionEqualToValue={(option, value) => option.value === value?.value}
                    />
                </FormControl>

                {/* 4. Ánh sáng & Tâm trạng - Ẩn khi chọn Infographic/Mindmap */}
                {!isInfographicType && (
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Ánh sáng</InputLabel>
                                <Select value={lighting} label="Ánh sáng" onChange={(e: SelectChangeEvent<string>) => setLighting(e.target.value)}>
                                    <MenuItem value=""><em>Không chọn</em></MenuItem>
                                    {LIGHTING_OPTIONS.map((opt) => (
                                        <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Tâm trạng</InputLabel>
                                <Select value={mood} label="Tâm trạng" onChange={(e: SelectChangeEvent<string>) => setMood(e.target.value)}>
                                    <MenuItem value=""><em>Không chọn</em></MenuItem>
                                    {MOOD_OPTIONS.map((opt) => (
                                        <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                )}

                {/* 5. Bố cục & Góc máy - Ẩn khi chọn Infographic/Mindmap */}
                {!isInfographicType && (
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Góc máy</InputLabel>
                                <Select value={cameraAngle} label="Góc máy" onChange={(e: SelectChangeEvent<string>) => setCameraAngle(e.target.value)}>
                                    <MenuItem value=""><em>Không chọn</em></MenuItem>
                                    {CAMERA_ANGLE_OPTIONS.map((opt) => (
                                        <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Ống kính</InputLabel>
                                <Select value={lens} label="Ống kính" onChange={(e: SelectChangeEvent<string>) => setLens(e.target.value)}>
                                    <MenuItem value=""><em>Không chọn</em></MenuItem>
                                    {LENS_OPTIONS.map((opt) => (
                                        <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                )}

                {/* 6. Màu sắc & Chủ đề */}
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                            <FormLabel sx={{ mb: 1 }}>Bảng màu (Color Palette)</FormLabel>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {COLOR_PALETTE_OPTIONS.map((opt) => (
                                    <Button
                                        key={opt.value}
                                        variant={colorPalette === opt.value ? 'contained' : 'outlined'}
                                        size="small"
                                        onClick={() => setColorPalette(colorPalette === opt.value ? '' : opt.value)}
                                        sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                                    >
                                        {opt.label}
                                    </Button>
                                ))}
                            </Box>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                            <FormLabel sx={{ mb: 1 }}>Chủ đề / Đối tượng</FormLabel>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {SUBJECT_OPTIONS.map((opt) => (
                                    <Button
                                        key={opt.value}
                                        variant={subject === opt.value ? 'contained' : 'outlined'}
                                        size="small"
                                        onClick={() => setSubject(subject === opt.value ? '' : opt.value)}
                                        sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                                    >
                                        {opt.label}
                                    </Button>
                                ))}
                            </Box>
                        </FormControl>
                    </Grid>
                </Grid>

                {/* 7. Thời đại & Nền */}
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                            <FormLabel sx={{ mb: 1 }}>Thời đại / Phong cách</FormLabel>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {ERA_OPTIONS.map((opt) => (
                                    <Button
                                        key={opt.value}
                                        variant={era === opt.value ? 'contained' : 'outlined'}
                                        size="small"
                                        onClick={() => setEra(era === opt.value ? '' : opt.value)}
                                        sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                                    >
                                        {opt.label}
                                    </Button>
                                ))}
                            </Box>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                            <FormLabel sx={{ mb: 1 }}>Nền / Background</FormLabel>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {BACKGROUND_OPTIONS.map((opt) => (
                                    <Button
                                        key={opt.value}
                                        variant={background === opt.value ? 'contained' : 'outlined'}
                                        size="small"
                                        onClick={() => setBackground(background === opt.value ? '' : opt.value)}
                                        sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                                    >
                                        {opt.label}
                                    </Button>
                                ))}
                            </Box>
                        </FormControl>
                    </Grid>
                </Grid>

                {/* 8. Thông số kỹ thuật */}
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Tỷ lệ khung hình (Aspect Ratio)</InputLabel>
                            <Select value={aspectRatio} label="Tỷ lệ khung hình (Aspect Ratio)" onChange={(e: SelectChangeEvent<string>) => setAspectRatio(e.target.value)}>
                                {ASPECT_RATIO_OPTIONS.map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Độ chi tiết (Quality)</InputLabel>
                            <Select value={quality} label="Độ chi tiết (Quality)" onChange={(e: SelectChangeEvent<string>) => setQuality(e.target.value)}>
                                {QUALITY_OPTIONS.map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>

                {/* 9. Bộ lọc loại bỏ */}
                <FormControl fullWidth size="small">
                    <InputLabel>Bộ lọc loại bỏ (Negative Prompt)</InputLabel>
                    <Select
                        multiple
                        value={negativePrompts}
                        label="Bộ lọc loại bỏ (Negative Prompt)"
                        onChange={(e: SelectChangeEvent<string[]>) => setNegativePrompts(e.target.value as string[])}
                        input={<OutlinedInput label="Bộ lọc loại bỏ (Negative Prompt)" />}
                        renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {selected.map((value) => (
                                    <Chip
                                        key={value}
                                        label={NEGATIVE_PROMPT_OPTIONS.find((o) => o.value === value)?.label || value}
                                        size="small"
                                    />
                                ))}
                            </Box>
                        )}
                        MenuProps={{
                            PaperProps: { style: { maxHeight: 300 } },
                            autoFocus: false,
                        }}
                    >
                        {NEGATIVE_PROMPT_OPTIONS.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* Actions */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mt: 2 }}>
                    <Button variant="outlined" onClick={handleReset} sx={{ textTransform: 'none' }}>
                        Đặt lại
                    </Button>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button variant="outlined" onClick={onClose} sx={{ textTransform: 'none' }}>
                            Hủy
                        </Button>
                        <LoadingButton
                            variant="contained"
                            onClick={handleSubmit}
                            loading={loading}
                            sx={{ textTransform: 'none' }}
                        >
                            Tạo hình ảnh
                        </LoadingButton>
                    </Box>
                </Box>
            </Box>
        </DrawerCustom>
    );
}
