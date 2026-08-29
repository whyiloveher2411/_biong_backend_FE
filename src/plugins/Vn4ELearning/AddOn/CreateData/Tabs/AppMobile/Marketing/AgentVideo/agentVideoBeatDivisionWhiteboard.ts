/** Mirror marketing_short_video_import_html_beat_division_whiteboard_image_prompt_block */

export const WHITEBOARD_HYBRID_STYLE_SUFFIX =
    'high-impact hybrid whiteboard collage, photorealistic cutout subject with white edge on pure white background, thick black marker annotations arrows scribbles underlines, bold Vietnamese hand-lettered headline, selective bright red accents on 1-2 keywords only, strong visual hierarchy, compact editorial thumbnail composition, no watermark';

export const WHITEBOARD_COLLAGE_STYLE_SUFFIX =
    'analog paper collage art on warm cream textured paper background, 1 focal magazine-cutout subject with torn deckled paper edges, layered overlapping photo fragments, halftone dots, washi tape strips, thick black marker annotations arrows scribbles underlines, bold vintage magazine headline typography, selective bright red accents on 1-2 keywords, muted retro palette, paper grain, strong hierarchy, compact editorial composition, no watermark';

export const WHITEBOARD_VOX_STYLE_SUFFIX =
    'Vox-style editorial journalism collage, photorealistic paper cutouts, layered documentary imagery, strong hierarchy, scale contrast, subtle red accents, minimal annotation';

export const WHITEBOARD_COURTROOM_STYLE_SUFFIX =
    'sketch style, hand-drawn reportage illustration in colored pencil soft pastel light watercolor on textured rough paper, quick loose dramatic strokes, muted low-saturation colors, gritty authentic atmosphere energy, focal subject caught mid-expression, visible paper grain and sketchy hatching, candid news framing, no watermark';

/**
 * Layout tách rời vật thể — append SAU style suffix (không thay phong cách, chỉ tách cluster để crop vùng chính xác).
 * Mirror DUCKAI_HAND_DRAWN_SUFFIX / METAAI_HAND_DRAWN_SUFFIX (extension) + PHP whiteboard_separated_layout_suffix().
 */
export const WHITEBOARD_SEPARATED_LAYOUT_SUFFIX =
    'editorial infographic layout, multiple separated visual elements, clear visual hierarchy, explainer composition, independent object clusters, large negative space between elements, designed for sequential reveal animation, visual journalism aesthetic, documentary infographic design';

/**
 * Gom nội dung về vùng trung tâm khi SINH ẢNH (không dùng ở bước chia beat) — chống việc cluster
 * bị dàn ra sát viền rồi đè lên motif trang trí của background khi ghép 2 lớp.
 * Mirror marketing_short_video_agent_whiteboard_central_safe_area_rule() (PHP) + extension.
 */
export const WHITEBOARD_CENTRAL_SAFE_AREA_RULE =
    'CENTRAL SAFE AREA (applies to BOTH images): compose everything inside the central 80% of the frame — ' +
    'leave a completely empty margin of at least 10% of the frame width and height on all four sides. ' +
    'In IMAGE 1 every object cluster and every text label MUST sit inside that central safe area, ' +
    'grouped toward the middle as one balanced centered composition; ' +
    'do NOT push clusters into the corners, do NOT spread them out to the borders, ' +
    'nothing may touch, overlap or cross the frame edges. ' +
    'Keep the gaps between clusters moderate — just wide enough to crop each cluster separately — ' +
    'instead of maximizing distance between them. ' +
    'In IMAGE 2 the decorative motifs stay in that outer margin and the corners, ' +
    'so they remain visible around the object layer and are never covered by IMAGE 1.';

/**
 * Bắt buộc AI trả ĐÚNG 2 ảnh mỗi beat: IMAGE 1 = object layer PNG alpha, IMAGE 2 = background plate.
 * Mirror DUCKAI_DUAL_LAYER_OUTPUT_RULE / METAAI_DUAL_LAYER_OUTPUT_RULE (extension)
 * + marketing_short_video_agent_whiteboard_dual_layer_output_rule() (PHP).
 */
export const WHITEBOARD_DUAL_LAYER_OUTPUT_RULE =
    'OUTPUT EXACTLY 2 SEPARATE IMAGES for this beat, in this order. ' +
    'IMAGE 1 (object layer): only the subject, the object clusters and the text labels described above, ' +
    'fully isolated on a TRANSPARENT background — export as PNG with a real alpha channel; ' +
    'if transparency is impossible, use pure solid white #FFFFFF instead; ' +
    'the area between and around the clusters must be 100% fully transparent alpha (or pure #FFFFFF), ' +
    'with NO partial or semi-transparent film at all: no glow, no halo, no rim light, no colored haze, ' +
    'no mist, no fog, no atmospheric tint, no gradient wash, no vignette, no soft light spill, ' +
    'no colored overlay, no drop shadow, no paper texture, no scenery, no environment, ' +
    'no background plate baked into this image; ' +
    'every cluster must have hard clean cut edges directly against transparency, ' +
    'each cluster separated by clear gaps but kept close to the middle, nothing bleeding to the frame edges. ' +
    'ALL on-screen text from "text_overlay" MUST be rendered inside IMAGE 1 only — split the labels apart, ' +
    'each label is its own independent cluster placed in a different area of the frame; ' +
    'IMAGE 2 must contain no text, no letters and no numbers at all. ' +
    'IMAGE 2 (background layer): a fully designed background plate in the exact style of this clip, ' +
    'following "background_prompt" — decorative motifs at the four CORNERS and along the EDGES and BORDERS ' +
    '(torn paper shreds, tape strips, halftone patches, ruled or graph lines, stamps, ink smudges, ' +
    'pencil hatching, frame borders — whichever fits the style), plus rich material texture across the whole frame; ' +
    'the CENTER stays low-contrast and calm (texture and faint motifs only) so the object layer above stays readable; ' +
    'a plain blank canvas or a flat empty color is an INVALID IMAGE 2; ' +
    'still NO subject, no hero, no organ, no molecule, no person, no meaningful icon, no arrow, no callout, ' +
    'no text, no letters, no numbers. ' +
    'Both images MUST share the exact same aspect ratio and framing so IMAGE 1 can be layered over IMAGE 2. ' +
    `${WHITEBOARD_CENTRAL_SAFE_AREA_RULE} ` +
    'Returning only 1 image is an INVALID response — regenerate until both images are provided.';

/** 7 key bắt buộc của image_prompt JSON — đồng bộ validation agentVideoBeatMap + PHP import-html-helper. */
export const WHITEBOARD_IMAGE_PROMPT_JSON_KEYS = [
    'subject',
    'action',
    'scene',
    'text_overlay',
    'composition',
    'must_avoid',
    'background_prompt',
] as const;

export type WhiteboardImagePromptJsonKey = (typeof WHITEBOARD_IMAGE_PROMPT_JSON_KEYS)[number];

/**
 * Key bắt buộc khi ĐỌC beat-map — `background_prompt` optional để beat-map cũ (6 key) vẫn render được
 * (engine fallback derive nền từ `scene`). Beat-map mới do AI trả phải đủ 7 key.
 */
export const WHITEBOARD_IMAGE_PROMPT_LEGACY_REQUIRED_KEYS = WHITEBOARD_IMAGE_PROMPT_JSON_KEYS.filter(
    (key) => key !== 'background_prompt',
);

/** Nguồn duy nhất của ví dụ image_prompt (mỗi style) — dẫn xuất cả 2 bản: escaped (block text) + raw JSON (schema example). */
const WHITEBOARD_IMAGE_PROMPT_EXAMPLE_OBJECTS: Record<WhiteboardGenStyle, Record<WhiteboardImagePromptJsonKey, string>> = {
    hybrid: {
        subject: 'Photorealistic cutout of a liver with clogged fat deposits beside ethanol molecules',
        action: 'Fat droplets accumulating inside the liver tissue',
        scene: 'Clean light explainer board, pure white background, hybrid whiteboard collage',
        text_overlay: 'GAN NHIỄM MỠ',
        composition: 'One clear left-to-right flow, strong hierarchy, bright red accents on 1-2 keywords only',
        must_avoid: 'watermark, logo, dense text blocks, generic placeholders, neon glow UI',
        background_prompt:
            'Designed whiteboard background plate: off-white board with paper grain, marker-drawn frame border and corner scribble motifs, faint grid patch and tape strips at the corners, calm low-contrast center, no objects, no text',
    },
    collage_art: {
        subject: 'Liver as a large magazine-cutout with torn deckled paper edges beside an ethanol molecule cutout',
        action: 'Damaged DNA strand fragments drifting apart as the liver decays',
        scene: 'Warm cream textured paper background, halftone dots, washi tape, layered overlapping paper fragments',
        text_overlay: 'GAN NHIỄM MỠ',
        composition: 'Strong hierarchy, one clear visual flow, selective bright red accents on 1-2 keywords, paper grain',
        must_avoid: 'watermark, logo, neon glow UI, clean digital white-edge cutout, dense text',
        background_prompt:
            'Designed analog collage background plate: warm cream kraft paper, torn paper shreds and washi tape strips at the corners and edges, faded halftone patches along the border, heavy paper grain, calm low-contrast center, no cutouts, no text',
    },
    vox: {
        subject: 'Photorealistic cutout of a human liver surrounded by layered documentary photo fragments',
        action: 'Fat deposits accumulating inside liver tissue, highlighted by a few clean marker strokes',
        scene: 'Editorial documentary composition: textured magazine-cream background, cropped photo fragments, depth, generous negative space',
        text_overlay: 'GAN NHIỄM MỠ',
        composition:
            'Editorial layered composition, strong hierarchy, scale contrast, cropped photo fragments, magazine-cream texture, depth',
        must_avoid: 'watermark, logo, dense text, grid, chart, question marks, circled emphasis, blood, gore, corpse, injury, accident, whiteboard, classroom board, sketchnote, presentation slide, isolated sticker cutout',
        background_prompt:
            'Designed editorial documentary background plate: magazine-cream textured paper, blurred cropped photographic strips along the edges, halftone corner patches and thin rule lines framing the frame, subtle vignette, calm low-contrast center, no objects, no text',
    },
    courtroom_sketch: {
        subject: 'Human liver caught mid-degeneration beside floating fat cells and DNA strands',
        action: 'Fatty tissue build-up, quick loose strokes, candid reportage framing',
        scene: 'Sketch style, colored pencil / soft pastel / light watercolor on textured rough paper',
        text_overlay: 'GAN NHIỄM MỠ',
        composition: 'Focal subject central or off-center dramatic, visible paper grain and sketchy hatching',
        must_avoid: 'clean digital render, photorealistic, neon saturated colors, flat vector cartoon, watermark',
        background_prompt:
            'Designed hand-drawn background plate: rough textured paper with visible tooth, loose pencil hatching and muted watercolor washes bleeding in from the corners and edges, sketchy border strokes, calm low-contrast center, no characters, no objects, no text',
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

/** Rule ngôn ngữ chữ trên ảnh — mirror backend marketing_short_video_agent_image_text_lang_rule_block. */
export function imageTextLangRuleBlock(imageTextLang = 'vi'): string[] {
    const lang = normalizeImageTextLang(imageTextLang);
    const lines = [
        '## TEXT OVERLAY (source of truth duy nhất)',
        '- **BẮT BUỘC nhiều chữ (TEXT-RICH)**: mỗi beat phải có **3–6 label** nối bằng `|` — mục tiêu để người xem **vừa xem vừa đọc**; `""` chỉ dùng khi beat thực sự không có nội dung đọc được (vd beat chỉ có tiếng động).',
        lang === 'en'
            ? '- Mỗi label **1–5 từ**, tổng khoảng **8–20 từ** (vd `"FATTY LIVER | FAT BUILD-UP | INFLAMMATION | SCAR TISSUE"`), bold hand-lettered, viết bằng tiếng Anh.'
            : '- Mỗi label **1–5 từ**, tổng khoảng **8–20 từ** (vd `"GAN NHIỄM MỠ | MỠ TÍCH TỤ | VIÊM GAN | MÔ XƠ HÓA"`), in đậm viết tay, viết đúng tiếng Việt có dấu.',
        '- **Label 1** = keyword chính trích từ `phrase_anchor`. **Các label sau ĐƯỢC LÀM GIÀU**: tên cơ chế, thuật ngữ chuyên môn, giai đoạn, hệ quả, đối tượng bị ảnh hưởng — miễn là **liên quan trực tiếp** nội dung beat và **làm rõ thêm** điều lời thoại đang nói.',
        '- **CẤM BỊA SỐ LIỆU**: chỉ được viết số / phần trăm / đơn vị khi con số đó **có mặt trong `phrase_anchor`** (vd anchor nói "740,000 ca" → được dùng "740.000 CA"); anchor không có số → **cấm** tự sinh số, tỉ lệ, năm, liều lượng.',
        '- Không được thêm **entity mới không liên quan** (bệnh / cơ quan / cơ chế của beat khác); adjacent beat chỉ làm context — vd beat "Điều này làm mọi thứ trở nên tệ hơn", adjacent "Cancer develops" → KHÔNG được sinh "UNG THƯ" cho beat này.',
        '- Transition beats (vd "Nói cách khác") → label tóm tắt core idea + các label làm rõ ý đang chuyển sang.',
        '- CTA beat cuối: chỉ bookmark / save keyword (giữ ngắn, không cần đủ 3 label).',
        '- Cấm lặp **nguyên khối** text_overlay giữa 2 beat liền kề; label trùng lẻ được phép nếu phần còn lại khác nhau.',
        '- Cấm lặp lại **nguyên văn cả câu thoại** (label là từ khóa, không phải phụ đề).',
        '- Cấm `\n`, dấu phẩy **bên trong 1 label**, list đánh số `1/2/3`, câu dài kiểu subtitle.',
        '- **Mỗi label là 1 cluster chữ riêng** trong IMAGE 1, đặt ở vùng khác nhau của khung, tách rời nhau bằng khoảng trống (khớp OBJECT SEPARATION) — cấm dồn hết chữ thành một khối.',
    ];
    return lines;
}

/** Normalize ngôn ngữ chữ trên ảnh — mirror backend marketing_short_video_agent_normalize_image_text_lang. */
export function normalizeImageTextLang(raw: unknown): 'vi' | 'en' {
    const value = String(raw || '').trim().toLowerCase();
    return value === 'en' || value === 'english' ? 'en' : 'vi';
}

/** Chuyển chuỗi prompt sang ngôn ngữ chữ trên ảnh — mirror backend marketing_short_video_agent_apply_image_text_lang. */
export function applyImageTextLang(text: string, imageTextLang = 'vi'): string {
    const lang = normalizeImageTextLang(imageTextLang);
    if (lang !== 'en') {
        return text;
    }
    const replacements: Record<string, string> = {
        'tiếng Việt': 'English',
        'Vietnamese': 'English',
        '3 NGUYÊN LIỆU': '3 INGREDIENTS',
        'những điều bạn muốn làm': 'things you want to do',
        'những điều bạn cần làm': 'things you need to do',
        'xử lý việc không muốn & không cần': 'handle what you don\'t want & don\'t need',
        'những điều bạn không muốn & không cần': 'handle what you don\'t want & don\'t need',
    };
    let out = String(text || '');
    for (const [from, to] of Object.entries(replacements)) {
        out = out.split(from).join(to);
    }
    return out;
}

/** Rule ngôn ngữ cho bản gửi đi sinh ảnh — mirror backend text_language trong append_beat_image_style_suffix. */
export function imageTextLangSuffixRule(imageTextLang = 'vi'): string {
    return normalizeImageTextLang(imageTextLang) === 'en'
        ? 'on-screen text must be English only, render 3-6 separate short labels of 1-5 keyword words each, spread apart as independent text clusters, all directly related to the beat voiceover, no gibberish letter sequences, no invented numbers'
        : 'chữ trên ảnh phải đúng tiếng Việt có dấu, text_overlay = 3–6 label ngắn (mỗi label 1–5 từ, nối bằng |) vẽ thành các cụm chữ tách rời nhau, keyword và thuật ngữ làm rõ lời thoại beat, cấm chuỗi ký tự vô nghĩa, cấm bịa số liệu';
}

const WHITEBOARD_COMMON_TAIL = (styleSuffix: string): string[] => [
    `- Style suffix gợi ý (append khi gửi sinh ảnh — KHÔNG nằm trong JSON): \`${styleSuffix}\`.`,
    '- **SUBJECT PRIORITY — 1 cây quyết định duy nhất (thay mọi rule cũ)**:',
    '  0. **STATISTICAL PRECEDENCE**: nếu **main claim là số liệu** (quantity, percentage, population count, rate, risk ratio, prevalence — vd "740,000 cancer cases were linked to alcohol", "2 billion drinkers", "1 in 8 deaths", "31% risk increase") → **subject MUST visualize the quantity itself**, **KỂ CẢ khi entity sinh học được nhắc** (vd có "cancer" nhưng vẫn subject = highlighted population cluster, not cancer cells); beat có cả cơ chế + số liệu → số liệu là main claim khi nó chiếm phần lớn ý nghĩa beat. **When a statistic refers to an outcome population** (vd "31% higher breast cancer risk") → visualize **affected population** (breast cancer population cluster) — **NOT percentage graphic alone** ("31% infographic"), **NOT** entity cô lập (breast cancer cell). **Statistical precedence OVERRIDES Subject Substitution Check** — khi bước 0 áp dụng, subject MAY represent the affected population thay vì biological entity itself. Subject của statistical beat MUST là **concrete visible aggregation** — VALID: human icon population cluster / highlighted subgroup within a crowd / comparison group of human silhouettes; **INVALID**: statistics graphic, infographic percentage, abstract population visualization, "group of people" chung chung.',
    '  1. **If [A] acts on [B]** (vd "Acetaldehyde damages DNA") → **subject = B** (supporting MAY be A).',
    '  - **Causal chain precedence**: chuỗi cause → damaged target → consequence → **subject = entity được mô tả trong CURRENT clause** — **không phải upstream cause, không phải downstream consequence**, trừ khi statistical precedence (bước 0) áp dụng. Vd "DNA mutations increase cancer risk" → subject = **mutated DNA** (current clause), KHÔNG phải cancer cell (consequence) hay risk population (downstream).',
    '  - **Epidemiological claims override biological entity preference**: nếu sentence chủ yếu mô tả **risk / prevalence / incidence / mortality / affected population** (vd "People who drink heavily are more likely to get liver cancer") → subject = **affected population visualization** (population cluster với highlighted liver cancer subgroup), KHÔNG phải liver cancer cells — kể cả khi không có con số cụ thể.',
    '  2. **Else if multiple entities** (vd "DNA, proteins and cell membranes are damaged") → chọn **entity được nhấn mạnh nhất**; bằng nhau → **entity bị ảnh hưởng cuối**; **cấm 3 hero ngang hàng**.',
    '  3. **Else if 1 entity** (DNA, neuron, liver, heart, acetaldehyde…) → **subject = entity đó** — **Human subjects INVALID** khi entity sinh học được nhắc (cấm thay bằng "người uống rượu/người bệnh").',
    '  4. **Else** (không có entity hữu hình) → áp dụng **Visual taxonomy** (xem bên dưới).',
    '  - **`subject` MUST directly represent the entity** (biểu diễn trực tiếp, không nhất thiết lặp đúng từ) — vd "DNA mutations accumulate" → "damaged DNA strand", "chromosome segment containing DNA mutations", "mutated cell nucleus" đều hợp lệ; thay bằng human/patient/drinker/body silhouette/cơ quan khác là **INVALID**.',
    '  - **GENERIC SUBJECT BAN**: trừ khi `phrase_anchor` nhắc rõ, subject MUST NOT là: generic doctor, generic patient, generic sick person, generic businessman, generic woman/man, generic hospital scene, generic alcohol drinker — chọn entity/cơ chế thực tế được mô tả.',
    '  - **BAN vague placeholders**: cấm subject dạng `scientific illustration of...`, `conceptual representation of...`, `symbolic depiction of...`, `visualization of...` — subject MUST be a **concrete visible object, organ, cell, molecule, population cluster, hoặc physical metaphor** (vd subject = "damaged DNA strand", "liver with fatty deposits", "neuron network", "human icon population cluster").',
    '  - **Hero = 1 primary subject** — có thể kèm **tối đa 1 supporting causal element** khi cần rõ khoa học (vd "Acetaldehyde destroys DNA" → primary = DNA strand, supporting = acetaldehyde molecule).',
    '  - **Contextual elements 1–3 (Vox feel — KHUYẾN KHÍCH, giới hạn 3)**: bên cạnh hero được phép **1–3 contextual elements** (organ silhouettes, warning layers, population icons, related objects, background shapes) để tạo **depth + scale contrast + storytelling layout** — vd beat "gây hàng loạt căn bệnh ung thư" → giant cancer cell (hero) + 1–2 organ silhouettes + red warning layer. Contextual elements **KHÔNG được thành second focal** — nhỏ hơn, mờ hơn, chỉ phụ trợ hero; **cấm quá 3** (tránh infographic đông đúc).',
    '  - **Supporting element must NOT become a second focal subject** — nếu sự chú ý của người xem bị chia giữa 2 vật thể → prompt INVALID; supporting chỉ hiện diện nhỏ/phụ trợ, không được nổi bật bằng primary.',
    '  - **Title context rule**: title CHỈ dùng để **giải quyết sự mơ hồ** — **KHÔNG BAO GIỜ** thay subject của beat bằng subject của title (vd title "Alcohol is AMAZING", beat "740,000 cancer cases" → subject = số liệu/crowd, không phải "cancer patients" chung chung); title cung cấp causal context, không quyết định subject. **The title must NEVER introduce visual entities** — title "Alcohol is AMAZING" không được kéo chai rượu / ly bia / người uống vào beat nào; **CHỈ nội dung beat hiện tại quyết định subject selection**.',
    '  - **Action relevance**: `action` = sự kiện/quá trình/thay đổi chính; **cấm** generic (placed on board, displayed, shown, floating, standing, pinned). **Nếu beat không ngầm chứa action** (vd beat chỉ có "Gan." / "Não.") → `action` MAY mô tả **current visible state của subject** (vd "liver with normal lobular structure"), **cấm bịa quá trình không có trong beat** (vd "liver undergoing metabolic stress" khi beat không nói).',
    '  - **Scene relevance rule**: `scene` **MUST directly support the subject** — nếu subject là DNA/neuron/liver/cell → scene **KHÔNG được** là hospital, doctor office, patient room, hoặc generic healthcare environment; **prefer editorial documentary composition** (layered cutout scene với hierarchy + depth, KHÔNG bảng trắng thuần). **Statistical beats**: scene MUST remain **editorial documentary environment** — hospitals, clinics, doctor offices, waiting rooms và patient rooms là **INVALID** trừ khi được nhắc rõ trong `phrase_anchor`.',
    '  - **DUAL LAYER SCOPE (BẮT BUỘC — đọc TRƯỚC mọi rule composition)**: mỗi beat được sinh thành **2 ảnh**: **IMAGE 1** = object layer (chỉ subject + object clusters + label chữ, nền TRONG SUỐT) và **IMAGE 2** = background plate (mô tả trong `background_prompt`) — **IMAGE 2 KHÔNG phải nền trống**: phải có **motif trang trí ở 4 góc + dọc viền** và chất liệu texture đúng phong cách clip, riêng **vùng trung tâm giữ nhạt/low-contrast** để object layer đè lên vẫn đọc được. Mọi rule về `scene`, EDITORIAL SCENE PRECEDENCE, COMPOSITION HIERARCHY, CUTOUT INTEGRATION đều áp cho **ẢNH GHÉP CUỐI (IMAGE 1 đè lên IMAGE 2)** — **KHÔNG** áp cho từng ảnh rời; vì vậy IMAGE 1 là các cutout rời trên nền trong suốt vẫn **HỢP LỆ**, và IMAGE 2 không có hero vẫn **HỢP LỆ**.',
    '  - **IMAGE 1 ALPHA PURITY (BẮT BUỘC — engine cắt vùng theo alpha)**: vùng giữa và quanh các cluster của IMAGE 1 phải **trong suốt 100%** (hoặc trắng tinh #FFFFFF) — **cấm** mọi lớp màu mờ bán trong suốt: glow, halo, rim light, colored haze/mist/fog, atmospheric tint, gradient wash, vignette, soft light spill, colored overlay, drop shadow, paper texture, background plate bị nướng sẵn vào ảnh; mép mỗi cluster phải **cắt sắc nét** trực tiếp trên nền trong suốt.',
    '  - **OBJECT SEPARATION (BẮT BUỘC — để engine crop từng vùng chính xác)**: trong IMAGE 1 các cluster vật thể/label **phải tách rời nhau bằng khoảng trống lớn** — cấm chồng lấn, cấm dính liền, cấm chạm biên frame; mỗi cluster là một khối độc lập có thể reveal tuần tự; **mỗi label chữ cũng là một cluster riêng**, đặt ở vùng khác nhau của khung.',
    '  - **EDITORIAL SCENE PRECEDENCE (BẮT BUỘC)**: mỗi `scene` MUST chứa **ít nhất HAI** trong ba lớp sau: ① **documentary environment HOẶC contextual imagery**; ② **layered photographic fragments**; ③ **textured magazine background**; **pure white empty background là INVALID**; **floating object trên blank canvas là INVALID** (scene chỉ ghi "textured magazine background" đơn lẻ là CHƯA ĐỦ).',
    '  - **COMPOSITION HIERARCHY RULE**: hero subject nên chiếm **khoảng 50–70% visual attention**; **tránh centered symmetry** — ưu tiên **asymmetrical editorial layout** với một dominant focal area (hero lệch tâm, context bao quanh).',
    '  - **CUTOUT INTEGRATION RULE**: hero cutout **MUST visually interact** với background layers, contextual fragments hoặc supporting elements (đè lên mảnh ảnh, xuyên qua layer, nối với context) — **isolated floating stickers là INVALID**.',
    '  - **Subtle annotation layer allowed (SECONDARY — rule duy nhất về annotation)**: tối đa **0–1 arrow, 0–1 callout, maximum 2 marker strokes** (đen hoặc đỏ tươi) — nếu không cần thì bỏ hẳn; không nơi nào khác trong prompt mô tả annotation.',
    '- **STYLE PRIORITY (HARD RULE — khi bất kỳ instruction xung đột)**: ① Editorial journalism collage ② Documentary storytelling ③ Information hierarchy ④ Photographic cutout composition ⑤ Annotation layer — **Annotation NEVER được trở thành defining visual style**; không instruction nào về annotation/overlay được ưu tiên hơn editorial composition.',
    '  - **Beat rất ngắn (<1.5s)**: chỉ capture **core entity/state** — action có thể là **static state** (không cần quá trình dài), **no supporting element required**, action ≤12 từ; **`visual_description` = 1 câu duy nhất**, subject = entity/state only, **no causal chain**, no secondary explanation.',
    '  - **Abstract concept** (không có entity trực tiếp): chuyển thành ẩn dụ vật lý (risk → warning symbol approaching organ; dependence → chained brain; memory loss → missing puzzle pieces; decline → fading neuron network; vulnerability → cracked shield). **Ẩn dụ CHỈ khi beat không có entity hữu hình trực tiếp** — có entity thì bắt buộc dùng entity.',
    '  - **ABSTRACT BEAT RULE (hypothetical statement)**: khi `phrase_anchor` chỉ chứa mệnh đề giả định (vd "Nếu chất này mới được phát minh ra hôm nay, chắc chắn nó sẽ bị cấm toàn cầu") → subject MAY visualize **central proposition itself** (dùng generic objects trực tiếp được ngụ ý bởi câu — chemical bottle, prohibition symbol…) — nhưng **MUST NOT introduce institutions, authorities hoặc enforcement mechanisms không được nhắc rõ** (cấm government building, police, ban sign official, judge, law document).',
    '- **Visual taxonomy — chọn CÁCH MINH HỌA (không thay subject)**: ① **causal mechanism (cause → effect)** — rất phổ biến, vd "Acetaldehyde damages DNA": subject = entity bị ảnh hưởng (DNA), supporting = cause (acetaldehyde molecule), mũi tên causal lớn + annotation; không nhất thiết phải là macro khoa học — có thể trừu tượng hóa (biểu tượng cause → mũi tên → entity đích); ② **scientific** → macro/phân tử/mũi tên quá trình, hero = entity trong beat; ③ **organ** → chính cơ quan đó, góc nhìn rõ; ④ **statistical / number-heavy** → **subject = visualization of quantity itself** — vd "2 billion drinkers" → human icon aggregation; "740k cancer cases" → highlighted cancer-case population cluster; "1 in 8 deaths" → shrinking survival comparison group; **NOT** single sad person / doctor / patient portrait; ⑤ **social** → cảnh xã hội có chủ thể rõ; ⑥ **CTA** → bookmark/notebook/save symbol/community illustration, **cấm** platform branding.',
    '  - **Statistical anti-repetition**: các statistical beat **liên tiếp** → **đa dạng hóa cách minh họa quy mô** giữa các beat (population cluster / human icon aggregation / shrinking comparison group / highlighted subgroup) — không lặp y hệt "crowd" mọi beat. **3 statistical beat liên tiếp MUST dùng different population structures** — vd beat 41 "740,000 cancer cases" → population cluster; beat 42 "2 billion drinkers" → human icon aggregation; beat 43 "1 in 8 deaths" → shrinking comparison cohort.',
    '- **Continuity**: chuỗi cơ chế liên tục (ethanol → acetaldehyde → DNA damage → mutation → cancer) → **cùng visual language + causal chain, cảm giác 1 chuỗi tiến hóa**; **Continuity affects ONLY: color language, annotation style, causal direction**; **Continuity NEVER affects: subject selection, text_overlay selection** — **subject selection luôn xảy ra trước**; repeated subject được phép khi biological stage thay đổi; yêu cầu unique chỉ áp cho tổ hợp subject + action + scene giống hệt nhau.**Anti-redundancy**: cùng entity trải qua **nhiều beat liên tiếp** → giữ entity nhưng **mỗi beat show một stage / condition / consequence khác** — vd DNA normal → DNA damaged → DNA mutation → DNA replication error → cancerous cell (không lặp "DNA" y hệt 5 beat); vd liver normal → fat → inflammation → fibrosis → cirrhosis. **Subject stage check (machine-checkable)**: nếu cùng entity xuất hiện ở beat liên tiếp → `subject` MUST **visibly reflect current stage** — INVALID: DNA damage / DNA mutation / DNA replication error đều sinh "damaged DNA strand"; VALID: DNA damage → broken DNA strand; DNA mutation → mutated chromosome segment; DNA replication error → chromosome replication mismatch.',
    '  - **Subject Entity Leakage — CẤM**: subject selection **MUST được thực hiện độc lập cho TỪNG beat TRƯỚC khi xét continuity**; continuity chỉ ảnh hưởng **color language, annotation style, causal flow** — **never override subject selection**. **Cấm kéo subject từ beat trước sang beat sau**: vd chuỗi Acetaldehyde → DNA damage → Mutation → Cancer → beat Mutation **MUST có subject = mutated DNA** (không phải acetaldehyde molecule từ beat trước), beat Cancer **MUST có subject = cancer cells/tumor** (không phải DNA).',
    '- **Cấm**: generic stock photo (doctor pointing/smiling, patient sitting, business handshake, man looking sad, person drinking beer), metaphor sai ngữ cảnh (broken clock, cracked glass, dark cloud cho beat số liệu), khoa học viễn tưởng (fantasy energy, magic glow, sci-fi beams, fictional anatomy), logo/watermark/chữ dày đặc.',
    '- **Nội dung phải khớp CHÍNH XÁC với beat**: `subject`, `action`, `scene`, `text_overlay`, `composition` đều bắt nguồn từ ý trong `phrase_anchor`/lời thoại của beat này — **cấm** tự bịa chủ thể, cảnh, số liệu hoặc ví dụ không có trong beat.',
    '- **Ví dụ JSON trong prompt CHỈ demo schema** — **CẤM** reuse `subject`, `action`, `scene`, `text_overlay` từ ví dụ **trừ khi beat của bạn thực sự nói về đúng nội dung đó**; mỗi beat phải có visual riêng theo đúng nội dung của nó.',
    '- **Hình ảnh thân thiện mọi lứa tuổi (người xem 12+) — CẤM TUYỆT ĐỐI hình ảnh thực rùng rợn**: máu, thi thể / xác chết, tai nạn thảm khốc, vết thương hở, bạo lực đẫm máu, tự hại. Nếu ý beat cần diễn tả hậu quả nghiêm trọng / nguy hiểm / mất mát → dùng **hình tượng trưng**: biểu tượng cảnh báo (màu đỏ), mây đen u ám, ly / đồng hồ vỡ tan, nhân vật buồn gục đầu, vật thể vỡ vụn, tông màu tối trầm — **không bao giờ** máu / thương tích / thi thể thực.',
    '- **TEXT OVERLAY** — tuân thủ block `## TEXT OVERLAY (source of truth duy nhất)` bên trên: **3–6 label** nối `|` (mỗi label 1–5 từ), label đầu là keyword từ `phrase_anchor`, các label sau làm rõ thuật ngữ/cơ chế/hệ quả, **cấm bịa số liệu** (chỉ dùng số có trong `phrase_anchor`), không lặp nguyên khối với beat liền kề.',
    '  - **Beat CTA cuối — CTA lockdown**: bookmark/notebook/save symbol/community illustration; **cấm** YouTube/TikTok logo, Subscribe/Like button, platform branding; kế thừa motif beat trước.',
    '- **Primary subject: 1, Supporting element: max 1, Contextual elements: 1–3 (Vox feel)** — **Beat complexity scaling**: **≤2s** → hero + 0–1 contextual element, annotation tối thiểu, **2–3 label**, action ≤12 từ; **2–5s** → hero + 1–2 contextual elements, tối đa 1 supporting element, 0–1 arrow, **3–4 label**; **>5s** → hero + 2–3 contextual elements, 1 supporting element, 0–1 arrow, **4–6 label**.',
    '- `composition` ưu tiên bố cục đơn giản, một luồng nhìn rõ, nhiều khoảng trống; loại bỏ chi tiết thừa trước khi render.',
    '- **`must_avoid` MUST include đầy đủ danh sách dưới, nên bắt đầu bằng đúng danh sách** (mỗi item cách nhau `, ` — dấu phẩy + space): `watermark, logo, dense text, grid, chart, question marks, circled emphasis, blood, gore, corpse, injury, accident` — sau đó append thêm nếu cần; **cấm** bỏ sót item, **cấm** bọc "avoid" (vd `"avoid gore"`), **cấm** viết lệch chữ, **cấm** dùng separator khác (vd `;`, dấu phẩy không space).',
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
    '- **`subject`**: nhân vật / vật thể chính — đủ cụ thể để nhận diện (English, ~5–25 từ).',
    '- **`action`**: hành động / trạng thái của chủ thể (English, ~5–25 từ).',
    '- **`scene`**: bối cảnh / nền (English, ~5–25 từ).',
    '- **`text_overlay`** — **3–6 label nối bằng `|`, mỗi label 1–5 từ** (vd `"GAN NHIỄM MỠ | MỠ TÍCH TỤ | VIÊM GAN | MÔ XƠ HÓA"`); label đầu là keyword từ `phrase_anchor`, các label sau làm rõ thuật ngữ/cơ chế/hệ quả; **cấm** `\n`, dấu phẩy bên trong 1 label, list, câu dài kiểu phụ đề, **cấm bịa số liệu** (xem "TEXT OVERLAY" bên dưới).',
    '- **`composition`**: bố cục + tông màu/cảm xúc (English, ~5–25 từ).',
    '- **`must_avoid`**: điều cấm — liệt kê ngắn (watermark, logo, chữ dày đặc, …).',
    '- **`background_prompt`**: mô tả **background plate CÓ TRANG TRÍ** cho IMAGE 2 (English, ~10–30 từ) — **đúng chất liệu/bản sắc của style clip** + **motif trang trí ở 4 góc và dọc viền** (mảnh giấy xé, washi tape, halftone patch, đường kẻ, stamp, vệt mực, nét hatching, khung viền) + texture phủ toàn khung; **vùng trung tâm giữ nhạt/low-contrast** để object layer đè lên vẫn đọc được; **cấm nền trắng trơn / nền phẳng trống**; **cấm** subject/hero, cơ quan, phân tử, nhân vật, icon có nghĩa, mũi tên, callout, chữ, số.',
];

const buildImagePromptJsonRules = (example: string): string[] => [
    '- **`image_prompt` = JSON object THẬT** trong beat-map (KHÔNG phải string escape) — bắt buộc đủ **7 key** dưới đây (không thêm bớt, không đổi tên):',
    ...IMAGE_PROMPT_JSON_FIELD_LINES.map((line) => `  ${line}`),
    '- **Cấm** thêm các key khác (purpose/context/mood/style/aspect/text_language/voice_content/safe_area/policy_safe/output_images) — engine tự chèn style, tỉ lệ khung hình, rule ngôn ngữ, lời thoại beat (voice_content), safe-area và rule xuất 2 ảnh (output_images) khi gửi sinh ảnh; AI chỉ viết 7 key trên.',
    '- **CẤM placeholder viết tắt**: mỗi field phải là câu/cụm mô tả đầy đủ (tối thiểu ~2–3 từ, không phải 1 chữ cái như `D`, `C`, `M`, `B`); `text_overlay` phải là label trọn cụm từ trong `phrase_anchor`, **cấm** cắt cụt 1 từ (vd `Mục`), **cấm** 1 ký tự.',
    '- Ví dụ JSON image_prompt (object thật — KHÔNG escape, KHÔNG bọc trong string):',
    '```json',
    example,
    '```',
];

const STYLE_SPEC: Record<WhiteboardGenStyle, { header: string; intro: string; rule: string; spec: string[]; banned: string }> = {
    hybrid: {
        header: 'Hybrid collage (bắt buộc)',
        intro: '- Clip dùng **hybrid editorial collage** (Vox-style documentary + annotation tay): mỗi beat là **editorial documentary composition** — photographic cutout + layered fragments + hierarchy + vài nét marker annotation (engine vẽ tay trước, reveal vùng ảnh thật sau) — không phải HTML motion, không phải bảng trắng trống đơn điệu.',
        rule: '- `image_prompt` (**JSON**): scene/subject mô tả **1 focal photorealistic cutout subject** + editorial layered composition + thick marker annotations + bold Vietnamese labels (style hybrid).',
        spec: [
            '  - Hero = photorealistic cutout (person/object) with clean white edge — **editorial focal** trong layered composition có depth (drop shadows, cropped fragments), không vật thể trôi trên nền trắng.',
            '  - Annotations = thick expressive black marker (secondary — xem Subtle annotation layer bên dưới): arrows, scribbles, underlines, emphasis marks, icons.',
            '  - Typography = bold hand-lettered, **3–6 label, mỗi label 1–5 từ**, đặt tách rời nhau quanh khung; **1–2 keywords in bright red** only; rest black.',
            '  - Composition = **editorial documentary layout**: strong hierarchy, scale contrast, layered collage, one clear visual flow (e.g. left-to-right), compact density — editorial YouTube-thumbnail energy, not a calm textbook diagram.',
            '  - Solid black graphic props OK (clock, brush bars, stamps) when they support the hook.',
        ],
        banned: '- **Cấm** flat colorful cartoon fills, neon glow UI, cluttered rainbow icons, photoreal full-bleed backgrounds (subject must be cutout on white).',
    },
    collage_art: {
        header: 'Collage Art / Magazine Cutout (bắt buộc)',
        intro: '- Clip dùng **Collage Art / Magazine Cutout**: mỗi beat dùng **ảnh collage giấy cắt tay** — magazine-cutout hero mép giấy rách/torn-deckled, nền giấy cream/kraft texture, halftone dots, washi tape, typography báo vintage — không phải HTML motion.',
        rule: '- `image_prompt` (**JSON**): scene/subject mô tả **1 focal magazine-cutout subject với torn/deckled paper edge** + thick marker annotations + bold Vietnamese labels (style collage).',
        spec: [
            '  - Nền = **giấy cream/kraft texture** (analog paper collage / scrapbook) — **không** nền trắng tinh, không ảnh full-bleed.',
            '  - Hero = **cutout từ tạp chí** (person/object) với **mép giấy xé / deckled** — to, trung tâm, tương phản cao; đặt chồng trên các mảnh ảnh khác.',
            '  - Layering = **fragment ảnh xếp chồng** (overlapping photo fragments), halftone dots, washi tape — cảm giác ghép tay, không ghép kỹ thuật số sạch.',
            '  - Annotations = thick expressive black marker: arrows, scribbles, underlines, emphasis marks, icons (không outline-only diagram mảnh).',
            '  - Typography = **bold vintage magazine headline** tiếng Việt + **3–6 short label tách rời** (mỗi label 1–5 từ); **1–2 keywords trong bright red** còn lại đen.',
            '  - Composition = một luồng visual rõ (vd trái → phải), hierarchy mạnh, mật độ gọn — editorial thumbnail energy, không textbook tĩnh.',
            '  - Solid black graphic props OK (clock, brush bars, stamps) khi hỗ trợ hook.',
            '  - Palette = muted retro (cream, kraft, đen, accent đỏ), paper grain; **cấm** màu neon, vector phẳng nhiều màu.',
        ],
        banned: '- **Cấm** flat colorful cartoon fills, neon glow UI, cluttered rainbow icons, photoreal full-bleed backgrounds, clean digital white-edge cutout (hero phải là giấy cắt tay).',
    },
    vox: {
        header: 'Vox-style explainer / tài liệu giải thích (documentary, bắt buộc)',
        intro: '- Clip dùng **Vox-style editorial documentary collage** — mỗi beat là một frame explainer báo chí hiện đại: photographic cutout + layered editorial composition + hierarchy + scale contrast; annotation tay chỉ phụ trợ (xem Subtle annotation layer bên dưới).',
        rule: '- `image_prompt` (**JSON**): scene/subject mô tả **editorial documentary composition** — 1 hero photographic cutout minh họa nội dung beat + layered photo fragments/cropped imagery + depth/scale contrast (style vox) — bố cục editorial, không grid/chart.',
        spec: [
            '  - Hero = **1** photorealistic cutout subject — **editorial focal**: đặt trong layered composition có depth (subtle drop shadows, cropped photo fragments), KHÔNG phải vật thể trôi trên nền trắng.',
            '  - **Editorial composition (PRIMARY)**: strong visual hierarchy — hero lớn nổi bật, contextual elements nhỏ xung quanh (scale contrast); layered collage (photo fragments, cropped imagery, background shapes); storytelling layout kiểu news magazine; large negative space.',
                        '  - Nền = editorial documentary scene: magazine-cream/giấy ngà texture + photographic background shapes + depth — **không** lưới tọa độ (grid), biểu đồ, chart, số liệu trang trí; **không** bối cảnh cảnh sát/tòa án/phòng điều tra.',
            '  - Typography = **BẮT BUỘC text-rich** (xem TEXT OVERLAY block): **3–6 label** bold hand-lettered đặt tách rời nhau quanh khung, mỗi label **1–5 từ** (label đầu trích từ `phrase_anchor`, các label sau làm rõ thuật ngữ/cơ chế/hệ quả); **1–2 từ duy nhất màu đỏ tươi**; còn lại đen; cấm đoạn chữ dài kiểu phụ đề.',
            '  - Composition = bố cục editorial, một luồng nhìn rõ, hierarchy mạnh, nhiều khoảng trống; loại bỏ chi tiết thừa trước khi render.',
        ],
        banned: '- **Cấm** flat colorful vector fills, neon glow UI, cluttered rainbow icons, watermark, logo, blurry, full-bleed photorealistic scene without cutouts, thin outline-only diagram, cartoon, cảnh điều tra/phá án/tòa án/cảnh sát (không liên quan chủ đề).',
    },
    courtroom_sketch: {
        header: 'Ký họa vẽ tay (Courtroom sketch style — kỹ thuật vẽ, bắt buộc)',
        intro: '- Clip dùng **ảnh ký họa vẽ tay (Courtroom sketch style)** — bút chì màu / phấn màu pastel / màu nước nhạt trên giấy vân nhám, nét vẽ nhanh thô mộc, màu trầm, tập trung bắt trọn khoảnh khắc kịch tính — không phải HTML motion.',
        rule: '- `image_prompt` (**JSON**): scene/subject mô tả **hand-drawn reportage sketch** + colored pencil / soft pastel / light watercolor trên giấy vân nhám + nét vẽ nhanh loose + màu trầm muted + khoảnh khắc/biểu cảm kịch tính của nhân vật chính + bold Vietnamese label ngắn (style courtroom_sketch).',
        spec: [
            '  - Chất liệu = bút chì màu / phấn màu pastel / màu nước nhạt trên giấy có vân nhám (paper tooth) — không vector phẳng, không render kỹ thuật số sạch.',
            '  - Nét vẽ = nhanh, thô mộc, loose — bắt trọn khoảnh khắc và biểu cảm của nhân vật chính, không trau chuốt, mang tính phóng sự.',
            '  - Màu = trầm, bão hòa thấp (muted) — **cấm** màu neon, bảng màu rực rỡ.',
            '  - Bối cảnh = khung hình candid kiểu ký họa báo chí (reportage) — bối cảnh lấy theo **chủ đề của beat** (vd. giấc ngủ, đồng hồ báo thức, tờ nhiệm vụ).',
            '  - Typography = **3–6 label tiếng Việt ngắn viết tay** (mỗi label 1–5 từ) đặt tách rời nhau; 1–2 từ đậm nếu cần nhấn; giữ phong cách vẽ tay, không font máy.',
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
export function beatImageStyleSuffix(genStyle = 'hybrid', imageTextLang = 'vi'): string {
    const style = `${STYLE_SUFFIX[resolveWhiteboardGenStyle(genStyle)]}, ${WHITEBOARD_SEPARATED_LAYOUT_SUFFIX}`;
    return applyImageTextLang(style, imageTextLang);
}

/** Dòng tỉ lệ ảnh theo clip aspect user chọn — append khi DÙNG prompt (mở Duck.ai/Meta.ai), không lưu. */
export function beatImageAspectSuffix(aspect = '9:16'): string {
    const normalized = String(aspect || '').trim().replace(/\s+/g, '');
    if (normalized === '16:9') {
        return 'horizontal 16:9 aspect ratio, landscape wide composition, full-width frame';
    }
    return 'vertical 9:16 aspect ratio, portrait composition, vertical frame';
}

/** Bỏ marker BGM/SFX/Dừng `[BGM: ...]` khỏi text — mirror backend marketing_short_video_agent_strip_voice_markers. */
export function stripVoiceMarkers(text: string): string {
    const cleaned = String(text || '').replace(/\[(?:BGM|SFX|Dừng)[^\]]*\]/giu, '');
    return cleaned.replace(/\s{2,}/gu, ' ').trim();
}

/** Lời thoại thực tế của beat từ beat map section (phrase_anchor, đã strip marker). */
export function resolveBeatVoiceContent(
    sections: Array<Record<string, unknown>> | undefined | null,
    beatId: string,
): string {
    const id = String(beatId || '').trim();
    if (!id) {
        return '';
    }
    const section = (sections || []).find((s) => {
        const sid = String(s?.id ?? s?.beat_id ?? '').trim();
        return sid === id;
    });
    const anchor = String(section?.phrase_anchor ?? section?.anchor ?? '').trim();
    return anchor ? stripVoiceMarkers(anchor) : '';
}

/** Luôn nối dòng phong cách image vào cuối prompt (bản gửi đi) — prompt có thể là JSON object string. */
export function appendBeatImageStyleSuffix(
    prompt: string,
    genStyle = 'hybrid',
    imageTextLang = 'vi',
    voiceContent = '',
): string {
    const trimmed = String(prompt || '').trim();
    const suffix = beatImageStyleSuffix(genStyle, imageTextLang);
    const textLangRule = imageTextLangSuffixRule(imageTextLang);
    const voice = String(voiceContent || '').trim();
    if (!trimmed) {
        return suffix;
    }
    // Prompt là JSON object → thêm key `style` + `text_language` + `voice_content` vào TRONG JSON (không nối ngoài).
    try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            const next: Record<string, unknown> = {
                ...parsed,
                style: suffix,
                text_language: textLangRule,
                safe_area: WHITEBOARD_CENTRAL_SAFE_AREA_RULE,
                output_images: WHITEBOARD_DUAL_LAYER_OUTPUT_RULE,
            };
            if (voice) {
                next.voice_content = voice;
            }
            return JSON.stringify(next, null, 2);
        }
    } catch {
        // Không phải JSON → fallback nối suffix sau dấu phẩy như cũ.
    }
    let appended = `${trimmed.replace(/[, ]+$/u, '')}, ${suffix}, ${textLangRule}, ${WHITEBOARD_CENTRAL_SAFE_AREA_RULE}`;
    if (voice) {
        appended += `, the voiceover for this beat says: "${voice}"`;
    }
    return `${appended}\n\n${WHITEBOARD_DUAL_LAYER_OUTPUT_RULE}`;
}

export function buildBeatDivisionWhiteboardImagePromptBlock(
    genStyle = 'hybrid',
    imageTextLang = 'vi',
): string {
    const style = resolveWhiteboardGenStyle(genStyle);
    const spec = STYLE_SPEC[style];

    const isHybridStyle = style === 'hybrid';

    const block = [
        ...(isHybridStyle
            ? [
                '## Visual mode — `image_prompt` (Whiteboard hybrid collage — PRIMARY)',
                '- Clip dùng **hybrid whiteboard collage**: 1 photorealistic cutout hero (white edge) + thick marker annotations + bold labels trên nền bảng — có **editorial hierarchy** (scale contrast, layered fragments, một luồng nhìn rõ) — KHÔNG phải "classroom explainer", "sketchnote", "presentation slide".',
                '- **Editorial composition là PRIMARY; marker annotation là SECONDARY** — annotation chỉ phụ trợ, không lấn át hero.',
            ]
            : [
                '## Visual mode — `image_prompt` (Vox-style editorial documentary collage — PRIMARY)',
                '- Clip dùng **Vox-style editorial documentary collage** — mỗi beat phải giống một frame trong modern journalism explainer: **photographic cutouts, strong visual hierarchy, layered composition, scale contrast, editorial storytelling, subtle annotations, large negative space, documentary design language**.',
                '- **Editorial composition là PRIMARY; whiteboard annotations (marker/arrow/callout) là SECONDARY** — annotation chỉ phụ trợ tinh tế, không định nghĩa phong cách; KHÔNG phải "whiteboard explainer", "classroom explainer", "sketchnote", "presentation slide".',
                '- **Editorial language (BẮT BUỘC trong `image_prompt`)**: mô tả phải dùng ngôn ngữ editorial journalism — editorial journalism, news magazine layout, explainer documentary, information hierarchy, cropped photographic collage, layered paper cutout composition, scale contrast, depth — **CẤM** dùng từ khóa `whiteboard`, `classroom`, `sketchnote`, `presentation slide`, `chalkboard` trong `image_prompt`.',
            ]),
        '- **Tỉ lệ khung hình (BẮT BUỘC — ảnh sinh đúng aspect clip)**: ảnh phải theo đúng tỉ lệ clip — **16:9 ngang 1920×1080** hoặc **9:16 dọc 1080×1920**; bố cục **full frame, không lề, không viền trắng**; mô tả `composition`/`scene` theo khung ngang hoặc khung dọc tương ứng.',
        spec.intro,
        '- **`visual_description`**: **exactly 1 sentence, max 20 words** (editor note cho QA — WHAT/WHY, không phải nguồn sinh ảnh) — tóm tắt ý beat; **toàn bộ visual instruction nằm trong `image_prompt`**; ảnh thật do `image_prompt` quyết định.',
        spec.rule,
        ...buildImagePromptJsonRules(IMAGE_PROMPT_EXAMPLE[style]),
        `- **${spec.header}**:`,
        ...spec.spec,
        spec.banned,
        ...imageTextLangRuleBlock(imageTextLang),
        ...WHITEBOARD_COMMON_TAIL(STYLE_SUFFIX[style]),
    ].join('\n');

    return applyImageTextLang(block, imageTextLang);
}

export function buildBeatDivisionWhiteboardOutputRules(
    genStyle = 'hybrid',
    imageTextLang = 'vi',
): string[] {
    const style = resolveWhiteboardGenStyle(genStyle);
    const outputRule: Record<WhiteboardGenStyle, string> = {
        hybrid: '- `image_prompt`: **JSON object đủ 7 key** theo **Visual mode — image_prompt** above; scene/subject theo hybrid editorial collage (photorealistic cutout hero + layered fragments + thick marker annotations, selective red accents); **text_overlay: 3–6 label nối `|`, mỗi label 1–5 từ** (vd "GAN NHIỄM MỠ | MỠ TÍCH TỤ | VIÊM GAN | MÔ XƠ HÓA"), label đầu là keyword từ `phrase_anchor`, các label sau làm rõ thuật ngữ/hệ quả, cấm bịa số liệu; tổng ≤ ~400 từ; no watermark.',
        collage_art: '- `image_prompt`: **JSON object đủ 7 key** theo **Visual mode — image_prompt** above; scene/subject theo collage art (magazine-cutout hero torn/deckled on cream paper, layered fragments); **text_overlay: 3–6 label nối `|`, mỗi label 1–5 từ** (vd "GAN NHIỄM MỠ | MỠ TÍCH TỤ | VIÊM GAN | MÔ XƠ HÓA"), label đầu là keyword từ `phrase_anchor`, các label sau làm rõ thuật ngữ/hệ quả, cấm bịa số liệu; tổng ≤ ~400 từ; no watermark.',
        vox: '- `image_prompt`: **JSON object đủ 7 key** theo **Visual mode — image_prompt** above; scene/subject theo vox-style editorial documentary (1 hero cutout + layered editorial composition + scale contrast; annotation theo Subtle annotation layer; **cấm** grid/chart/question marks/circled emphasis/whiteboard; **cấm** cảnh điều tra/tòa án); **text_overlay: 3–6 label nối `|`, mỗi label 1–5 từ** (vd "GAN NHIỄM MỠ | MỠ TÍCH TỤ | VIÊM GAN | MÔ XƠ HÓA"), label đầu là keyword từ `phrase_anchor`, các label sau làm rõ thuật ngữ/hệ quả, cấm bịa số liệu; tổng ≤ ~400 từ; no watermark.',
        courtroom_sketch: '- `image_prompt`: **JSON object đủ 7 key** theo **Visual mode — image_prompt** above; scene/subject theo courtroom sketch (**colored pencil/pastel/watercolor on rough paper** + loose strokes + muted colors + dramatic moment); **text_overlay: 3–6 label nối `|`, mỗi label 1–5 từ** (vd "GAN NHIỄM MỠ | MỠ TÍCH TỤ | VIÊM GAN | MÔ XƠ HÓA"), label đầu là keyword từ `phrase_anchor`, các label sau làm rõ thuật ngữ/hệ quả, cấm bịa số liệu; tổng ≤ ~400 từ; no watermark.',
    };
    return [
        '- **RELEVANCE PRIORITY (cao nhất)**: mỗi `image_prompt` minh họa trực tiếp **`phrase_anchor` của beat này** + nhất quán **Title video** — ưu tiên `phrase_anchor`; có thể dùng **1–2 beat lân cận** làm ngữ cảnh, **không lấy nội dung xa hơn**. Ảnh chung chung/trang trí hoặc minh họa chủ đề khác là **sai**.',
        '- **Unique**: không lặp nguyên tổ hợp `subject + action + scene`; **cho phép tái dùng chủ thể** nếu đổi hành động/góc nhìn.',
        '- **`background_prompt` (BẮT BUỘC mỗi beat)**: mô tả background plate **có trang trí** cho IMAGE 2 — đúng chất liệu style clip, motif ở 4 góc + dọc viền, trung tâm nhạt; **cấm** nền trắng trơn / nền phẳng trống, **cấm** mọi subject/vật thể có nghĩa/nhân vật/chữ/số; **được phép giống nhau giữa các beat cùng scene** (giữ nhất quán nền cả clip).',
        applyImageTextLang(outputRule[style], imageTextLang),
    ];
}

export function buildBeatDivisionWhiteboardSchemaExtra(
    isWhiteboard: boolean,
    genStyle = 'hybrid',
    imageTextLang = 'vi',
): Record<string, Record<string, string>> {
    if (!isWhiteboard) {
        return {};
    }
    // image_prompt = JSON object THẬT trong beat-map (mới) — không phải string escape.
    const example = WHITEBOARD_IMAGE_PROMPT_EXAMPLE_OBJECTS[resolveWhiteboardGenStyle(genStyle)];
    return {
        image_prompt: Object.fromEntries(
            Object.entries(example).map(([key, value]) => [key, applyImageTextLang(value, imageTextLang)]),
        ),
    };
}
