import type { StoreScreenshotItem, StoreScreenshotTemplate } from './storeScreenshotTypes';
import { getStylePresetById, normalizeStylePresetId } from './storeScreenshotStyleOptions';

export type CopyStylePresetId =
    | 'benefit_centric'
    | 'action_oriented'
    | 'social_proof_numbers'
    | 'pain_point_solver'
    | 'simplicity_speed'
    | 'sequential_storytelling'
    | 'curiosity_fomo'
    | 'brand_positioning';

export const DEFAULT_COPY_STYLE_PRESET: CopyStylePresetId = 'benefit_centric';

/** Map id phong cách cũ (6 preset) sang id mới — giữ tương thích dữ liệu đã lưu. */
const LEGACY_COPY_STYLE_MAP: Record<string, CopyStylePresetId> = {
    benefit_first: 'benefit_centric',
    curiosity_hook: 'curiosity_fomo',
    problem_solution: 'pain_point_solver',
    social_proof: 'social_proof_numbers',
    action_momentum: 'action_oriented',
    feature_as_win: 'benefit_centric',
};

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
        id: 'benefit_centric',
        label: 'Tập trung vào lợi ích',
        description: 'Đặt lợi ích lớn nhất hoặc kết quả user nhận được lên hàng đầu — nói app giúp gì, không liệt kê app có gì.',
        headlineGuide: 'Headline = kết quả cụ thể user nhận được, bám tính năng/màn hình thật trong ảnh và metadata.',
        titleGuide: 'Subtitle bổ sung một bằng chứng hoặc cách đạt kết quả — chỉ dùng số liệu có trong metadata.',
        promptLine: 'Copy style: benefit-centric — lead with the biggest real user outcome from this screen; subtitle adds one proof or how-it-works grounded in visible UI or metadata. Never generic feature labels.',
        rhetoricalDevice: 'direct outcome statement (what the user gets from this app moment)',
        example: {
            headline: 'Ngủ ngon hơn sau 10 phút',
            subtitle: 'Hơn 500 bài thiền định và âm thanh thiên nhiên giúp giảm stress',
            avoid: 'Tránh: "Ứng dụng thiền đa tính năng" — khô, không nêu lợi ích cụ thể từ app thật.',
        },
        exampleEn: {
            headline: 'Sleep better in 10 minutes',
            subtitle: '500+ meditations and nature sounds to ease stress',
            avoid: 'Avoid: "Multi-feature meditation app" — dry, no outcome tied to this screen.',
        },
    },
    {
        id: 'action_oriented',
        label: 'Hành động trực diện',
        description: 'Động từ mạnh, dứt khoát ở đầu câu — thúc đẩy user tải app để bắt đầu ngay.',
        headlineGuide: 'Headline mở bằng động từ hành động gắn với hành vi thật trên màn hình (học, luyện, khám phá…).',
        titleGuide: 'Subtitle nêu thói quen hoặc bước tiếp theo user có thể làm ngay trong app.',
        promptLine: 'Copy style: action-oriented — strong imperative verb at the start; headline pushes immediate start; subtitle names a realistic daily action shown or implied on screen.',
        rhetoricalDevice: 'imperative command ("Master…", "Practice…", "Build…") tied to a real in-app action',
        example: {
            headline: 'Làm chủ tiếng Anh giao tiếp',
            subtitle: 'Luyện phản xạ 15 phút mỗi ngày cùng giáo viên bản xứ AI',
            avoid: 'Tránh: "Tải app ngay" — CTA chung chung, không gắn hành động cụ thể trên ảnh.',
        },
        exampleEn: {
            headline: 'Master conversational English',
            subtitle: '15-minute daily drills with native AI tutors',
            avoid: 'Avoid: "Download now" — generic CTA with no specific in-app action.',
        },
    },
    {
        id: 'social_proof_numbers',
        label: 'Chứng thực & số liệu',
        description: 'Số liệu cụ thể (người dùng, xếp hạng, ngày, tiền) để xây dựng niềm tin — chỉ khi metadata hỗ trợ.',
        headlineGuide: 'Headline dùng số liệu/uy tín thật từ metadata; không bịa con số, top chart hay giải thưởng.',
        titleGuide: 'Subtitle củng cố bằng một fact có căn cứ (cộng đồng, đánh giá, mốc thời gian).',
        promptLine: 'Copy style: social proof & numbers — concrete credibility signals ONLY if supported by app metadata; if no stats exist, use qualitative trust (e.g. "trusted by learners") without inventing figures.',
        rhetoricalDevice: 'credible number or ranking (only when metadata supports it)',
        example: {
            headline: 'Lựa chọn của 10 triệu creator',
            subtitle: 'Ứng dụng chỉnh sửa video ngắn top 1 trên App Store năm 2025',
            avoid: 'Tránh: bịa số người dùng, hạng top hoặc năm nếu metadata không có.',
        },
        exampleEn: {
            headline: 'Chosen by 10 million creators',
            subtitle: 'Top short-form video editor on the App Store in 2025',
            avoid: 'Avoid: inventing user counts, rankings, or years not in metadata.',
        },
    },
    {
        id: 'pain_point_solver',
        label: 'Giải quyết nỗi đau',
        description: 'Gọi tên rắc rối user đang gặp, rồi đưa app như giải pháp cứu cánh — bám pain thật của app.',
        headlineGuide: 'Headline nêu pain hoặc relief mà app này thực sự giải quyết (từ mô tả/metadata).',
        titleGuide: 'Subtitle mô tả cách app xử lý pain — khớp UI trên ảnh.',
        promptLine: 'Copy style: pain-point solver — name a relatable frustration this app addresses, then position the on-screen feature as relief; empathetic, not fear-mongering; pain must match app reality.',
        rhetoricalDevice: 'pain then relief ("No more…", "Clear…", "Fix…") grounded in app use case',
        example: {
            headline: 'Xóa sạch bộ nhớ trong 1 chạm',
            subtitle: 'Tự động quét và loại bỏ ảnh trùng lặp, tệp rác cứng đầu',
            avoid: 'Tránh: pain chung chung không liên quan tính năng trên ảnh.',
        },
        exampleEn: {
            headline: 'Free up storage in one tap',
            subtitle: 'Auto-scan and remove duplicate photos and stubborn junk files',
            avoid: 'Avoid: generic pain unrelated to what is visible on screen.',
        },
    },
    {
        id: 'simplicity_speed',
        label: 'Đơn giản hóa',
        description: 'Nhấn mạnh dễ dàng, nhanh, không tốn sức — hấp dẫn user bận rộn hoặc sợ quy trình phức tạp.',
        headlineGuide: 'Headline nhấn "không cần…", "tự động", "trong vài phút" — phải đúng với flow trên ảnh.',
        titleGuide: 'Subtitle giải thích cơ chế đơn giản/hóa tự động mà app thực sự có.',
        promptLine: 'Copy style: simplicity & speed — emphasize zero friction, automation, or speed; headline removes setup fear; subtitle shows how little effort is required on this screen.',
        rhetoricalDevice: 'friction removal ("No manual…", "Automatic…", "In minutes…")',
        example: {
            headline: 'Quản lý chi tiêu không cần nhập liệu',
            subtitle: 'Tự động đồng bộ hóa hóa đơn và phân tích dòng tiền thông minh',
            avoid: 'Tránh: hứa "1 chạm" nếu màn hình cho thấy nhiều bước.',
        },
        exampleEn: {
            headline: 'Track spending with zero manual entry',
            subtitle: 'Auto-sync receipts and smart cash-flow insights',
            avoid: 'Avoid: promising one-tap if the screen shows a multi-step flow.',
        },
    },
    {
        id: 'sequential_storytelling',
        label: 'Kể chuyện theo chuỗi',
        description: 'Biến carousel thành các bước (Bước 1, 2, 3…) — user lướt ảnh hiểu quy trình app.',
        headlineGuide: 'Headline có thể mở "Bước N:" / "Step N:" khớp vị trí ảnh trong carousel và hành động trên màn hình.',
        titleGuide: 'Subtitle mô tả ngữ cảnh của bước đó trong flow thật của app.',
        promptLine: 'Copy style: sequential storytelling — frame this screenshot as one step in the app journey; headline may use "Step N:" matching carousel position; subtitle explains what happens at this step using visible UI.',
        rhetoricalDevice: 'numbered step in a flow ("Step 1:", "Step 2:") tied to carousel order',
        example: {
            headline: 'Bước 1: Chọn món bạn thích',
            subtitle: 'Hàng ngàn nhà hàng chuẩn vị xung quanh bạn',
            avoid: 'Tránh: đánh số bước không khớp thứ tự ảnh hoặc nội dung màn hình.',
        },
        exampleEn: {
            headline: 'Step 1: Pick your favorite dish',
            subtitle: 'Thousands of authentic restaurants near you',
            avoid: 'Avoid: step numbers that conflict with screenshot order or on-screen content.',
        },
    },
    {
        id: 'curiosity_fomo',
        label: 'Tò mò & FOMO',
        description: 'Khơi tò mò hoặc sợ bỏ lỡ — từ ngữ độc quyền, giới hạn — chỉ khi app thực sự có ưu đãi/tính năng riêng.',
        headlineGuide: 'Headline gợi deal, quyền lợi riêng hoặc góc bất ngờ — không clickbait, không hứa giảm giá không có trong metadata.',
        titleGuide: 'Subtitle làm rõ điều kiện hoặc độc quyền thật (thành viên, khung giờ, tính năng premium).',
        promptLine: 'Copy style: curiosity & FOMO — exclusive angle or limited access that makes users want the next screenshot; never false scarcity or fake discounts; claims must match app offers in metadata.',
        rhetoricalDevice: 'exclusive access or limited opportunity (only if app actually offers it)',
        example: {
            headline: 'Săn deal thương hiệu giảm đến 70%',
            subtitle: 'Chỉ dành riêng cho thành viên ứng dụng vào khung giờ vàng',
            avoid: 'Tránh: phần trăm giảm giá hoặc "chỉ hôm nay" nếu metadata không đề cập.',
        },
        exampleEn: {
            headline: 'Hunt brand deals up to 70% off',
            subtitle: 'Members-only drops during golden hours in the app',
            avoid: 'Avoid: discount percentages or "today only" without metadata support.',
        },
    },
    {
        id: 'brand_positioning',
        label: 'Định vị thương hiệu',
        description: 'Khẳng định USP độc tôn so với đối thủ — thường mạnh nhất ở ảnh đầu carousel.',
        headlineGuide: 'Headline định vị vai trò độc nhất của app (trợ lý, nền tảng, phương pháp…) — phải khớp mô tả app thật.',
        titleGuide: 'Subtitle liệt kê 2–3 khả năng cốt lõi app thực sự có, không phóng đại.',
        promptLine: 'Copy style: brand positioning — assert the app\'s unique role or USP vs alternatives; ideal for first screenshot; headline states who this app is for you; subtitle lists core capabilities actually present in metadata or on screen.',
        rhetoricalDevice: 'unique positioning statement ("Your first…", "The only…") — truthful USP only',
        example: {
            headline: 'Trợ lý AI cá nhân đầu tiên của bạn',
            subtitle: 'Tự động sắp xếp lịch trình, soạn thảo văn bản và nhắc nhở công việc',
            avoid: 'Tránh: "đầu tiên trên thế giới" hoặc "duy nhất" nếu không chứng minh được.',
        },
        exampleEn: {
            headline: 'Your first personal AI assistant',
            subtitle: 'Auto-schedule, draft messages, and remind you of tasks',
            avoid: 'Avoid: "world\'s first" or "only app" without verifiable support.',
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
    const raw = String(value ?? '').trim();
    const resolved = (LEGACY_COPY_STYLE_MAP[raw] ?? raw) as CopyStylePresetId;
    if (resolved in COPY_PRESET_MAP) {
        return resolved;
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
        'When copy_style_id differs between screenshots, headlines MUST use different rhetorical devices (outcome vs command vs proof vs pain vs simplicity vs step vs FOMO vs positioning).',
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
    const templatePreset = template
        ? getStylePresetById(normalizeStylePresetId(template.style_preset))
        : null;

    return [
        templatePreset
            ? `Voice (${templatePreset.label}): ${templatePreset.copyVoiceLine.replace(/^Copy voice:\s*/i, '')}`
            : '',
        `Style #${item.order} — ${presetId}: ${preset.promptLine}`,
        ...(caption ? [`Screen: ${caption}`] : []),
        preset.exampleEn.avoid.replace(/^Avoid:\s*/i, 'Avoid '),
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
        return 'Screenshot đầu tiên — hook mạnh nhất; phong cách brand_positioning thường phù hợp nếu chọn một style cho ảnh này.';
    }
    if (order >= total) {
        return 'Screenshot cuối — củng cố niềm tin hoặc kêu gọi bắt đầu; action_oriented thường hiệu quả.';
    }
    return `Screenshot giữa (#${order}/${total}) — mỗi ảnh một góc giá trị; sequential_storytelling có thể dùng "Bước ${order}:" nếu carousel kể flow.`;
}
