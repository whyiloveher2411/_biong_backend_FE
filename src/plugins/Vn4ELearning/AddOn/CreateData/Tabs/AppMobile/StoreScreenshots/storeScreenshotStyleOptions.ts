import type { StoreScreenshotTemplate } from './storeScreenshotTypes';
import { normalizeHexColor } from './storeScreenshotColorUtils';

export type StylePresetId =
    | 'clean_professional'
    | 'bold_marketing'
    | 'minimal_light'
    | 'dark_premium'
    | 'playful_gamified';

export type BackgroundModeId =
    | 'brand_gradient'
    | 'solid_brand'
    | 'light_neutral'
    | 'dark_charcoal'
    | 'soft_mesh';

export type LayoutStyleId =
    | 'centered_device'
    | 'device_bottom_hero'
    | 'device_left_copy'
    | 'screen_focus';

export type DeviceFrameStyleId =
    | 'iphone_modern'
    | 'iphone_classic'
    | 'android_pixel'
    | 'no_frame';

export type TypographyStyleId =
    | 'bold_sans'
    | 'rounded_friendly'
    | 'minimal_semibold';

export type FontFamilyId =
    | 'inter'
    | 'sf_pro'
    | 'poppins'
    | 'nunito'
    | 'montserrat'
    | 'roboto';

export type StyleAdvancedFields = {
    background_mode: BackgroundModeId;
    layout_style: LayoutStyleId;
    device_frame_style: DeviceFrameStyleId;
    typography_style: TypographyStyleId;
};

export const DEFAULT_STYLE_PRESET: StylePresetId = 'clean_professional';
export const DEFAULT_FONT_FAMILY: FontFamilyId = 'inter';

export const DEFAULT_STYLE_ADVANCED: StyleAdvancedFields = {
    background_mode: 'brand_gradient',
    layout_style: 'centered_device',
    device_frame_style: 'iphone_modern',
    typography_style: 'bold_sans',
};

export type StyleCopyVoiceExample = {
    headline: string;
    subtitle: string;
    avoid: string;
};

export const STYLE_PRESETS: Array<{
    id: StylePresetId;
    label: string;
    description: string;
    promptLine: string;
    copyVoiceLine: string;
    copyVoiceExample: StyleCopyVoiceExample;
    defaults: StyleAdvancedFields;
}> = [
    {
        id: 'clean_professional',
        label: 'Sạch & chuyên nghiệp',
        description: 'Gradient brand nhẹ, device giữa, headline trên — phù hợp app học tập và productivity.',
        promptLine: 'Overall mood: clean and professional — soft brand gradient, centered device mockup, headline above the phone, bold sans-serif typography. Best for education and productivity apps.',
        copyVoiceLine: 'Copy voice: clear, confident, polished — professional but warm. Straightforward benefits, no slang, no hype exclamation. Sounds trustworthy for learning/productivity.',
        copyVoiceExample: {
            headline: 'Build skills on your schedule',
            subtitle: 'Short lessons that fit your day',
            avoid: 'Avoid: overly playful slang or game-like hype — this visual is clean and professional.',
        },
        defaults: {
            background_mode: 'brand_gradient',
            layout_style: 'centered_device',
            device_frame_style: 'iphone_modern',
            typography_style: 'bold_sans',
        },
    },
    {
        id: 'bold_marketing',
        label: 'Marketing nổi bật',
        description: 'Device lớn phía dưới, nền gradient đậm, headline lớn — tối ưu conversion.',
        promptLine: 'Overall mood: bold high-conversion marketing — large hero device in the lower frame, rich gradient or mesh background, oversized headline at top. Best for feature launches and conversion-focused listings.',
        copyVoiceLine: 'Copy voice: bold, urgent, high-energy conversion — strong verbs, punchy phrases, momentum. Feels like a launch campaign, not a dry spec sheet.',
        copyVoiceExample: {
            headline: 'Start learning in minutes',
            subtitle: 'No setup — jump straight in',
            avoid: 'Avoid: timid or overly soft phrasing — this visual demands bold marketing energy.',
        },
        defaults: {
            background_mode: 'soft_mesh',
            layout_style: 'device_bottom_hero',
            device_frame_style: 'iphone_modern',
            typography_style: 'bold_sans',
        },
    },
    {
        id: 'minimal_light',
        label: 'Tối giản sáng',
        description: 'Nền trắng/xám nhạt, ít trang trí, chữ tối — tạo cảm giác tin cậy.',
        promptLine: 'Overall mood: minimal and light — white or very light gray background, minimal decoration, dark readable text, understated device mockup. Conveys trust, clarity, and simplicity.',
        copyVoiceLine: 'Copy voice: calm, precise, understated — every word earns its place. Quiet confidence, clarity over hype. Sounds simple and trustworthy.',
        copyVoiceExample: {
            headline: 'Learning made simple',
            subtitle: 'Clear steps, no clutter',
            avoid: 'Avoid: loud hype, exclamation overload, or gamified cheer — this visual is minimal and restrained.',
        },
        defaults: {
            background_mode: 'light_neutral',
            layout_style: 'centered_device',
            device_frame_style: 'iphone_classic',
            typography_style: 'minimal_semibold',
        },
    },
    {
        id: 'dark_premium',
        label: 'Tối cao cấp',
        description: 'Nền charcoal, device nổi với shadow, chữ trắng — phù hợp app dev/premium.',
        promptLine: 'Overall mood: dark premium — charcoal backdrop with subtle depth, floating device with soft shadow, white high-contrast text. Best for developer tools and premium apps.',
        copyVoiceLine: 'Copy voice: sleek, premium, concise — sophisticated tone for power users. Sharp and confident, never cheesy or childish.',
        copyVoiceExample: {
            headline: 'Code with confidence',
            subtitle: 'Tools built for serious builders',
            avoid: 'Avoid: cute gamification language or bubbly exclamations — this visual is premium and refined.',
        },
        defaults: {
            background_mode: 'dark_charcoal',
            layout_style: 'device_bottom_hero',
            device_frame_style: 'iphone_modern',
            typography_style: 'minimal_semibold',
        },
    },
    {
        id: 'playful_gamified',
        label: 'Vui & gamification',
        description: 'Màu tươi, shape mềm, typography thân thiện — streak, XP, game-like.',
        promptLine: 'Overall mood: playful and gamified — bright cheerful colors, soft rounded shapes, friendly rounded typography. Best for streaks, XP, badges, and game-like learning experiences.',
        copyVoiceLine: 'Copy voice: playful, energetic, game-like — celebrate progress, streaks, rewards, levels, and fun. Warm, upbeat, approachable; light enthusiasm is welcome. NOT corporate, stiff, or overly serious.',
        copyVoiceExample: {
            headline: 'Level up your streak',
            subtitle: 'Earn rewards as you learn',
            avoid: 'Avoid: dry corporate tone or stiff enterprise wording — this visual is fun and gamified.',
        },
        defaults: {
            background_mode: 'soft_mesh',
            layout_style: 'centered_device',
            device_frame_style: 'iphone_modern',
            typography_style: 'rounded_friendly',
        },
    },
];

export const BACKGROUND_OPTIONS: Array<{
    id: BackgroundModeId;
    label: string;
    helper: string;
    promptLine: (brandColor: string) => string;
}> = [
    {
        id: 'brand_gradient',
        label: 'Gradient brand',
        helper: 'Gradient dọc từ màu brand',
        promptLine: (brandColor) => `Background: vertical soft gradient using brand color ${brandColor}.`,
    },
    {
        id: 'solid_brand',
        label: 'Màu brand phẳng',
        helper: 'Một màu đồng nhất',
        promptLine: (brandColor) => `Background: solid flat fill using brand color ${brandColor}.`,
    },
    {
        id: 'light_neutral',
        label: 'Sáng trung tính',
        helper: 'Trắng hoặc xám nhạt',
        promptLine: () => 'Background: clean light neutral (white or very light gray), minimal decoration.',
    },
    {
        id: 'dark_charcoal',
        label: 'Tối charcoal',
        helper: 'Nền tối cao cấp',
        promptLine: () => 'Background: dark charcoal premium backdrop with subtle depth, not pure black.',
    },
    {
        id: 'soft_mesh',
        label: 'Gradient mesh',
        helper: 'Mesh hiện đại từ brand',
        promptLine: (brandColor) => `Background: modern soft mesh gradient with 2–3 tones derived from brand color ${brandColor}.`,
    },
];

export const LAYOUT_OPTIONS: Array<{
    id: LayoutStyleId;
    label: string;
    helper: string;
    promptLine: string;
}> = [
    {
        id: 'centered_device',
        label: 'Device giữa',
        helper: 'Headline trên, mockup giữa',
        promptLine: 'Layout: centered smartphone mockup, headline and subtitle above the device.',
    },
    {
        id: 'device_bottom_hero',
        label: 'Device hero dưới',
        helper: 'Device lớn chiếm 60–70% phía dưới',
        promptLine: 'Layout: large hero device occupying 60–70% of the lower frame, headline at top.',
    },
    {
        id: 'device_left_copy',
        label: 'Device trái, copy phải',
        helper: 'Split layout ngang',
        promptLine: 'Layout: device on the left, headline and subtitle copy on the right.',
    },
    {
        id: 'screen_focus',
        label: 'Ưu tiên màn hình',
        helper: 'Screen lớn, mockup tối giản',
        promptLine: 'Layout: screen-focused composition with minimal mockup chrome; app UI is the hero.',
    },
];

export const DEVICE_FRAME_OPTIONS: Array<{
    id: DeviceFrameStyleId;
    label: string;
    helper: string;
    promptLine: string;
}> = [
    {
        id: 'iphone_modern',
        label: 'iPhone hiện đại',
        helper: 'Dynamic Island / notch',
        promptLine: 'Device frame: modern iPhone with rounded corners and Dynamic Island or notch.',
    },
    {
        id: 'iphone_classic',
        label: 'iPhone cổ điển',
        helper: 'Viền đều, ít chi tiết',
        promptLine: 'Device frame: classic iPhone with uniform bezels and minimal detail.',
    },
    {
        id: 'android_pixel',
        label: 'Android Pixel',
        helper: 'Hole-punch / home ảo',
        promptLine: 'Device frame: modern Android phone (Pixel-style) with hole-punch camera.',
    },
    {
        id: 'no_frame',
        label: 'Không khung máy',
        helper: 'Full-bleed screen trong layout',
        promptLine: 'Device frame: no physical mockup — crop the app screen full-bleed inside the marketing layout.',
    },
];

export const TYPOGRAPHY_OPTIONS: Array<{
    id: TypographyStyleId;
    label: string;
    helper: string;
    promptLine: string;
}> = [
    {
        id: 'bold_sans',
        label: 'Sans đậm',
        helper: 'Dễ đọc trên store listing',
        promptLine: 'Typography: bold sans-serif, high contrast, readable at mobile store thumbnail size.',
    },
    {
        id: 'rounded_friendly',
        label: 'Bo tròn thân thiện',
        helper: 'Edu / gamification',
        promptLine: 'Typography: rounded friendly sans-serif, warm and approachable tone.',
    },
    {
        id: 'minimal_semibold',
        label: 'Semibold tối giản',
        helper: 'Ít decorative',
        promptLine: 'Typography: minimal semibold sans-serif, restrained and clean.',
    },
];

export const FONT_FAMILY_OPTIONS: Array<{
    id: FontFamilyId;
    label: string;
    helper: string;
    promptLine: string;
}> = [
    {
        id: 'inter',
        label: 'Inter',
        helper: 'Sans trung tính, dễ đọc trên store',
        promptLine: 'Font family: Inter — modern neutral sans-serif for headline and subtitle on the image.',
    },
    {
        id: 'sf_pro',
        label: 'SF Pro',
        helper: 'Cảm giác native iOS / Apple',
        promptLine: 'Font family: SF Pro — Apple system sans-serif feel for headline and subtitle.',
    },
    {
        id: 'poppins',
        label: 'Poppins',
        helper: 'Geometric, thân thiện, năng động',
        promptLine: 'Font family: Poppins — geometric friendly sans for headline and subtitle.',
    },
    {
        id: 'nunito',
        label: 'Nunito',
        helper: 'Bo tròn, mềm — edu / gamification',
        promptLine: 'Font family: Nunito — rounded soft sans for headline and subtitle.',
    },
    {
        id: 'montserrat',
        label: 'Montserrat',
        helper: 'Marketing bold, urban',
        promptLine: 'Font family: Montserrat — bold marketing sans for headline and subtitle.',
    },
    {
        id: 'roboto',
        label: 'Roboto',
        helper: 'Android / Google Play quen thuộc',
        promptLine: 'Font family: Roboto — clean Google-style sans for headline and subtitle.',
    },
];

const PRESET_MAP = Object.fromEntries(
    STYLE_PRESETS.map((preset) => [preset.id, preset]),
) as Record<StylePresetId, (typeof STYLE_PRESETS)[number]>;

export function normalizeStylePresetId(value?: string | null): StylePresetId {
    if (value && value in PRESET_MAP) {
        return value as StylePresetId;
    }
    return DEFAULT_STYLE_PRESET;
}

export function normalizeFontFamilyId(value?: string | null): FontFamilyId {
    if (value && FONT_FAMILY_OPTIONS.some((option) => option.id === value)) {
        return value as FontFamilyId;
    }
    return DEFAULT_FONT_FAMILY;
}

export function resolveFontFamily(template: StoreScreenshotTemplate): FontFamilyId {
    return normalizeFontFamilyId(template.font_family);
}

export function getPresetDefaults(presetId: string): StyleAdvancedFields {
    const preset = PRESET_MAP[normalizeStylePresetId(presetId)];
    return { ...preset.defaults };
}

function findOption<T extends { id: string }>(options: T[], id: string | undefined, fallbackId: string): T {
    const found = options.find((opt) => opt.id === id)
        ?? options.find((opt) => opt.id === fallbackId);
    return found ?? options[0];
}

export function resolveStyleAdvancedFields(template: StoreScreenshotTemplate): StyleAdvancedFields {
    const preset = normalizeStylePresetId(template.style_preset);
    const defaults = getPresetDefaults(preset);

    return {
        background_mode: findOption(BACKGROUND_OPTIONS, template.background_mode, defaults.background_mode).id,
        layout_style: findOption(LAYOUT_OPTIONS, template.layout_style, defaults.layout_style).id,
        device_frame_style: findOption(
            DEVICE_FRAME_OPTIONS,
            template.device_frame_style,
            defaults.device_frame_style,
        ).id,
        typography_style: findOption(
            TYPOGRAPHY_OPTIONS,
            template.typography_style,
            defaults.typography_style,
        ).id,
    };
}

export function buildStyleBackgroundPromptLine(
    template: StoreScreenshotTemplate,
    screenshotBackgroundColor?: string | null,
): string {
    const brandColor = normalizeHexColor(template.brand_color, '#1A73E8');
    const imageBg = normalizeHexColor(screenshotBackgroundColor);
    const advanced = resolveStyleAdvancedFields(template);
    const background = findOption(BACKGROUND_OPTIONS, advanced.background_mode, DEFAULT_STYLE_ADVANCED.background_mode);

    if (!imageBg) {
        return background.promptLine(brandColor);
    }

    return `Background: ${background.label} interpreted with per-screenshot anchor ${imageBg}, harmonized with brand accent ${brandColor} — see Per-screenshot background color section.`;
}

export function buildStylePromptLines(
    template: StoreScreenshotTemplate,
    screenshotBackgroundColor?: string | null,
): string[] {
    const presetId = normalizeStylePresetId(template.style_preset);
    const preset = PRESET_MAP[presetId];
    const advanced = resolveStyleAdvancedFields(template);
    const layout = findOption(LAYOUT_OPTIONS, advanced.layout_style, DEFAULT_STYLE_ADVANCED.layout_style);
    const device = findOption(
        DEVICE_FRAME_OPTIONS,
        advanced.device_frame_style,
        DEFAULT_STYLE_ADVANCED.device_frame_style,
    );
    const typography = findOption(
        TYPOGRAPHY_OPTIONS,
        advanced.typography_style,
        DEFAULT_STYLE_ADVANCED.typography_style,
    );
    const fontFamily = findOption(
        FONT_FAMILY_OPTIONS,
        template.font_family,
        DEFAULT_FONT_FAMILY,
    );

    return [
        preset.promptLine,
        buildStyleBackgroundPromptLine(template, screenshotBackgroundColor),
        layout.promptLine,
        device.promptLine,
        fontFamily.promptLine,
        typography.promptLine,
        'Portrait orientation. No watermark. High quality marketing visual suitable for App Store and Google Play.',
    ];
}

export function buildTemplateStylePayload(
    brandColor: string,
    fontFamily: FontFamilyId,
    targets: string[],
    presetId: StylePresetId,
    advanced: StyleAdvancedFields,
): StoreScreenshotTemplate {
    return {
        brand_color: brandColor,
        font_family: fontFamily,
        targets,
        style_preset: presetId,
        background_mode: advanced.background_mode,
        layout_style: advanced.layout_style,
        device_frame_style: advanced.device_frame_style,
        typography_style: advanced.typography_style,
    };
}

export function readTemplateStyleFromConfig(template: StoreScreenshotTemplate): {
    presetId: StylePresetId;
    advanced: StyleAdvancedFields;
} {
    const presetId = normalizeStylePresetId(template.style_preset);
    return {
        presetId,
        advanced: resolveStyleAdvancedFields({ ...template, style_preset: presetId }),
    };
}

export function getStylePresetById(presetId: StylePresetId) {
    return PRESET_MAP[presetId];
}

export function buildVisualCopyVoiceLines(template: StoreScreenshotTemplate): string[] {
    const presetId = normalizeStylePresetId(template.style_preset);
    const preset = PRESET_MAP[presetId];
    const advanced = resolveStyleAdvancedFields(template);
    const typography = findOption(
        TYPOGRAPHY_OPTIONS,
        advanced.typography_style,
        DEFAULT_STYLE_ADVANCED.typography_style,
    );
    const fontFamily = findOption(
        FONT_FAMILY_OPTIONS,
        template.font_family,
        DEFAULT_FONT_FAMILY,
    );

    return [
        `SHARED visual template (applies to ALL screenshots): ${preset.label} (${presetId})`,
        `Visual mood: ${preset.promptLine}`,
        fontFamily.promptLine,
        `Typography feel: ${typography.promptLine}`,
        `COPY VOICE (mandatory for every headline/subtitle): ${preset.copyVoiceLine}`,
        `Visual copy tone reference: "${preset.copyVoiceExample.headline}" / "${preset.copyVoiceExample.subtitle}"`,
        preset.copyVoiceExample.avoid,
        'Every headline and subtitle MUST sound like it belongs on this visual template — layer per-screenshot copy_style_id ON TOP of this shared voice, never ignore it.',
    ];
}
