# HyperFrames skill routing — Short Video Agent (Biong)

Workflow **2 bước**: phase 1 `audio_script` → admin upload MP3 → phase 2 render từ `audio_file`.

**Luật vàng:** MP3 đã có sẵn → **không** chạy TTS pipeline của `/faceless-explainer`. Orchestrator chính là `/general-video`.

---

## Routing theo input

| Điều kiện | Skill chính | Ghi chú |
|-----------|-------------|---------|
| Marketing post (mặc định) | `/general-video` + `/product-launch-video` | Promo/social 9:16 — visual patterns từ product-launch |
| `content_plain_text` có URL site/sản phẩm | + `/website-to-video` (tùy chọn) | Chỉ capture brand/screenshot nếu URL rõ ràng; không thay orchestrator |
| Topic explainer thuần (không promo) | Borrow `/faceless-explainer` visual-design | Chỉ section_plan, diagram, typography — **không** TTS |
| Caption karaoke | `/embedded-captions` | **Bắt buộc** — sub-composition `compositions/captions.html` |
| Transition stinger / kinetic accent | `/motion-graphics` | Beat ngắn, không thay narration |
| GitHub PR | `/pr-to-video` | **Không** dùng trong pipeline marketing Biong |

---

## Phase 1 — audio_script

1. `short_video_get_context` → `creative_brief`
2. Borrow cấu trúc `/faceless-explainer` scriptwriting: hook → problem → insight → proof → CTA (30–90s)
3. `short_video_save_audio_script` → **DỪNG**

**Cấm:** `generate_narration_tts`, Kokoro, render HyperFrames

---

## Phase 2 — render (thứ tự đọc skill)

Đọc **theo thứ tự** trước khi viết HTML:

| # | Skill | File / mục đích |
|---|-------|-----------------|
| 1 | `/hyperframes` | Router + layout-before-animation |
| 2 | `/general-video` | Orchestrator — pre-recorded VO |
| 3 | `/product-launch-video` | `references/motion-language.md`, `composition.md`, `visual-design.md` |
| 4 | `/hyperframes-core` | `references/tracks-and-clips.md` — clip contract |
| 5 | `/hyperframes-animation` | `adapters/gsap.md`, blueprints |
| 6 | `/hyperframes-creative` | Palette, `beat-direction.md`, `audio-reactive.md` |
| 7 | `/embedded-captions` | Karaoke word-sync |
| 8 | `/hyperframes-media` | `transcribe` MP3 |
| 9 | Layout Biong | [layout-9x16-zones.md](layout-9x16-zones.md) |
| 10 | GSAP checklist | [gsap-beat-checklist.md](gsap-beat-checklist.md) |
| 11 | Motion map | [motion-vocabulary-map.md](motion-vocabulary-map.md) |
| 12 | **Cinematic ép** | [motion-complexity-activation.md](motion-complexity-activation.md) |

GSAP bổ sung: `/gsap-core`, `/gsap-timeline`, `/gsap-performance`

---

## Init project render

```bash
npx hyperframes init storage/agent-renders/{id}/my-video --non-interactive --skip-skills --example=blank
```

Dùng skill **repo-level** (`.agents/skills/`) — không duplicate skill vào từng project.

---

## Composition contract (tóm tắt)

Mọi visual element trong beat:

```html
<div class="clip" id="hero-headline"
     data-start="0" data-duration="4.2" data-track-index="0">
  ...
</div>
```

- Sub-composition caption: `data-composition-src="compositions/captions.html"` — **tách file**
- GSAP: `gsap.timeline({ paused: true })` → `window.__timelines["beat_N"]` — key = `data-composition-id`
- Chi tiết: `.agents/skills/hyperframes-core/references/tracks-and-clips.md`

---

## Registry blocks (trước khi viết beat)

```bash
cd storage/agent-renders/{id}/my-video
npx hyperframes add caption-pill-karaoke
npx hyperframes add caption-kinetic-slam
# + transition/VFX block theo beat map
```

Chi tiết: [motion-complexity-activation.md](motion-complexity-activation.md)

---

## Post-author audit

Sau khi viết beat HTML:

```bash
node .agents/skills/hyperframes-animation/scripts/animation-map.mjs storage/agent-renders/{id}/my-video/compositions/beat_1
hyperframes lint storage/agent-renders/{id}/my-video
```

Preflight overlap caption vs content (layout zones).

---

## Anti-patterns

- Chạy full `/faceless-explainer` pipeline (TTS xung đột `audio_file`)
- Bỏ qua skill routing — chỉ dùng `/general-video` mà không đọc product-launch visual
- Caption inline trong beat HTML cùng layer diagram
- Thiếu `data-track-index` / `class="clip"` trên visual clips
- Bỏ qua `animation-map.mjs` audit trước render
