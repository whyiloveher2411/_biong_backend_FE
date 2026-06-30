---
name: biong-short-video-preflight
description: Kiểm tra bắt buộc trước render final short video — transcribe, caption sync, ambient motion, visual density, z-depth, beat-map, karaoke, watermark. Invoke phase 2 sau TTS, trước hyperframes render --quality high.
---

# Biong Short Video — Preflight

**Chạy bắt buộc** trước mọi `hyperframes render --quality high`. Fail → **sửa code**, không render final.

Đọc: [overlay-layer-stack.md](../biong-short-video-hyperframes/references/overlay-layer-stack.md) · [visual-shot-plan.md](../biong-short-video-hyperframes/references/visual-shot-plan.md) · [continuous-motion-patterns.md](../biong-short-video-hyperframes/references/continuous-motion-patterns.md)

---

## Khi nào invoke

- Phase 2 render — sau TTS/transcribe + trước render final
- Trước `upload_agent_video`
- Sau mỗi lần sửa caption/watermark/beat/ambient/layer

---

## Bước 0 — Transcribe + caption sync (bắt buộc)

Từ repo root `_biong_backend_FE`, thay `{id}`:

```bash
PROJ=storage/agent-renders/{id}/my-video

node .cursor/skills/biong-short-video-preflight/scripts/bootstrap-phase2-assets.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/transcribe-audio.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/sync-caption-from-script.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/verify-caption-sync.mjs $PROJ --strict
node .cursor/skills/biong-short-video-preflight/scripts/map-shot-plan-to-beat-map.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/sync-index-beats-from-map.mjs $PROJ
# Agent viết compositions/beat_N.html thủ công — CẤM gen-beats-from-shot-plan.mjs
node .cursor/skills/biong-short-video-preflight/scripts/gen-captions-html.mjs $PROJ
mkdir -p $PROJ/assets/images
cp .cursor/skills/biong-short-video-hyperframes/assets/spacedev-logo.png $PROJ/assets/images/
node .cursor/skills/biong-short-video-preflight/scripts/gen-brand-watermark.mjs $PROJ --duration {totalVideoSec}
```

---

## Bước 1 — Visual + beat + overlay (bắt buộc)

Sau `/continuous-motion` + registry blocks theo `visual_shot_plan`:

```bash
node .cursor/skills/biong-short-video-preflight/scripts/check-continuous-motion.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/check-stock-full-bleed.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/check-dynamic-background.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/check-floater-keepout.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/check-visual-density.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/check-typography-spacing.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/check-beat-timing.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/check-media-stack.mjs $PROJ --strict
node .cursor/skills/biong-short-video-preflight/scripts/check-overlay-stack.mjs $PROJ
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
| 1 | `visual_shot_plan` trong metadata | ✓ |
| 2 | `compositions/ambient-layer.html` + `__timelines["ambient"]` | ✓ |
| 3 | ≥1 non-caption registry block wired | ✓ |
| 4 | Z-depth ≥2 bands (80–800) | ✓ |
| 5 | Caption z9000 + watermark z9500 | ✓ |

---

## Quality gate

- [ ] `check-continuous-motion.mjs` exit 0
- [ ] `check-dynamic-background.mjs` exit 0
- [ ] `check-floater-keepout.mjs` exit 0
- [ ] `check-visual-density.mjs` exit 0
- [ ] `check-typography-spacing.mjs` exit 0
- [ ] `check-overlay-stack.mjs` exit 0
- [ ] `check-media-stack.mjs --strict` exit 0
- [ ] `hyperframes lint` 0 errors
- [ ] Chỉ sau đó: `render --quality high --strict`
