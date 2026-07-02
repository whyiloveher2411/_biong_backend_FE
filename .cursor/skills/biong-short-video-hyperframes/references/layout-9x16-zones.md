# Layout 9:16 — Agent short video (1080×1920)

Quy tắc bắt buộc phase 2. Mục tiêu: **nội dung chính gom cụm ở giữa dọc**, caption chỉ ở band dưới.

Canvas mặc định: **1080×1920** (portrait TikTok/Reels).

---

## Nguyên tắc cốt lõi — CONTENT CLUSTER (căn giữa dọc)

**Hero + support phải nằm trong MỘT cụm**, căn giữa theo chiều dọc của vùng an toàn (trên caption band). **Cấm** tách hero lên zone trên và support xuống zone dưới khiến hai box cách xa nhau với khoảng trống lớn ở giữa.

```
+----------------------------------+
|  (padding top ~80px)             |
|                                  |
|     ┌─────────────────────┐      |
|     │  HERO (stat/headline)│      |  ← content-cluster
|     │  gap 16–24px         │      |     justify-content: center
|     │  SUPPORT (chart/flow)│      |     trên scene-root
|     └─────────────────────┘      |
|         ↑ tâm cụm ≈ y 42–48%     |
|                                  |
|  CAPTION 78%–100% (karaoke only) |
+----------------------------------+
```

| Vùng | % cao | px (1920h) | Nội dung |
|------|-------|------------|----------|
| Safe content | 4–78% | 80–1498 | **Toàn bộ** `.content-cluster` (hero + support gom lại) |
| Caption | 78–100% | 1498–1920 | Chỉ `compositions/captions.html` |

**Tâm cụm mục tiêu:** `y ≈ 0.44 × 1920` (~845px) — giữa vùng an toàn, không dồn sát top.

---

## Cấu trúc HTML bắt buộc

```html
<div class="scene-root">
  <div class="content-cluster">
    <div class="hero-block">…nội dung chính…</div>
    <div class="support-block">…visual phụ…</div>
  </div>
</div>
```

- `.content-cluster` — **bắt buộc** mọi beat (gom nội dung, căn giữa dọc)
- `.hero-block` + `.support-block` — **tùy chọn**; có thể gộp một block hoặc chỉ hero khi đủ visual
- **Không** ép một khuôn HTML cố định — chọn `layout_variant` phù hợp nội dung (xem bên dưới)
- **Cấm** đặt hero/support trực tiếp dưới `.scene-root` không có cluster

---

## Layout variants (linh hoạt — không gò ép 1 khuôn)

`content-cluster` chỉ quy định **cụm căn giữa dọc** — **không** bắt buộc hero trái / support phải / bento cố định.

Ghi `layout_variant` trong shot-plan (tùy chọn):

| Variant | Khi dùng | Cấu trúc |
|---------|----------|----------|
| `stack_center` | Mặc định — headline + visual dưới | Cột: hero full-width → gap → support |
| `hero_only` | Một stat/quote đủ mạnh | Chỉ hero-block, không support |
| `vs_row` | A vs B (2 card) | Headline trên; support = `flex row` 2 card + `vs` badge, `gap ≥24px` |
| `bento_2x2` | 3–4 insight | Grid 2×2 trong support-block |
| `single_column` | Flow dọc | Support = cột, reveal tuần tự |

**Cấm trên 9:16:**

| Anti-pattern | Vì sao |
|--------------|--------|
| `content-cluster { flex-direction: row }` với headline \| cards | Screen split — hình 2, đọc kém |
| Headline cột trái ~40% + cards cột phải ~60% | Chip bị bó, chữ nhỏ |
| Zone 52% trên / 38% dưới cách xa | Khoảng trống giữa màn hình |

**So sánh A vs B:** dùng `stack_center` + `vs_row` — headline **căn giữa phía trên**, hai card **cùng hàng bên dưới** (không chia màn hình trái/phải).

---

## CSS scaffold (copy vào mỗi beat)

```css
.scene-root {
  width: 1080px;
  height: 1920px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;   /* căn GIỮA cụm theo chiều dọc */
  padding: 80px 48px 360px;  /* bottom = caption keep-out */
  box-sizing: border-box;
}

.content-cluster {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;                 /* hero + support sát nhau */
  width: 100%;
  max-width: 940px;
  min-height: 960px;         /* bắt buộc fill >50% canvas */
  justify-content: center;
}

.hero-block,
.support-block {
  flex: 0 0 auto;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

**Cấm:**
- `flex: 0 0 52%` / `min-height: 480px` trên hero/support — gây tách box trên/dưới
- `justify-content: flex-start` + padding-top lớn trên `.scene-root` — đẩy cụm lên top
- `gap: 28px`+ giữa hero/support khi cluster đã có gap riêng mà vẫn spread zones

---

## Z-depth theo `z_role`

| z_role | z-index | Ghi chú |
|--------|---------|---------|
| `bg_mesh` | 0–2 | Full-bleed |
| `bg_stock` | 3–5 | Stock mờ |
| `ambient` | 6–10 | ambient-layer |
| `floater` | 80–150 | Sticker — **lane phải**, cấm đè text — [floater-text-keepout.md](floater-text-keepout.md) |
| `hero_chart` / `hero_type` | 200–450 | Trong cluster |
| `support` | 200–450 | Trong cluster (cùng band, không tách xa) |

---

## Quy tắc cứng

1. **Bắt buộc** `.content-cluster` + `justify-content: center` trên `.scene-root`.
2. Hero và support **cùng cụm**, khoảng cách **20–32px**.
3. **Cấm** diagram/CTA trong caption band (bottom 360px).
4. Caption sub-composition **tách file** — không inline trong beat.
5. Preflight: nội dung (trừ caption) bottom edge ≥ 360px từ đáy canvas.
6. **Screen fill >50%:** `.content-cluster` phải phủ ≥50% canvas (≥960px chiều cao, không tính caption band). Enforce qua `min-height: 960px` trên `.content-cluster`.

Preflight: `check-screen-fill.mjs` — xem [visual-shot-plan.md](visual-shot-plan.md).

## Typography & spacing (1080×1920)

| Token | Quy tắc |
|-------|---------|
| Hero stat/headline | ≥64px; chiếm ≥40% chiều rộng cluster |
| Support card title | ≥36px |
| Support card subtitle / body | ≥28px |
| Gap hero ↔ support | 20–32px trong `.content-cluster` |
| Gap giữa cards | ≥24px (`gap` flex/grid) |
| Max items / hàng ngang | ≤3; 4+ insight → bento 2×2 hoặc vertical cascade |
| Card min-width | ≥280px hoặc full-width stack |
| Cell min-height (bento) | ≥160px |

Preflight: `check-typography-spacing.mjs` — xem [canvas-contract-3-layer.md](canvas-contract-3-layer.md).

---

## Anti-patterns

| Sai | Đúng |
|-----|------|
| Hero 52% trên + support 38% dưới, giữa trống | Một `.content-cluster` căn giữa dọc |
| Hai box cách nhau cả màn hình | `gap: 20px` trong cluster |
| Headline sát top 15% | Cụm căn giữa ~y 44% |
| Headline trái + cards phải (screen split) | Stack dọc: headline giữa trên → vs row dưới |
| Sticker trái rộng đè chữ card | `floater-lane-right` — floater-text-keepout.md |
| Nền gradient/mesh tĩnh | `stock_video` phủ timeline — dynamic-bg-mandatory.md |
| Karaoke inline trong beat | `compositions/captions.html` overlay |

---

## Tham khảo

- `gsap-beat-checklist.md` — animation mỗi beat
- `visual-layout-archetypes.md` — archetype theo shot plan
