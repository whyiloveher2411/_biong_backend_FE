# Anti-scaffold guardrails — cấm ship placeholder / text-only beat

## Triệu chứng lỗi

- Mọi frame giống nhau: title + card `"Beat 1/2/3…"`
- Chỉ hiện chữ đang nói trên nền gradient — không registry/lottie/3d
- `#root` opaque `#0B0F1A` + overlay che stock video
- 4 beat visual = 4 section HASCAS (Solve 60s = 1 khung)
- `gen-beats-from-shot-plan.mjs` scaffold (`.glow-orb` + `.kw` only)

## Bắt buộc phase 2 (đầu render)

1. Transcribe → caption sync → `caption-words.json`
2. Sinh `visual_shot_plan` (**N beats** content-driven) — [visual-shot-plan.md](./visual-shot-plan.md) · [visual-layout-archetypes.md](./visual-layout-archetypes.md)
3. Lưu qua `short_video_update_agent_status` + `assets/visual-shot-plan.json`
4. `map-shot-plan-to-beat-map.mjs` → timing theo `phrase_anchor`
5. Agent **viết thủ công** `compositions/beat_N.html` + `npx hyperframes add` registry

```bash
PROJ=storage/agent-renders/{id}/my-video
node .cursor/skills/biong-short-video-preflight/scripts/map-shot-plan-to-beat-map.mjs $PROJ
npx hyperframes add data-chart flowchart stat-motion grain-overlay  # theo shot-plan
# CẤM: gen-beats-from-shot-plan.mjs
node .cursor/skills/biong-short-video-preflight/scripts/check-visual-density.mjs $PROJ
```

## Theme & canvas (bắt buộc)

- Init `--example={visual_style}` portrait — **cấm** `blank` production — [hyperframes-theme-init.md](./hyperframes-theme-init.md)
- Mỗi beat: **3 lớp** background / UI cards / dynamic typography — [canvas-contract-3-layer.md](./canvas-contract-3-layer.md)
- Support on-screen text ≥28px; card title ≥36px — [layout-9x16-zones.md](./layout-9x16-zones.md)

## Quy tắc beat HTML

| Cấm | Bắt buộc |
|-----|----------|
| Text `Beat N` trong ui-card/hero | Layout archetype + registry customized |
| `--example=blank` production | Theme vignelli/kinetic-type/… + đọc CSS token |
| 4 chip ngang font nhỏ | Bento 2×2 hoặc vertical; gap ≥24px |
| Plain stat div | `stat-motion` / `apple-money-count` registry |
| Text-only kinetic (`.kw` + gradient) | ≥2 render_stack: registry/GSAP/lottie/threejs |
| `#root` / html opaque navy | `background: transparent !important` |
| gen-beats scaffold fingerprint | Hand-crafted beat từ catalog-map |
| <3 GSAP tween/beat | ≥3 tween + stagger group |
| Copy fixture `visual-pipeline-minimal/beat_*.html` | [fixtures-not-production-templates.md](./fixtures-not-production-templates.md) |
| Giphy `<video>` MP4 | `<img>` WebP/GIF — [giphy-accent-format.md](./giphy-accent-format.md) |
| Chỉ hero-block, support trống | Hero + support trong `.content-cluster` — [layout-9x16-zones.md](./layout-9x16-zones.md) |
| Hero trên + support dưới cách xa | Gom `.content-cluster` căn giữa dọc, gap ≤24px |
| Sticker `left` đè text trong cluster | `floater-lane-right` — [floater-text-keepout.md](./floater-text-keepout.md) |
| `gradient_only` / nền CSS tĩnh | `stock_video` mọi beat — [dynamic-bg-mandatory.md](./dynamic-bg-mandatory.md) |

## Beat overlap (chồng nội dung ghost)

**Fix pipeline:**
1. `map-shot-plan-to-beat-map.mjs` — `normalizeSequentialSections()` (no overlap)
2. `sync-index-beats-from-map.mjs` — patch `index.html`
3. `check-beat-timing.mjs` — FAIL nếu overlap

`check-visual-density.mjs` **FAIL** khi:

- Thiếu `visual_shot_plan` hoặc thiếu `phrase_anchor` / `layout_archetype` / `visual_story` / `render_stack`
- Placeholder `Beat N` hoặc gen-beats scaffold
- Text-only beat
- Beat opaque che stock
- <2 registry block khác tên (non-caption)
- `media-plan.md` thiếu `layout_archetype`
