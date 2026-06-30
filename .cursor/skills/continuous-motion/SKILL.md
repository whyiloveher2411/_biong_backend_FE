---
name: continuous-motion
description: Secondary motion liên tục cho short video agent — ambient timeline repeat -1, parallax, breathe, grain. Invoke Phase 2 trước beat HTML.
---

# continuous-motion

Tách **beat-synced motion** (theo `beat-map.json`) khỏi **ambient motion** (chạy suốt video). Phá dead zone giữa beat mà vẫn giữ GSAP `paused: true` cho HyperFrames render.

**Đọc:** `biong-short-video-hyperframes/references/continuous-motion-patterns.md` · `overlay-layer-stack.md`

## Khi invoke

- Phase 2 render — sau `map-markers-to-timing.mjs`, **trước** viết beat HTML
- Sau `npx hyperframes add grain-overlay` (component)

## Dual-timeline contract

```javascript
window.__timelines = window.__timelines || {};

// Beat-synced — entrance theo beat-map (Pattern A: "main")
const mainTl = gsap.timeline({ paused: true });
// ... beat entrances at global times ...
window.__timelines["main"] = mainTl;

// Ambient — continuous secondary motion
const ambientTl = gsap.timeline({ paused: true, repeat: -1 });
// ... parallax, breathe, grain pulse — duration = loop segment ...
window.__timelines["ambient"] = ambientTl;
```

**Luật:**
- **Cấm** `tl.play()` trên cả hai
- **Cấm** `repeat: -1` trên `main` timeline
- Ambient tweens dùng `repeat: -1` **bên trong** `ambient` timeline — HF seek parent time
- Key `ambient` === `data-composition-id` trên `compositions/ambient-layer.html`

## Sub-composition host

Trong `index.html` — **trước** beat sections, sau bg layers:

```html
<div class="clip hf-ambient-layer"
     data-composition-src="compositions/ambient-layer.html"
     data-composition-id="ambient"
     data-start="0"
     data-duration="{totalVideoSec}"
     data-track-index="2"
     style="position:absolute;inset:0;z-index:8;pointer-events:none;">
</div>
```

## Patterns bắt buộc (≥2 trong ambient)

| Pattern | GSAP |
|---------|------|
| Parallax drift | `fromTo(bg, {x:20, scale:1.05}, {x:-20, scale:1, duration: totalVideoSec, ease:"none"})` |
| Breathe | `to(orb, {scale:1.03, duration:2, yoyo:true, repeat:-1, ease:"sine.inOut"})` |
| Grain pulse | component `grain-overlay` + opacity yoyo |
| Neon sweep | `shimmer-sweep` component hoặc `xPercent` loop |
| Floating orbs | `y: "+=20", duration:4, yoyo:true, repeat:-1, stagger:0.5` |

## Components (registry)

```bash
npx hyperframes add grain-overlay
npx hyperframes add shimmer-sweep
```

Paste HTML/CSS vào `compositions/ambient-layer.html` — nền `transparent`.

## Preflight

```bash
node .cursor/skills/biong-short-video-preflight/scripts/check-continuous-motion.mjs <project-dir>
```

## Anti-patterns

| Sai | Đúng |
|-----|------|
| Chỉ có `main` timeline | Cả `main` + `ambient` |
| Frame đứng im giữa beat | Ambient chạy liên tục |
| Ken-Burns trên stock freeze | Parallax trên composed layer / gradient |
| `repeat:-1` trên main | Chỉ trên ambient |
