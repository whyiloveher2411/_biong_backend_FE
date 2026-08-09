/** Mirror marketing_short_video_import_html_beat_division_whiteboard_image_prompt_block */

export const WHITEBOARD_HYBRID_STYLE_SUFFIX =
    'high-impact hybrid whiteboard collage, photorealistic cutout subject with white edge on pure white background, thick black marker annotations arrows scribbles underlines, bold Vietnamese hand-lettered headline, selective bright red accents on 1-2 keywords only, strong visual hierarchy, compact editorial thumbnail composition, no watermark';

export const WHITEBOARD_COLLAGE_STYLE_SUFFIX =
    'analog paper collage art on warm cream textured paper background, 1 focal magazine-cutout subject with torn deckled paper edges, layered overlapping photo fragments, halftone dots, washi tape strips, thick black marker annotations arrows scribbles underlines, bold vintage magazine headline typography, selective bright red accents on 1-2 keywords, muted retro palette, paper grain, strong hierarchy, compact editorial composition, no watermark';

export const WHITEBOARD_VOX_STYLE_SUFFIX =
    'Vox-style editorial journalism collage, photorealistic paper cutouts, layered documentary imagery, strong hierarchy, scale contrast, subtle red accents, minimal annotation';

export const WHITEBOARD_COURTROOM_STYLE_SUFFIX =
    'sketch style, hand-drawn reportage illustration in colored pencil soft pastel light watercolor on textured rough paper, quick loose dramatic strokes, muted low-saturation colors, gritty authentic atmosphere energy, focal subject caught mid-expression, visible paper grain and sketchy hatching, candid news framing, no watermark';

/** 6 key bắt buộc của image_prompt JSON — đồng bộ validation agentVideoBeatMap + PHP import-html-helper. */
export const WHITEBOARD_IMAGE_PROMPT_JSON_KEYS = [
    'subject',
    'action',
    'scene',
    'text_overlay',
    'composition',
    'must_avoid',
] as const;

export type WhiteboardImagePromptJsonKey = (typeof WHITEBOARD_IMAGE_PROMPT_JSON_KEYS)[number];

/** Nguồn duy nhất của ví dụ image_prompt (mỗi style) — dẫn xuất cả 2 bản: escaped (block text) + raw JSON (schema example). */
const WHITEBOARD_IMAGE_PROMPT_EXAMPLE_OBJECTS: Record<WhiteboardGenStyle, Record<WhiteboardImagePromptJsonKey, string>> = {
    hybrid: {
        subject: 'Photorealistic cutout of a liver with clogged fat deposits beside ethanol molecules',
        action: 'Fat droplets accumulating inside the liver tissue',
        scene: 'Clean light explainer board, pure white background, hybrid whiteboard collage',
        text_overlay: 'GAN NHIỄM MỠ',
        composition: 'One clear left-to-right flow, strong hierarchy, bright red accents on 1-2 keywords only',
        must_avoid: 'watermark, logo, dense text blocks, generic placeholders, neon glow UI',
    },
    collage_art: {
        subject: 'Liver as a large magazine-cutout with torn deckled paper edges beside an ethanol molecule cutout',
        action: 'Damaged DNA strand fragments drifting apart as the liver decays',
        scene: 'Warm cream textured paper background, halftone dots, washi tape, layered overlapping paper fragments',
        text_overlay: 'GAN NHIỄM MỠ',
        composition: 'Strong hierarchy, one clear visual flow, selective bright red accents on 1-2 keywords, paper grain',
        must_avoid: 'watermark, logo, neon glow UI, clean digital white-edge cutout, dense text',
    },
    vox: {
        subject: 'Photorealistic cutout of a human liver surrounded by layered documentary photo fragments',
        action: 'Fat deposits accumulating inside liver tissue, highlighted by a few clean marker strokes',
        scene: 'Editorial documentary composition: textured magazine-cream background, cropped photo fragments, depth, generous negative space',
        text_overlay: 'GAN NHIỄM MỠ',
        composition:
            'Editorial layered composition, strong hierarchy, scale contrast, cropped photo fragments, magazine-cream texture, depth',
        must_avoid: 'watermark, logo, dense text, grid, chart, question marks, circled emphasis, blood, gore, corpse, injury, accident, whiteboard, classroom board, sketchnote, presentation slide, isolated sticker cutout',
    },
    courtroom_sketch: {
        subject: 'Human liver caught mid-degeneration beside floating fat cells and DNA strands',
        action: 'Fatty tissue build-up, quick loose strokes, candid reportage framing',
        scene: 'Sketch style, colored pencil / soft pastel / light watercolor on textured rough paper',
        text_overlay: 'GAN NHIỄM MỠ',
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

/** Rule ngôn ngữ chữ trên ảnh — mirror backend marketing_short_video_agent_image_text_lang_rule_block. */
export function imageTextLangRuleBlock(imageTextLang = 'vi'): string[] {
    const lang = normalizeImageTextLang(imageTextLang);
    const lines = [
        '## TEXT OVERLAY (source of truth duy nhất)',
        '- Default = `""` — chỉ dùng khi giúp hiểu rõ đáng kể (significantly improves comprehension).',
        lang === 'en'
            ? '- Tối đa 6 từ; nhiều label nối `|` (vd `"FATTY LIVER | CIRRHOSIS"`), bold hand-lettered, viết bằng tiếng Anh.'
            : '- Tối đa 6 từ; nhiều label nối `|` (vd `"GAN NHIỄM MỠ | XƠ GAN"`), in đậm viết tay, viết đúng tiếng Việt có dấu.',
        '- Ưu tiên keyword chính xác từ `phrase_anchor`; fallback tóm tắt 1–3 từ **CHỈ từ current beat**; adjacent beat chỉ làm context — **MUST NOT introduce new nouns / entities / diseases / organs / mechanisms** (vd beat "Điều này làm mọi thứ trở nên tệ hơn", adjacent "Cancer develops" → KHÔNG được sinh "UNG THƯ" cho beat này).',
        '- Transition beats (vd "Nói cách khác") → tóm tắt core idea.',
        '- CTA beat cuối: chỉ bookmark / save keyword.',
        '- Cấm lặp text_overlay giống hệt giữa 2 beat liền kề (vd "DNA damage" → beat sau "DNA mutation") trừ khi thật sự cần thiết.',
        '- Statistical beats: **prefer outcome keyword over raw numbers** — vd "31% higher breast cancer risk" → VALID: "UNG THƯ VÚ" / "NGUY CƠ CAO HƠN"; **INVALID**: "31%", "740000", "1 IN 8" (con số đã thể hiện bằng subject population cluster).',
        '- Cấm `\n`, dấu phẩy, list, subtitle/câu dài, `1/2/3`, chữ lặp lại toàn bộ lời thoại.',
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
        ? 'on-screen text must be English only, at most 1-2 short labels of 1-3 keyword words extracted verbatim from the beat voiceover, directly related to the beat content, no gibberish letter sequences'
        : 'chữ trên ảnh phải đúng tiếng Việt có dấu, text_overlay = string duy nhất tối đa 6 từ (nhiều label dùng |), keyword trích từ lời thoại beat, liên quan trực tiếp nội dung beat, cấm chuỗi ký tự vô nghĩa';
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
    '- **TEXT OVERLAY** — tuân thủ block `## TEXT OVERLAY (source of truth duy nhất)` bên trên: Default `""`, ≤6 từ, keyword từ `phrase_anchor`, không lặp giống hệt beat liền kề, statistical → outcome keyword (không phải số).',
    '  - **Beat CTA cuối — CTA lockdown**: bookmark/notebook/save symbol/community illustration; **cấm** YouTube/TikTok logo, Subscribe/Like button, platform branding; kế thừa motif beat trước.',
    '- **Primary subject: 1, Supporting element: max 1, Contextual elements: 1–3 (Vox feel)** — **Beat complexity scaling**: **≤2s** → hero + 0–1 contextual element, annotation tối thiểu, 0–1 label, action ≤12 từ; **2–5s** → hero + 1–2 contextual elements, tối đa 1 supporting element, 0–1 arrow, 1 label; **>5s** → hero + 2–3 contextual elements, 1 supporting element, 0–1 arrow, 1–2 labels.',
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
    '- **`text_overlay`** — **empty string `""` HOẶC single string ≤6 từ**; nếu nhiều label nối bằng `|` (vd `"UNG THƯ"`, `"DNA HỎNG"`, `"GAN NHIỄM MỠ | XƠ GAN"`); **cấm** `\n`, dấu phẩy, list; nếu dùng: ưu tiên keyword chính xác từ `phrase_anchor`; nếu `phrase_anchor` không có keyword hữu ích → tóm tắt 1–3 từ (xem "TEXT OVERLAY" bên dưới).',
    '- **`composition`**: bố cục + tông màu/cảm xúc (English, ~5–25 từ).',
    '- **`must_avoid`**: điều cấm — liệt kê ngắn (watermark, logo, chữ dày đặc, …).',
];

const buildImagePromptJsonRules = (example: string): string[] => [
    '- **`image_prompt` = JSON object THẬT** trong beat-map (KHÔNG phải string escape) — bắt buộc đủ **6 key** dưới đây (không thêm bớt, không đổi tên):',
    ...IMAGE_PROMPT_JSON_FIELD_LINES.map((line) => `  ${line}`),
    '- **Cấm** thêm các key khác (purpose/context/mood/style/aspect/text_language/voice_content/safe_area/policy_safe) — engine tự chèn style, tỉ lệ khung hình, rule ngôn ngữ, lời thoại beat (voice_content) và safe-area khi gửi sinh ảnh; AI chỉ viết 6 key trên.',
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
            '  - Typography = bold hand-lettered, **1–2 label, mỗi label 1–3 từ khóa**; **1–2 keywords in bright red** only; rest black.',
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
            '  - Typography = **bold vintage magazine headline** tiếng Việt + short labels; **1–2 keywords trong bright red** còn lại đen.',
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
            '  - Typography = **OPTIONAL — default KHÔNG có text overlay**; chỉ dùng khi comprehension giảm đáng kể nếu không có (xem TEXT OVERLAY block); nếu dùng: tối đa **1–2 label** bold hand-lettered, mỗi label **1–3 từ khóa** (trích nguyên văn `phrase_anchor`); **1–2 từ duy nhất màu đỏ tươi**; còn lại đen; cấm đoạn chữ dài.',
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
export function beatImageStyleSuffix(genStyle = 'hybrid', imageTextLang = 'vi'): string {
    return applyImageTextLang(STYLE_SUFFIX[resolveWhiteboardGenStyle(genStyle)], imageTextLang);
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
            const next: Record<string, unknown> = { ...parsed, style: suffix, text_language: textLangRule };
            if (voice) {
                next.voice_content = voice;
            }
            return JSON.stringify(next, null, 2);
        }
    } catch {
        // Không phải JSON → fallback nối suffix sau dấu phẩy như cũ.
    }
    let appended = `${trimmed.replace(/[, ]+$/u, '')}, ${suffix}, ${textLangRule}`;
    if (voice) {
        appended += `, the voiceover for this beat says: "${voice}"`;
    }
    return appended;
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
        hybrid: '- `image_prompt`: **JSON object đủ 6 key** theo **Visual mode — image_prompt** above; scene/subject theo hybrid editorial collage (photorealistic cutout hero + layered fragments + thick marker annotations, selective red accents); **text_overlay: string duy nhất ≤6 từ, nhiều label dùng `|`** (vd "GAN NHIỄM MỠ | XƠ GAN"), keyword từ `phrase_anchor`; tổng ≤ ~400 từ; no watermark.',
        collage_art: '- `image_prompt`: **JSON object đủ 6 key** theo **Visual mode — image_prompt** above; scene/subject theo collage art (magazine-cutout hero torn/deckled on cream paper, layered fragments); **text_overlay: string duy nhất ≤6 từ, nhiều label dùng `|`** (vd "GAN NHIỄM MỠ | XƠ GAN"), keyword từ `phrase_anchor`; tổng ≤ ~400 từ; no watermark.',
        vox: '- `image_prompt`: **JSON object đủ 6 key** theo **Visual mode — image_prompt** above; scene/subject theo vox-style editorial documentary (1 hero cutout + layered editorial composition + scale contrast; annotation theo Subtle annotation layer; **cấm** grid/chart/question marks/circled emphasis/whiteboard; **cấm** cảnh điều tra/tòa án); **text_overlay: string duy nhất ≤6 từ, nhiều label dùng `|`** (vd "GAN NHIỄM MỠ | XƠ GAN"), keyword từ `phrase_anchor`; tổng ≤ ~400 từ; no watermark.',
        courtroom_sketch: '- `image_prompt`: **JSON object đủ 6 key** theo **Visual mode — image_prompt** above; scene/subject theo courtroom sketch (**colored pencil/pastel/watercolor on rough paper** + loose strokes + muted colors + dramatic moment); **text_overlay: string duy nhất ≤6 từ, nhiều label dùng `|`** (vd "GAN NHIỄM MỠ | XƠ GAN"), keyword từ `phrase_anchor`; tổng ≤ ~400 từ; no watermark.',
    };
    return [
        '- **RELEVANCE PRIORITY (cao nhất)**: mỗi `image_prompt` minh họa trực tiếp **`phrase_anchor` của beat này** + nhất quán **Title video** — ưu tiên `phrase_anchor`; có thể dùng **1–2 beat lân cận** làm ngữ cảnh, **không lấy nội dung xa hơn**. Ảnh chung chung/trang trí hoặc minh họa chủ đề khác là **sai**.',
        '- **Unique**: không lặp nguyên tổ hợp `subject + action + scene`; **cho phép tái dùng chủ thể** nếu đổi hành động/góc nhìn.',
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
