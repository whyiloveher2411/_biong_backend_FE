# HF Prompt Art Direction — Phase 2 render

Thay thế `motion-complexity-activation.md` (legacy). Agent đóng vai **Senior Motion Designer** theo aesthetic HyperFrames playground — **không** registry/GSAP beat catalog cũ.

**Đọc TRƯỚC khi viết beat HTML:** [evolution-memory.md](evolution-memory.md) · [hf-prompt-beat-contract.md](hf-prompt-beat-contract.md) · [hf-prompt-catalog.md](hf-prompt-catalog.md)

---

## Mindset

- Mỗi beat = 1 art direction world từ `hyperframes/prompts/{hf_prompt_type}.md`
- Text là hero hoặc số liệu là hero — tùy prompt type
- Motion = pure function of `t` (Whisper-synced), không GSAP beat timeline
- Layout editorial poster — pause bất kỳ frame `t` nào vẫn đọc được

---

## Vai trò bắt buộc

1. Đọc prompt type được gán (`hf_prompt_type`) — **không** đổi type khi render
2. Đọc `assets/beat-timing/beat_N.json` — embed `TIMINGS` vào `render()`
3. Viết beat HTML theo [hf-prompt-beat-contract.md](hf-prompt-beat-contract.md)
4. Font: **Be Vietnam Pro** — [typography-be-vietnam-pro.md](typography-be-vietnam-pro.md)
5. Caption karaoke: [caption-karaoke-script-sync.md](caption-karaoke-script-sync.md) — host riêng, không duplicate
6. Watermark: [spacedev-brand-watermark.md](spacedev-brand-watermark.md)
7. Viral pacing: [viral-retention-structure.md](viral-retention-structure.md)

---

## Giữ nguyên (media & overlay)

| Thành phần | Skill / doc |
|------------|---------------|
| Ambient layer | `/continuous-motion` · [continuous-motion-patterns.md](continuous-motion-patterns.md) |
| MCP media | [media-mcp-activation.md](media-mcp-activation.md) |
| Giphy accent | [giphy-accent-format.md](giphy-accent-format.md) |
| Overlay stack | [overlay-layer-stack.md](overlay-layer-stack.md) |
| Preflight | `/biong-short-video-preflight` |
| Evolution | `/biong-short-video-evolution` · [evolution-memory.md](evolution-memory.md) |

---

## Cấm (legacy)

- `npx hyperframes add` registry hero (stat-motion, flowchart, caption-kinetic-slam…)
- GSAP `window.__timelines["beat_N"]` trong beat HTML
- `.hook-title-plate`, `.plate-rust`, `.border-3d`, card catalog v1/v2
- `layout_archetype` / `render_stack` / `registry_block`
- Scaffold placeholder `"Beat 1"`, text-only kinetic không visual

---

## Brand CSS vars (đồng bộ playground)

Mỗi beat mở `<style>` với preamble:

```css
:root {
  --cream:#f6f5f1; --cream-2:#efece4; --ink:#0a0a0a; --mute:#6b6862;
  --line:#e3dfd3; --signal:#ff3b1f; --signal-2:#ff6a4a; --frame:#ffb800;
  --green:#1f8a5b; --blue:#2b66ff;
}
```

Tint theo `hf_theme` project nếu cần — không phá hierarchy prompt.

---

## Density tối thiểu

Mỗi beat `render()` phải drive **≥3 distinct elements** keyed off `t` (hero line, support, decorative ambient). Preflight `check-foreground-motion-density.mjs` kiểm tra.

`visual_story` trong shot-plan mô tả layout **không** chỉ echo `phrase_anchor`.

---

## Phase 2 pipeline (tóm tắt)

1. Transcribe → caption sync → `visual_shot_plan` (content, chưa có type)
2. `assign-beat-prompt-types.mjs`
3. `map-shot-plan-to-beat-map.mjs`
4. `build-beat-element-timing.mjs`
5. MCP media + ambient + viết `beat_N.html` per prompt
6. Preflight → evolution → render
