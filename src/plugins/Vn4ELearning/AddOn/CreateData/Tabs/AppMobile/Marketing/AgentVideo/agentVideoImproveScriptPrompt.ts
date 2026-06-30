export function buildImproveAudioScriptPrompt(title: string, audioScript: string): string {
    const script = String(audioScript || '').trim();
    if (!script) {
        return '';
    }

    const articleTitle = String(title || '').trim() || '(chưa có tiêu đề)';

    return `Bạn là biên tập kịch bản voiceover short video tiếng Việt.

## Nhiệm vụ
Viết lại (cải thiện) audio script bên dưới: văn nói tự nhiên hơn, retention tốt hơn, giữ nguyên ý chính và nhịp kể.

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
Chỉ trả về audio script đã viết lại (plain text), không giải thích thêm.`;
}
