# Overlay layer stack — caption & watermark luôn trên cùng

**Nguyên nhân karaoke/logo bị chìm:** HyperFrames dùng **CSS `z-index`** cho thứ tự vẽ — **KHÔNG** dùng `data-track-index`.

> `data-track-index` chỉ kiểm soát **overlap thời gian** (lint), không phải front/back.
> Nguồn: `.agents/skills/hyperframes-core/references/tracks-and-clips.md`

---

## Stack z-index bắt buộc (1080×1920)

| Layer | z-index | Nội dung |
|-------|---------|----------|
| Beat backgrounds / blooms | 0–5 | Gradient, decor full-bleed |
| Beat content (hero, cards) | 10–50 | Text, diagram, stock trong beat |
| Caption host clip (`index.html`) | **9000** | Sub-composition karaoke |
| Watermark host clip (`index.html`) | **9500** | Sub-composition brand |
| (Cấm beat > 100) | — | Beat không được vượt 9000 |

---

## Thứ tự DOM trong `#root` (bắt buộc)

```html
<div id="root" data-composition-id="main">
  <!-- 1. Beats (z-index thấp) -->
  <section class="clip scene" style="z-index:10" ... data-track-index="1">...</section>

  <!-- 2. Caption — SAU tất cả beats, TRƯỚC watermark -->
  <div class="clip hf-overlay-caption"
       data-composition-src="compositions/captions.html"
       data-start="0"
       data-duration="{totalVideoSec}"
       data-track-index="20"
       style="position:absolute;inset:0;z-index:9000;pointer-events:none;">
  </div>

  <!-- 3. Watermark — CUỐI #root -->
  <div class="clip hf-overlay-brand"
       data-composition-src="compositions/brand-watermark.html"
       data-start="0"
       data-duration="{totalVideoSec}"
       data-track-index="21"
       style="position:absolute;inset:0;z-index:9500;pointer-events:none;">
  </div>
</div>
```

**Luật DOM:** caption host và watermark host phải là **con trực tiếp** của `#root`, **sau** mọi beat section.

---

## Sub-composition — nền trong suốt (bắt buộc)

Caption và watermark **cấm** nền opaque — sẽ che toàn frame:

```css
html, body {
  width: 1080px;
  height: 1920px;
  overflow: hidden;
  background: transparent !important;
}
```

### Caption (`compositions/captions.html`)

```css
.caption-root {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}
.caption-group {
  position: absolute;
  left: 50%;
  bottom: 12%;
  transform: translateX(-50%);
  z-index: 2;
}
.caption-word--active {
  z-index: 3;
}
/* Pill/karaoke: đảm bảo chữ contrast trên mọi nền */
.caption-pill, .caption-text {
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.55);
}
```

Sau `npx hyperframes add caption-pill-karaoke` — **patch** file caption: `background: transparent` trên body, z-index trên `.caption-*`.

### Watermark (`compositions/brand-watermark.html`)

**Cấu trúc bắt buộc:** `#root` full canvas `1080×1920` (`position:relative`) → child `.brand-wrap` có `left`/`top`. **Cấm** đặt positioning trên `#root` — HyperFrames lệch logo. Sinh bằng `gen-brand-watermark.mjs`.

```css
#root {
  position: relative;
  width: 1080px;
  height: 1920px;
}
.brand-wrap {
  position: absolute;
  left: 28px;
  top: 28px;
  z-index: 10;
  /* contrast trên nền sáng/tối */
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.5));
}
.brand-wrap span {
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
}
```

---

## Track index (chỉ temporal — gợi ý)

| Track | Clip |
|-------|------|
| 1 | Beat scenes (không overlap thời gian trên cùng track) |
| 10 | Narration audio |
| 11 | BGM global |
| 20 | Caption host (full duration) |
| 21 | Watermark host (full duration) |

---

## Preflight bắt buộc trước render final

```bash
node .cursor/skills/biong-short-video-preflight/scripts/check-overlay-stack.mjs \
  storage/agent-renders/{id}/my-video
```

Hoặc invoke skill `/biong-short-video-preflight`.

**Cấm** `hyperframes render --quality high` khi script exit ≠ 0.

---

## Anti-patterns

| Sai | Hậu quả | Đúng |
|-----|---------|------|
| Tin track 99 = trên cùng | Logo/caption chìm | z-index 9000 / 9500 |
| Caption trước beat trong DOM | Beat che caption | Caption host sau beats |
| `body { background: #fff }` trong captions.html | Che cả frame | `transparent` |
| Watermark chỉ beat G | Lúc có lúc không | `data-duration=totalVideoSec` |
| Karaoke inline trong beat | z-index beat thấp | Sub-composition host 9000 |

---

## Checklist

- [ ] `#root` có `.hf-overlay-caption` với `z-index:9000`
- [ ] `#root` có `.hf-overlay-brand` với `z-index:9500`
- [ ] Caption host **sau** beats trong DOM
- [ ] Watermark host **cuối** `#root`
- [ ] `compositions/captions.html` + `brand-watermark.html` tồn tại
- [ ] Sub-composition body `background: transparent`
- [ ] `check-overlay-stack.mjs` pass
