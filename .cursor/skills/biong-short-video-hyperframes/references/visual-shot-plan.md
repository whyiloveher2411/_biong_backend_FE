# Visual Shot Plan — khóa layout Phase 2

Agent **bắt buộc** sinh `visual_shot_plan` **đầu Phase 2** (sau khi `audio_script` đã **admin duyệt**), lưu qua `short_video_update_agent_status`.

**Input:** `audio_script` + `audio_script_metadata` (`core_signals`, `markers`, `timeline`) từ `get_context`.

**Mục tiêu:** Agent tự do sáng tạo visual dựa trên nội dung script thật — không ràng buộc sớm ở Phase 1.

**Đọc kèm:** [agent/skills/motion-graphics/catalog-map.md](../../../../agent/skills/motion-graphics/catalog-map.md) · [motion-complexity-activation.md](motion-complexity-activation.md) · [overlay-layer-stack.md](overlay-layer-stack.md)

---

## Khi nào sinh (Phase 2 only)

1. `short_video_get_context` — `audio_script_approved === true`
2. Đọc `audio_script` + `markers` + `core_signals`
3. **→ Sinh `visual_shot_plan`** (file này) — map nội dung từng beat
4. `short_video_update_agent_status({ status: "processing", metadata: { visual_shot_plan, visual_shot_plan_at } })`
5. Tiếp bootstrap → transcribe → MCP media → render

**Cấm** sinh shot-plan trong Phase 1 / `save_audio_script`.

---

## Schema — `visual_shot_plan[]`

Một entry per HASCAS section / marker beat:

```json
{
  "section": "solve",
  "time": 27,
  "hero_mode": "registry_block",
  "registry_block": "data-chart",
  "customize": {
    "headline": "Tăng trưởng người dùng",
    "data": [{ "label": "Q1", "value": 42 }, { "label": "Q2", "value": 68 }]
  },
  "accent_media": {
    "type": "giphy_sticker",
    "query": "mind blown"
  },
  "bg_media": {
    "type": "stock_video",
    "query": "abstract dark gradient motion"
  },
  "motion_hint": "cascade + ambient_parallax",
  "z_role": "hero_chart"
}
```

### `hero_mode` (enum)

| Value | Khi dùng | Registry / asset |
|-------|----------|------------------|
| `registry_block` | Số liệu, chart, stat | `data-chart`, `stat-motion`, `apple-money-count` |
| `diagram` | Quy trình, flow, cause-effect | `flowchart` |
| `social_card` | Social proof, metrics | `ig`, `tiktok`, `yt` |
| `kinetic_type` | Hook punch, headline slam | `caption-kinetic-slam` + hero words |
| `stock_accent` | **Fallback** — chỉ nền B-roll | Pexels low-opacity bg — không full-bleed hero |

**Luật:** ≥60% beat phải có `hero_mode !== stock_accent`.

### `z_role` → z-index band

| z_role | z-index band | Vùng layout |
|--------|--------------|-------------|
| `bg_mesh` | 0–2 | Full-bleed gradient |
| `bg_stock` | 3–5 | Stock video/image mờ |
| `ambient` | 6–10 | Grain, particles (ambient-layer) |
| `floater` | 80–150 | Giphy sticker, orbs |
| `hero_chart` | 200–450 | Registry block hero |
| `hero_type` | 200–450 | Kinetic headline |
| `support` | 450–650 | Chips, badges |
| `accent_lottie` | 650–800 | Lottie từ bundle |

### `accent_media.type`

| type | MCP / nguồn |
|------|-------------|
| `giphy_sticker` | `short_video_search_giphy` media_type=sticker |
| `giphy_gif` | `short_video_search_giphy` media_type=gif |
| `lottie` | Bundle `assets/lotties/manifest.json` → `lottie_id` |
| `none` | Không accent |

### `bg_media.type`

| type | MCP |
|------|-----|
| `stock_video` | `short_video_search_stock_media` media_type=video |
| `stock_image` | `short_video_search_stock_media` media_type=image |
| `gradient_only` | Không gọi MCP — CSS mesh |

**Luật:** Pexels chỉ `bg_media` — opacity 0.3–0.6, blur nhẹ. **Cấm** full-bleed stock làm hero khi `hero_mode` là registry/diagram/social.

---

## Map nội dung → block (marketing/edu)

| Tín hiệu từ `core_signals` | `hero_mode` | `registry_block` |
|----------------------------|-------------|------------------|
| Số liệu, %, growth | `registry_block` | `data-chart` hoặc `stat-motion` |
| Quy trình, bước, flow | `diagram` | `flowchart` |
| So sánh A vs B | `registry_block` | `data-chart` (2 series) |
| Social proof, follower | `social_card` | `ig` / `tiktok` |
| Hook shock | `kinetic_type` | `caption-kinetic-slam` |
| Agitate pain point | `kinetic_type` + `accent_media` giphy | sticker reaction |
| CTA loop | `kinetic_type` | hero CTA words + `logo-outro` optional |

Transitions giữa beat: `domain-warp-dissolve`, `whip-pan`, `sdf-iris` (xem registry).

Polish liên tục: components `grain-overlay`, `shimmer-sweep` trong `ambient-layer.html`.

---

## Ví dụ shot-plan (90s HASCAS)

```json
{
  "visual_shot_plan": [
    {
      "section": "hook",
      "time": 0,
      "hero_mode": "kinetic_type",
      "registry_block": "caption-kinetic-slam",
      "customize": { "words": ["Google", "hoảng", "loạn"] },
      "accent_media": { "type": "giphy_sticker", "query": "explosion" },
      "bg_media": { "type": "gradient_only" },
      "motion_hint": "slam + ambient_grain",
      "z_role": "hero_type"
    },
    {
      "section": "agitate",
      "time": 5,
      "hero_mode": "registry_block",
      "registry_block": "stat-motion",
      "customize": { "target": 1000000000, "label": "người dùng ChatGPT" },
      "accent_media": { "type": "giphy_sticker", "query": "shocked" },
      "bg_media": { "type": "stock_video", "query": "dark city night" },
      "motion_hint": "punch + parallax",
      "z_role": "hero_chart"
    },
    {
      "section": "solve",
      "time": 27,
      "hero_mode": "diagram",
      "registry_block": "flowchart",
      "customize": { "nodes": ["Tìm kiếm", "AI Mode", "Mất click"] },
      "accent_media": { "type": "lottie", "lottie_id": "arrow-down" },
      "bg_media": { "type": "stock_video", "query": "abstract tech lines" },
      "motion_hint": "cascade + breathe",
      "z_role": "hero_chart"
    },
    {
      "section": "cta",
      "time": 81,
      "hero_mode": "kinetic_type",
      "registry_block": "caption-kinetic-slam",
      "customize": { "words": ["Theo", "dõi", "ngay"] },
      "accent_media": { "type": "lottie", "lottie_id": "celebration" },
      "bg_media": { "type": "gradient_only" },
      "motion_hint": "slam + ambient_glow",
      "z_role": "hero_type"
    }
  ]
}
```

---

## Audit gates (Phase 1)

`/audit-audio-script` phải kiểm tra:

| Code | Severity | Điều kiện |
|------|----------|-----------|
| `missing_shot_plan` | critical | Không có `visual_shot_plan` hoặc rỗng |
| `shot_plan_stock_heavy` | critical | >40% beat `hero_mode=stock_accent` |
| `shot_plan_no_registry` | critical | Không có beat `registry_block` / `diagram` / `social_card` |
| `shot_plan_registry_mismatch` | warning | Block không khớp nội dung (chart không có số) |

**Pass shot-plan:** ≥60% beat `hero_mode !== stock_accent` AND ≥1 beat có `registry_block` không phải caption-only.

---

## Phase 2 thực thi

1. Đọc `visual_shot_plan` từ `get_context` / `agent-metadata.json`
2. `npx hyperframes add <registry_block>` theo từng beat unique
3. `npx hyperframes add grain-overlay` (component) cho ambient
4. MCP media theo `accent_media` + `bg_media` — không search stock blind
5. Ghi `media-plan.md` với cột: `hero_type`, `registry_block`, `z_role`
6. Wire z-index theo [overlay-layer-stack.md](overlay-layer-stack.md)
7. Invoke `/continuous-motion` trước beat HTML

---

## Anti-patterns

| Sai | Đúng |
|-----|------|
| Phase 2 tự chọn Pexels hero mỗi beat | Theo `bg_media` + registry hero |
| Bỏ qua shot-plan khi save | `visual_shot_plan` trong metadata bắt buộc |
| Mọi beat `stock_accent` | ≥60% beat có registry/kinetic/diagram |
| Caption block là hero duy nhất | ≥1 non-caption registry block / video |
