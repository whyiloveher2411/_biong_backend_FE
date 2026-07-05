export function buildImproveAudioScriptPrompt(title: string, audioScript: string): string {
    const script = String(audioScript || '').trim();
    if (!script) {
        return '';
    }

    const articleTitle = String(title || '').trim() || '(chưa có tiêu đề)';

    return `Bạn là biên tập kịch bản voiceover short video tiếng Việt.

## Nhiệm vụ
Viết lại (cải thiện) audio script bên dưới: văn nói tự nhiên hơn, retention tốt hơn, giữ nguyên ý chính và nhịp kể.

## Chia đoạn cho phân cảnh (bắt buộc)
Script sau cải thiện phải dễ chia beat / phân cảnh visual sau này (Whisper + beat-map).
- Chia thành **các đoạn rõ ràng** — mỗi đoạn cách nhau bằng **một dòng trống**.
- Mỗi đoạn = **một ý / một khoảnh khắc visual** (hook, một twist, một số liệu, một bước giải pháp, CTA…).
- Mỗi đoạn nên **1–3 câu ngắn**, dễ đọc TTS và dễ gán \`phrase_anchor\` khi chia beat.
- **Cấm** viết thành khối văn dài liền một mạch — không gộp nhiều ý khác nhau vào cùng một đoạn.
- Giữ nhịp HASCAS nếu script gốc có: đoạn hook ngắn → agitate → solve (có thể nhiều đoạn) → CTA.
- Tag \`[...]\` đặt ở đầu đoạn hoặc ngay trước câu liên quan — không tách tag khỏi đoạn mà nó thuộc về.

## Quy tắc tag (bắt buộc)
- Các tag trong ngoặc vuông \`[...]\` (vd. \`[BGM: lofi ambient]\`, \`[SFX: vine boom]\`, \`[sigh]\`, \`[laughter]\`, \`[dissatisfaction-hnn]\`) phải GIỮ NGUYÊN nội dung — không đổi tên, không đổi giá trị bên trong tag.
- Chỉ được dùng đúng các tag đã có trong script gốc — CẤM thêm tag mới, CẤM xóa tag.
- Được phép viết lại phần văn nói xung quanh tag.

## Tiêu đề bài viết
${articleTitle}

## Audio script hiện tại
\`\`\`
${script}
\`\`\`

## Output
Chỉ trả về audio script đã viết lại (plain text), **có dòng trống giữa các đoạn**, không giải thích thêm.`;
}
