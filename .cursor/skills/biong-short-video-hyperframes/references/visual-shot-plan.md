# Visual Shot Plan — khóa layout Phase 2

Agent **bắt buộc** sinh `visual_shot_plan` **sau transcribe** Phase 2 (khi đã có `caption-words.json` + `totalVideoSec`), lưu qua `short_video_update_agent_status` và `assets/visual-shot-plan.json`.

**Input:** `audio_script` + `caption-words.json` + `core_signals` + `creative_brief` + `totalVideoSec` + `hf_theme` (CMS hoặc auto).

**Mục tiêu:** Visual beat **bám cụm nội dung đang nói** — **không** map 1:1 theo 4 section HASCAS. HASCAS chỉ dùng cho kịch bản thoại Phase 1. **Được phép** hiển thị dẫn chứng ngắn **không** nằm trong VO qua `visual_enrichment`.

**Đọc kèm:** [hf-prompt-catalog.md](hf-prompt-catalog.md) · [hf-prompt-beat-contract.md](hf-prompt-beat-contract.md) · [hf-prompt-art-direction.md](hf-prompt-art-direction.md) · [hyperframes-theme-init.md](hyperframes-theme-init.md) · [overlay-layer-stack.md](overlay-layer-stack.md)

---

## Khi nào sinh (Phase 2 only)

1. `short_video_get_context` — `audio_script_approved === true`
2. `bootstrap-phase2-assets.mjs` → `transcribe-audio.mjs` → caption sync → có `caption-words.json`
3. Đọc `audio_script` + `caption-words` + `core_signals`
4. **→ Sinh `visual_shot_plan`** — **N beat** theo nội dung (không giới hạn min/max)
5. `short_video_update_agent_status({ status: "processing", metadata: { visual_shot_plan, visual_shot_plan_at } })`
6. `assign-beat-prompt-types.mjs` → `map-shot-plan-to-beat-map.mjs` → `build-beat-element-timing.mjs`
7. Agent viết `compositions/beat_N.html` theo `hf_prompt_type` + beat-timing → MCP media → render

**Cấm** sinh shot-plan trong Phase 1 / `save_audio_script`.

**Cấm** dùng `gen-beats-from-shot-plan.mjs` — đã gỡ khỏi pipeline.

---

## Visual beat vs HASCAS

| Khái niệm | Phạm vi | Số lượng |
|-----------|---------|----------|
| **HASCAS** | Kịch bản thoại (`timeline`, `expressive_plan`, narrative markers) | 4 section narrative — **chỉ Phase 1** |
| **Visual beat** | Một layout/motion world bám `phrase_anchor` trên audio thật | **Không giới hạn** — chia khi đổi ý, số liệu, quy trình, twist, CTA |

Chia beat khi: đổi chủ đề · số liệu mới · quy trình mới · so sánh · twist · CTA — **không** chia theo 4 chữ HASCAS.

**Marketing post liên kết:** on-screen content được lấy tự do từ `creative_brief.content_plain_text` / `marketing_post_images` — **không** giới hạn bởi từng câu `audio_script`. Đọc [marketing-post-image-card.md](marketing-post-image-card.md).

---

## Beat duration — 5s–20s (bắt buộc)

| Rule | Giá trị |
|------|---------|
| Min duration/beat | **5s** — beat ngắn hơn phải gộp với beat liền kề |
| Max duration/beat | **20s** — không ngoại lệ (kể cả beat 1 hook) |
| Video 60s | Khoảng **3–12 beat** (60÷20 … 60÷5) |
| Video 90s | Khoảng **5–18 beat** |
| Video 120–180s | Khoảng **6–36 beat** |
| Beat quá dài | **Tách thành nhiều beat** — mỗi beat = 1 ý / số liệu / câu, mỗi beat ≤20s |
| Beat quá ngắn | **Gộp** — không tách micro-beat <5s |

**Cấm:** 1 beat >20s ôm nhiều ý → màn hình trống chờ.  
**Cấm:** beat <5s (trừ beat cuối nếu dư <5s sau khi chia).  
**Cấm:** 2 beat liền kề dùng cùng `phrase_anchor` hoặc cùng `hf_prompt_type`.

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
  "hf_prompt_type": "data-story",
  "visual_story": "Counter roll + sparkline — không chỉ hiện chữ anchor",
  "element_ids": ["hero_stat", "delta_chip", "source_badge"],
  "visual_enrichment": [
    { "type": "source_badge", "text": "McKinsey 2024" },
    { "type": "comparison_stat", "text": "+340% YoY", "source": "creative_brief" }
  ],
  "accent_media": { "type": "giphy_sticker", "query": "arrow up" },
  "bg_media": { "type": "stock_video", "query": "abstract tech lines" }
}
```

> `hf_prompt_type` do `assign-beat-prompt-types.mjs` gán — agent **không** tự chọn khi render.

### Trường bắt buộc

| Trường | Mô tả |
|--------|--------|
| `beat_id` | `beat_1`, `beat_2`, … — khớp `compositions/beat_N.html` |
| `phrase_anchor` | Đoạn text khớp `audio_script` — map timing qua `caption-words.json` |
| `hf_prompt_type` | Gán bởi script — xem [hf-prompt-catalog.md](hf-prompt-catalog.md) |
| `visual_story` | Mô tả visual **không** chỉ echo text — preflight kiểm tra |
| `element_ids` | Danh sách id element cho `build-beat-element-timing.mjs` |
| `min_duration_sec` | ≥ 5.0 — preflight FAIL nếu beat-map < 5s (trừ beat cuối dư) |
| `max_duration_sec` | ≤ 20.0 — preflight FAIL nếu beat-map > 20s |
| `content_unique` | `phrase_anchor` phải khác tất cả beat khác trong video |

### Trường tùy chọn

| Trường | Mô tả |
|--------|--------|
| `narrative_role` | `hook` \| `agitate` \| `solve` \| `cta` — gợi ý mood |
| `content_intent` | `stat`, `comparison`, `process`, `hook_shock`, `cta` — gợi ý assign script |
| `visual_enrichment` | Facts/badge ngắn **ngoài VO** — từ `creative_brief` |
| `accent_media` | Giphy/Lottie theo shot-plan |
| `bg_media` | Stock video/image — bg only trong index.html |

### `visual_enrichment[]` — types

| type | Khi dùng | Nguồn |
|------|----------|-------|
| `source_badge` | Badge nguồn, năm báo cáo | Brief / post |
| `comparison_stat` | Số so sánh chưa nói trong VO | `core_signals`, brief (có proof) |
| `context_chip` | Insight ngắn bổ sung | `narrative_chain` |
| `quote_snippet` | Trích dẫn ≤8 từ | Post gốc |
| `marketing_post_image` | Ảnh thật + caption từ marketing post | `creative_brief.marketing_post_images` — 1 ảnh / 1 beat — [marketing-post-image-card.md](marketing-post-image-card.md) |
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
| `marketing_post_image` | Ảnh thật marketing post | `.browser-mockup-card` — [marketing-post-image-card.md](marketing-post-image-card.md) |
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

## Phase 2 thực thi

1. Transcribe → caption sync → đọc `audio_script` + `caption-words.json`
2. Sinh `visual_shot_plan` (N beats, content only) → lưu `assets/visual-shot-plan.json`
3. `assign-beat-prompt-types.mjs` — gán `hf_prompt_type` random
4. `map-shot-plan-to-beat-map.mjs` → `assets/beat-map.json`
5. `build-beat-element-timing.mjs` → `assets/beat-timing/beat_N.json`
6. **Mỗi beat:** đọc `@hyperframes/prompts/{hf_prompt_type}.md` + timing JSON → viết `compositions/beat_N.html` (hf-seek `t`-based)
7. MCP media theo `accent_media` + `bg_media` + `/continuous-motion` ambient
8. Ghi `media-plan.md` với cột: `hf_prompt_type`, `accent_media`, `bg_media`

---

## Anti-patterns

| Sai | Đúng |
|-----|------|
| 4 beat = 4 section HASCAS | N beat theo nội dung đang nói |
| Chỉ hiện chữ `phrase_anchor` trên nền | `visual_story` + prompt type aesthetic |
| GSAP beat timeline / registry blocks | hf-seek `render()` pure function of `t` |
| Đoán element timing bằng mắt | `assets/beat-timing/beat_N.json` từ Whisper |
| Solve 60s = 1 composition | Tách nhiều beat trong Solve |
