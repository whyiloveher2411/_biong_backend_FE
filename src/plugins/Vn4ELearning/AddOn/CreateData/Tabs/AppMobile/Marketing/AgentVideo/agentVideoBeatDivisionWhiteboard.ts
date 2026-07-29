/** Mirror marketing_short_video_import_html_beat_division_whiteboard_image_prompt_block */
export function buildBeatDivisionWhiteboardImagePromptBlock(): string {
    return [
        '## Whiteboard mode — `image_prompt` (Duck.ai manual)',
        '- Clip đang ở chế độ **whiteboard**: mỗi beat dùng **ảnh line art** để engine animate tay vẽ (skeleton stroke) — không phải HTML motion.',
        '- **`visual_description`**: WHAT/WHY cho editor/QA — English, ~40–60 words, semantic brief (giữ block creative hiện tại).',
        '- **`image_prompt`**: prompt **trực tiếp** cho Duck.ai — chủ yếu English mô tả scene/layout, ~30–120 từ.',
        '- `image_prompt` phải mô tả: subject + layout + hành động chính + labels/icons **dạng nét** + style suffix whiteboard.',
        '- **Bắt buộc nét mỏng**: black/dark marker line art on pure white background — engine skeletonize nét để dẫn tay vẽ.',
        '- **Cấm solid fill / tô màu khối / gradient / shading dày / photorealistic / painted texture** — fill đặc làm video reveal mảng rời, không theo nét.',
        '- **Cấm** flat colorful illustration, neon glow icons, filled colored boxes — chỉ outline stroke.',
        '- **On-screen text tiếng Việt — BẮT BUỘC chính xác theo nội dung beat**:',
        '  - Lấy chữ từ ý/cụm trong `phrase_anchor` (hoặc lời thoại beat tương ứng); quote **đúng nghĩa**, có thể rút gọn ngắn để đọc được trên ảnh.',
        '  - Ví dụ GOOD: narration nói ba nguyên liệu là muốn làm / cần làm / xử lý việc không muốn cũng không cần → labels: `\'những điều bạn muốn làm\'`, `\'những điều bạn cần làm\'`, `\'xử lý việc không muốn & không cần\'` + title `\'3 NGUYÊN LIỆU\'`.',
        '  - Ví dụ BAD: `\'Nguyên liệu 1\'`, `\'Nguyên liệu 2\'`, `\'Bước 1\'`, `\'Item 1\'`, `\'Tip 1\'` — placeholder chung chung, **không** truyền nội dung.',
        '  - **Cấm** số thứ tự giả làm nội dung (`1/2/3`, `A/B/C`) khi narration đã nêu rõ từng ý.',
        '  - Chữ trên ảnh = hand-lettered outline mỏng; mỗi label ≤ ~8–12 từ; ưu tiên cụm sát nghĩa narration hơn slogan chung.',
        '- **Khuyến khích** arrows, icons, symbols **chỉ dạng line diagram** (outline) gắn đúng từng label cụ thể.',
        '- Composition informative OK (nhân vật + panel chữ + mũi tên) nhưng **toàn bộ là line art**, 1–2 focal groups, ít chi tiết nền.',
        '- Style suffix gợi ý: `clean whiteboard marker line art, thin black ink on pure white, outline only no fills, clear specific Vietnamese hand-lettered labels from narration, arrows and icons as line diagrams, simple educational composition, no watermark`.',
        '- **Cấm** logo thương mại, watermark, chữ dày đặc / đoạn dài khó đọc / placeholder generic.',
        '- `image_prompt` và `visual_description` **song song** trên mỗi section — không thay thế nhau.',
    ].join('\n');
}

export function buildBeatDivisionWhiteboardOutputRules(): string[] {
    return [
        '- `image_prompt`: follow **Whiteboard mode — image_prompt** above; English scene + **specific** Vietnamese label quotes from this beat\'s `phrase_anchor` (no generic "Nguyên liệu 1/2/3"); ~30–120 words; thin black marker line art on white; outline only; no watermark.',
    ];
}

export function buildBeatDivisionWhiteboardSchemaExtra(isWhiteboard: boolean): Record<string, string> {
    if (!isWhiteboard) {
        return {};
    }
    return {
        image_prompt:
            "Whiteboard marker line art of a tired person in bed, a clock, and a balance scale above three outline boxes with Vietnamese labels 'những điều bạn muốn làm', 'những điều bạn cần làm', 'xử lý việc không muốn & không cần' and title '3 NGUYÊN LIỆU', thin black ink on pure white, outline only no fills, simple educational diagram, no watermark",
    };
}
