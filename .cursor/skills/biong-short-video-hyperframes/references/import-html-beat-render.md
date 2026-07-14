# Import HTML Beat Render — chatbot preview → HyperFrames render

Đọc khi `render_mode=import_html` (ghép beat HTML từ admin chatbot).

**Khác creative pipeline:** beat chatbot dùng `hf-seek` trong iframe preview — **ổn**. Render final dùng pipeline **per-beat → concat → overlay → mux audio** (không mount 15 beat trong một document).

---

## Pipeline render (A1 + B1)

```text
assemble
  → normalize beat (scaffold <template> + __timelines; getAttribute src; localize images)
  → mỗi beat: mini index (1 host) → hyperframes render silent MP4
  → ffmpeg concat → visual-silent.mp4
  → overlay index (video underlay + caption + brand + progress + ambient) → visual-with-overlay.mp4
  → ffmpeg mix narration + BGM chain + SFX → renders/final.mp4
```

| Pass | DOM | Mục đích |
|------|-----|----------|
| Per-beat | 1 beat **inline standalone** (`main`, không `composition-src`) | Fidelity ≈ preview iframe |
| Overlay | 1 `<video>` + overlay layers | Karaoke global, watermark, progress |
| Audio mux | ffmpeg | Narration + BGM + sfx_hook + sfx beat-transition |

Mini index thêm: `data-start="0"`, tắt CSS `transition`, hidden `<img>` cho mọi `assets/images/*` trong beat (compiler embed ảnh động).

**Cấm** vá animation beat (rewrite `opacity`/`render()` phase) — không fix fidelity bằng sửa HTML chatbot.

**Per-beat render: `--workers 1`** (capture tuần tự frame 0→N trên 1 Chrome ≈ preview). Overlay: `--workers auto`.

Entry: `node scripts/render-import-html.mjs --short-video-id N`  
Upload ưu tiên `renders/final.mp4`.

---

## Normalize (sau khi ghi beat từ CMS)

```bash
PROJ=storage/agent-renders/{id}/my-video

node .cursor/skills/biong-short-video-preflight/scripts/normalize-import-html-beat-for-render.mjs $PROJ --localize-images
```

Script **chỉ scaffolding** — giữ nguyên CSS, DOM, `render()`:

- Bọc `<template>` (sub-composition HyperFrames)
- Thay `addEventListener('hf-seek')` → GSAP `window.__timelines["beat_N"]` gọi `render(t)`
- Gỡ `prefers-reduced-motion`
- Fix `img.src` compare → `getAttribute('src')` + preload `IMAGES[]`
- `:root` → `#root` (token CSS khi từng dùng overlay/host)
- `--localize-images`: tải ảnh `https://` về `assets/images/`

**CMS giữ HTML gốc** — normalize chỉ trên disk `compositions/`.

Full `index.html` từ assemble vẫn được sinh (wire BGM/SFX metadata, caption files) nhưng **không** còn là pass render visual chính.

---

## Preflight

- `check-import-html-beat-render.mjs` — bắt buộc `import_html`
- `check-hf-seek-beat.mjs` — **skip** `import_html`

---

## Cấm / cho phép

| | import_html assemble / render |
|--|---------------------|
| Cấm | Sửa visual user; vá animation composite; shot-plan creative gen trên import path |
| Cho phép | normalize scaffold; caption/ambient/watermark; BGM chain assets; per-beat render + concat + overlay + audio mix |

---

## Liên quan

- [import-html-assemble-bgm.md](import-html-assemble-bgm.md) — BGM cho assemble
- [overlay-layer-stack.md](overlay-layer-stack.md)
- Scripts: `scripts/lib/build-per-beat-render-index.mjs`, `build-overlay-index.mjs`, `concat-silent-beat-clips.mjs`, `mix-import-html-audio.mjs`
