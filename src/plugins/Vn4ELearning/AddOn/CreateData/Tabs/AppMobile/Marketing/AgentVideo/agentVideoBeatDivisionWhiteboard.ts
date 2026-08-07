/** Mirror marketing_short_video_import_html_beat_division_whiteboard_image_prompt_block */

export const WHITEBOARD_HYBRID_STYLE_SUFFIX =
    'high-impact hybrid whiteboard collage, photorealistic cutout subject with white edge on pure white background, thick black marker annotations arrows scribbles underlines, bold Vietnamese hand-lettered headline, selective bright red accents on 1-2 keywords only, strong visual hierarchy, compact editorial thumbnail composition, no watermark';

export const WHITEBOARD_COLLAGE_STYLE_SUFFIX =
    'analog paper collage art on warm cream textured paper background, 1 focal magazine-cutout subject with torn deckled paper edges, layered overlapping photo fragments, halftone dots, washi tape strips, thick black marker annotations arrows scribbles underlines, bold vintage magazine headline typography, selective bright red accents on 1-2 keywords, muted retro palette, paper grain, strong hierarchy, compact editorial composition, no watermark';

export const WHITEBOARD_VOX_STYLE_SUFFIX =
    'vox-style documentary explainer board, photorealistic cutout subjects illustrating the topic pinned on a clean light background, thick black and bright red marker strokes connecting objects, directional arrows, question marks, circled emphasis marks highlighting key data, faint coordinate grid and subtle bar-line charts in the background, bold Vietnamese hand-lettered callouts, muted documentary palette, compact editorial composition, no watermark';

export const WHITEBOARD_COURTROOM_STYLE_SUFFIX =
    'sketch style, hand-drawn reportage illustration in colored pencil soft pastel light watercolor on textured rough paper, quick loose dramatic strokes, muted low-saturation colors, gritty authentic atmosphere energy, focal subject caught mid-expression, visible paper grain and sketchy hatching, candid news framing, no watermark';

/** 9 key bắt buộc của image_prompt JSON — đồng bộ validation agentVideoBeatMap + PHP import-html-helper. */
export const WHITEBOARD_IMAGE_PROMPT_JSON_KEYS = [
    'purpose',
    'context',
    'subject',
    'action',
    'scene',
    'text_overlay',
    'mood',
    'composition',
    'must_avoid',
] as const;

export type WhiteboardImagePromptJsonKey = (typeof WHITEBOARD_IMAGE_PROMPT_JSON_KEYS)[number];

/** Nguồn duy nhất của ví dụ image_prompt (mỗi style) — dẫn xuất cả 2 bản: escaped (block text) + raw JSON (schema example). */
const WHITEBOARD_IMAGE_PROMPT_EXAMPLE_OBJECTS: Record<WhiteboardGenStyle, Record<WhiteboardImagePromptJsonKey, string>> = {
    hybrid: {
        purpose: "Visual hook proving the beat's main idea: the 3-ingredient rule for handling unwanted tasks.",
        context: 'A tired young adult lies in bed at dawn beside a loud black alarm clock; narration lists three task groups to handle.',
        subject: 'Young adult photorealistic cutout lying in bed beside a large black alarm clock',
        action: 'Exhausted, staring at floating task papers scattered around',
        scene: 'Clean bright bedroom, pure white background, hybrid whiteboard collage',
        text_overlay:
            "'3 NGUYÊN LIỆU' + labels 'những điều bạn muốn làm', 'những điều bạn cần làm', 'xử lý việc không muốn & không cần'",
        mood: 'Slightly stressful self-help, high thumbnail energy',
        composition: 'One clear left-to-right flow, strong hierarchy, bright red accents on 1-2 keywords only',
        must_avoid: 'watermark, logo, dense text blocks, generic placeholders, neon glow UI',
    },
    collage_art: {
        purpose: 'Show the 3-ingredient rule as a vintage paper-cutout collage, hero as a magazine cutout.',
        context: 'A tired young adult lies in bed at dawn beside a black alarm clock; narration lists three task groups to handle.',
        subject: 'Young adult as large magazine-cutout with torn deckled paper edges beside a black alarm clock cutout',
        action: 'Lying exhausted among floating task-paper fragments',
        scene: 'Warm cream textured paper background, halftone dots, washi tape, layered overlapping paper fragments',
        text_overlay:
            "Title '3 NGUYÊN LIỆU' + labels 'những điều bạn muốn làm', 'những điều bạn cần làm', 'xử lý việc không muốn & không cần'",
        mood: 'Muted retro editorial, slightly stressful self-help',
        composition: 'Strong hierarchy, one clear visual flow, selective bright red accents on 1-2 keywords, paper grain',
        must_avoid: 'watermark, logo, neon glow UI, clean digital white-edge cutout, dense text',
    },
    vox: {
        purpose: "Documentary explainer board: cutout subject illustrates the beat's main idea clearly.",
        context: 'A tired young adult lies in bed at dawn beside a loud alarm clock; narration lists three task groups to handle.',
        subject: 'Photorealistic cutout of a tired young adult and a black alarm clock pinned on the explainer board',
        action: 'Cutout figures placed on the board, connected by thick marker strokes',
        scene: 'Clean light documentary explainer board background with faint coordinate grid and subtle bar-chart traces',
        text_overlay:
            "Callouts '3 NGUYÊN LIỆU', 'những điều bạn muốn làm', 'những điều bạn cần làm', 'xử lý việc không muốn & không cần'",
        mood: 'Muted documentary palette, calm informative',
        composition:
            'Thick black and bright red marker strokes connecting objects, arrows, question marks, circled emphasis, compact editorial',
        must_avoid: 'watermark, logo, neon glow UI, flat colorful vector fills, full-bleed photorealistic scene without cutouts, crime/courtroom/investigation imagery',
    },
    courtroom_sketch: {
        purpose: "Reportage-style illustration capturing the dramatic moment behind the beat's main idea.",
        context: 'A tired young adult caught in a tense early-morning moment; narration explains the 3-ingredient rule for handling tasks.',
        subject: 'Tired young adult caught mid-expression beside a black alarm clock and floating task papers',
        action: 'Dramatic pose, quick loose strokes, candid newsroom framing',
        scene: 'Sketch style, colored pencil / soft pastel / light watercolor on textured rough paper',
        text_overlay: "Short hand-written label '3 NGUYÊN LIỆU' and brief notes",
        mood: 'Gritty authentic, muted low-saturation, mysterious reportage',
        composition: 'Focal subject central or off-center dramatic, visible paper grain and sketchy hatching',
        must_avoid: 'clean digital render, photorealistic, neon saturated colors, flat vector cartoon, watermark',
    },
};

/** Bản escaped `\"` — dùng trong block text (LLM copy thẳng vào beat-map JSON). */
const escapeJsonQuotesForPrompt = (obj: Record<string, string>): string =>
    JSON.stringify(obj, null, 2).replace(/"/g, '\\"');

export const WHITEBOARD_HYBRID_IMAGE_PROMPT_EXAMPLE = escapeJsonQuotesForPrompt(WHITEBOARD_IMAGE_PROMPT_EXAMPLE_OBJECTS.hybrid);

export const WHITEBOARD_COLLAGE_IMAGE_PROMPT_EXAMPLE = escapeJsonQuotesForPrompt(
    WHITEBOARD_IMAGE_PROMPT_EXAMPLE_OBJECTS.collage_art,
);

export const WHITEBOARD_VOX_IMAGE_PROMPT_EXAMPLE = escapeJsonQuotesForPrompt(WHITEBOARD_IMAGE_PROMPT_EXAMPLE_OBJECTS.vox);

export const WHITEBOARD_COURTROOM_IMAGE_PROMPT_EXAMPLE = escapeJsonQuotesForPrompt(
    WHITEBOARD_IMAGE_PROMPT_EXAMPLE_OBJECTS.courtroom_sketch,
);

const WHITEBOARD_VIETNAMESE_TEXT_RULES = [
    '- **On-screen text tiếng Việt — BẮT BUỘC chính xác theo nội dung beat**:',
    '  - Lấy chữ từ ý/cụm trong `phrase_anchor` (hoặc lời thoại beat tương ứng); quote **đúng nghĩa**, có thể rút gọn ngắn để đọc được trên ảnh.',
    '  - Ví dụ GOOD: narration nói ba nguyên liệu là muốn làm / cần làm / xử lý việc không muốn cũng không cần → labels: `\'những điều bạn muốn làm\'`, `\'những điều bạn cần làm\'`, `\'xử lý việc không muốn & không cần\'` + title `\'3 NGUYÊN LIỆU\'`.',
    '  - Ví dụ BAD: `\'Nguyên liệu 1\'`, `\'Nguyên liệu 2\'`, `\'Bước 1\'`, `\'Item 1\'`, `\'Tip 1\'` — placeholder chung chung, **không** truyền nội dung.',
    '  - **Cấm** số thứ tự giả làm nội dung (`1/2/3`, `A/B/C`) khi narration đã nêu rõ từng ý.',
    '  - Chữ trên ảnh = bold hand-lettered marker; mỗi label ≤ ~8–12 từ; ưu tiên cụm sát nghĩa narration hơn slogan chung.',
];

const WHITEBOARD_COMMON_TAIL = (styleSuffix: string): string[] => [
    `- Style suffix gợi ý (append khi gửi sinh ảnh — KHÔNG nằm trong JSON): \`${styleSuffix}\`.`,
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

const IMAGE_PROMPT_JSON_FIELD_LINES = [
    '- **`purpose`**: mục đích ảnh trong video — ảnh này minh họa ý gì, đóng vai trò gì trong câu chuyện của beat.',
    '- **`context`**: hoàn cảnh beat — tóm tắt 1–2 câu từ `phrase_anchor`/lời thoại (người xem đang nghe nội dung gì) để ảnh khớp video.',
    '- **`subject`**: nhân vật / vật thể chính (English).',
    '- **`action`**: hành động / trạng thái (English).',
    '- **`scene`**: bối cảnh / nền (English).',
    '- **`text_overlay`**: chữ tiếng Việt trên ảnh — quote **chính xác** từ `phrase_anchor`, không placeholder.',
    '- **`mood`**: cảm xúc / tông màu (English).',
    '- **`composition`**: bố cục (English).',
    '- **`must_avoid`**: điều cấm — liệt kê ngắn (watermark, logo, chữ dày đặc, …).',
];

const buildImagePromptJsonRules = (example: string): string[] => [
    '- **`image_prompt` = JSON object** — bắt buộc đủ **9 key** dưới đây (không thêm bớt, không đổi tên):',
    ...IMAGE_PROMPT_JSON_FIELD_LINES.map((line) => `  ${line}`),
    '- Giá trị field: **English** (~5–25 từ / field), trừ `text_overlay` = label tiếng Việt.',
    '- `image_prompt` là field string trong beat-map JSON → **mọi dấu nháy kép bên trong phải escape `\\"`**; cấm nháy kép thô.',
    '- Ví dụ JSON image_prompt (đúng schema — escape nháy kép đúng):',
    '```json',
    example,
    '```',
];

const STYLE_SPEC: Record<WhiteboardGenStyle, { header: string; intro: string; rule: string; spec: string[]; banned: string }> = {
    hybrid: {
        header: 'Hybrid collage (bắt buộc)',
        intro: '- Clip đang ở chế độ **whiteboard**: mỗi beat dùng **ảnh hybrid whiteboard collage** — engine vẽ tay trên annotation trước, rồi reveal vùng ảnh thật/màu — không phải HTML motion.',
        rule: '- `image_prompt` (**JSON**): scene/subject mô tả **1 focal photorealistic cutout subject** + thick marker annotations + bold Vietnamese labels (style hybrid).',
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
        rule: '- `image_prompt` (**JSON**): scene/subject mô tả **1 focal magazine-cutout subject với torn/deckled paper edge** + thick marker annotations + bold Vietnamese labels (style collage).',
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
        header: 'Vox-style explainer / tài liệu giải thích (documentary, bắt buộc)',
        intro: '- Clip đang ở chế độ **whiteboard**: mỗi beat dùng **ảnh phong cách Vox-style** — cutout photo đóng vai **minh họa chủ đề** trên bảng giải thích; nét marker đen/đỏ nối các vật thể, mũi tên, dấu chấm hỏi, vùng khoanh tròn giải thích câu chuyện — không phải HTML motion.',
        rule: '- `image_prompt` (**JSON**): scene/subject mô tả **cutout subjects minh họa nội dung beat** + marker strokes (đen hoặc đỏ tươi) nối các vật thể + arrows / question marks / circled emphasis marks + faint grid / map / chart nền (style vox).',
        spec: [
            '  - Hero = 1–3 photorealistic cutout subject (person/object) minh họa nội dung beat — đặt rải trên nền sáng sạch, không full-bleed scene.',
            '  - Annotations = nét marker **đen hoặc đỏ tươi** nối các vật thể với nhau: mũi tên chỉ hướng, dấu chấm hỏi `?`, vùng khoanh tròn/underline nhấn mạnh dữ liệu — dày, expressive, không outline mảnh.',
            '  - Nền = lưới tọa độ (coordinate grid) mờ hoặc biểu đồ cột/đường in nhạt phía sau (subtle, không cướp tiêu điểm); nền là bảng giải thích sạch — **không** bối cảnh cảnh sát/tòa án/phòng điều tra.',
            '  - Typography = bold hand-lettered Vietnamese callouts + short labels; **1–2 từ duy nhất màu đỏ tươi**; còn lại đen.',
            '  - Composition = bố cục kiểu trang tài liệu giải thích chuyên sâu (documentary explainer board) — hierarchy mạnh, mật độ gọn, editorial thumbnail energy.',
        ],
        banned: '- **Cấm** flat colorful vector fills, neon glow UI, cluttered rainbow icons, watermark, logo, blurry, full-bleed photorealistic scene without cutouts, thin outline-only diagram, cartoon, cảnh điều tra/phá án/tòa án/cảnh sát (không liên quan chủ đề).',
    },
    courtroom_sketch: {
        header: 'Ký họa vẽ tay (Courtroom sketch style — kỹ thuật vẽ, bắt buộc)',
        intro: '- Clip đang ở chế độ **whiteboard**: mỗi beat dùng **ảnh ký họa vẽ tay** — bút chì màu / phấn màu pastel / màu nước nhạt trên giấy vân nhám, nét vẽ nhanh thô mộc, màu trầm, tập trung bắt trọn khoảnh khắc kịch tính — không phải HTML motion.',
        rule: '- `image_prompt` (**JSON**): scene/subject mô tả **hand-drawn reportage sketch** + colored pencil / soft pastel / light watercolor trên giấy vân nhám + nét vẽ nhanh loose + màu trầm muted + khoảnh khắc/biểu cảm kịch tính của nhân vật chính + bold Vietnamese label ngắn (style courtroom_sketch).',
        spec: [
            '  - Chất liệu = bút chì màu / phấn màu pastel / màu nước nhạt trên giấy có vân nhám (paper tooth) — không vector phẳng, không render kỹ thuật số sạch.',
            '  - Nét vẽ = nhanh, thô mộc, loose — bắt trọn khoảnh khắc và biểu cảm của nhân vật chính, không trau chuốt, mang tính phóng sự.',
            '  - Màu = trầm, bão hòa thấp (muted) — **cấm** màu neon, bảng màu rực rỡ.',
            '  - Bối cảnh = khung hình candid kiểu ký họa báo chí (reportage) — bối cảnh lấy theo **chủ đề của beat** (vd. giấc ngủ, đồng hồ báo thức, tờ nhiệm vụ).',
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

/** Luôn nối dòng phong cách image vào cuối prompt (bản gửi đi) — prompt có thể là JSON object string. */
export function appendBeatImageStyleSuffix(prompt: string, genStyle: string = 'hybrid'): string {
    const trimmed = String(prompt || '').trim();
    const suffix = beatImageStyleSuffix(genStyle);
    if (!trimmed) {
        return suffix;
    }
    // Prompt là JSON object → thêm key `style` vào TRONG JSON (không nối ngoài).
    try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return JSON.stringify({ ...parsed, style: suffix }, null, 2);
        }
    } catch {
        // Không phải JSON → fallback nối suffix sau dấu phẩy như cũ.
    }
    return `${trimmed.replace(/[, ]+$/u, '')}, ${suffix}`;
}

export function buildBeatDivisionWhiteboardImagePromptBlock(genStyle: string = 'hybrid'): string {
    const style = resolveWhiteboardGenStyle(genStyle);
    const spec = STYLE_SPEC[style];

    return [
        '## Whiteboard mode — `image_prompt` (JSON object, Duck.ai manual)',
        spec.intro,
        '- **`visual_description`**: WHAT/WHY cho editor/QA — English, ~40–60 words, semantic brief (giữ block creative hiện tại).',
        spec.rule,
        ...buildImagePromptJsonRules(IMAGE_PROMPT_EXAMPLE[style]),
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
        hybrid: '- `image_prompt`: **JSON object đủ 9 key** theo **Whiteboard mode — image_prompt** above; `context`/`purpose` lấy từ beat này\'s `phrase_anchor`; scene/subject theo hybrid whiteboard collage (photorealistic cutout hero + thick marker annotations, selective red accents); tổng ≤ ~400 từ; no watermark.',
        collage_art: '- `image_prompt`: **JSON object đủ 9 key** theo **Whiteboard mode — image_prompt** above; `context`/`purpose` lấy từ beat này\'s `phrase_anchor`; scene/subject theo collage art (magazine-cutout hero torn/deckled on cream paper, layered fragments); tổng ≤ ~400 từ; no watermark.',
        vox: '- `image_prompt`: **JSON object đủ 9 key** theo **Whiteboard mode — image_prompt** above; `context`/`purpose` lấy từ beat này\'s `phrase_anchor`; scene/subject theo vox-style (cutout subject minh họa nội dung beat + black/red marker strokes + arrows/question marks/circled emphasis + faint grid/chart, nền bảng giải thích sạch, **cấm** cảnh điều tra/tòa án); tổng ≤ ~400 từ; no watermark.',
        courtroom_sketch: '- `image_prompt`: **JSON object đủ 9 key** theo **Whiteboard mode — image_prompt** above; `context`/`purpose` lấy từ beat này\'s `phrase_anchor`; scene/subject theo courtroom sketch (**colored pencil/pastel/watercolor on rough paper** + loose strokes + muted colors + dramatic moment); **specific** Vietnamese label quotes từ `phrase_anchor` (no generic "Nguyên liệu 1/2/3"); tổng ≤ ~400 từ; no watermark.',
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
    // JSON thật (chưa escape) — JSON.stringify của prompt sẽ escape đúng 1 lần thành `\"` trong beat-map.
    return {
        image_prompt: JSON.stringify(
            WHITEBOARD_IMAGE_PROMPT_EXAMPLE_OBJECTS[resolveWhiteboardGenStyle(genStyle)],
            null,
            2,
        ),
    };
}
