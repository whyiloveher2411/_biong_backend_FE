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

## Phase 1 — audio_script viral (OmniVoice văn nói)

1. `short_video_get_context` → `creative_brief.content_plain_text`
2. Đọc [viral-retention-structure.md](viral-retention-structure.md) + [vi-voiceover-naturalization.md](vi-voiceover-naturalization.md) + [omnivoice-speech-script.md](omnivoice-speech-script.md)
3. `/extract-core-signals` → hook, tension, takeaway, **narrative_chain**, loop_hook_line
4. `/hyperframes-creative` → **Narrative Flow But/Therefore** + góc nhìn — đọc [narrative-flow-vi.md](narrative-flow-vi.md)
5. `/viral-audio-script` → bản nháp HASCAS 60–180s + expand narrative_chain — **cấm structural summarization**
6. `/humanize-audio-script` → §2 từ đệm — giữ expressive tag slots + But/Therefore
7. `/audit-audio-script` → QA + sửa lỗi — **pass bắt buộc** trước save
8. `save_audio_script({ text, metadata })` → **DỪNG**

Docs: [extract-core-signals.md](extract-core-signals.md) · [narrative-flow-vi.md](narrative-flow-vi.md) · [audit-audio-script.md](audit-audio-script.md) · [viral-audio-script.md](viral-audio-script.md) · [humanize-audio-script.md](humanize-audio-script.md) · [vi-voiceover-naturalization.md](vi-voiceover-naturalization.md) · [omnivoice-speech-script.md](omnivoice-speech-script.md)

**Cấm:** `generate_narration_tts`, Kokoro, render HyperFrames, tóm tắt học thuật, **structural summarization**, **save khi audit chưa pass**

---

## Phase 2 — render (thứ tự đọc skill)

Đọc **theo thứ tự** trước khi viết HTML:

| # | Skill | File / mục đích |
|---|-------|-----------------|
| 1 | `/hyperframes` | Router + layout-before-animation |
| 2 | `/general-video` | Orchestrator — pre-recorded VO |
| 3 | `/product-launch-video` | `references/motion-language.md`, `composition.md`, `visual-design.md` |
| 4 | `/hyperframes-core` | `references/tracks-and-clips.md` — clip contract — **trước beat HTML** |
| 5 | `/hyperframes-creative` | `video-composition.md`, palette, `audio-reactive.md` — **trước beat HTML** |
| 6 | Kinetic typography | [kinetic-typography-brief.md](kinetic-typography-brief.md) — mindset motion graphics |
| 7 | Typography font | [typography-be-vietnam-pro.md](typography-be-vietnam-pro.md) — **trước beat HTML** |
| 8 | Viral pacing | [viral-retention-structure.md](viral-retention-structure.md) — beat map timeline |
| 9 | `/hyperframes-animation` | `adapters/gsap.md`, blueprints |
| 10 | Caption contract | [caption-karaoke-script-sync.md](caption-karaoke-script-sync.md) — script text + Whisper timing |
| 11 | `/embedded-captions` + `/hyperframes-registry` | Registry caption blocks |
| 12 | `/hyperframes-media` | `transcribe` MP3 |
| 13 | Brand watermark | [spacedev-brand-watermark.md](spacedev-brand-watermark.md) |
| 14 | Overlay z-index | [overlay-layer-stack.md](overlay-layer-stack.md) — caption 9000, watermark 9500 |
| 15 | **Preflight** | `/biong-short-video-preflight` — check-overlay-stack.mjs |
| 16 | Layout Biong | [layout-9x16-zones.md](layout-9x16-zones.md) |
| 17 | GSAP checklist | [gsap-beat-checklist.md](gsap-beat-checklist.md) |
| 18 | Motion map | [motion-vocabulary-map.md](motion-vocabulary-map.md) |
| 19 | **Cinematic ép** | [motion-complexity-activation.md](motion-complexity-activation.md) |
| 20 | **`/hyperframes-cli`** | [blank-frame-audit.md](blank-frame-audit.md) — lint + inspect trước render |

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
- GSAP: `gsap.timeline({ paused: true })` → đăng ký `window.__timelines[id]` — key = `data-composition-id`
- **Timeline pattern:** Pattern A (inline beats → `window.__timelines["main"]`, times global) **hoặc** Pattern B (sub-comp per beat → `["beat_N"]`, times local). **Cấm Pattern C** — xem [blank-frame-audit.md](blank-frame-audit.md)
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

Sau khi viết beat HTML — đọc [blank-frame-audit.md](blank-frame-audit.md):

```bash
cd storage/agent-renders/{id}/my-video
node ../../../../.cursor/skills/biong-short-video-preflight/scripts/check-overlay-stack.mjs .
npx hyperframes lint
npx hyperframes inspect --json
node .agents/skills/hyperframes-animation/scripts/animation-map.mjs .
```

Preflight overlay pass + overlap caption vs content (layout zones). **0 lint errors** trước `--quality high`.

---

## Anti-patterns

- Chạy full `/faceless-explainer` pipeline (TTS xung đột `audio_file`)
- Bỏ qua skill routing — chỉ dùng `/general-video` mà không đọc product-launch visual
- Caption inline trong beat HTML cùng layer diagram
- Thiếu `data-track-index` / `class="clip"` trên visual clips
- Bỏ qua `lint` / `inspect` / `animation-map.mjs` audit trước render
- Pattern C timeline (inline beat + global times) — blank frames beat 2+
