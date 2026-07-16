/**
 * Quy tắc dùng chung trong prompt copy cho chatbot HTML beat.
 * Caption/karaoke do agent ghép layer riêng — không nằm trong HTML user.
 */
import { formatDurationSec } from './agentVideoHfPromptDuration';

export function buildHtmlChatbotNoLegacyBorrowRulesBlock(): string {
    return [
        '## CẤM — mượn visual beat video cũ',
        '- **TUYỆT ĐỐI KHÔNG** copy HTML/CSS/JS từ beat HTML video khác hoặc `storage/agent-renders/{id_khác}/`.',
        '- **CẤM** đọc beat project cũ làm mẫu — chỉ dùng prompt server + `visual_style` + `visual_description` + skill contract.',
        '- **CẤM** reuse scaffold lặp mọi beat: `#joint-grid`, `.joint`, `#metric-block`, equalizer đỏ.',
        '- **CẤM** script bulk sinh nhiều beat từ một template — mỗi beat thiết kế riêng.',
        '',
    ].join('\n');
}

export function buildHtmlChatbotLayoutSafeZonesBlock(): string {
    return [
        '## BẮT BUỘC — Safe Zones (content keep-out) + Background full-bleed',
        '- Kích thước canvas là **1080x1920** (tỉ lệ 9:16).',
        '- **Caption band (content only):** bottom **360px** (y = 1560–1920) và top **80px** (y = 0–80) là vùng **cấm đặt foreground** — không headline, card, chart, ảnh hero, text đọc được. Karaoke/Logo do layer riêng khi render final.',
        '- **Background full-bleed (bắt buộc):** gradient, mesh, grain, vignette, glow phải phủ **toàn canvas 1080×1920** kể cả caption band — vùng dưới **có nền**, chỉ không có content.',
        '- **Cấu trúc scaffold (bắt buộc):**',
        '  1. `.bg-layer` — con trực tiếp của `#stage`, `position:absolute; inset:0; z-index:0; pointer-events:none` — chứa toàn bộ nền trang trí.',
        '  2. `.content-area` — con trực tiếp của `#stage`, `position:relative; z-index:1` — đã có `padding: 80px 48px 360px` để gom foreground vào safe zone giữa.',
        '- **Cấm trên background:** `height: 1480px`, `top: 80px`, hoặc đặt nền bên trong `.content-area` / container có padding — sẽ để trống caption band.',
        '- **Quy tắc định vị foreground (bắt buộc):**',
        '  1. Mọi nội dung đọc được (text, card, chart, ảnh hero) đặt trong `.content-area` hoặc tuân padding keep-out.',
        '  2. `position: absolute` cho **foreground** (không áp dụng `.bg-layer`): **CẤM** `top < 80px` hoặc `bottom < 360px` — tọa độ y phải trong 80px–1560px.',
        '',
    ].join('\n');
}

export function buildHtmlChatbotNoKaraokeRulesBlock(): string {
    return [
        '## CẤM — karaoke / phụ đề / caption trong HTML beat',
        '- **TUYỆT ĐỐI KHÔNG** tạo text karaoke, phụ đề, subtitle, caption on-screen, word-by-word highlight.',
        '- **KHÔNG** hiển thị audio script, phrase_anchor, whisper text, hoặc bất kỳ câu voiceover nào sync theo thời gian.',
        '- **KHÔNG** dùng whisper_words để render chữ lên màn hình — whisper chỉ để tham khảo **pacing**, không phải nội dung hiển thị.',
        '- Voiceover đã có trong audio — caption/karaoke do **pipeline agent ghép layer riêng** (`compositions/captions.html`) khi render final.',
        '- HTML beat chỉ chứa **visual thuần**: layout, ảnh, shape, motion, graphic type — không lớp text đọc theo audio.',
        '- **CẤM** logo, wordmark, watermark thương hiệu trong HTML beat — brand overlay do layer riêng khi render final.',
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

export function buildHtmlChatbotJsContractBlock(durationSec: number): string {
    const total = formatDurationSec(durationSec);
    return [
        '## JavaScript animation (bắt buộc — preview CMS)',
        '- Preview timeline gọi `dispatchEvent(new CustomEvent(\'hf-seek\', { detail: { time } }))` — **phải giữ** listener scaffold:',
        '  `addEventListener(\'hf-seek\', (e) => { t = e.detail.time; render(); });`',
        '- **Cấm** chỉ gán `window.render = render` mà không có `hf-seek` — animation sẽ **đứng im**.',
        '- Dùng `let t = 0` (global) + `function render()` **không tham số**. Trong `render()`: `const time = clamp(t, 0, DURATION)`.',
        '- **Cấm** `function render(t)` — khi gọi `render()` không đối số, `t` bên trong = `undefined` → animation hỏng.',
        '- Mọi easing helper (`easeOutExpo`, `easeOutCubic`, …) phải **định nghĩa trong cùng `<script>`** trước khi dùng.',
        '- Mọi `document.getElementById(...)` phải khớp `id` trong DOM; trước khi set `.style` kiểm tra `if (el) { ... }`.',
        `- Timing animation dùng **local beat time** 0…${total} (biến \`t\` / \`time\`), không hard-code giây tuyệt đối clip dài.`,
        '- **Cấm** `setInterval`, `setTimeout`, `requestAnimationFrame` loop, GSAP timeline, CSS `@keyframes` / `transition` cho motion chính.',
        '- Đóng ngoặc `{}` cân bằng — syntax error trong `<script>` làm **toàn bộ** beat không chạy.',
        '',
    ].join('\n');
}

export function buildBeatDivisionSingleOutputRulesBlock(options?: {
    relaxDurationBounds?: boolean;
}): string {
    void options;
    const durationRules = [
        '## Beat duration (khuyến nghị phân bố nội dung — không validate cứng)',
        '- **Khuyến nghị** mỗi beat khoảng **5–20s** để AI phân bố ý/visual hợp lý khi chia beat.',
        '- Beat ngắn hơn/dài hơn vẫn **được chấp nhận** nếu khớp đoạn audio và phủ liên tục 0 → totalVideoSec.',
        '- Pipeline **không** tách/gộp lại beat trong code — beat-map trả về giữ nguyên.',
        '- Chỉ bắt buộc: durationSec > 0, sections liên tục, không overlap/gap.',
    ];

    return [
        '## OUTPUT — đúng 1 artifact duy nhất (bắt buộc)',
        '- Trả về **một JSON object** beat-map duy nhất — không HTML, không nhiều file.',
        '- **Cấm** trả kèm file HTML, beat HTML mẫu, hoặc nhiều JSON riêng lẻ.',
        '- **Cấm** markdown fence trong response cuối — chỉ JSON thuần.',
        '',
        ...durationRules,
        '',
    ].join('\n');
}
