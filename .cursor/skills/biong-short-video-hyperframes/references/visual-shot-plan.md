# Visual Shot Plan — khóa layout Phase 2

Agent **bắt buộc** sinh `visual_shot_plan` **sau transcribe** Phase 2 (khi đã có `caption-words.json` + `totalVideoSec`), lưu qua `short_video_update_agent_status` và `assets/visual-shot-plan.json`.

**Input:** `audio_script` + `caption-words.json` + `core_signals` + `creative_brief` + `totalVideoSec` + `hf_theme` (CMS hoặc auto).

**Mục tiêu:** Visual beat **bám cụm nội dung đang nói** — **không** map 1:1 theo 4 section HASCAS. HASCAS chỉ dùng cho kịch bản thoại Phase 1. **Được phép** hiển thị dẫn chứng ngắn **không** nằm trong VO qua `visual_enrichment`.

**Đọc kèm:** [visual-layout-archetypes.md](visual-layout-archetypes.md) · [hyperframes-theme-init.md](hyperframes-theme-init.md) · [canvas-contract-3-layer.md](canvas-contract-3-layer.md) · [agent/skills/motion-graphics/catalog-map.md](../../../../agent/skills/motion-graphics/catalog-map.md) · [motion-complexity-activation.md](motion-complexity-activation.md) · [overlay-layer-stack.md](overlay-layer-stack.md)

---

## Khi nào sinh (Phase 2 only)

1. `short_video_get_context` — `audio_script_approved === true`
2. `bootstrap-phase2-assets.mjs` → `transcribe-audio.mjs` → caption sync → có `caption-words.json`
3. Đọc `audio_script` + `caption-words` + `core_signals`
4. **→ Sinh `visual_shot_plan`** — **N beat** theo nội dung (không giới hạn min/max)
5. `short_video_update_agent_status({ status: "processing", metadata: { visual_shot_plan, visual_shot_plan_at } })`
6. `map-shot-plan-to-beat-map.mjs` → agent viết `compositions/beat_N.html` thủ công → MCP media → render

**Cấm** sinh shot-plan trong Phase 1 / `save_audio_script`.

**Cấm** dùng `gen-beats-from-shot-plan.mjs` — đã gỡ khỏi pipeline.

---

## Visual beat vs HASCAS

| Khái niệm | Phạm vi | Số lượng |
|-----------|---------|----------|
| **HASCAS** | Kịch bản thoại (`timeline`, `expressive_plan`, narrative markers) | 4 section narrative — **chỉ Phase 1** |
| **Visual beat** | Một layout/motion world bám `phrase_anchor` trên audio thật | **Không giới hạn** — chia khi đổi ý, số liệu, quy trình, twist, CTA |

Chia beat khi: đổi chủ đề · số liệu mới · quy trình mới · so sánh · twist · CTA — **không** chia theo 4 chữ HASCAS.

---

## Beat duration — tối đa 5s (bắt buộc)

| Rule | Giá trị |
|------|---------|
| Max duration/beat | **5s** — không ngoại lệ (kể cả beat 1 hook) |
| Video 60s | Tối thiểu ~12 beat |
| Video 90s | Tối thiểu ~18 beat |
| Video 120–180s | Tối thiểu ~24–36 beat |
| Beat quá dài | **Tách thành nhiều beat** — mỗi beat = 1 ý / số liệu / câu |

**Cấm:** 1 beat ôm nhiều ý → màn hình trống chờ.  
**Cấm:** 2 beat liền kề dùng cùng `phrase_anchor` hoặc cùng `layout_archetype`.

---

## Schema — file `visual-shot-plan.json`

Top-level (ngoài array beat):

```json
{
  "hf_theme": "vignelli",
  "visual_shot_plan": [ /* entries */ ]
}
```

| Trường top-level | Mô tả |
|------------------|--------|
| `hf_theme` | Theme HyperFrames khi CMS = `auto` — xem [hyperframes-theme-init.md](hyperframes-theme-init.md) |

---

## Schema — `visual_shot_plan[]`

Một entry = **một visual beat** (content unit):

```json
{
  "beat_id": "beat_7",
  "phrase_anchor": "22.000 công ty chi mạnh AI",
  "narrative_role": "solve",
  "content_intent": "stat_comparison",
  "layout_archetype": "split_stat_diagram",
  "render_stack": ["registry:stat-motion", "registry:flowchart", "gsap", "lottie"],
  "hero_mode": "registry_block",
  "registry_block": "stat-motion",
  "customize": { "target": 22000, "label": "công ty đầu tư AI" },
  "visual_story": "Số lớn slam trái, bento 2x2 phải — không chỉ hiện chữ anchor",
  "visual_enrichment": [
    { "type": "source_badge", "text": "McKinsey 2024", "show_at_sec": 12.4 },
    { "type": "comparison_stat", "text": "+340% YoY", "source": "creative_brief" }
  ],
  "internal_acts": [
    { "at_sec": 0, "action": "hero_slam" },
    { "at_sec": 2.1, "action": "reveal_card_1" },
    { "at_sec": 4.0, "action": "camera_push" }
  ],
  "motion_hint": "slam + cascade + shader transition in",
  "accent_media": { "type": "lottie", "lottie_id": "arrow-up" },
  "bg_media": { "type": "stock_video", "query": "abstract tech lines" },
  "z_role": "hero_chart"
}
```

### Trường bắt buộc

| Trường | Mô tả |
|--------|--------|
| `beat_id` | `beat_1`, `beat_2`, … — khớp `compositions/beat_N.html` |
| `phrase_anchor` | Đoạn text khớp `audio_script` — map timing qua `caption-words.json` |
| `layout_archetype` | Xem [visual-layout-archetypes.md](visual-layout-archetypes.md) — **bắt buộc**, không lặp >2 beat liên tiếp |
| `render_stack` | ≥2 trong: `registry:*`, `gsap`, `lottie`, `giphy`, `threejs`, `shader` |
| `visual_story` | Mô tả visual **không** chỉ echo text — preflight kiểm tra |
| `minimum_elements` | **≥5** distinct elements trên màn hình — bắt buộc |
| `max_duration_sec` | ≤ 5.0 — preflight FAIL nếu beat-map > 5s |
| `content_unique` | `phrase_anchor` phải khác tất cả beat khác trong video |

### Trường bắt buộc (density)

| Trường | Mô tả |
|--------|--------|
| `minimum_elements` | Số element visual tối thiểu (≥5) |
| `decorative_elements[]` | Badges, icons, particles, glow rings |
| `supporting_graphics[]` | Source badges, mockups, company chips, quote boxes |
| `continuous_motion_layers[]` | Elements có loop animation suốt beat |

### Trường tùy chọn

| Trường | Mô tả |
|--------|--------|
| `narrative_role` | `hook` \| `agitate` \| `solve` \| `cta` — **gợi ý mood**, không cap số beat |
| `content_intent` | `stat`, `comparison`, `process`, `social_proof`, `hook_shock`, `cta` |
| `visual_enrichment` | Facts/badge ngắn **ngoài VO** — từ `creative_brief`, `core_signals`, `marketing_post` — **không bịa số** |
| `internal_acts` | Beat ≥6s: ≥2 act nội bộ (multi-clip trong beat) — map GSAP `addLabel` |
| `layout_variant` | `stack_center` \| `vs_row` \| `bento_2x2` \| `hero_only` \| `single_column` — **không** ép một khuôn; xem [layout-9x16-zones.md](layout-9x16-zones.md) |

### `visual_enrichment[]` — types

| type | Khi dùng | Nguồn |
|------|----------|-------|
| `source_badge` | Badge nguồn, năm báo cáo | Brief / post |
| `comparison_stat` | Số so sánh chưa nói trong VO | `core_signals`, brief (có proof) |
| `context_chip` | Insight ngắn bổ sung | `narrative_chain` |
| `quote_snippet` | Trích dẫn ≤8 từ | Post gốc |
| `header_badge` | Beat index `#N/total` | Shot-plan |
| `decorative_icon` | Icon trang trí (atom, dollar, etc.) | Creative |
| `screenshot_mockup` | Browser/app mockup card | Brief / enrichment |

**Enforcement:** Mỗi beat phải có **≥2** `visual_enrichment` entries **hoặc** `supporting_graphics[]` + `decorative_elements[]`.

### `decorative_elements[]` — types

| type | Khi dùng |
|------|----------|
| `header_badge` | `#2/9` beat index góc trên |
| `section_label` | `HOOK` / `AGITATE` / `SOLVE` / `CTA` |
| `decorative_icon` | Icon lớn mờ phía sau hero |
| `particle_field` | Floating dots/orbs |
| `glow_ring` | Vòng sáng pulse quanh hero |
| `accent_underline` | Line gradient dưới headline |

### `supporting_graphics[]` — types

| type | Khi dùng |
|------|----------|
| `source_badge` | Nguồn báo cáo, năm |
| `company_logos` | Logo chips horizontal stack |
| `quote_box` | Blockquote mô tả ngắn |
| `screenshot_mockup` | Browser window mockup |
| `comparison_stat` | Số so sánh chưa nói trong VO |

### `continuous_motion_layers[]`

List elements có animation loop suốt beat:

```json
{ "element": "deco-icon", "animation": "rotate_loop", "duration": 10 },
{ "element": "particles", "animation": "float_yoyo", "duration": 2 },
{ "element": "hero-card", "animation": "breathe", "duration": 2.5 }
```

On-screen copy **ngắn** (headline/chip ≥32px); narration đầy đủ vẫn ở caption track.

### `internal_acts[]` — pacing đồn dập

Beat duration ≥6s **bắt buộc** ≥2 `internal_acts` **hoặc** ≥2 GSAP `addLabel` trong beat HTML.

| action gợi ý | Visual |
|--------------|--------|
| `hero_slam` | Stat/headline entrance |
| `reveal_card_N` | Stagger card N |
| `camera_push` | `scale 0.92→1` trên cluster |
| `layout_swap` | Đổi hero/support focus |
| `shader_transition` | Registry transition in |

### `hero_mode` (enum)

| Value | Khi dùng | Registry / asset |
|-------|----------|------------------|
| `registry_block` | Số liệu, chart, stat | `data-chart`, `stat-motion`, `apple-money-count` |
| `diagram` | Quy trình, flow, cause-effect | `flowchart` |
| `social_card` | Social proof, metrics | `ig`, `tiktok`, `yt` |
| `kinetic_type` | Hook punch, headline slam | `caption-kinetic-slam` + hero words |
| `stock_accent` | **Fallback** — chỉ nền B-roll | Pexels low-opacity bg — không full-bleed hero |

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
| `stock_video` | `short_video_search_stock_media` media_type=video — **bắt buộc mọi beat** |
| `stock_image` | `short_video_search_stock_media` media_type=image + Ken Burns GSAP |
| ~~`gradient_only`~~ | **CẤM** — đọc [dynamic-bg-mandatory.md](dynamic-bg-mandatory.md) |

**Luật:** Pexels chỉ `bg_media` — opacity 0.3–0.6, blur nhẹ. **Cấm** full-bleed stock làm hero khi `hero_mode` là registry/diagram/social.

---

## Map nội dung → block (marketing/edu)

| Tín hiệu từ nội dung | `layout_archetype` | `registry_block` |
|----------------------|-------------------|------------------|
| Số liệu, %, growth | `stat_punch_card` | `data-chart` hoặc `stat-motion` |
| Quy trình, bước, flow | `process_flow` | `flowchart` |
| So sánh A vs B | `comparison_split` | `data-chart` (2 series) |
| Social proof, follower | `social_proof_card` | `ig` / `tiktok` |
| Hook shock | `kinetic_hook_slam` | `caption-kinetic-slam` |
| Pain point + reaction | `kinetic_hook_slam` + giphy | sticker reaction |
| CTA loop | `cta_orbit` | hero CTA + `logo-outro` optional |
| Climax visual | `shader_hero_3d` | Three.js / `code-3d-extrude` |

Transitions giữa beat: `domain-warp-dissolve`, `whip-pan`, `sdf-iris` (xem registry).

---

## Ví dụ shot-plan (90s — 10 visual beat)

Video 90s có thể có **8–15 beat** tùy mật độ nội dung. Ví dụ rút gọn 6 beat (Solve tách 3 beat):

```json
{
  "visual_shot_plan": [
    {
      "beat_id": "beat_1",
      "phrase_anchor": "Google hoảng loạn vì ChatGPT",
      "narrative_role": "hook",
      "layout_archetype": "kinetic_hook_slam",
      "render_stack": ["registry:caption-kinetic-slam", "gsap", "giphy"],
      "hero_mode": "kinetic_type",
      "registry_block": "caption-kinetic-slam",
      "visual_story": "Slam từng từ + sticker nổ + SFX vine boom",
      "customize": { "words": ["Google", "hoảng", "loạn"] },
      "accent_media": { "type": "giphy_sticker", "query": "explosion" },
      "bg_media": { "type": "stock_video", "query": "abstract dark motion" },
      "motion_hint": "slam + ambient_grain",
      "z_role": "hero_type"
    },
    {
      "beat_id": "beat_2",
      "phrase_anchor": "một tỷ người dùng ChatGPT",
      "narrative_role": "agitate",
      "layout_archetype": "stat_punch_card",
      "render_stack": ["registry:stat-motion", "gsap", "giphy"],
      "hero_mode": "registry_block",
      "registry_block": "stat-motion",
      "visual_story": "Counter punch lên 1B + sticker shocked face",
      "customize": { "target": 1000000000, "label": "người dùng ChatGPT" },
      "accent_media": { "type": "giphy_sticker", "query": "shocked" },
      "bg_media": { "type": "stock_video", "query": "dark city night" },
      "motion_hint": "punch + parallax",
      "z_role": "hero_chart"
    },
    {
      "beat_id": "beat_3",
      "phrase_anchor": "Tìm kiếm chuyển sang AI Mode",
      "narrative_role": "solve",
      "layout_archetype": "process_flow",
      "render_stack": ["registry:flowchart", "gsap", "lottie"],
      "hero_mode": "diagram",
      "registry_block": "flowchart",
      "visual_story": "Flowchart cascade từng node theo thoại",
      "customize": { "nodes": ["Tìm kiếm", "AI Mode", "Mất click"] },
      "accent_media": { "type": "lottie", "lottie_id": "arrow-down" },
      "bg_media": { "type": "stock_video", "query": "abstract tech lines" },
      "motion_hint": "cascade + breathe",
      "z_role": "hero_chart"
    },
    {
      "beat_id": "beat_4",
      "phrase_anchor": "click giảm 40 phần trăm",
      "narrative_role": "solve",
      "layout_archetype": "comparison_split",
      "render_stack": ["registry:data-chart", "gsap"],
      "hero_mode": "registry_block",
      "registry_block": "data-chart",
      "visual_story": "Bar chart 2 cột before/after + count-up",
      "customize": { "data": [{ "label": "Trước", "value": 100 }, { "label": "Sau", "value": 60 }] },
      "bg_media": { "type": "stock_video", "query": "abstract dark motion" },
      "motion_hint": "stagger bars",
      "z_role": "hero_chart"
    },
    {
      "beat_id": "beat_5",
      "phrase_anchor": "nhưng startup vẫn tăng trưởng",
      "narrative_role": "solve",
      "layout_archetype": "bento_insight_grid",
      "render_stack": ["gsap", "lottie", "registry:stat-motion"],
      "hero_mode": "registry_block",
      "registry_block": "stat-motion",
      "visual_story": "Bento 3 card insight stagger + arrow lottie",
      "customize": { "target": 42, "label": "% tăng trưởng" },
      "bg_media": { "type": "stock_video", "query": "startup office" },
      "motion_hint": "bento stagger",
      "z_role": "hero_chart"
    },
    {
      "beat_id": "beat_6",
      "phrase_anchor": "Theo dõi để xem phần 2",
      "narrative_role": "cta",
      "layout_archetype": "cta_orbit",
      "render_stack": ["registry:caption-kinetic-slam", "gsap", "lottie"],
      "hero_mode": "kinetic_type",
      "registry_block": "caption-kinetic-slam",
      "visual_story": "CTA orbit collapse + celebration lottie",
      "customize": { "words": ["Theo", "dõi", "ngay"] },
      "accent_media": { "type": "lottie", "lottie_id": "celebration" },
      "bg_media": { "type": "stock_video", "query": "abstract dark motion" },
      "motion_hint": "slam + ambient_glow",
      "z_role": "hero_type"
    }
  ]
}
```

---

## Audit gates (Phase 2 preflight)

`check-visual-density.mjs` kiểm tra:

| Code | Severity | Điều kiện |
|------|----------|-----------|
| `missing_shot_plan` | critical | Không có `visual_shot_plan` hoặc rỗng |
| `missing_phrase_anchor` | critical | Entry thiếu `phrase_anchor` |
| `missing_layout_archetype` | critical | Entry thiếu `layout_archetype` |
| `text_only_beat` | critical | Beat HTML chỉ có text kinetic, không registry/lottie/3d |
| `archetype_repeat` | critical | >2 beat liên tiếp cùng `layout_archetype` |
| `missing_visual_story` | critical | Entry thiếu `visual_story` hoặc `render_stack` rỗng |

---

## Phase 2 thực thi

1. Transcribe → caption sync → đọc `audio_script` + `caption-words.json`
2. Sinh `visual_shot_plan` (N beats) → lưu metadata + `assets/visual-shot-plan.json`
3. `map-shot-plan-to-beat-map.mjs` → `assets/beat-map.json`
4. `npx hyperframes add <registry_block>` theo từng beat unique — **customize in-place**
5. Agent **viết thủ công** `compositions/beat_N.html` — **cấm** scaffold gen-beats
6. MCP media theo `accent_media` + `bg_media`
7. Ghi `media-plan.md` với cột: `hero_type`, `registry_block`, `z_role`, `layout_archetype`
8. Invoke `/continuous-motion` trước beat HTML

---

## Anti-patterns

| Sai | Đúng |
|-----|------|
| 4 beat = 4 section HASCAS | N beat theo nội dung đang nói |
| Chỉ hiện chữ `phrase_anchor` trên nền | `visual_story` + registry + motion stack |
| Dùng `gen-beats-from-shot-plan.mjs` | Hand-craft beat HTML từ registry/GSAP/Lottie/Three.js |
| Solve 60s = 1 composition | Tách nhiều beat trong Solve |
| Caption block là hero duy nhất | ≥2 registry block khác tên / video |
