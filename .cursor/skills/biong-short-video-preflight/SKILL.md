---
name: biong-short-video-preflight
description: Kiểm tra bắt buộc trước render final short video — transcribe, caption sync, hf-seek beats, ambient motion, visual density, beat-map, karaoke, watermark. Invoke phase 2 sau TTS, trước hyperframes render --quality high.
---

# Biong Short Video — Preflight

**Chạy bắt buộc** trước mọi `hyperframes render --quality high`. Fail → **sửa code**, không render final.

Đọc: [overlay-layer-stack.md](../biong-short-video-hyperframes/references/overlay-layer-stack.md) · [visual-shot-plan.md](../biong-short-video-hyperframes/references/visual-shot-plan.md) · [hf-prompt-beat-contract.md](../biong-short-video-hyperframes/references/hf-prompt-beat-contract.md) · [import-html-beat-render.md](../biong-short-video-hyperframes/references/import-html-beat-render.md) · [continuous-motion-patterns.md](../biong-short-video-hyperframes/references/continuous-motion-patterns.md)

---

## Khi nào invoke

- Phase 2 render — sau TTS/transcribe + trước render final
- Trước `upload_agent_video`
- Sau mỗi lần sửa caption/watermark/beat/ambient/layer

---

## Import HTML (`render_mode=import_html`) — ghép beat chatbot

Đọc [import-html-beat-render.md](../biong-short-video-hyperframes/references/import-html-beat-render.md).

Sau ghi `compositions/beat_N.html` từ CMS — **bắt buộc normalize trước render**:

```bash
PROJ=storage/agent-renders/{id}/my-video

node .cursor/skills/biong-short-video-preflight/scripts/bootstrap-phase2-assets.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/normalize-import-html-beat-for-render.mjs $PROJ --localize-images
node .cursor/skills/biong-short-video-preflight/scripts/sync-index-beats-from-map.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/gen-captions-html.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/gen-brand-watermark.mjs $PROJ --duration {totalVideoSec}
node .cursor/skills/biong-short-video-preflight/scripts/check-import-html-beat-render.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/check-overlay-stack.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/verify-caption-sync.mjs $PROJ --strict
node .cursor/skills/biong-short-video-preflight/scripts/check-beat-timing.mjs $PROJ
```

**Cấm** `check-hf-seek-beat.mjs` cho import_html (script tự skip). **Cấm** render nếu `check-import-html-beat-render` fail.

---

## Bước 0 — Transcribe + caption sync + prompt assign (bắt buộc)

Từ repo root `_biong_backend_FE`, thay `{id}`:

```bash
PROJ=storage/agent-renders/{id}/my-video

node .cursor/skills/biong-short-video-preflight/scripts/bootstrap-phase2-assets.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/transcribe-audio.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/sync-caption-from-script.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/verify-caption-sync.mjs $PROJ --strict
node .cursor/skills/biong-short-video-preflight/scripts/assign-beat-prompt-types.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/map-shot-plan-to-beat-map.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/build-beat-element-timing.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/sync-index-beats-from-map.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/wire-beat-transition-sfx.mjs $PROJ
# Agent viết compositions/beat_N.html theo hf_prompt_type + beat-timing — CẤM gen-beats-from-shot-plan.mjs
node .cursor/skills/biong-short-video-preflight/scripts/gen-captions-html.mjs $PROJ
mkdir -p $PROJ/assets/images
cp .cursor/skills/biong-short-video-hyperframes/assets/spacedev-logo.png $PROJ/assets/images/
node .cursor/skills/biong-short-video-preflight/scripts/gen-brand-watermark.mjs $PROJ --duration {totalVideoSec}
```

---

## Bước 1 — Visual + beat + overlay (bắt buộc)

Sau `/continuous-motion` + agent viết beat HTML theo `hyperframes/prompts/{hf_prompt_type}.md`:

```bash
node .cursor/skills/biong-short-video-preflight/scripts/check-continuous-motion.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/check-stock-full-bleed.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/check-dynamic-background.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/check-floater-keepout.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/check-hf-seek-beat.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/check-visual-density.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/check-foreground-motion-density.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/check-typography-spacing.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/check-beat-timing.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/check-screen-fill.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/check-marketing-post-images.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/check-media-stack.mjs $PROJ --strict
node .cursor/skills/biong-short-video-preflight/scripts/check-overlay-stack.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/check-beat-transition-sfx.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/check-default-styles.mjs $PROJ
```

---

## Bước 2 — HyperFrames lint + inspect

```bash
cd $PROJ
npx hyperframes lint
npx hyperframes inspect --samples 15
node ../../../../.agents/skills/hyperframes-animation/scripts/animation-map.mjs .
```

---

## Bước 3 — Rà tay (agent)

| # | Kiểm tra | Pass |
|---|----------|------|
| 1 | `visual_shot_plan` + `hf_prompt_type` mỗi beat | ✓ |
| 2 | `assets/beat-timing/beat_N.json` mỗi beat | ✓ |
| 3 | `compositions/ambient-layer.html` + `__timelines["ambient"]` | ✓ |
| 4 | Beat HTML hf-seek `render()` — không GSAP beat timeline | ✓ |
| 5 | Caption z9000 + watermark z9500 | ✓ |

---

## Bước 4 — Visual audit (pre-final)

Sau Bước 1–3 pass → invoke `/biong-short-video-evolution` (không thay thế lint/inspect):

```bash
node .cursor/skills/biong-short-video-preflight/scripts/capture-visual-audit.mjs $PROJ
```

Agent đọc `snapshots/` + `contact-sheet.jpg` — layout 0 fail + aesthetic ≥7/10.

**Sau mỗi vòng fix trong vision loop:** chạy lại Bước 1–3 (preflight đầy đủ) rồi `capture-visual-audit.mjs` lại.

Pass vision → append [evolution-memory.md](../biong-short-video-hyperframes/references/evolution-memory.md) → mới `render --quality high --strict`.

---

## Quality gate

- [ ] `check-hf-seek-beat.mjs` exit 0
- [ ] `check-continuous-motion.mjs` exit 0
- [ ] `check-dynamic-background.mjs` exit 0
- [ ] `check-visual-density.mjs` exit 0
- [ ] `check-foreground-motion-density.mjs` exit 0
- [ ] `check-beat-timing.mjs` exit 0 — mỗi beat 5s–20s
- [ ] `check-screen-fill.mjs` exit 0
- [ ] `check-overlay-stack.mjs` exit 0
- [ ] `check-media-stack.mjs --strict` exit 0
- [ ] `hyperframes lint` 0 errors
- [ ] `/biong-short-video-evolution` vision pass + `assets/visual-audit-report.json`
- [ ] Chỉ sau đó: `render --quality high --strict`
