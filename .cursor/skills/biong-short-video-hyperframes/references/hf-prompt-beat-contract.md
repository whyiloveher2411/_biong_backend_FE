# HF Prompt Beat Contract — adapter playground → agent beat

Đọc **trước** khi viết `compositions/beat_N.html`. Mỗi beat dùng 1 prompt type từ `hyperframes/prompts/{hf_prompt_type}.md` + contract này.

**Đọc kèm:** [hf-prompt-catalog.md](hf-prompt-catalog.md) · [hf-prompt-art-direction.md](hf-prompt-art-direction.md) · [overlay-layer-stack.md](overlay-layer-stack.md) · [typography-be-vietnam-pro.md](typography-be-vietnam-pro.md)

---

## Playground vs agent beat

| Playground (`hyperframes/prompts/*.md`) | Agent beat sub-composition |
|----------------------------------------|----------------------------|
| Full `<!doctype html>` standalone | Fragment trong project HyperFrames — mount qua `index.html` beat-host |
| `data-duration="60"` cố định | `data-duration` = `beat-map.json` → `sections[i].durationSec` (5–20s) |
| Nền cream/ink opaque | `#root` + `.scene-root` **transparent** — nền từ `ambient-layer` + stock bg |
| System fonts only | **Be Vietnam Pro** từ `assets/fonts/` (override playground) |
| No external images | Cho phép `assets/images/` từ MCP (accent_media, marketing_post_images) |
| Arc 0–20% / 20–80% / 80–100% trên 60s | Arc **tương đối** trên beat duration; element timing **từ Whisper** |

---

## Cấu trúc HTML bắt buộc

```html
<div id="root" data-composition-id="beat_3" data-duration="8.4">
  <div class="scene-root">
    <div id="stage"><!-- layout theo prompt type --></div>
  </div>
</div>
<style>
  @font-face {
    font-family: "Be Vietnam Pro";
    src: url("../assets/fonts/BeVietnamPro-Bold.woff2") format("woff2");
    font-weight: 700;
  }
  #root, .scene-root { background: transparent !important; }
  :root {
    --cream:#f6f5f1; --cream-2:#efece4; --ink:#0a0a0a; --mute:#6b6862;
    --line:#e3dfd3; --signal:#ff3b1f; --signal-2:#ff6a4a; --frame:#ffb800;
    --green:#1f8a5b; --blue:#2b66ff;
  }
  body, #stage {
    margin: 0;
    width: 1080px;
    height: 1920px;
    overflow: hidden;
    font-family: "Be Vietnam Pro", ui-sans-serif, system-ui, sans-serif;
    color: var(--ink);
  }
</style>
<script>
  let t = 0;
  const DURATION = 8.4; /* khớp data-duration */
  const TIMINGS = [/* embed từ assets/beat-timing/beat_3.json */];

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }

  function render() {
    const time = clamp(t, 0, DURATION);
    /* pure function of time — cập nhật DOM/canvas theo TIMINGS */
  }

  addEventListener("hf-seek", (e) => { t = e.detail.time; render(); });
  render();
</script>
```

---

## Timing từ Whisper (bắt buộc)

1. Chạy `build-beat-element-timing.mjs` sau `map-shot-plan-to-beat-map.mjs`
2. Đọc `assets/beat-timing/beat_N.json`
3. Mỗi element: `show_at_local_sec = whisper_start - beat.startSec`
4. Trong `render()`: element visible khi `t >= show_at_local_sec`
5. Stagger word groups 60–140ms nếu nhiều element cùng cụm thoại

**Cấm** đoán timing bằng mắt — phải dùng JSON từ pipeline.

---

## Motion contract (`t`-based)

- **Bắt buộc:** `addEventListener('hf-seek')` + `function render()` pure function of `t`
- **Cấm:** `gsap.timeline`, `setInterval`, `setTimeout`, CSS `@keyframes` animation, CSS `transition` chained off class toggles
- **Cấm:** `Math.random()`, `Date.now()`, `performance.now()` runtime — seed từ `t` + index nếu cần
- **Cho phép:** `transform`/`opacity`/`clip-path`/`mask-image` keyed off `t`; inline SVG `stroke-dashoffset`; canvas redraw

Pattern helper (tham chiếu `storage/agent-renders/15/cinematic-title-cv-robot.html`):

```javascript
function maskReveal(el, localT, start, dur, axis) {
  const p = easeOutCubic(clamp((localT - start) / dur, 0, 1));
  if (axis === "vertical") {
    el.style.clipPath = `inset(${(1 - p) * 100}% 0 0 0)`;
  } else {
    el.style.clipPath = `inset(0 ${(1 - p) * 100}% 0 0)`;
  }
}
```

---

## Media layers (giữ nguyên pipeline)

| Layer | Nguồn | Ghi chú |
|-------|-------|---------|
| Ambient | `compositions/ambient-layer.html` | GSAP paused — track riêng, không trong beat |
| Stock bg | `index.html` stock video | opacity 0.1–0.15, không trong beat |
| Accent | Giphy/Lottie theo shot-plan | Trong beat, local `assets/images/` |
| Caption | `compositions/captions.html` | z-index 9000 — không duplicate trong beat |
| Watermark | `compositions/brand-watermark.html` | z-index 9500 |

Beat **không** embed BGM/narration — đã có trong `index.html`.

---

## Cấm (legacy — đã gỡ)

- `npx hyperframes add` registry hero blocks
- `.hook-title-plate`, `.plate-rust`, `.border-3d`, `.ui-card` catalog cũ
- `.content-cluster` bắt buộc (layout tự do theo prompt type)
- `window.__timelines["beat_N"]` GSAP beat timeline
- `layout_archetype`, `render_stack`, `registry_block` trong shot-plan

---

## Preflight

`check-hf-seek-beat.mjs` validate mỗi beat. `check-visual-density.mjs` validate shot-plan `hf_prompt_type`.

---

## Workflow mỗi beat

1. Đọc `@hyperframes/prompts/{hf_prompt_type}.md`
2. Đọc `assets/beat-timing/beat_N.json`
3. Viết `compositions/beat_N.html` theo aesthetic prompt + contract này
4. `data-duration` khớp beat-map ±0.1s
