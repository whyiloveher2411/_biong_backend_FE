# Overlay layer stack — caption & watermark luôn trên cùng

**Nguyên nhân karaoke/logo bị chìm:** HyperFrames dùng **CSS `z-index`** cho thứ tự vẽ — **KHÔNG** dùng `data-track-index`.

> `data-track-index` chỉ kiểm soát **overlap thời gian** (lint), không phải front/back.
> Nguồn: `.agents/skills/hyperframes-core/references/tracks-and-clips.md`

---

## Stack z-index bắt buộc (1080×1920)

| Layer | z-index | Nội dung |
|-------|---------|----------|
| Ambient animation (base) | **2–6** | `ambient-layer.html` — gradient, particles, mesh — **opacity 1.0** |
| Stock / video bg | **7–10** | Pexels B-roll — **opacity 0.1–0.15** (khuyến nghị 0.11), trên ambient |
| Decorative floaters | 80–150 | Orbs, giphy sticker, lines (trong beat) |
| Hero (registry block, headline) | 200–450 | data-chart, flowchart, kinetic hero |
| Support (chips, badges) | 450–650 | Metadata, secondary UI |
| Accent Lottie / sticker | 650–800 | `window.__hfLottie` hosts |
| Beat progress bar (`index.html`) | **8990** | Thanh tiến trình liên tục — [beat-progress-bar.md](beat-progress-bar.md) |
| Caption host clip (`index.html`) | **9000** | Sub-composition karaoke |
| Watermark host clip (`index.html`) | **9500** | Sub-composition brand |
| (Cấm content > 850) | — | Không được gần caption band |

Map `z_role` từ `visual_shot_plan` → band: xem [visual-shot-plan.md](visual-shot-plan.md).

---

## Thứ tự DOM trong `#root` (bắt buộc)

```html
<div id="root" data-composition-id="main">
  <!-- 1. Ambient animation — DƯỚI CÙNG, opacity 1 -->
  <div class="clip hf-ambient-layer" data-composition-src="compositions/ambient-layer.html"
       data-composition-id="ambient" data-start="0" data-duration="{totalVideoSec}"
       style="position:absolute;inset:0;z-index:4;pointer-events:none;"></div>

  <!-- 2. Stock video — TRÊN ambient, opacity thấp (0.1–0.15) -->
  <div class="stock-bg-wrap" style="position:absolute;inset:0;z-index:7;pointer-events:none;">
    <video class="stock-bg" ...></video>
  </div>

  <!-- 3. Beat sections (z 80–800 theo z_role) -->
  <section class="clip scene" style="z-index:320" ... data-track-index="1">...</section>

  <!-- 3. Beat progress — trước caption -->
  <div class="beat-progress-host" style="position:absolute;top:0;left:0;width:1080px;height:4px;z-index:8990;pointer-events:none">
    <div class="beat-progress-track" style="background:transparent"><div class="beat-progress-fill"></div></div>
  </div>

  <!-- 4. Caption — SAU beats, TRƯỚC watermark -->
  <div class="clip hf-overlay-caption"
       data-composition-src="compositions/captions.html"
       data-start="0"
       data-duration="{totalVideoSec}"
       data-track-index="20"
       style="position:absolute;inset:0;z-index:9000;pointer-events:none;">
  </div>

  <!-- 4. Watermark — CUỐI #root -->
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

Caption, watermark, ambient **cấm** nền opaque — sẽ che toàn frame:

```css
html, body {
  width: 1080px;
  height: 1920px;
  overflow: hidden;
  background: transparent !important;
}
```

### Ambient (`compositions/ambient-layer.html`)

- `data-composition-id="ambient"` khớp `window.__timelines["ambient"]`
- z-index host **2–6** (dưới stock video)
- Invoke `/continuous-motion`

### Caption (`compositions/captions.html`)

```css
.caption-root {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}
.caption-group-wrap {
  position: absolute;
  left: 50%;
  bottom: 180px;  /* ~9.4% canvas — caption band, tránh platform description overlay */
  transform: translateX(-50%);
  z-index: 2;
}
.caption-group {
  position: absolute;
  left: 0;
  bottom: 0;
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

### Watermark (`compositions/brand-watermark.html`)

**Cấu trúc bắt buộc:** `#root` full canvas → child `.brand-wrap`. Sinh bằng `gen-brand-watermark.mjs`.

---

## Track index (chỉ temporal — gợi ý)

| Track | Clip |
|-------|------|
| 1 | Beat scenes |
| 2 | Ambient layer host |
| 10 | Narration audio |
| 11 | BGM chain segment 1 |
| 12 | Hook SFX |
| 13 | BGM chain segment 2 |
| 15 | BGM chain segment 3 |
| 17 | BGM chain segment 4 |
| 19 | BGM chain segment 5 |
| 20 | Caption host (full duration) |
| 21 | Watermark host (full duration) |

---

## Preflight bắt buộc trước render final

```bash
node .cursor/skills/biong-short-video-preflight/scripts/check-overlay-stack.mjs storage/agent-renders/{id}/my-video
node .cursor/skills/biong-short-video-preflight/scripts/check-continuous-motion.mjs storage/agent-renders/{id}/my-video
```

---

## Anti-patterns

| Sai | Hậu quả | Đúng |
|-----|---------|------|
| Mọi beat z≤50 (phẳng) | Slideshow feel | Hero z 200–450, floaters 80–150 |
| Tin track 99 = trên cùng | Logo/caption chìm | z-index 9000 / 9500 |
| Stock full-bleed z=300 che UI | Mất registry hero | Stock bg z 7–10, opacity 0.1–0.15 **trên** ambient |
| Beat z > 850 | Gần caption | Content max ~800 |
| Caption trước beat trong DOM | Beat che caption | Caption sau beats |

---

## Checklist

- [ ] Ambient host z-index 6–10 + `ambient-layer.html`
- [ ] ≥2 distinct z-bands trong 80–800 (preflight)
- [ ] `#root` có `.hf-overlay-caption` z-index:9000
- [ ] `#root` có `.hf-overlay-brand` z-index:9500
- [ ] `check-overlay-stack.mjs` pass
