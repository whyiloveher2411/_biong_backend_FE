# Hook Title Impact Box — beat 1 bắt buộc

**Đọc kèm:** [keyword-highlighting.md](keyword-highlighting.md) · [kinetic-typography-brief.md](kinetic-typography-brief.md) · [beat-progress-bar.md](beat-progress-bar.md) · [box-animation-catalog.md](box-animation-catalog.md)

---

## Khi dùng

**BẮT BUỘC DÙNG ĐÚNG TEMPLATE — KHÔNG BIẾN THỂ** cho `beat_1` / `narrative_role: hook` — khung hình đầu tiên luôn là title plate, không hero text trần.

| Thuộc tính | Giá trị |
|------------|---------|
| Layout | Plate centered ~85% width |
| Style cố định | `.plate-rust` — thiết rỉ sét (duy nhất) |
| **Nội dung title** | **`article_title`** / `marketing_post_title` từ `get_context` — **tên bài viết gốc** |
| Title | `clamp(52px, 5vw, 72px)`, `font-weight: 800`, trắng |
| Keyword | solid sáng (cyan/vàng) — cấm gradient clip |
| Khung | 4× `.hook-corner` L-bracket + `border-3d` + `fx-shine` + `fx-breathe` |

**Cấm beat 1:** `news_editorial_stack` hero trần, `#N/9`, `section-label`, `plate-wood`, `hook-title-frame`, **`title` record short video** (có ` — Short video #N`).

---

## Nguồn text `.hook-title-text` (bắt buộc)

| Dùng | Không dùng |
|------|------------|
| `get_context.article_title` | `get_context.title` (CMS record có suffix) |
| `creative_brief.marketing_post_title` | `phrase_anchor` hook VO |
| `assets/agent-metadata.json` → `article_title` (bootstrap) | Câu shock / hook narration |

- **`.hook-title-text`** = **tên bài viết** (marketing post), highlight keyword bằng `.kw-*`
- **Hook VO / câu mở** → đặt ở `.quote-box` hoặc `.context-chip` bên dưới plate
- **Cấm** chuỗi `Short video #` trong `.hook-title-text`
- **`index.html` `<title>`** cũng chỉ dùng `article_title`, không suffix

---

## CẢNH BÁO QUAN TRỌNG

Beat 1 PHẢI dùng CHÍNH XÁC template plate-rust bên dưới. KHÔNG tùy chỉnh:

- KHÔNG đổi màu nền / viền
- KHÔNG bỏ hook-corner
- KHÔNG bỏ fx-shine / fx-breathe
- KHÔNG đổi structure HTML

Mọi video từ v8 trở đi PHẢI tuân thủ template này không ngoại lệ.

---

## HTML mẫu (plate-rust)

```html
<div class="hook-title-plate plate-rust fx-breathe border-3d">
  <span class="hook-corner hook-corner-tl" aria-hidden="true"></span>
  <span class="hook-corner hook-corner-tr" aria-hidden="true"></span>
  <span class="hook-corner hook-corner-bl" aria-hidden="true"></span>
  <span class="hook-corner hook-corner-br" aria-hidden="true"></span>
  <div class="hook-title-box fx-shine">
    <h1 class="hook-title-text">
      Doanh nghiệp đang bắt <span class="kw kw-tech">AI</span> nói chuyện như người tiền sử
    </h1>
  </div>
</div>
```

---

## CSS — plate-rust

```css
.hook-title-plate {
  position: relative;
  width: min(920px, 92%);
  margin: 0 auto;
  padding: 14px;
  border: 3px solid rgba(255, 180, 120, 0.55);
  box-shadow:
    inset 0 5px 0 rgba(255, 220, 180, 0.35),
    inset 0 -5px 0 rgba(0, 0, 0, 0.55),
    0 8px 24px rgba(0, 0, 0, 0.45);
  background:
    linear-gradient(145deg, #5c1a12 0%, #8b2e1a 35%, #6b2218 70%, #4a1510 100%);
}
.hook-title-plate::before {
  content: "";
  position: absolute;
  inset: 0;
  opacity: 0.35;
  pointer-events: none;
  background-image: url("data:image/svg+xml,..."); /* feTurbulence noise */
  mix-blend-mode: overlay;
}
.hook-corner {
  position: absolute;
  width: 28px;
  height: 28px;
  border: 3px solid rgba(255, 240, 220, 0.9);
  pointer-events: none;
}
.hook-corner-tl { top: 4px; left: 4px; border-right: none; border-bottom: none; }
.hook-corner-tr { top: 4px; right: 4px; border-left: none; border-bottom: none; }
.hook-corner-bl { bottom: 4px; left: 4px; border-right: none; border-top: none; }
.hook-corner-br { bottom: 4px; right: 4px; border-left: none; border-top: none; }
.hook-title-box {
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(180, 40, 30, 0.95), rgba(120, 20, 15, 0.98)) !important;
  border: 2px solid rgba(255, 140, 80, 0.5) !important;
  padding: 32px 28px;
  border-radius: 2px;
}
.hook-title-text {
  font-size: clamp(52px, 5vw, 72px);
  font-weight: 800;
  line-height: 1.12;
  text-align: center;
  color: #fff;
  text-shadow: 0 3px 8px rgba(0, 0, 0, 0.75);
}
.hook-title-text .kw-tech { color: #22d3ee; }
.hook-title-text .kw-action { color: #ffea00; }
```

Reuse `.fx-shine::after` + `@keyframes shine-sweep` từ [box-animation-catalog.md](box-animation-catalog.md) hoặc `assets/global-default-styles.css`.

---

## Minimum elements (beat 1)

≥5: `hook-title-plate`, `hook-title-box`, `hook-title-text`, `hook-corner`×4, `quote-box` hoặc `context-chip`, `deco-icon`, `particle`.
