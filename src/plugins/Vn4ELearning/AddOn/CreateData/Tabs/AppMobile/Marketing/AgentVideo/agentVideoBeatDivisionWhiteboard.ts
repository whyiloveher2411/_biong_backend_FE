/** Mirror marketing_short_video_import_html_beat_division_whiteboard_image_prompt_block */

export const WHITEBOARD_HYBRID_IMAGE_PROMPT_EXAMPLE =
    "High-impact hybrid whiteboard collage of a tired young adult photorealistic cutout lying in bed beside a large black alarm clock, floating task papers, bold Vietnamese headline '3 NGUYÊN LIỆU', short labels 'những điều bạn muốn làm', 'những điều bạn cần làm', 'xử lý việc không muốn & không cần', thick black marker arrows scribbles underlines, selective bright red accents on 1-2 keywords, strong hierarchy, compact editorial thumbnail, pure white background, no watermark";

export const WHITEBOARD_HYBRID_STYLE_SUFFIX =
    'high-impact hybrid whiteboard collage, photorealistic cutout subject with white edge on pure white background, thick black marker annotations arrows scribbles underlines, bold Vietnamese hand-lettered headline, selective bright red accents on 1-2 keywords only, strong visual hierarchy, compact editorial thumbnail composition, no watermark';

export const WHITEBOARD_COLLAGE_IMAGE_PROMPT_EXAMPLE =
    "Analog paper collage art on warm cream textured paper background: a tired young adult as a large magazine-cutout subject with torn deckled paper edges lying in bed beside a black alarm clock cutout, floating task-paper fragments, halftone dots, washi tape, thick black marker arrows scribbles underlines, bold vintage magazine Vietnamese headline '3 NGUYÊN LIỆU', short labels 'những điều bạn muốn làm', 'những điều bạn cần làm', 'xử lý việc không muốn & không cần', selective bright red accents on 1-2 keywords, muted retro palette, paper grain, strong hierarchy, compact editorial composition, no watermark";

export const WHITEBOARD_COLLAGE_STYLE_SUFFIX =
    'analog paper collage art on warm cream textured paper background, 1 focal magazine-cutout subject with torn deckled paper edges, layered overlapping photo fragments, halftone dots, washi tape strips, thick black marker annotations arrows scribbles underlines, bold vintage magazine headline typography, selective bright red accents on 1-2 keywords, muted retro palette, paper grain, strong hierarchy, compact editorial composition, no watermark';

export const WHITEBOARD_VOX_IMAGE_PROMPT_EXAMPLE =
    "Vox-style investigation explainer: a tired young adult as a photorealistic cutout piece of evidence pinned on a clean light background beside a black alarm clock cutout, task papers as evidence, thick black and bright red marker strokes connecting objects, arrows, question marks, circled emphasis marks, faint coordinate grid and bar-chart traces behind, bold Vietnamese callouts '3 NGUYÊN LIỆU' and short labels 'những điều bạn muốn làm', 'những điều bạn cần làm', 'xử lý việc không muốn & không cần', muted documentary palette, compact editorial composition, no watermark";

export const WHITEBOARD_VOX_STYLE_SUFFIX =
    'vox-style investigation explainer, photorealistic cutout subjects as evidence pinned on a clean light background, thick black and bright red marker strokes connecting objects, directional arrows, question marks, circled emphasis marks highlighting key data, faint coordinate grid and subtle maps or bar-line charts in the background, bold Vietnamese hand-lettered callouts, muted documentary palette, compact editorial composition, no watermark';

export const WHITEBOARD_COURTROOM_IMAGE_PROMPT_EXAMPLE =
    "Courtroom sketch style, hand-drawn reportage in colored pencil and light watercolor on textured rough paper: a tired young adult caught mid-expression beside a black alarm clock and floating task papers, quick loose dramatic strokes, muted low-saturation colors, gritty authentic trial-atmosphere energy, short Vietnamese label '3 NGUYÊN LIỆU' and brief hand-written notes, visible paper grain, candid news framing, no watermark";

export const WHITEBOARD_COURTROOM_STYLE_SUFFIX =
    'courtroom sketch style, hand-drawn reportage illustration in colored pencil soft pastel light watercolor on textured rough paper, quick loose dramatic strokes, muted low-saturation colors, gritty authentic trial atmosphere energy, focal subject caught mid-expression, visible paper grain and sketchy hatching, candid news framing, no watermark';

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

export const WHITEBOARD_GEN_STYLES = ['collage_art', 'vox', 'courtroom_sketch'] as const;

export type WhiteboardGenStyle = (typeof WHITEBOARD_GEN_STYLES)[number] | 'hybrid';

/** Trả style đã biết; style lạ → hybrid. */
export function resolveWhiteboardGenStyle(genStyle: string | null | undefined): WhiteboardGenStyle {
    const raw = String(genStyle || '').trim().toLowerCase();
    if (raw === 'collage_art' || raw === 'vox' || raw === 'courtroom_sketch') {
        return raw;
    }
    return 'hybrid';
}

const STYLE_SPEC: Record<WhiteboardGenStyle, { header: string; intro: string; rule: string; spec: string[]; banned: string }> = {
    hybrid: {
        header: 'Hybrid collage (bắt buộc)',
        intro: '- Clip đang ở chế độ **whiteboard**: mỗi beat dùng **ảnh hybrid whiteboard collage** — engine vẽ tay trên annotation trước, rồi reveal vùng ảnh thật/màu — không phải HTML motion.',
        rule: '- `image_prompt` phải mô tả: **1 focal photorealistic cutout subject** + thick marker annotations + bold Vietnamese labels + style suffix hybrid.',
        spec: [
            '  - Hero = photorealistic cutout (person/object) with clean white edge on pure white background — large, central, high contrast.',
            '  - Annotations = thick expressive black marker: arrows, scribbles, underlines, emphasis marks, icons (not thin outline-only diagrams).',
            '  - Typography = bold hand-lettered Vietnamese headline + short labels; **1–2 keywords in bright red** only; rest black.',
            '  - Composition = one clear visual flow (e.g. left-to-right), strong hierarchy, compact density, minimal empty space — editorial YouTube-thumbnail energy, not a calm textbook diagram.',
            '  - Solid black graphic props OK (clock, brush bars, stamps) when they support the hook.',
        ],
        banned: '- **Cấm** flat colorful cartoon fills, neon glow UI, cluttered rainbow icons, photoreal full-bleed backgrounds (subject must be cutout on white).',
    },
    collage_art: {
        header: 'Collage Art / Magazine Cutout (bắt buộc)',
        intro: '- Clip đang ở chế độ **whiteboard** với phong cách hình ảnh **Collage Art / Magazine Cutout**: mỗi beat dùng **ảnh collage giấy cắt tay** — engine vẽ tay trên annotation trước, rồi reveal vùng ảnh thật/màu — không phải HTML motion.',
        rule: '- `image_prompt` phải mô tả: **1 focal magazine-cutout subject với torn/deckled paper edge** + thick marker annotations + bold Vietnamese labels + style suffix collage.',
        spec: [
            '  - Nền = **giấy cream/kraft texture** (analog paper collage / scrapbook) — **không** nền trắng tinh, không ảnh full-bleed.',
            '  - Hero = **cutout từ tạp chí** (person/object) với **mép giấy xé / deckled** — to, trung tâm, tương phản cao; đặt chồng trên các mảnh ảnh khác.',
            '  - Layering = **fragment ảnh xếp chồng** (overlapping photo fragments), halftone dots, washi tape — cảm giác ghép tay, không ghép kỹ thuật số sạch.',
            '  - Annotations = thick expressive black marker: arrows, scribbles, underlines, emphasis marks, icons (không outline-only diagram mảnh).',
            '  - Typography = **bold vintage magazine headline** tiếng Việt + short labels; **1–2 keywords trong bright red** còn lại đen.',
            '  - Composition = một luồng visual rõ (vd trái → phải), hierarchy mạnh, mật độ gọn — editorial thumbnail energy, không textbook tĩnh.',
            '  - Solid black graphic props OK (clock, brush bars, stamps) khi hỗ trợ hook.',
            '  - Palette = muted retro (cream, kraft, đen, accent đỏ), paper grain; **cấm** màu neon, vector phẳng nhiều màu.',
        ],
        banned: '- **Cấm** flat colorful cartoon fills, neon glow UI, cluttered rainbow icons, photoreal full-bleed backgrounds, clean digital white-edge cutout (hero phải là giấy cắt tay).',
    },
    vox: {
        header: 'Vox-style phòng điều tra / tài liệu giải thích (bắt buộc)',
        intro: '- Clip đang ở chế độ **whiteboard**: mỗi beat dùng **ảnh phong cách Vox-style** — cutout photo đóng vai **vật chứng** minh họa; nét marker đen/đỏ nối các vật thể, mũi tên, dấu chấm hỏi, vùng khoanh tròn giải thích câu chuyện — không phải HTML motion.',
        rule: '- `image_prompt` phải mô tả: **cutout subjects như vật chứng (evidence)** + marker strokes (đen hoặc đỏ tươi) nối các vật thể + arrows / question marks / circled emphasis marks + faint grid / map / chart nền + bold Vietnamese callouts + style suffix vox.',
        spec: [
            '  - Hero = 1–3 photorealistic cutout subject (person/object) đóng vai **vật chứng** (evidence) — đặt rải trên nền sáng sạch, không full-bleed scene.',
            '  - Annotations = nét marker **đen hoặc đỏ tươi** nối các vật thể với nhau: mũi tên chỉ hướng, dấu chấm hỏi `?`, vùng khoanh tròn/underline nhấn mạnh dữ liệu — dày, expressive, không outline mảnh.',
            '  - Nền = lưới tọa độ (coordinate grid) mờ, bản đồ địa chính trị hoặc biểu đồ cột/đường in nhạt phía sau (subtle, không cướp tiêu điểm).',
            '  - Typography = bold hand-lettered Vietnamese callouts + short labels; **1–2 từ duy nhất màu đỏ tươi**; còn lại đen.',
            '  - Composition = bố cục kiểu phòng điều tra phá án / trang tài liệu giải thích chuyên sâu — hierarchy mạnh, mật độ gọn, editorial thumbnail energy.',
        ],
        banned: '- **Cấm** flat colorful vector fills, neon glow UI, cluttered rainbow icons, watermark, logo, blurry, full-bleed photorealistic scene without cutouts, thin outline-only diagram, cartoon.',
    },
    courtroom_sketch: {
        header: 'Phác thảo tòa án (Courtroom sketch, bắt buộc)',
        intro: '- Clip đang ở chế độ **whiteboard**: mỗi beat dùng **ảnh phác thảo tòa án vẽ tay** — bút chì màu / phấn màu pastel / màu nước nhạt trên giấy vân nhám, nét vẽ nhanh thô mộc, màu trầm, tập trung bắt trọn khoảnh khắc kịch tính — không phải HTML motion.',
        rule: '- `image_prompt` phải mô tả: **hand-drawn courtroom sketch reportage** + colored pencil / soft pastel / light watercolor trên giấy vân nhám + nét vẽ nhanh loose + màu trầm muted + khoảnh khắc/biểu cảm kịch tính của nhân vật chính + bold Vietnamese label ngắn + style suffix courtroom_sketch.',
        spec: [
            '  - Chất liệu = bút chì màu / phấn màu pastel / màu nước nhạt trên giấy có vân nhám (paper tooth) — không vector phẳng, không render kỹ thuật số sạch.',
            '  - Nét vẽ = nhanh, thô mộc, loose — bắt trọn khoảnh khắc và biểu cảm của nhân vật chính, không trau chuốt, mang tính phóng sự.',
            '  - Màu = trầm, bão hòa thấp (muted) — **cấm** màu neon, bảng màu rực rỡ.',
            '  - Bối cảnh = phòng xử án / sự kiện phóng sự điều tra — khung hình candid kiểu ký họa tòa án (courtroom reportage), chính trị gia / nhân vật lịch sử / phiên tòa.',
            '  - Typography = label tiếng Việt ngắn viết tay; 1–2 từ đậm nếu cần nhấn; giữ phong cách vẽ tay, không font máy.',
            '  - Composition = hierarchy rõ, focal character trung tâm hoặc lệch tâm kịch tính, mật độ phóng sự, không layout trang trí cầu kỳ.',
        ],
        banned: '- **Cấm** clean digital render, photorealistic, nét vẽ trau chuốt mượt, màu bão hòa neon, flat vector cartoon, watermark, logo, blurry, bố cục đối xứng hoàn hảo kiểu poster.',
    },
};

const STYLE_SUFFIX: Record<WhiteboardGenStyle, string> = {
    hybrid: WHITEBOARD_HYBRID_STYLE_SUFFIX,
    collage_art: WHITEBOARD_COLLAGE_STYLE_SUFFIX,
    vox: WHITEBOARD_VOX_STYLE_SUFFIX,
    courtroom_sketch: WHITEBOARD_COURTROOM_STYLE_SUFFIX,
};

const IMAGE_PROMPT_EXAMPLE: Record<WhiteboardGenStyle, string> = {
    hybrid: WHITEBOARD_HYBRID_IMAGE_PROMPT_EXAMPLE,
    collage_art: WHITEBOARD_COLLAGE_IMAGE_PROMPT_EXAMPLE,
    vox: WHITEBOARD_VOX_IMAGE_PROMPT_EXAMPLE,
    courtroom_sketch: WHITEBOARD_COURTROOM_IMAGE_PROMPT_EXAMPLE,
};

/** Dòng phong cách image theo gen_style — append khi DÙNG prompt (mở Duck.ai/Meta.ai), không lưu. */
export function beatImageStyleSuffix(genStyle: string = 'hybrid'): string {
    return STYLE_SUFFIX[resolveWhiteboardGenStyle(genStyle)];
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
    const style = resolveWhiteboardGenStyle(genStyle);
    const spec = STYLE_SPEC[style];

    return [
        '## Whiteboard mode — `image_prompt` (Duck.ai manual)',
        spec.intro,
        '- **`visual_description`**: WHAT/WHY cho editor/QA — English, ~40–60 words, semantic brief (giữ block creative hiện tại).',
        '- **`image_prompt`**: prompt **trực tiếp** cho Duck.ai — chủ yếu English mô tả scene/layout, ~30–120 từ.',
        spec.rule,
        `- **${spec.header}**:`,
        ...spec.spec,
        spec.banned,
        ...WHITEBOARD_VIETNAMESE_TEXT_RULES,
        ...WHITEBOARD_COMMON_TAIL(STYLE_SUFFIX[style]),
    ].join('\n');
}

export function buildBeatDivisionWhiteboardOutputRules(genStyle: string = 'hybrid'): string[] {
    const style = resolveWhiteboardGenStyle(genStyle);
    const outputRule: Record<WhiteboardGenStyle, string> = {
        hybrid: '- `image_prompt`: follow **Whiteboard mode — image_prompt** above; English scene + photorealistic cutout hero + thick marker annotations + **specific** Vietnamese label quotes from this beat\'s `phrase_anchor` (no generic "Nguyên liệu 1/2/3"); ~30–120 words; hybrid whiteboard collage; selective red accents; no watermark.',
        collage_art: '- `image_prompt`: follow **Whiteboard mode — image_prompt** above; English scene + **magazine-cutout hero with torn/deckled paper edge on cream paper collage background** + thick marker annotations + **specific** Vietnamese label quotes from this beat\'s `phrase_anchor` (no generic "Nguyên liệu 1/2/3"); ~30–120 words; collage art style; layered paper fragments; selective red accents; no watermark.',
        vox: '- `image_prompt`: follow **Whiteboard mode — image_prompt** above; English scene + **photorealistic cutout subjects as evidence** + thick black/bright red marker strokes connecting objects + arrows / question marks / circled emphasis + faint grid/map/chart background + **specific** Vietnamese label quotes from this beat\'s `phrase_anchor` (no generic "Nguyên liệu 1/2/3"); ~30–120 words; vox-style investigation explainer; selective red accents; no watermark.',
        courtroom_sketch: '- `image_prompt`: follow **Whiteboard mode — image_prompt** above; English scene + **hand-drawn courtroom sketch reportage** + colored pencil / pastel / light watercolor on rough paper + quick loose strokes + muted colors + dramatic moment of the focal character + **specific** Vietnamese label quotes from this beat\'s `phrase_anchor` (no generic "Nguyên liệu 1/2/3"); ~30–120 words; courtroom sketch style; no watermark.',
    };
    return [outputRule[style]];
}

export function buildBeatDivisionWhiteboardSchemaExtra(
    isWhiteboard: boolean,
    genStyle: string = 'hybrid',
): Record<string, string> {
    if (!isWhiteboard) {
        return {};
    }
    return {
        image_prompt: IMAGE_PROMPT_EXAMPLE[resolveWhiteboardGenStyle(genStyle)],
    };
}
