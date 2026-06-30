# HyperFrames theme init — scaffolding 9:16

**Cấm** `--example=blank` cho production render agent. Blank khiến agent tự viết CSS phẳng — thiếu design system.

**Đọc kèm:** [canvas-contract-3-layer.md](canvas-contract-3-layer.md) · [typography-be-vietnam-pro.md](typography-be-vietnam-pro.md)

---

## Resolve theme (thứ tự ưu tiên)

1. **CMS** `agent_video_json.hf_theme` — nếu ≠ `auto` → khóa theme admin chọn
2. **`visual_shot_plan.hf_theme`** — agent ghi khi CMS = `auto`
3. **Mặc định** `vignelli`

Trả trong `short_video_get_context`: `hf_theme`, `hf_theme_source`, `hf_theme_catalog`.

---

## Catalog 9:16 (portrait-safe)

| Theme | Khi dùng |
|-------|----------|
| `vignelli` | **Mặc định** — tin tức/social, editorial điện ảnh, tương phản cao |
| `kinetic-type` | Hook punch, quote slam, ít chart |
| `warm-grain` | Storytelling ấm, giáo dục, grain ambient |
| `nyt-graph` | Beat data-heavy, nhiều số liệu, biểu đồ |
| `swiss-grid` | So sánh, grid insight, layout Swiss |
| `product-promo` | CTA sản phẩm/app, promo |

**Không dùng** cho 9:16 agent: `play-mode` (16:9), `blank` (production).

### Map nội dung → theme (khi CMS = auto)

| Tín hiệu trong brief / shot-plan | Theme gợi ý |
|----------------------------------|-------------|
| Hook shock, quote ngắn | `kinetic-type` |
| Nhiều stat/chart trong plan | `nyt-graph` |
| Giáo dục, narrative ấm | `warm-grain` |
| So sánh A/B, bento insight | `swiss-grid` |
| CTA app/sản phẩm | `product-promo` |
| Còn lại | `vignelli` |

Ghi `hf_theme` ở root `visual_shot_plan` object hoặc `assets/visual-shot-plan.json` top-level.

---

## Init command

```bash
THEME=vignelli   # resolve từ CMS / shot-plan
npx hyperframes init storage/agent-renders/{id}/my-video \
  --non-interactive --skip-skills \
  --example=${THEME} \
  --resolution portrait
```

---

## Sau init (bắt buộc)

1. **Đọc reference** — mở `index.html` + CSS/token của theme vừa init (tương đương `reference-premium.html`). Copy layering, gradient, shadow — **không** viết layout từ đầu.
2. **Font override** — theme có thể ship Syne/Inter/CDN. **Xóa** `fonts.googleapis.com` / `@import` CDN. Copy Be Vietnam Pro + `@font-face` theo [typography-be-vietnam-pro.md](typography-be-vietnam-pro.md). Giữ design tokens gradient/glass/shadow của theme.
3. **Canvas contract** — mọi beat tuân [canvas-contract-3-layer.md](canvas-contract-3-layer.md).
4. **Registry + beats** — `npx hyperframes add` theo `visual_shot_plan`; viết `compositions/beat_N.html` thủ công.

---

## Motion Director (ép thẩm mỹ)

Đóng vai Motion Director HeyGen khi viết beat HTML:

1. Áp dụng **3 lớp** (background / UI cards / dynamic typography) — không flat layout.
2. Số liệu → `npx hyperframes add stat-motion` hoặc `apple-money-count` — **cấm** plain `<div>22.000</div>`.
3. Meme/logo → `scale` + `rotation: 3`, `ease: "back.out(1.7)"`.
4. Mỗi beat ≥1 layout shift (stagger wave, hero swap, camera push `scale 0.92→1`).

---

## Checklist

- [ ] Theme ≠ `blank` (trừ spike debug local)
- [ ] `--resolution portrait` (1080×1920)
- [ ] Be Vietnam Pro local, không Google Fonts CDN
- [ ] Đã đọc CSS token theme trước khi viết beat
- [ ] `hf_theme` ghi trong shot-plan hoặc CMS
