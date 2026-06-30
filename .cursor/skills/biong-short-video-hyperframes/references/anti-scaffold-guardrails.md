# Anti-scaffold guardrails — cấm ship placeholder beat

## Triệu chứng lỗi (video #5 lần 1)

- Mọi frame giống nhau: title + card `"Beat 1/2/3…"`
- `#root` opaque `#0B0F1A` + overlay 78% che stock video trong `index.html`
- Không có `visual_shot_plan`, registry blocks, kinetic hero thật
- `check-visual-density.mjs` false positive (đếm `beat_*` như registry)

## Bắt buộc phase 2 (đầu render)

1. Sinh `visual_shot_plan` từ `audio_script` đã duyệt — [visual-shot-plan.md](./visual-shot-plan.md)
2. Lưu qua `short_video_update_agent_status` metadata
3. Sinh `assets/visual-shot-plan.json` trong project render

```bash
PROJ=storage/agent-renders/{id}/my-video
node .cursor/skills/biong-short-video-preflight/scripts/gen-beats-from-shot-plan.mjs $PROJ
npx hyperframes add data-chart flowchart grain-overlay  # theo shot-plan
node .cursor/skills/biong-short-video-preflight/scripts/check-visual-density.mjs $PROJ
```

## Quy tắc beat HTML

| Cấm | Bắt buộc |
|-----|----------|
| Text `Beat N` trong ui-card/hero | Kinetic words từ `headline_words` |
| `#root` / html opaque navy | `background: transparent !important` |
| Overlay full-bleed trong beat | Glass cards (rgba) — stock lộ qua index |
| <3 GSAP tween/beat | ≥6 tween stagger entrance |

## Stock visibility

- Stock clips: **direct child `#root`** trong `index.html`, class `.stock-bg`
- **Bắt buộc full-bleed:** `width:1080px; height:1920px; object-fit:cover` (stock Pexels thường 16:9 — thiếu height → chỉ phủ nửa trên)
- Chạy `patch-stock-full-bleed.mjs` sau khi wire stock; `check-stock-full-bleed.mjs` trước render
- z-index 1, opacity 0.32–0.45; beat sub-comp transparent

## Beat overlap (chồng nội dung ghost)

**Triệu chứng:** 19M + Gen Z + chart cùng frame; text jumbled.

**Nguyên nhân:** `beat-map.json` overlap (hascas-rescaled start < beat trước end) → nhiều `<section beat-host>` active cùng lúc.

**Fix pipeline:**
1. `map-markers-to-timing.mjs` — `normalizeSequentialSections()` (no overlap)
2. `sync-index-beats-from-map.mjs` — patch `index.html`
3. `check-beat-timing.mjs` — FAIL nếu overlap


`check-visual-density.mjs` **FAIL** (không WARN) khi:

- Thiếu `visual_shot_plan`
- Placeholder `Beat N`
- Beat opaque che stock
- Thiếu registry block ref trong bundle
- `media-plan.md` thiếu `hero_type` / `registry_block` / `z_role`
