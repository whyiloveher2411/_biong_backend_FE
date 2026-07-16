# HyperFrames skill routing — Short Video Agent (Biong)

Workflow **3 bước**: phase 1 `audio_script` → admin **duyệt** → phase 2 render (manual: upload MP3 trước; auto: prompt `continue` TTS+render).

**Luật vàng:** MP3 đã có sẵn → **không** chạy TTS pipeline của `/faceless-explainer`. Orchestrator chính là `/general-video`.

---

## Routing theo input

| Điều kiện | Skill chính | Ghi chú |
|-----------|-------------|---------|
| Marketing post (mặc định) | `/general-video` + `/product-launch-video` | Promo/social 9:16 — visual patterns từ product-launch |
| `content_plain_text` có URL site/sản phẩm | + `/website-to-video` (tùy chọn) | Chỉ capture brand/screenshot nếu URL rõ ràng; không thay orchestrator |
| Topic explainer thuần (không promo) | Borrow `/faceless-explainer` visual-design | Chỉ section_plan, diagram, typography — **không** TTS |
| Caption karaoke | `/embedded-captions` | **Bắt buộc** — sub-composition `compositions/captions.html` |
| Transition / registry UI | `/motion-graphics` | Catalog-map → data-chart, flowchart, social cards |
| Ambient secondary motion | `/continuous-motion` | `ambient-layer.html` + dual timeline |
| GitHub PR | `/pr-to-video` | **Không** dùng trong pipeline marketing Biong |

---

## Phase 1 — audio_script (4 bước)

1. `short_video_get_context` → `creative_brief.content_plain_text`
2. `/extract-core-signals` → hook, tension, takeaway, **narrative_chain**
3. `/hyperframes-creative` → Narrative Flow + plain language
4. `/viral-audio-script` → script hoàn chỉnh one-pass (đọc [plain-language-storytelling-vi.md](plain-language-storytelling-vi.md))
5. `/audit-audio-script` → QA script — **pass bắt buộc**
6. `save_audio_script` → **DỪNG** — chờ admin duyệt

**Cấm:** `visual_shot_plan`, `generate_narration_tts`, render, structural summarization

---

## Phase 2 — render (thứ tự đọc skill)

**Bước 0 (bắt buộc):** Sau transcribe + `caption-words.json` → sinh `visual_shot_plan` (**N beats** bám audio, không theo HASCAS) → `short_video_update_agent_status({ metadata: { visual_shot_plan } })` — [visual-shot-plan.md](visual-shot-plan.md) · [visual-layout-archetypes.md](visual-layout-archetypes.md)

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
| 7b | Theme init | [hyperframes-theme-init.md](hyperframes-theme-init.md) + [canvas-contract-3-layer.md](canvas-contract-3-layer.md) |
| 8 | Viral pacing | [viral-retention-structure.md](viral-retention-structure.md) |
| 8b | Visual shot-plan | [visual-shot-plan.md](visual-shot-plan.md) + [visual-layout-archetypes.md](visual-layout-archetypes.md) |
| 9 | `/motion-graphics` | `agent/skills/motion-graphics/catalog-map.md` — registry pick |
| 10 | `/continuous-motion` | [continuous-motion-patterns.md](continuous-motion-patterns.md) — **trước beat HTML** |
| 11 | `/hyperframes-animation` | `adapters/gsap.md`, blueprints |
| 10 | Caption contract | [caption-karaoke-script-sync.md](caption-karaoke-script-sync.md) |
| 12 | `/embedded-captions` + `/hyperframes-registry` | Caption + hero registry blocks |
| 13 | `/hyperframes-media` | transcribe MP3 |
| 14 | Media MCP | [media-mcp-activation.md](media-mcp-activation.md) + giphy + lottie |
| 15 | Brand watermark | [spacedev-brand-watermark.md](spacedev-brand-watermark.md) |
| 16 | Overlay z-index | [overlay-layer-stack.md](overlay-layer-stack.md) — z 0–800 + 9000/9500 |
| 17 | **Preflight** | `/biong-short-video-preflight` — continuous + visual-density + overlay |
| 18 | Layout Biong | [layout-9x16-zones.md](layout-9x16-zones.md) |
| 18b | Floater keep-out | [floater-text-keepout.md](floater-text-keepout.md) |
| 18c | Dynamic BG | [dynamic-bg-mandatory.md](dynamic-bg-mandatory.md) |
| 19 | GSAP checklist | [gsap-beat-checklist.md](gsap-beat-checklist.md) |
| 20 | Motion map | [motion-vocabulary-map.md](motion-vocabulary-map.md) |
| 21 | **Cinematic ép** | [motion-complexity-activation.md](motion-complexity-activation.md) |
| 22 | **`/hyperframes-cli`** | [blank-frame-audit.md](blank-frame-audit.md) |

GSAP bổ sung: `/gsap-core`, `/gsap-timeline`, `/gsap-performance`

---

## Init project render

Resolve style: CMS `visual_style` → `visual_shot_plan.visual_style` → `vignelli`. Xem [hyperframes-theme-init.md](hyperframes-theme-init.md).

```bash
# THEME từ short_video_get_context.visual_style (không dùng blank production)
npx hyperframes init storage/agent-renders/{id}/my-video \
  --non-interactive --skip-skills \
  --example={visual_style} \
  --resolution portrait
```

Sau init: đọc CSS token theme → override Be Vietnam Pro → tuân [canvas-contract-3-layer.md](canvas-contract-3-layer.md).

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
# Theo visual_shot_plan:
npx hyperframes add data-chart
npx hyperframes add flowchart
npx hyperframes add grain-overlay
npx hyperframes add domain-warp-dissolve
```

Đọc `visual_shot_plan` từ get_context — không install blind.

Chi tiết: [motion-complexity-activation.md](motion-complexity-activation.md)

---

## Post-author audit

Sau khi viết beat HTML — đọc [blank-frame-audit.md](blank-frame-audit.md):

```bash
cd storage/agent-renders/{id}/my-video
node .cursor/skills/biong-short-video-preflight/scripts/check-overlay-stack.mjs .
node .cursor/skills/biong-short-video-preflight/scripts/check-continuous-motion.mjs .
node .cursor/skills/biong-short-video-preflight/scripts/check-visual-density.mjs .
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
