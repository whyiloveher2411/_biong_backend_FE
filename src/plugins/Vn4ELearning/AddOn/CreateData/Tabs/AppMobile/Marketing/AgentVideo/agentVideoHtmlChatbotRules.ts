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
        '## BẮT BUỘC — Safe Zones (semantic bounding box) + Background full-bleed',
        '- Kích thước canvas là **1080x1920** (tỉ lệ 9:16).',
        '- **Critical foreground** (text đọc được, card, chart, ảnh hero mang thông tin) phải nằm **hoàn toàn** trong vùng `x = 48–1032`, `y = 80–1560`.',
        '- **Bottom / top reserved bands:** y = 0–80 (logo) và y = 1560–1920 (band dưới ~360px) — **không** đặt nội dung thiết yếu.',
        '- Band dưới **bắt buộc trống content** vì overlay khi đăng (tên channel, mô tả, progress, UI Facebook/TikTok/Reels) và karaoke layer (nếu bật) sẽ che vùng này.',
        '- Karaoke/caption/logo do layer riêng khi render final — **không** dùng band dưới cho text graphic beat.',
        '- **Background full-bleed (bắt buộc):** gradient, mesh, grain, vignette, glow phủ **toàn canvas** kể cả band đáy — vùng dưới có nền, không có content sát mép.',
        '- Ambient decoration / particle không mang thông tin có thể đi qua safe zone nếu không làm giảm khả năng đọc overlay nền tảng / karaoke.',
        '- Hero visual có thể chạm hoặc crop ở biên nếu phần mang thông tin vẫn trong safe zone.',
        '- **Cấu trúc scaffold (bắt buộc):**',
        '  1. `.bg-layer` — con trực tiếp của `#stage`, `position:absolute; inset:0; z-index:0; pointer-events:none`.',
        '  2. `.content-area` — con trực tiếp của `#stage`, `position:absolute; top:80px; right:48px; bottom:360px; left:48px; z-index:1` — **không** flex-center mặc định; layout tự do trong vùng này.',
        '- **Cấm** đặt nền trang trí chỉ trong `.content-area` (sẽ trống band đáy) — nền thuộc `.bg-layer`.',
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
        '- **CẤM** logo artwork, wordmark, watermark trong HTML beat — brand overlay do layer riêng khi render final. Proper noun dạng text trung tính chỉ khi có trong metadata (xem Text & branding).',
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
        '## JavaScript runtime contract (bắt buộc — preview CMS)',
        '- Preview timeline gọi `dispatchEvent(new CustomEvent(\'hf-seek\', { detail: { time } }))` — **phải giữ** listener `hf-seek`.',
        '- **Cấm** chỉ gán `window.render = render` mà không có `hf-seek` — animation sẽ **đứng im**.',
        '- Dùng `let t = 0` (global) + `function render()` **không tham số**. Trong `render()`: `const time = clamp(Number.isFinite(Number(t)) ? Number(t) : 0, 0, DURATION)`.',
        '- **Cấm** `function render(t)` — khi gọi `render()` không đối số, `t` bên trong = `undefined` → animation hỏng.',
        '- **Được phép** thêm pure helper / easing / DOM reference cache trong cùng `<script>`.',
        '- **Không được đổi:** `const DURATION`, global `let t`, tên/signature `function render()`, event name `hf-seek`.',
        '- Mọi `document.getElementById(...)` phải khớp `id` trong DOM; trước khi set `.style` kiểm tra `if (el) { ... }`.',
        `- Timing dùng **local beat time** 0…${total} — không hard-code giây tuyệt đối của clip dài.`,
        '- **Cấm** `setInterval`, `setTimeout`, `requestAnimationFrame` loop, GSAP timeline, CSS `@keyframes` / `transition` cho motion chính phụ thuộc thời gian.',
        '- **Cấm** `Math.random()` — variation phải deterministic (index + time).',
        '- `render()` phải cho cùng frame khi gọi nhiều lần với cùng `t`; không create/destroy hàng loạt DOM mỗi frame.',
        '- Trong `render()`: cập nhật DOM cho **mọi** `time` từ 0 đến DURATION — không return sớm khiến frame đứng.',
        '- Đóng ngoặc `{}` cân bằng — syntax error trong `<script>` làm **toàn bộ** beat không chạy.',
        '',
    ].join('\n');
}

export function buildBeatDivisionSingleOutputRulesBlock(options?: {
    relaxDurationBounds?: boolean;
}): string {
    const relax = Boolean(options?.relaxDurationBounds);
    const durationRules = relax
        ? [
            '## Beat duration (khuyến nghị phân bố nội dung — không validate cứng)',
            '- **Khuyến nghị** mỗi beat khoảng **5–20s** khi phù hợp; intro/outro có thể ngắn, beat repo có thể dài.',
            '- Beat ngắn hơn/dài hơn vẫn **được chấp nhận** nếu khớp đoạn audio và phủ liên tục 0 → totalVideoSec.',
            '- Pipeline **không** tách/gộp lại beat trong code — beat-map trả về giữ nguyên.',
            '- Chỉ bắt buộc: durationSec > 0, sections liên tục, không overlap/gap.',
        ]
        : [
            '## Beat duration & cắt theo nội dung (không validate cứng)',
            '- **Ưu tiên cấu trúc nội dung** — không target số beat theo công thức giây cố định.',
            '- Soft hint: tránh beat **< ~3s** hoặc **> ~30s** khi vẫn giữ nguyên câu; nếu ý quá dài, tách ở **cuối câu** gần biên hợp lý — **cấm** cắt giữa câu chỉ để “vừa giây”.',
            '- **Cắt beat** chỉ tại **cuối câu** (sau `.?!…`) hoặc sau **xuống dòng**; **không bao giờ** đặt `endSec` giữa cụm từ đang nói dở.',
            '- Neo `startSec`/`endSec` theo Whisper tại biên câu đó (cuối từ cuối câu / trước từ đầu câu sau).',
            '- Pipeline **không** tách/gộp lại beat trong code — beat-map trả về giữ nguyên.',
            '- Chỉ bắt buộc: durationSec > 0, sections liên tục, không overlap/gap.',
        ];

    return [
        '## OUTPUT — đúng 1 artifact duy nhất (bắt buộc)',
        '- Trả về **một JSON object** beat-map duy nhất — không HTML, không nhiều file.',
        '- **Cấm** trả kèm file HTML, beat HTML mẫu, hoặc nhiều JSON riêng lẻ.',
        '- **Cấm** markdown fence trong response cuối — chỉ JSON thuần.',
        "- Trong mọi field string (`visual_description`, `background`, `phrase_anchor`, …): **cấm nháy kép thô** `\"` — dùng nháy đơn `'` hoặc escape `\\\"`.",
        '',
        ...durationRules,
        '',
    ].join('\n');
}
