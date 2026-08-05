/** Mirror marketing_short_video_import_html_beat_division_whiteboard_image_prompt_block */

export const WHITEBOARD_HYBRID_IMAGE_PROMPT_EXAMPLE =
    "High-impact hybrid whiteboard collage of a tired young adult photorealistic cutout lying in bed beside a large black alarm clock, floating task papers, bold Vietnamese headline '3 NGUYÊN LIỆU', short labels 'những điều bạn muốn làm', 'những điều bạn cần làm', 'xử lý việc không muốn & không cần', thick black marker arrows scribbles underlines, selective bright red accents on 1-2 keywords, strong hierarchy, compact editorial thumbnail, pure white background, no watermark";

export const WHITEBOARD_HYBRID_STYLE_SUFFIX =
    'high-impact hybrid whiteboard collage, photorealistic cutout subject with white edge on pure white background, thick black marker annotations arrows scribbles underlines, bold Vietnamese hand-lettered headline, selective bright red accents on 1-2 keywords only, strong visual hierarchy, compact editorial thumbnail composition, no watermark';

export const WHITEBOARD_COLLAGE_IMAGE_PROMPT_EXAMPLE =
    "Analog paper collage art on warm cream textured paper background: a tired young adult as a large magazine-cutout subject with torn deckled paper edges lying in bed beside a black alarm clock cutout, floating task-paper fragments, halftone dots, washi tape, thick black marker arrows scribbles underlines, bold vintage magazine Vietnamese headline '3 NGUYÊN LIỆU', short labels 'những điều bạn muốn làm', 'những điều bạn cần làm', 'xử lý việc không muốn & không cần', selective bright red accents on 1-2 keywords, muted retro palette, paper grain, strong hierarchy, compact editorial composition, no watermark";

export const WHITEBOARD_COLLAGE_STYLE_SUFFIX =
    'analog paper collage art on warm cream textured paper background, 1 focal magazine-cutout subject with torn deckled paper edges, layered overlapping photo fragments, halftone dots, washi tape strips, thick black marker annotations arrows scribbles underlines, bold vintage magazine headline typography, selective bright red accents on 1-2 keywords, muted retro palette, paper grain, strong hierarchy, compact editorial composition, no watermark';

const WHITEBOARD_VIETNAMESE_TEXT_RULES = [
    '- **On-screen text tiếng Việt — BẮT BUỘC chính xác theo nội dung beat**:',
    '  - Lấy chữ từ ý/cụm trong `phrase_anchor` (hoặc lời thoại beat tương ứng); quote **đúng nghĩa**, có thể rút gọn ngắn để đọc được trên ảnh.',
    '  - Ví dụ GOOD: narration nói ba nguyên liệu là muốn làm / cần làm / xử lý việc không muốn cũng không cần → labels: `\'những điều bạn muốn làm\'`, `\'những điều bạn cần làm\'`, `\'xử lý việc không muốn & không cần\'` + title `\'3 NGUYÊN LIỆU\'`.',
    '  - Ví dụ BAD: `\'Nguyên liệu 1\'`, `\'Nguyên liệu 2\'`, `\'Bước 1\'`, `\'Item 1\'`, `\'Tip 1\'` — placeholder chung chung, **không** truyền nội dung.',
    '  - **Cấm** số thứ tự giả làm nội dung (`1/2/3`, `A/B/C`) khi narration đã nêu rõ từng ý.',
    '  - Chữ trên ảnh = bold hand-lettered marker; mỗi label ≤ ~8–12 từ; ưu tiên cụm sát nghĩa narration hơn slogan chung.',
];

const WHITEBOARD_COMMON_TAIL = (styleSuffix: string): string[] => [
    `- Style suffix gợi ý: \`${styleSuffix}\`.`,
    '- **Cấm** logo thương mại, watermark, chữ dày đặc / đoạn dài khó đọc / placeholder generic.',
    '- `image_prompt` và `visual_description` **song song** trên mỗi section — không thay thế nhau.',
];

function isCollage(genStyle: string | null | undefined): boolean {
    return String(genStyle || '').trim().toLowerCase() === 'collage_art';
}

/** Dòng phong cách image theo gen_style — append khi DÙNG prompt (mở Duck.ai/Meta.ai), không lưu. */
export function beatImageStyleSuffix(genStyle: string = 'hybrid'): string {
    return isCollage(genStyle) ? WHITEBOARD_COLLAGE_STYLE_SUFFIX : WHITEBOARD_HYBRID_STYLE_SUFFIX;
}

/** Luôn nối dòng phong cách image vào cuối prompt (bản gửi đi). */
export function appendBeatImageStyleSuffix(prompt: string, genStyle: string = 'hybrid'): string {
    const trimmed = String(prompt || '').trim();
    const suffix = beatImageStyleSuffix(genStyle);
    if (!trimmed) {
        return suffix;
    }
    return `${trimmed.replace(/[, ]+$/u, '')}, ${suffix}`;
}

export function buildBeatDivisionWhiteboardImagePromptBlock(genStyle: string = 'hybrid'): string {
    if (isCollage(genStyle)) {
        return [
            '## Whiteboard mode — `image_prompt` (Duck.ai manual)',
            '- Clip đang ở chế độ **whiteboard** với phong cách hình ảnh **Collage Art / Magazine Cutout**: mỗi beat dùng **ảnh collage giấy cắt tay** — engine vẽ tay trên annotation trước, rồi reveal vùng ảnh thật/màu — không phải HTML motion.',
            '- **`visual_description`**: WHAT/WHY cho editor/QA — English, ~40–60 words, semantic brief (giữ block creative hiện tại).',
            '- **`image_prompt`**: prompt **trực tiếp** cho Duck.ai — chủ yếu English mô tả scene/layout, ~30–120 từ.',
            '- `image_prompt` phải mô tả: **1 focal magazine-cutout subject với torn/deckled paper edge** + thick marker annotations + bold Vietnamese labels + style suffix collage.',
            '- **Collage Art (bắt buộc)**:',
            '  - Nền = **giấy cream/kraft texture** (analog paper collage / scrapbook) — **không** nền trắng tinh, không ảnh full-bleed.',
            '  - Hero = **cutout từ tạp chí** (person/object) với **mép giấy xé / deckled** — to, trung tâm, tương phản cao; đặt chồng trên các mảnh ảnh khác.',
            '  - Layering = **fragment ảnh xếp chồng** (overlapping photo fragments), halftone dots, washi tape — cảm giác ghép tay, không ghép kỹ thuật số sạch.',
            '  - Annotations = thick expressive black marker: arrows, scribbles, underlines, emphasis marks, icons (không outline-only diagram mảnh).',
            '  - Typography = **bold vintage magazine headline** tiếng Việt + short labels; **1–2 keywords trong bright red** còn lại đen.',
            '  - Composition = một luồng visual rõ (vd trái → phải), hierarchy mạnh, mật độ gọn — editorial thumbnail energy, không textbook tĩnh.',
            '  - Solid black graphic props OK (clock, brush bars, stamps) khi hỗ trợ hook.',
            '  - Palette = muted retro (cream, kraft, đen, accent đỏ), paper grain; **cấm** màu neon, vector phẳng nhiều màu.',
            '- **Cấm** flat colorful cartoon fills, neon glow UI, cluttered rainbow icons, photoreal full-bleed backgrounds, clean digital white-edge cutout (hero phải là giấy cắt tay).',
            ...WHITEBOARD_VIETNAMESE_TEXT_RULES,
            ...WHITEBOARD_COMMON_TAIL(WHITEBOARD_COLLAGE_STYLE_SUFFIX),
        ].join('\n');
    }

    return [
        '## Whiteboard mode — `image_prompt` (Duck.ai manual)',
        '- Clip đang ở chế độ **whiteboard**: mỗi beat dùng **ảnh hybrid whiteboard collage** — engine vẽ tay trên annotation trước, rồi reveal vùng ảnh thật/màu — không phải HTML motion.',
        '- **`visual_description`**: WHAT/WHY cho editor/QA — English, ~40–60 words, semantic brief (giữ block creative hiện tại).',
        '- **`image_prompt`**: prompt **trực tiếp** cho Duck.ai — chủ yếu English mô tả scene/layout, ~30–120 từ.',
        '- `image_prompt` phải mô tả: **1 focal photorealistic cutout subject** + thick marker annotations + bold Vietnamese labels + style suffix hybrid.',
        '- **Hybrid collage (bắt buộc)**:',
        '  - Hero = photorealistic cutout (person/object) with clean white edge on pure white background — large, central, high contrast.',
        '  - Annotations = thick expressive black marker: arrows, scribbles, underlines, emphasis marks, icons (not thin outline-only diagrams).',
        '  - Typography = bold hand-lettered Vietnamese headline + short labels; **1–2 keywords in bright red** only; rest black.',
        '  - Composition = one clear visual flow (e.g. left-to-right), strong hierarchy, compact density, minimal empty space — editorial YouTube-thumbnail energy, not a calm textbook diagram.',
        '  - Solid black graphic props OK (clock, brush bars, stamps) when they support the hook.',
        '- **Cấm** flat colorful cartoon fills, neon glow UI, cluttered rainbow icons, photoreal full-bleed backgrounds (subject must be cutout on white).',
        ...WHITEBOARD_VIETNAMESE_TEXT_RULES,
        ...WHITEBOARD_COMMON_TAIL(WHITEBOARD_HYBRID_STYLE_SUFFIX),
    ].join('\n');
}

export function buildBeatDivisionWhiteboardOutputRules(genStyle: string = 'hybrid'): string[] {
    if (isCollage(genStyle)) {
        return [
            '- `image_prompt`: follow **Whiteboard mode — image_prompt** above; English scene + **magazine-cutout hero with torn/deckled paper edge on cream paper collage background** + thick marker annotations + **specific** Vietnamese label quotes from this beat\'s `phrase_anchor` (no generic "Nguyên liệu 1/2/3"); ~30–120 words; collage art style; layered paper fragments; selective red accents; no watermark.',
        ];
    }
    return [
        '- `image_prompt`: follow **Whiteboard mode — image_prompt** above; English scene + photorealistic cutout hero + thick marker annotations + **specific** Vietnamese label quotes from this beat\'s `phrase_anchor` (no generic "Nguyên liệu 1/2/3"); ~30–120 words; hybrid whiteboard collage; selective red accents; no watermark.',
    ];
}

export function buildBeatDivisionWhiteboardSchemaExtra(
    isWhiteboard: boolean,
    genStyle: string = 'hybrid',
): Record<string, string> {
    if (!isWhiteboard) {
        return {};
    }
    return {
        image_prompt: isCollage(genStyle)
            ? WHITEBOARD_COLLAGE_IMAGE_PROMPT_EXAMPLE
            : WHITEBOARD_HYBRID_IMAGE_PROMPT_EXAMPLE,
    };
}
