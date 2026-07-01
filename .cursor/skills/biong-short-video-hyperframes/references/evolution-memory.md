# Evolution Memory — Short Video Agent

*Đọc file này TRƯỚC khi viết `compositions/beat_N.html` phase 2. Tái sử dụng premium blocks; tuân constraints.*

**Quy tắc prune:** tối đa 15 premium blocks + 30 lessons. Khi vượt → merge/dedupe entry cũ nhất cùng `layout_archetype`.

**Cấm** sửa `SKILL.md` trong session render — chỉ append file này.

---

## 1. Premium code blocks (reuse first)

### [glass_ui_card] stat_punch_card / bento_grid — Thẻ kính mờ

- **Khi dùng:** số liệu, chi tiết, support cards
- **Cấm:** plain `div` không backdrop-filter cho stat hero

```css
.ui-card.premium-card {
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.6);
  padding: 20px 24px;
  max-width: 85%;
  margin: 0 auto;
}
```

```javascript
tl.fromTo(".premium-card", { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.8, stagger: 0.12, ease: "back.out(1.7)" }, 0.2);
```

### [kinetic_hero_9x16] kinetic_hook_slam — Headline portrait

- **Khi dùng:** hook, punch line 3–5 từ
- **Cấm:** `font-size` > `4.5vw` trên hero 9:16; thiếu `max-width`

```css
.hero-title {
  font-size: clamp(48px, 4vw, 72px);
  font-weight: 800;
  max-width: 85%;
  margin: 0 auto;
  text-align: center;
  line-height: 1.1;
}
```

---

## 2. Lessons learned (constraints)

### [seed] timeline_pattern_c — Blank frame do GSAP global trong timeline local

- **Lỗi phát hiện:** Beat 2+ trống — hero opacity 0 suốt beat vì tween dùng thời gian global (6.15s) trong `window.__timelines["beat_2"]` local.
- **Cách vá:** Chọn pattern A (single `main` timeline, times global) **hoặc** pattern B (mỗi beat file riêng, times local 0-based). **Cấm pattern C.**
- **Rule cứng:** Mỗi project chỉ một timeline pattern; entrance trong `.clip` dùng `fromTo`, không chỉ `from`.

### [seed] video_25 — Logo watermark lệch giữa/trái

- **Lỗi phát hiện:** Logo Spacedev nhảy vị trí — `left`/`top` đặt trên `#root` thay vì `.brand-wrap`.
- **Cách vá:** `gen-brand-watermark.mjs`; `.brand-wrap { left: 28px; top: 28px }`; host `z-index: 9500`, `data-duration=totalVideoSec`.
- **Rule cứng:** Watermark host **cuối** `#root`; cấm gắn watermark vào beat cuối.

### [seed] overlay_z_index — Caption/sticker đè sai

- **Lỗi phát hiện:** GIF sticker đè karaoke; caption chìm dưới hero.
- **Cách vá:** Caption host `z-index: 9000`; watermark `9500`; hero 200–450; floaters ≤150.
- **Rule cứng:** `data-track-index` không quyết định z-order — chỉ CSS `z-index`. Phụ đề luôn trên decorative layers.

---

## 3. Visual evolution log

*(Agent tự điền sau mỗi vision audit — format: `Video #{id}: score X/10 — nhận xét — action`)*

- *(Chưa có entry runtime — agent sẽ append sau render đầu tiên)*
