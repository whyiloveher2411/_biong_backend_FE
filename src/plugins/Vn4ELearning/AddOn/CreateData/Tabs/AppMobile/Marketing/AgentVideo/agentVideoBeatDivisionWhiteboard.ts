/** Mirror marketing_short_video_import_html_beat_division_whiteboard_image_prompt_block */
export const WHITEBOARD_HYBRID_IMAGE_PROMPT_EXAMPLE =
    "High-impact hybrid whiteboard collage of a tired young adult photorealistic cutout lying in bed beside a large black alarm clock, floating task papers, bold Vietnamese headline '3 NGUYÊN LIỆU', short labels 'những điều bạn muốn làm', 'những điều bạn cần làm', 'xử lý việc không muốn & không cần', thick black marker arrows scribbles underlines, selective bright red accents on 1-2 keywords, strong hierarchy, compact editorial thumbnail, pure white background, no watermark";

export const WHITEBOARD_HYBRID_STYLE_SUFFIX =
    'high-impact hybrid whiteboard collage, photorealistic cutout subject with white edge on pure white background, thick black marker annotations arrows scribbles underlines, bold Vietnamese hand-lettered headline, selective bright red accents on 1-2 keywords only, strong visual hierarchy, compact editorial thumbnail composition, no watermark';

export function buildBeatDivisionWhiteboardImagePromptBlock(): string {
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
        '- **On-screen text tiếng Việt — BẮT BUỘC chính xác theo nội dung beat**:',
        '  - Lấy chữ từ ý/cụm trong `phrase_anchor` (hoặc lời thoại beat tương ứng); quote **đúng nghĩa**, có thể rút gọn ngắn để đọc được trên ảnh.',
        '  - Ví dụ GOOD: narration nói ba nguyên liệu là muốn làm / cần làm / xử lý việc không muốn cũng không cần → labels: `\'những điều bạn muốn làm\'`, `\'những điều bạn cần làm\'`, `\'xử lý việc không muốn & không cần\'` + title `\'3 NGUYÊN LIỆU\'`.',
        '  - Ví dụ BAD: `\'Nguyên liệu 1\'`, `\'Nguyên liệu 2\'`, `\'Bước 1\'`, `\'Item 1\'`, `\'Tip 1\'` — placeholder chung chung, **không** truyền nội dung.',
        '  - **Cấm** số thứ tự giả làm nội dung (`1/2/3`, `A/B/C`) khi narration đã nêu rõ từng ý.',
        '  - Chữ trên ảnh = bold hand-lettered marker; mỗi label ≤ ~8–12 từ; ưu tiên cụm sát nghĩa narration hơn slogan chung.',
        `- Style suffix gợi ý: \`${WHITEBOARD_HYBRID_STYLE_SUFFIX}\`.`,
        '- **Cấm** logo thương mại, watermark, chữ dày đặc / đoạn dài khó đọc / placeholder generic.',
        '- `image_prompt` và `visual_description` **song song** trên mỗi section — không thay thế nhau.',
    ].join('\n');
}

export function buildBeatDivisionWhiteboardOutputRules(): string[] {
    return [
        '- `image_prompt`: follow **Whiteboard mode — image_prompt** above; English scene + photorealistic cutout hero + thick marker annotations + **specific** Vietnamese label quotes from this beat\'s `phrase_anchor` (no generic "Nguyên liệu 1/2/3"); ~30–120 words; hybrid whiteboard collage; selective red accents; no watermark.',
    ];
}

export function buildBeatDivisionWhiteboardSchemaExtra(isWhiteboard: boolean): Record<string, string> {
    if (!isWhiteboard) {
        return {};
    }
    return {
        image_prompt: WHITEBOARD_HYBRID_IMAGE_PROMPT_EXAMPLE,
    };
}
