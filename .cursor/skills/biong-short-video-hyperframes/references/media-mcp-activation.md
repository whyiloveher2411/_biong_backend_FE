# Media MCP activation — ép agent lấy assets qua MCP (phase render)

AI agent mặc định bịa đường dẫn `assets/foo.mp3` hoặc bỏ qua nhạc nền. **Bắt buộc** đọc file này phase render (sau transcribe) trước khi viết beat HTML.

Phase 1: ghi `[BGM: mood]`, `[SFX: ...]` + `metadata.markers` — **không** gọi MCP, **không** shot-plan.

Phase 2: sinh `visual_shot_plan` → lưu `update_agent_status` → MCP theo shot-plan.

**Đọc:** [visual-shot-plan.md](visual-shot-plan.md) — mọi media call theo shot-plan, không search stock blind mỗi beat.

---

## Vai trò

Chuyên gia Motion Graphics viral — **registry UI hero** + ambient motion + nhạc nền nhẹ. **Mọi beat** phải có `stock_video` nền — đọc [dynamic-bg-mandatory.md](dynamic-bg-mandatory.md). Pexels z 3–5, opacity 0.35–0.55.

---

## Quy trình 3 bước

### 1. Phân tích ngữ cảnh

- Đọc `visual_shot_plan`, `audio_script`, transcribe → `totalVideoSec`
- Map BGM từ `[BGM: ...]` (fallback: `lofi ambient`)
- Mỗi beat: `hero_mode`, `registry_block`, `accent_media`, `bg_media`

### 2. Gọi MCP + registry (cấm bịa tên file)

**Hook SFX (1 lần / video):**

```text
short_video_search_meme_sound({ query: "vine boom" })
```

→ `assets/audio/sfx_hook.mp3`

**BGM chain (nhiều segment / video):**

```text
short_video_search_bgm({ query: "lofi ambient", limit: 8 })
```

→ Tải `assets/audio/bgm_1.mp3`, `bgm_2.mp3`, … (candidate **khác nhau**, cùng mood) cho đến khi phủ `totalVideoSec`

→ Ghi `assets/bgm-chain.json` → `node .cursor/skills/biong-short-video-preflight/scripts/wire-bgm-chain.mjs $PROJ`

**Cấm** `min_duration_sec=totalVideoSec` và **cấm** `loop` — dùng BGM chain + crossfade 0.5s.

**Stock — chỉ `bg_media`:**

```text
short_video_search_stock_media({ query: "abstract dark gradient", media_type: "video" })
```

→ `assets/images/` — embed z 3–5, **full-bleed** `.stock-bg` 1080×1920 + `object-fit:cover` (chạy `patch-stock-full-bleed.mjs`)

**Giphy accent:**

```text
short_video_search_giphy({ query: "celebration", media_type: "sticker" })
```

→ `assets/images/` — floater z 80–150 — **`<img>` WebP/GIF only** — [giphy-accent-format.md](giphy-accent-format.md) + **lane phải** [floater-text-keepout.md](floater-text-keepout.md)

**Lottie (bundle local):**

```bash
cp .cursor/skills/biong-short-video-hyperframes/assets/lotties/{id}.json \
   storage/agent-renders/{id}/my-video/assets/lotties/
```

→ `window.__hfLottie` — xem [lottie-activation.md](lottie-activation.md)

**Registry hero:**

```bash
npx hyperframes add data-chart   # theo visual_shot_plan.registry_block
```

### 3. Embed HyperFrames

- BGM chain track 11/13/15…, SFX track 12, narration track 10
- Registry blocks via `data-composition-src` — z 200–450
- `compositions/ambient-layer.html` — z 6–10
- GSAP `paused: true` — `main` + `ambient` timelines

---

## Bảng chọn tool

| Trigger | MCP / action | Ghi chú |
|---------|--------------|---------|
| `[SFX: ...]` | `short_video_search_meme_sound` | track 12, giây 0 |
| `[BGM: ...]` | `short_video_search_bgm` + `wire-bgm-chain.mjs` | chain track 11/13/15…, crossfade 0.5s |
| `bg_media.stock_*` | `short_video_search_stock_media` | bg only, opacity thấp |
| `accent_media.giphy_*` | `short_video_search_giphy` | sticker/gif |
| `accent_media.lottie` | Lottie bundle | `lottie_id` từ manifest |
| `hero_mode=registry_block` | `npx hyperframes add` | customize in-place |

---

## Tần suất bắt buộc

| Quy tắc | Chi tiết |
|---------|----------|
| Mỗi video | BGM chain phủ ≥ totalVideoSec (check-media-stack) |
| Hook SFX | Bắt buộc nếu script có `[SFX: ...]` (track 12) |
| Registry | ≥1 **non-caption** block (data-chart, flowchart, stat-motion…) |
| Stock hero | ≤40% beat — còn lại registry/kinetic/diagram |
| Ambient | `ambient-layer.html` bắt buộc (lớp phụ — **không** thay stock video) |
| Dynamic BG | Mọi beat `stock_video`; timeline phủ kín — `check-dynamic-background.mjs` |
| Floater lane | `floater-lane-right`; cấm đè text — `check-floater-keepout.mjs` |
| BGM volume | 0.25–0.35; narration 1.0 |
| BGM crossfade | 0.5s giữa segment — wire-bgm-chain.mjs |
| Cấm BGM loop | Attribute `loop` không hoạt động khi render |

---

## Deliverable: `media-plan.md`

```markdown
| scope | time_sec | hero_type | registry_block | z_role | mcp_tool | query | local_path |
|-------|----------|-----------|----------------|--------|----------|-------|------------|
| sfx_hook | 0.0 | audio | — | — | short_video_search_meme_sound | vine boom | ../assets/audio/sfx_hook.mp3 |
| bgm_global | 0.0 | audio | — | — | short_video_search_bgm | lofi ambient | ../assets/audio/bgm_1.mp3 |
| bgm_2 | 44.5 | audio | — | — | short_video_search_bgm | lofi ambient | ../assets/audio/bgm_2.mp3 |
| hook | 0.0 | kinetic_type | caption-kinetic-slam | hero_type | hyperframes add | — | compositions/… |
```

**Quality gate:** `wire-bgm-chain.mjs` + `check-media-stack.mjs --strict` + `check-visual-density.mjs`

---

## Anti-patterns

| Cấm | Làm đúng |
|-----|----------|
| Pexels full-bleed hero mỗi beat | Registry block + stock bg mờ |
| Bỏ qua visual_shot_plan | MCP theo shot-plan |
| Chỉ caption registry blocks | ≥1 data-chart / flowchart / stat-motion |
| `tl.play()` | paused + `window.__timelines` |
| 1 file BGM + loop | BGM chain nhiều segment |

---

## Đọc kèm

- [import-html-assemble-bgm.md](import-html-assemble-bgm.md) — import HTML assemble
- [visual-shot-plan.md](visual-shot-plan.md)
- [lottie-activation.md](lottie-activation.md)
- [continuous-motion-patterns.md](continuous-motion-patterns.md)
- [overlay-layer-stack.md](overlay-layer-stack.md)
- [blank-frame-audit.md](blank-frame-audit.md)
