import type { StoreScreenshotItem, StoreScreenshotTemplate } from './storeScreenshotTypes';
import { buildVisualCopyVoiceLines } from './storeScreenshotStyleOptions';

export type CopyStylePresetId =
    | 'benefit_first'
    | 'curiosity_hook'
    | 'problem_solution'
    | 'social_proof'
    | 'action_momentum'
    | 'feature_as_win';

export const DEFAULT_COPY_STYLE_PRESET: CopyStylePresetId = 'benefit_first';

export type CopyStyleExample = {
    headline: string;
    subtitle: string;
    avoid: string;
};

export const COPY_STYLE_PRESETS: Array<{
    id: CopyStylePresetId;
    label: string;
    description: string;
    headlineGuide: string;
    titleGuide: string;
    promptLine: string;
    rhetoricalDevice: string;
    example: CopyStyleExample;
    exampleEn: CopyStyleExample;
}> = [
    {
        id: 'benefit_first',
        label: 'Lợi ích trước tiên',
        description: 'Nói thẳng user được gì — nhanh, rõ, dễ hiểu trong 2 giây đầu.',
        headlineGuide: 'Headline = kết quả cụ thể user nhận được (học nhanh hơn, tiết kiệm thời gian, đạt mục tiêu).',
        titleGuide: 'Title ngắn, benefit-led, không mô tả tính năng kỹ thuật.',
        promptLine: 'Copy style: benefit-first — lead with the clearest user outcome in the headline; subtitle adds one proof point or how-it-works. Avoid feature jargon; speak to what the user gains.',
        rhetoricalDevice: 'direct outcome statement (what the user gets, not what the app is)',
        example: {
            headline: 'Học mỗi ngày chỉ 5 phút',
            subtitle: 'Bài học ngắn, vừa với lịch bận rộn',
            avoid: 'Tránh: "Ứng dụng học lập trình đa nền tảng" — khô, user không thấy lợi ích ngay.',
        },
        exampleEn: {
            headline: 'Learn in just 5 minutes a day',
            subtitle: 'Short lessons that fit a busy schedule',
            avoid: 'Avoid: "Multi-platform coding learning app" — dry, no instant benefit.',
        },
    },
    {
        id: 'curiosity_hook',
        label: 'Gợi mở tò mò',
        description: 'Tạo khoảng trống tò mò để user muốn vuốt xem tiếp và bấm tải.',
        headlineGuide: 'Headline gợi mở (câu hỏi, “Bạn đã thử…?”, “Cách đơn giản để…”) nhưng vẫn trung thực.',
        titleGuide: 'Title mở vòng, không spoil toàn bộ giá trị app.',
        promptLine: 'Copy style: curiosity hook — open a knowledge gap or surprising angle that makes users want the next screenshot; never clickbait or false promises.',
        rhetoricalDevice: 'question or knowledge gap ("Ever tried…?", "What if…?", "The simple way to…")',
        example: {
            headline: 'Bạn đã thử học code 5 phút mỗi ngày?',
            subtitle: 'Cách đơn giản để giữ thói quen lâu dài',
            avoid: 'Tránh: "Giải pháp học tập toàn diện" — quá chung, không gợi tò mò.',
        },
        exampleEn: {
            headline: 'Ever tried learning code for 5 minutes a day?',
            subtitle: 'A simple way to build a lasting habit',
            avoid: 'Avoid: "Comprehensive learning solution" — too broad, no curiosity gap.',
        },
    },
    {
        id: 'problem_solution',
        label: 'Vấn đề → giải pháp',
        description: 'Chạm pain point rồi đưa relief — rất hiệu quả cho app giải quyết nỗi đau cụ thể.',
        headlineGuide: 'Headline nêu pain (mất thời gian, khó duy trì thói quen…) hoặc relief ngay.',
        titleGuide: 'Title đối lập: before/after hoặc “Không còn…”.',
        promptLine: 'Copy style: problem → solution — name a relatable pain in headline or subtitle, then position the app as the relief; empathetic, not fear-mongering.',
        rhetoricalDevice: 'pain then relief ("No more…", "Stop…", "Finally…")',
        example: {
            headline: 'Không còn bỏ dở giữa chừng',
            subtitle: 'Streak nhắc bạn quay lại mỗi ngày',
            avoid: 'Tránh: "Có tính năng nhắc nhở" — nêu feature thay vì pain/relief.',
        },
        exampleEn: {
            headline: 'No more quitting halfway',
            subtitle: 'Your streak brings you back every day',
            avoid: 'Avoid: "Has reminder feature" — feature list, not pain/relief.',
        },
    },
    {
        id: 'social_proof',
        label: 'Niềm tin & social proof',
        description: 'Giảm rào cản tải bằng uy tín, số liệu, cộng đồng, chuyên gia.',
        headlineGuide: 'Headline nhấn trust (hàng nghìn người học, được giáo viên tin dùng…) nếu metadata hỗ trợ.',
        titleGuide: 'Title mang cảm giác an toàn, đáng tin, không phô trương.',
        promptLine: 'Copy style: social proof & trust — emphasize credibility, community, or results others achieved; only use claims supported by metadata.',
        rhetoricalDevice: 'credibility signal (community, numbers, trust — only if metadata supports it)',
        example: {
            headline: 'Hàng nghìn người học mỗi ngày',
            subtitle: 'Tham gia cộng đồng đang tiến bộ từng ngày',
            avoid: 'Tránh: bịa số liệu không có trong metadata app.',
        },
        exampleEn: {
            headline: 'Thousands learn here every day',
            subtitle: 'Join a community that keeps moving forward',
            avoid: 'Avoid: inventing stats not supported by app metadata.',
        },
    },
    {
        id: 'action_momentum',
        label: 'Kêu gọi hành động',
        description: 'Đẩy user bắt đầu ngay — phù hợp screenshot cuối hoặc onboarding.',
        headlineGuide: 'Headline động từ mạnh: Bắt đầu, Khám phá, Thử ngay — kèm lợi ích ngắn.',
        titleGuide: 'Title ngắn, imperative, tạo momentum.',
        promptLine: 'Copy style: action momentum — strong verbs and forward motion; headline invites immediate start; subtitle removes friction (“in minutes”, “no setup”).',
        rhetoricalDevice: 'imperative command ("Start…", "Try…", "Begin…") plus friction removal',
        example: {
            headline: 'Bắt đầu bài học đầu tiên',
            subtitle: 'Chỉ vài phút, không cần cài đặt phức tạp',
            avoid: 'Tránh: "Tải app ngay" — quá generic, thiếu lý do cụ thể.',
        },
        exampleEn: {
            headline: 'Start your first lesson now',
            subtitle: 'Just minutes — no complicated setup',
            avoid: 'Avoid: "Download now" — generic CTA with no specific reason.',
        },
    },
    {
        id: 'feature_as_win',
        label: 'Tính năng = chiến thắng user',
        description: 'Giới thiệu tính năng nhưng luôn frame thành win cho user, không liệt kê dry.',
        headlineGuide: 'Headline = tính năng → lợi ích (“Streak giữ bạn đi đúng hướng”).',
        titleGuide: 'Title kết nối capability với cảm xúc/user goal.',
        promptLine: 'Copy style: feature-as-win — each screenshot highlights one capability framed as a user victory, not a spec list.',
        rhetoricalDevice: 'one capability → one user victory (never a spec bullet list)',
        example: {
            headline: 'Streak giữ bạn đi đúng hướng',
            subtitle: 'Thấy tiến bộ rõ ràng từng ngày',
            avoid: 'Tránh: "Có streak, XP, badge" — liệt kê tính năng, không nói user win gì.',
        },
        exampleEn: {
            headline: 'Your streak keeps you on track',
            subtitle: 'See real progress every single day',
            avoid: 'Avoid: "Streak, XP, badges" — feature dump, not a user win.',
        },
    },
];

const GENERIC_COPY_BANNED_PHRASES = [
    'master the skills',
    'skills of tomorrow',
    'master tomorrow',
    'learn faster',
    'transform your',
    'unlock your',
    'all-in-one',
    'comprehensive',
    'cutting-edge',
    'next-level',
    'revolutionary',
    'powerful platform',
    'ultimate',
];

const COPY_PRESET_MAP = Object.fromEntries(
    COPY_STYLE_PRESETS.map((preset) => [preset.id, preset]),
) as Record<CopyStylePresetId, (typeof COPY_STYLE_PRESETS)[number]>;

export function normalizeCopyStylePresetId(value?: string | null): CopyStylePresetId {
    if (value && value in COPY_PRESET_MAP) {
        return value as CopyStylePresetId;
    }
    return DEFAULT_COPY_STYLE_PRESET;
}

export function buildCopyStylePromptLinesForPreset(presetId?: string | null): string[] {
    const preset = COPY_PRESET_MAP[normalizeCopyStylePresetId(presetId)];

    return [
        preset.promptLine,
        `Headline guidance: ${preset.headlineGuide}`,
        `Title guidance: ${preset.titleGuide}`,
    ];
}

export function buildCopyStyleBulkBlockLines(
    shot: Pick<StoreScreenshotItem, 'order' | 'caption' | 'copy_style_preset'>,
    totalCount: number,
    template?: StoreScreenshotTemplate,
): string[] {
    const presetId = normalizeCopyStylePresetId(shot.copy_style_preset);
    const preset = COPY_PRESET_MAP[presetId];
    const caption = shot.caption?.trim();
    const visualVoiceReminder = template
        ? 'Blend: shared visual template copy voice (from section above) + this screenshot copy_style_id — both are mandatory.'
        : '';

    return [
        `--- Screenshot #${shot.order} ---`,
        `REQUIRED copy_style_id: ${presetId} (${preset.label})`,
        `Rhetorical device for this screenshot ONLY: ${preset.rhetoricalDevice}`,
        caption
            ? `Screen content (tie headline to something visible here): ${caption}`
            : 'Screen content: (empty — infer one specific UI moment from metadata and funnel position)',
        preset.promptLine,
        `Headline guidance: ${preset.headlineGuide}`,
        `Subtitle guidance: ${preset.titleGuide}`,
        `Per-style tone reference (match voice, do NOT copy verbatim): headline "${preset.exampleEn.headline}" / subtitle "${preset.exampleEn.subtitle}"`,
        preset.exampleEn.avoid,
        visualVoiceReminder,
        getScreenshotPositionHint(shot.order, totalCount),
        `This screenshot MUST sound noticeably different from every other screenshot — especially those with a different copy_style_id — while still matching the shared visual template voice.`,
        '',
    ].filter(Boolean);
}

export function buildCopyDifferentiationLines(screenshots: StoreScreenshotItem[]): string[] {
    const sorted = [...screenshots].sort((a, b) => a.order - b.order);
    const uniqueStyles = Array.from(new Set(
        sorted.map((shot) => normalizeCopyStylePresetId(shot.copy_style_preset)),
    ));

    if (uniqueStyles.length <= 1) {
        return [
            'All screenshots share one copy style — still vary sentence structure and vocabulary; never repeat the same opening word or phrase pattern.',
        ];
    }

    const styleSummary = sorted.map((shot) => (
        `#${shot.order}=${normalizeCopyStylePresetId(shot.copy_style_preset)}`
    )).join(', ');

    return [
        `Copy style map: ${styleSummary}`,
        'When copy_style_id differs between screenshots, headlines MUST use different rhetorical devices (question vs pain vs proof vs command vs outcome vs feature-win).',
        'Do not reuse the same headline opening (e.g. multiple headlines starting with "Master", "Learn", "Start").',
        'Do not reuse the same subtitle structure across screenshots.',
        'Banned overused phrases (do not use any): ' + GENERIC_COPY_BANNED_PHRASES.map((p) => `"${p}"`).join(', ') + '.',
    ];
}

export function buildBulkJsonExampleRow(
    screenshot: number,
    presetId: CopyStylePresetId,
    promptLang: string,
    bulkLang: string,
): string {
    const preset = COPY_PRESET_MAP[presetId];
    return [
        '  {',
        `    "screenshot": ${screenshot},`,
        `    "headline": { "${promptLang}": "${preset.exampleEn.headline}", "${bulkLang}": "${preset.example.headline}" },`,
        `    "subtitle": { "${promptLang}": "${preset.exampleEn.subtitle}", "${bulkLang}": "${preset.example.subtitle}" }`,
        '  }',
    ].join('\n');
}

export function buildCopyStylePromptLinesForScreenshot(
    item: StoreScreenshotItem,
    template?: StoreScreenshotTemplate,
): string[] {
    const presetId = normalizeCopyStylePresetId(item.copy_style_preset);
    const preset = COPY_PRESET_MAP[presetId];
    const caption = item.caption?.trim();

    return [
        ...(template ? buildVisualCopyVoiceLines(template) : []),
        `Per-screenshot copy style #${item.order} (REQUIRED: ${presetId}):`,
        `Rhetorical device: ${preset.rhetoricalDevice}`,
        ...(caption ? [`Screen content: ${caption}`] : []),
        ...buildCopyStylePromptLinesForPreset(item.copy_style_preset),
        `Per-style tone reference: "${preset.exampleEn.headline}" / "${preset.exampleEn.subtitle}"`,
        preset.exampleEn.avoid,
        template
            ? 'Headline/subtitle on image must blend shared visual template voice with this per-screenshot copy style.'
            : '',
    ].filter(Boolean);
}

export function readCopyStyleFromScreenshot(item: Pick<StoreScreenshotItem, 'copy_style_preset'>): CopyStylePresetId {
    return normalizeCopyStylePresetId(item.copy_style_preset);
}

export function getCopyStylePresetById(presetId: CopyStylePresetId) {
    return COPY_PRESET_MAP[presetId];
}

export function getScreenshotPositionHint(order: number, total: number): string {
    if (order <= 1) {
        return 'Screenshot đầu tiên — cần hook mạnh nhất để dừng tay user vuốt store.';
    }
    if (order >= total) {
        return 'Screenshot cuối — củng cố niềm tin hoặc kêu gọi bắt đầu.';
    }
    return 'Screenshot giữa — mỗi ảnh một lợi ích/tính năng, không lặp headline.';
}
