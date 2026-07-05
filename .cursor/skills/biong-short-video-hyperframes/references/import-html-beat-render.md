# Import HTML Beat Render — chatbot preview → HyperFrames render

Đọc khi `render_mode=import_html` (ghép beat HTML từ admin chatbot).

**Khác creative pipeline:** beat chatbot dùng `hf-seek` trong iframe preview — **ổn**. HyperFrames render sub-composition cần `<template>` + `window.__timelines["beat_N"]`.

---

## Vấn đề

| Môi trường | Cơ chế animation | HTML chatbot |
|------------|------------------|--------------|
| Admin preview (iframe) | `dispatchEvent('hf-seek')` | ✓ chạy |
| HyperFrames render | `window.__timelines[id]` seek | ✗ crash `Illegal invocation` nếu không normalize |

Triệu chứng render: beat tĩnh, log `Composition script failed beat_N`, `Sub-composition timelines not registered`.

---

## Giải pháp (bắt buộc sau khi ghi beat từ CMS)

```bash
PROJ=storage/agent-renders/{id}/my-video

# Sau bước ghi compositions/beat_N.html từ import_html.beat_html CMS:
node .cursor/skills/biong-short-video-preflight/scripts/normalize-import-html-beat-for-render.mjs $PROJ --localize-images

# Preflight trước render:
node .cursor/skills/biong-short-video-preflight/scripts/check-import-html-beat-render.mjs $PROJ
```

Script **chỉ scaffolding** — giữ nguyên CSS, DOM, `render()`:
- Bọc `<template>` (sub-composition HyperFrames)
- Thay `addEventListener('hf-seek')` → GSAP `window.__timelines["beat_N"]` gọi `render(t)`
- Gỡ `prefers-reduced-motion` (headless tắt animation)
- Thêm `data-width`/`data-height` trên `#root` nếu thiếu
- `--localize-images`: tải ảnh `https://` về `assets/images/`

**CMS giữ HTML gốc** — normalize chỉ trên disk `compositions/`, không ghi đè CMS.

---

## Preflight

- `check-import-html-beat-render.mjs` — bắt buộc `import_html`
- `check-hf-seek-beat.mjs` — **skip** `import_html` (dùng check trên)

---

## Cấm / cho phép

| | import_html assemble |
|--|---------------------|
| Cấm | Sửa visual user; shot-plan; creative gen-beats; stock/giphy/SFX MCP; BGM **loop** |
| Cho phép | normalize script; caption/ambient/watermark; wire index; **search_bgm** + **wire-bgm-chain.mjs**; `bgm-chain.json` |

---

## Caption overlay — sát mép dưới (bắt buộc import_html)

Beat HTML chatbot **không** chừa caption band. Agent ghép caption riêng:

```bash
node .cursor/skills/biong-short-video-preflight/scripts/gen-captions-html.mjs $PROJ
```

- Pill karaoke: **`bottom: 48px`** (cố định) — **cấm** `bottom: 12%` (đè UI beat).
- Host `compositions/captions.html` z-index 9000 — xem [overlay-layer-stack.md](overlay-layer-stack.md).

---

## Liên quan

- [import-html-assemble-bgm.md](import-html-assemble-bgm.md) — BGM global cho assemble
- [hf-prompt-beat-contract.md](hf-prompt-beat-contract.md) — creative pipeline (hf-seek fragment)
- [overlay-layer-stack.md](overlay-layer-stack.md)
