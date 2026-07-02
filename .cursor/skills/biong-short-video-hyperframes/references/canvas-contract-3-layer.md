# Canvas contract — thiết kế 3 lớp (bắt buộc mỗi beat)

Mọi phân cảnh trong beat HTML **bắt buộc** dựng theo 3 lớp. **Cấm** layout phẳng đơn sơ (một div text trên nền màu).

**Đọc kèm:** [hyperframes-theme-init.md](hyperframes-theme-init.md) · [layout-9x16-zones.md](layout-9x16-zones.md) · [typography-be-vietnam-pro.md](typography-be-vietnam-pro.md)

---

## Lớp 1 — Canvas nền (global `index.html`, không trong beat)

| Bắt buộc | Cấm |
|----------|-----|
| `ambient-layer.html` opacity **1.0** — gradient + particles + mesh | Beat `.bg-animated` opaque che stock |
| `stock-bg` video opacity **0.1–0.15** (khuyến nghị 0.11) trên ambient | Stock opacity > 0.2 làm lộ B-roll quá đậm |
| Beat `#root` / `.scene-root` **transparent** | Nền flat `#0B0F1A` opaque trong beat |

```css
.scene-root {
  /* transparent — stock/grain ở layer dưới */
  background: transparent !important;
}
.ambient-gradient {
  background: linear-gradient(165deg, #0B0F19 0%, #12182a 45%, #1a1035 100%);
}
```

---

## Lớp 2 — UI cards / assets (trung cảnh)

Mọi khối thông tin, chart, meme frame **phải** nằm trong card:

```css
.ui-card {
  border-radius: 24px; /* rounded-2xl */
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  background: rgba(255, 255, 255, 0.06);
}
```

- Bo góc lớn `border-radius ≥ 16px`
- Viền phát sáng mỏng
- Đổ bóng đa tầng sâu — tạo chiều sâu 3D
- Glassmorphism trên support blocks

**Cấm:** list bullet text thuần không card; chip 4-in-a-row font nhỏ.

---

## Lớp 3 — Dynamic typography (tiền cảnh)

| Bắt buộc | Cấm |
|----------|-----|
| **Be Vietnam Pro** local — [typography-be-vietnam-pro.md](typography-be-vietnam-pro.md) | `system-ui` / Inter / Syne CDN |
| Hero ≥64px; support title ≥36px; body ≥28px | Label 14–18px on-screen |
| Highlighter / marker sync caption timing | Chữ chạy đều không nhấn |
| Stat → registry `stat-motion` / chart | Plain text số liệu |

Highlighter pattern: xem `.agents/skills/hyperframes/references/css-patterns.md` § Highlight Mode.

---

## Cấu trúc HTML mẫu

```html
<div class="scene-root">
  <div class="content-cluster">
    <div class="hero-block">
      <div class="ui-card hero-stat"><!-- registry stat-motion --></div>
    </div>
    <div class="support-block">
      <div class="ui-card insight-grid"><!-- bento 2x2, gap ≥24px --></div>
    </div>
  </div>
</div>
```

---

## Preflight

- `check-typography-spacing.mjs` — font min, gap, max items/row
- `check-visual-density.mjs` — glass/ui-card, anti text-only

---

## Anti-patterns (từ production)

| Sai | Đúng |
|-----|------|
| 4 chip ngang font 14px | Bento 2×2 hoặc vertical cascade, title ≥36px |
| Screen split: headline trái, cards phải | `stack_center` + `vs_row` — headline trên, cards dưới |
| Stat `22.000` trong div thuần | `stat-motion` + label card |
| Hero to, support chip nhỏ chật | Cùng scale typography; gap ≥24px |
| Một màu nền + text | 3 lớp gradient + glass + dynamic type |
