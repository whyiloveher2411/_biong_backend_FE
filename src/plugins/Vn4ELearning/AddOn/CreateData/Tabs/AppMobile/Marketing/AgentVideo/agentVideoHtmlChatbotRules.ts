/**
 * Quy tắc dùng chung trong prompt copy cho chatbot HTML beat.
 * Caption/karaoke do agent ghép layer riêng — không nằm trong HTML user.
 */
export function buildHtmlChatbotNoKaraokeRulesBlock(): string {
    return [
        '## CẤM — karaoke / phụ đề / caption trong HTML beat',
        '- **TUYỆT ĐỐI KHÔNG** tạo text karaoke, phụ đề, subtitle, caption on-screen, word-by-word highlight.',
        '- **KHÔNG** hiển thị audio script, phrase_anchor, whisper text, hoặc bất kỳ câu voiceover nào sync theo thời gian.',
        '- **KHÔNG** dùng whisper_words để render chữ lên màn hình — whisper chỉ để tham khảo **pacing**, không phải nội dung hiển thị.',
        '- Voiceover đã có trong audio — caption/karaoke do **Spacedev agent ghép layer riêng** (`compositions/captions.html`) khi render final.',
        '- HTML beat chỉ chứa **visual thuần**: layout, ảnh, shape, motion, graphic type — không lớp text đọc theo audio.',
        '- Nếu template phong cách gợi ý caption on-screen → **bỏ qua** trong luồng HTML chatbot này.',
        '',
    ].join('\n');
}

/** Mỗi lần chatbot trả lời = đúng 1 file HTML self-contained (hoặc 1 JSON với prompt chia beat). */
export function buildHtmlChatbotSingleFileOutputRulesBlock(beatId?: string): string {
    const beatScope = beatId
        ? `Prompt này chỉ cho **${beatId}** — không generate HTML beat khác trong cùng response.`
        : 'Prompt chia beat chỉ trả JSON — không kèm HTML.';

    return [
        '## OUTPUT — đúng 1 artifact duy nhất (bắt buộc)',
        '- Trả về **một file duy nhất** — không phân thành nhiều file.',
        '- **Cấm** trả nhiều file cùng lúc (vd. `beat_1.html` + `beat_2.html` + `styles.css`).',
        '- **Cấm** tách `index.html` + `.css` + `.js` riêng — inline toàn bộ vào `<style>` và `<script>` trong cùng một HTML.',
        '- **Cấm** markdown fence, giải thích, hoặc danh sách file — user cần copy-paste **một** nội dung hoàn chỉnh.',
        beatScope,
        '',
    ].join('\n');
}

export function buildHtmlChatbotSingleHtmlFileRulesBlock(beatId: string): string {
    return [
        buildHtmlChatbotSingleFileOutputRulesBlock(beatId),
        '## Định dạng HTML (bắt buộc)',
        '- Một document hoàn chỉnh: `<!doctype html>` … `</html>`.',
        '- Không `import`, không `<link rel="stylesheet">` external, không file JS riêng.',
        '- Response = **chỉ** chuỗi HTML thuần (bắt đầu bằng `<!doctype html>` hoặc `<html`, kết thúc `</html>`).',
        '- **Không** dùng marker BEGIN/END — chỉ trả HTML thuần.',
        '',
    ].join('\n');
}

export function buildBeatDivisionSingleOutputRulesBlock(): string {
    return [
        '## OUTPUT — đúng 1 artifact duy nhất (bắt buộc)',
        '- Trả về **một JSON object** beat-map duy nhất — không HTML, không nhiều file.',
        '- **Cấm** trả kèm file HTML, beat HTML mẫu, hoặc nhiều JSON riêng lẻ.',
        '- **Cấm** markdown fence trong response cuối — chỉ JSON thuần.',
        '',
    ].join('\n');
}
