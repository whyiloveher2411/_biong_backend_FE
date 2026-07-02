---
name: biong-short-video-hyperframes
description: Agent short video marketing — script → admin duyệt → CMS queue TTS → agent render HyperFrames (phase 2 render-only).
---

# Biong Short Video — HyperFrames Agent

## Luồng workflow (3 bước thực tế)

| Bước | Ai làm | Hành động | Kết quả |
|------|--------|-----------|---------|
| **1** | Agent | `get_context` + `save_audio_script` | `audio_script` — **DỪNG** |
| **Giữa** | Admin | **Duyệt script** trên CMS | CMS **queue TTS** (luôn sau duyệt) |
| **Giữa** | CMS worker | OmniVoice chain TTS | `audio_file` |
| **2** | Agent | `visual_shot_plan` + render + `upload_agent_video` | `agent_video_url` |

Toggle **TTS tự động** + **nền tảng TTS** trên drawer cấu hình chain CMS queue — **không** còn prompt agent TTS.

TTS fail → `agent_video_status=failed` + **Thử lại TTS** + **upload MP3 fallback**.

`get_context` trả `workflow_mode`, `tts_pending`, `agent_tts_status`, `tts_chain`.

**Cấm** `generate_narration_tts` từ agent/MCP Phase 2 — TTS chỉ qua CMS queue sau duyệt.

---

## CMS queue TTS (sau admin duyệt)

| Bước | Ai | Kết quả |
|------|-----|---------|
| Script | Agent Phase 1 | `audio_script` — DỪNG chờ duyệt |
| Duyệt | Admin CMS | enqueue `agent_narration_tts` |
| Audio | Queue worker | `audio_file` |
| Render | Agent Phase 2 (prompt bước 2) | `agent_video_url` |

Upload MP3 thủ công vẫn được khi TTS lỗi hoặc muốn thay file.

Chain TTS: **OmniVoice local → VieNeu → Saydi → Vbee** — response `tts_provider_used` (`omnivoice_local` | `vieneu_clone` | …).

**Phase 1 script (4 bước):**
1. `/extract-core-signals` → `/hyperframes-creative` → `/viral-audio-script` (one-pass) → `/audit-audio-script` → `save_audio_script` → **DỪNG**
2. Đọc [plain-language-storytelling-vi.md](references/plain-language-storytelling-vi.md) — kể cho bạn 12 tuổi; cấm em dash `—`
3. Đọc [narrative-flow-vi.md](references/narrative-flow-vi.md) — But/Therefore
4. Đọc [vi-voiceover-naturalization.md](references/vi-voiceover-naturalization.md) + [omnivoice-expressive-tags.md](references/omnivoice-expressive-tags.md)

**Sau TTS:** `bootstrap-phase2-assets.mjs` → `transcribe-audio.mjs` → caption sync → `visual_shot_plan` (N beats) → `map-shot-plan-to-beat-map.mjs` (prosody tags đổi duration).

**Prereq OmniVoice (local):**

| Tier | Lệnh | Env backend |
|------|------|-------------|
| Local | `./omnivoice-tts.sh prepare-clone && start` | `OMNIVOICE_TTS_LOCAL_BASE_URL=http://127.0.0.1:8766` |

Chung: `OMNIVOICE_MODEL_ID=k2-fsa/OmniVoice`, `OMNIVOICE_GUIDANCE_SCALE=2`, `OMNIVOICE_USE_AUDIO_DEMO_CLONE=true`, `OMNIVOICE_SHORT_VIDEO_SPEED=1.15`, `OMNIVOICE_NUM_STEP=64`. Không cần queue worker cho MCP short video.

---

## Media assets qua MCP (bắt buộc phase render)

**Đọc trước:** [media-mcp-activation.md](references/media-mcp-activation.md)

Phase 1: ghi `[BGM]`, `[SFX]`, `timeline`, `markers` (HASCAS narrative only) — **không** gọi MCP, **không** shot-plan. Phase render:

1. `get_context` — script **đã duyệt**
2. `bootstrap-phase2-assets.mjs` → `transcribe-audio.mjs` → caption sync → `totalVideoSec`
3. Sinh `visual_shot_plan` (**N beats** bám audio, không theo HASCAS) → `update_agent_status` + `assets/visual-shot-plan.json`
4. `map-shot-plan-to-beat-map.mjs` → agent viết `compositions/beat_N.html` thủ công (registry/GSAP/Lottie/Three.js)
5. `search_meme_sound` (hook) + `search_bgm` + `search_giphy` / Lottie bundle / stock **bg only**
6. `/continuous-motion` → `ambient-layer.html` + `window.__timelines["ambient"]`
7. Embed SFX track 12 (hook) + beat-move tracks 14–21 + BGM track 11; GSAP paused

| Tool | Dùng khi |
|------|----------|
| `short_video_search_meme_sound` | Hook SFX — vine boom, sấm sét (giây 0) |
| `short_video_search_stock_media` | **bg_media** only — opacity 0.3–0.6, không hero full-bleed |
| `short_video_search_bgm` | Nhạc nền Pixabay — 1 track/video |
| `short_video_search_giphy` | accent_media sticker/gif từ shot-plan |
| Lottie bundle | `accent_media.type=lottie` — cp từ `assets/lotties/` |

Deliverable: `my-video/media-plan.md` — `sfx_hook` + `bgm_global` + mỗi beat (`hero_type`, `registry_block`, `z_role`).

**Tần suất:** hook SFX bắt buộc; ≥1 BGM; ≥1 non-caption registry block/video; ambient layer bắt buộc; preflight `check-continuous-motion.mjs` + `check-visual-density.mjs`

`get_context.production_playbook.media_assets` có `priority_matrix`, `frequency_rules`, `alias_hints`.

**Backend env:** `PEXELS_API_KEY`, `PIXABAY_API_KEY` (Audio API — fallback scrape/catalog nếu chưa bật quyền)

---

## Phase 1 — Audio script viral (extract + viral script)

### Skills

| # | Skill | Output |
|---|-------|--------|
| 1 | `/extract-core-signals` | `core_signals`: hook, tension, takeaway, **narrative_chain**, perspective |
| 2 | `/hyperframes-creative` | Narrative Flow But/Therefore + góc nhìn plain language |
| 3 | `/viral-audio-script` | Script **hoàn chỉnh** HASCAS + timeline + markers + `expressive_plan` |
| 4 | `/audit-audio-script` | **QA + sửa** — pass bắt buộc trước save |

Docs: [plain-language-storytelling-vi.md](references/plain-language-storytelling-vi.md) · [audit-audio-script.md](references/audit-audio-script.md) · [narrative-flow-vi.md](references/narrative-flow-vi.md) · [viral-retention-structure.md](references/viral-retention-structure.md)

### Timeline viral (60–180s)

Agent chọn `estimated_duration_sec` trong **60–180** theo nội dung. HASCAS scale: Hook ~5%, Agitate ~25%, Solve ~60%, CTA ~10%.

Word budget: ~2.5 từ/giây — 60s ≈ 150 từ, 180s ≈ 450 từ.

- Câu **tự nhiên** (plain language); **cấm** em dash `—`; **bắt buộc** `[SFX: vine boom]` ở hook
- `cta_mode: "loop"` khuyến nghị

### Lưu MCP

```text
short_video_save_audio_script({
  short_video_id,
  text: "[BGM: lofi ambient] [SFX: vine boom] ... (đủ dài 60–180s)",
  metadata: {
    timeline: { hook_end: 5, agitate_end: 27, solve_end: 81, total: 90 },
    cta_mode: "loop",
    markers: [{ time: 0, text: "...", section: "hook" }],
    estimated_duration_sec: 90
  }
})
```

**DỪNG** — admin duyệt script trên CMS (CMS queue TTS). Khi có `audio_file` → copy prompt **bước 2** render-only.

---

## Phase 2 — Motion complexity (bắt buộc)

**Đọc TRƯỚC khi viết beat HTML:** [evolution-memory.md](references/evolution-memory.md) — reuse premium blocks, tuân constraints. **Cấm** sửa `SKILL.md` trong session render.

**Cấm scaffold placeholder:** Không ship beat HTML có text `"Beat 1"`, `"Beat 2"`…, text-only kinetic, hoặc `#root` opaque che stock. **Cấm** `gen-beats-from-shot-plan.mjs` — đã gỡ. Phase 2 **bắt buộc**:

1. Transcribe → sinh `visual_shot_plan` (**N beats** content-driven) — [visual-shot-plan.md](references/visual-shot-plan.md) · [visual-layout-archetypes.md](references/visual-layout-archetypes.md)
2. `assets/visual-shot-plan.json` + `map-shot-plan-to-beat-map.mjs`
3. Agent **viết thủ công** `compositions/beat_N.html` + `npx hyperframes add` registry — customize in-place

**CSS global bắt buộc:**

Mọi project PHẢI copy + inject `global-default-styles.css` vào `assets/` và link trong `index.html`:

```html
<link rel="stylesheet" href="assets/global-default-styles.css" />
```

Copy khi bootstrap:

```bash
cp .cursor/skills/biong-short-video-hyperframes/assets/global-default-styles.css $PROJ/assets/
```

Hoặc inline vào `<style>` trong beat HTML. File này enforce:

- Inset `box-shadow` (border-3d) cho tất cả boxes/cards
- Tiered `text-shadow` cho hero/focal/card-title/body
- `fx-shine` + `fx-breathe` shared keyframes
- Cấm override các styles này trừ khi có lý do đặc biệt

**Beat 1 hook title:** `.hook-title-text` = `article_title` từ `get_context` (tên bài viết) — cấm `title` có ` — Short video #N`; hook VO đặt ở `.quote-box`.

4. Đọc [giphy-accent-format.md](references/giphy-accent-format.md) · [floater-text-keepout.md](references/floater-text-keepout.md) · [dynamic-bg-mandatory.md](references/dynamic-bg-mandatory.md) · [foreground-continuous-motion.md](references/foreground-continuous-motion.md) · [keyword-highlighting.md](references/keyword-highlighting.md) · [beat-progress-bar.md](references/beat-progress-bar.md) · [beat-transition-sfx.md](references/beat-transition-sfx.md) · [hook-title-impact-box.md](references/hook-title-impact-box.md) · [box-animation-catalog.md](references/box-animation-catalog.md) · [card-animation-catalog-v2.md](references/card-animation-catalog-v2.md) · [text-animation-catalog.md](references/text-animation-catalog.md) · [text-shadow-guidelines.md](references/text-shadow-guidelines.md) · [dynamic-bg-patterns.md](references/dynamic-bg-patterns.md) · [fixtures-not-production-templates.md](references/fixtures-not-production-templates.md) · [layout-9x16-zones.md](references/layout-9x16-zones.md)
5. `check-visual-density.mjs` pass (FAIL nếu text-only / thiếu shot-plan / opaque beat) — **keyword highlight + box fx (`.box-*` + `.fx-*`) + text effects (≥2 types) + card effects (≥3 types) + NO opacity fade content trong loop**

### Vai trò

**Senior Motion Graphics** — dynamic, cinematic. Cấm slide text + đổi nền.

**Mindset:** Motion designer — [kinetic-typography-brief.md](references/kinetic-typography-brief.md). Font: [typography-be-vietnam-pro.md](references/typography-be-vietnam-pro.md). Pacing: [viral-retention-structure.md](references/viral-retention-structure.md).

### Caption karaoke (bắt buộc mọi video)

Đọc [caption-karaoke-script-sync.md](references/caption-karaoke-script-sync.md):

- **Text:** `assets/audio-script.txt` từ `bootstrap-phase2-assets.mjs`
- **Timing:** `transcript.json` từ `transcribe-audio.mjs` (start/end only)
- **Sync:** `transcribe-audio.mjs` → `sync-caption-from-script.mjs` → `verify-caption-sync.mjs --strict` → `gen-captions-html.mjs`
- **Chunk:** 3–5 từ/group trong HTML generator

### Preflight (bắt buộc trước render final)

Invoke `/biong-short-video-preflight` — đọc skill đầy đủ; tóm tắt:

```bash
PROJ=storage/agent-renders/{id}/my-video
# Sau short_video_get_context — lưu response → assets/get-context-snapshot.json
node .cursor/skills/biong-short-video-preflight/scripts/bootstrap-phase2-assets.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/transcribe-audio.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/sync-caption-from-script.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/verify-caption-sync.mjs $PROJ --strict
node .cursor/skills/biong-short-video-preflight/scripts/map-shot-plan-to-beat-map.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/sync-index-beats-from-map.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/wire-beat-transition-sfx.mjs $PROJ
# Agent viết compositions/beat_N.html thủ công — CẤM gen-beats-from-shot-plan.mjs
node .cursor/skills/biong-short-video-preflight/scripts/gen-captions-html.mjs $PROJ
cp .cursor/skills/biong-short-video-hyperframes/assets/spacedev-logo.png $PROJ/assets/images/
cp .cursor/skills/biong-short-video-hyperframes/assets/global-default-styles.css $PROJ/assets/
node .cursor/skills/biong-short-video-preflight/scripts/gen-brand-watermark.mjs $PROJ --duration {totalVideoSec}
node .cursor/skills/biong-short-video-preflight/scripts/patch-stock-full-bleed.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/check-continuous-motion.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/check-stock-full-bleed.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/check-visual-density.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/check-foreground-motion-density.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/check-beat-timing.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/check-screen-fill.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/check-media-stack.mjs $PROJ --strict
node .cursor/skills/biong-short-video-preflight/scripts/check-overlay-stack.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/check-beat-transition-sfx.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/check-default-styles.mjs $PROJ
```

Pass → invoke `/biong-short-video-evolution` (vision loop) → mới `render --quality high --strict`.

### Phase 2.5 — Auto-Evolution (bắt buộc)

Invoke `/biong-short-video-evolution` sau preflight pass, **trước** render final:

1. `capture-visual-audit.mjs` → `hyperframes snapshot`
2. Agent đọc snapshots + contact-sheet — rubric layout + aesthetic ≥7/10
3. Fail → sửa beat HTML/CSS/GSAP → re-preflight (max **2 vòng**, không hỏi user)
4. Pass → append [evolution-memory.md](references/evolution-memory.md) + `assets/visual-audit-report.json`
5. `render --quality high --strict` + upload kèm `metadata.visual_audit_report`

### Watermark Spacedev (bắt buộc)

Đọc [spacedev-brand-watermark.md](references/spacedev-brand-watermark.md):

- **Sinh:** `gen-brand-watermark.mjs` — `#root` full canvas + `.brand-wrap` góc trên trái
- **Cấm** `right`/`bottom` trên `#root` — logo lệch giữa/trái (lỗi video #25)
- Host clip `z-index:9500`, **cuối** `#root`, `data-duration=totalVideoSec`

### Upload (sau render)

1. `short_video_upload_agent_video` — native FormData ≤20MB; curl -F >20MB (v2.2.0)
2. Fail → `node mcp/short-video-agent/scripts/upload-agent-video.mjs --short-video-id {id} --file {abs}`

### Registry blocks (ưu tiên)

```bash
cd storage/agent-renders/{id}/my-video
npx hyperframes add caption-pill-karaoke
npx hyperframes add caption-kinetic-slam
```

Dùng block cho caption + transition — customize, không viết từ đầu. Skill: `/hyperframes-registry`.

### GSAP ép

- **Cấm** linear entrance → `power3.out`, `back.out(1.7)`, `elastic.out(1, 0.3)`
- **Stagger** `0.1` trên lists/words/cards
- **Continuous loops:** mỗi beat ≥1 foreground tween `repeat: -1` hoặc `yoyo: true` — đọc [foreground-continuous-motion.md](references/foreground-continuous-motion.md)
- **Visual density:** mỗi beat ≥5 distinct elements (badges, hero, cards, deco icons, quote boxes)
- **3D depth:** scale 0.8→1, rotate ±5°, gradient border glow
- **Sync:** `paused: true` → `window.__timelines[id]`; `data-duration` khớp audio beat

### Render final

```bash
# Debug local — cấm upload CMS
npx hyperframes render --quality draft --output debug.mp4

# Final — sau lint + inspect pass
npx hyperframes render --output output.mp4 --quality high --fps 30 --strict
```

Không upload bản `--quality draft`. Trước render final: đọc [blank-frame-audit.md](references/blank-frame-audit.md).

---

## Tài liệu (đọc theo thứ tự)

1. [audit-audio-script.md](references/audit-audio-script.md) — **QA cổng cuối phase 1 — bắt buộc trước save**
2. [narrative-flow-vi.md](references/narrative-flow-vi.md) — **But/Therefore + anti-listing — bắt buộc phase 1**
3. [viral-retention-structure.md](references/viral-retention-structure.md) — **timeline viral + retention pacing**
4. [typography-be-vietnam-pro.md](references/typography-be-vietnam-pro.md) — **font Be Vietnam Pro local**
5. [media-mcp-activation.md](references/media-mcp-activation.md) — **phase render: MCP assets bắt buộc**
6. [caption-karaoke-script-sync.md](references/caption-karaoke-script-sync.md) — **caption bắt buộc**
7. [transcribe-locale.md](references/transcribe-locale.md) — **locale transcribe đa ngôn ngữ**
7. [kinetic-typography-brief.md](references/kinetic-typography-brief.md) — **mindset motion graphics, min font**
7b. [hyperframes-theme-init.md](references/hyperframes-theme-init.md) + [canvas-contract-3-layer.md](references/canvas-contract-3-layer.md) — **theme scaffolding + 3 lớp**
8. [spacedev-brand-watermark.md](references/spacedev-brand-watermark.md) — **watermark bắt buộc**
9. [overlay-layer-stack.md](references/overlay-layer-stack.md) — **z-index caption 9000 / watermark 9500**
10. [motion-complexity-activation.md](references/motion-complexity-activation.md) — ép cinematic
11. [visual-layout-archetypes.md](references/visual-layout-archetypes.md) — **layout catalog Phase 2**
12. [hyperframes-skill-routing.md](references/hyperframes-skill-routing.md)
12. [layout-9x16-zones.md](references/layout-9x16-zones.md)
12b. [floater-text-keepout.md](references/floater-text-keepout.md) — **sticker không đè text**
12c. [dynamic-bg-mandatory.md](references/dynamic-bg-mandatory.md) — **cấm nền tĩnh**
12d. [foreground-continuous-motion.md](references/foreground-continuous-motion.md) — **foreground animation liên tục**
13. [gsap-beat-checklist.md](references/gsap-beat-checklist.md)
14. [blank-frame-audit.md](references/blank-frame-audit.md) — **lint + inspect**
15. `/biong-short-video-preflight` — **check-overlay-stack.mjs trước render final**
16. [evolution-memory.md](references/evolution-memory.md) — **đọc trước beat HTML; append sau vision audit**
17. `/biong-short-video-evolution` — **vision loop trước render final**
18. [motion-vocabulary-map.md](references/motion-vocabulary-map.md)

---

## Skill routing

| Vai trò | Skill |
|---------|-------|
| Orchestrator | `/general-video` |
| Visual | `/product-launch-video` + `/motion-graphics` (catalog-map) |
| Ambient motion | `/continuous-motion` |
| Registry | `/hyperframes-registry` |
| Caption | `/embedded-captions` |
| GSAP | `/hyperframes-animation` + gsap-skills |
| Preflight | `/biong-short-video-preflight` — trước render final |
| Auto-evolution | `/biong-short-video-evolution` — vision audit + memory sau preflight |

---

## Quality gates

- [ ] Caption host `z-index:9000` + watermark host `z-index:9500` — [overlay-layer-stack.md](references/overlay-layer-stack.md)
- [ ] `check-overlay-stack.mjs` exit 0 — `/biong-short-video-preflight`
- [ ] `check-beat-transition-sfx.mjs` exit 0 — sfx_beat_move mỗi chuyển beat 2…N
- [ ] `check-default-styles.mjs` exit 0 — plate-rust beat_1 + global border-3d/text-shadow
- [ ] `transcribe-audio.mjs` + `verify-caption-sync.mjs --strict` pass
- [ ] `map-shot-plan-to-beat-map.mjs` + `check-beat-timing.mjs` pass
- [ ] Mỗi beat ≤5s — `check-beat-timing.mjs` exit 0
- [ ] Content fill >50% màn hình — `check-screen-fill.mjs` exit 0
- [ ] Không lặp `phrase_anchor` giữa các beat — `check-visual-density.mjs`
- [ ] Caption sync: verify-caption-sync.mjs --strict pass
- [ ] Caption karaoke wired — text audio_script, timing Whisper
- [ ] Watermark Spacedev — logo + © Spacedev góc trên trái, suốt video
- [ ] Kinetic typography — hero 3–5 từ stagger; body ≥28px; card title ≥36px; list → UI Card
- [ ] Theme init `--example={hf_theme}` portrait — **cấm** blank production — [hyperframes-theme-init.md](references/hyperframes-theme-init.md)
- [ ] Canvas contract 3 lớp mỗi beat — [canvas-contract-3-layer.md](references/canvas-contract-3-layer.md)
- [ ] `check-typography-spacing.mjs` exit 0
- [ ] `/hyperframes-creative` + `/hyperframes-core` invoked trước beat HTML
- [ ] `visual_shot_plan` trong metadata Phase 2 — N beats content-driven, mỗi beat có `layout_archetype` + `visual_story`
- [ ] `check-continuous-motion.mjs` + `check-visual-density.mjs` + `check-foreground-motion-density.mjs` exit 0
- [ ] Mỗi beat ≥5 distinct visual elements + ≥1 foreground loop animation + keyword highlighting + diverse box animations (`.box-*` + `.fx-*`)
- [ ] `media-plan.md` có `bgm_global` + `hero_type`/`registry_block`/`z_role`
- [ ] ≥1 non-caption registry block (data-chart, flowchart, stat-motion…)
- [ ] `compositions/ambient-layer.html` + `window.__timelines["ambient"]`
- [ ] Z-depth ≥2 bands 80–800 — [overlay-layer-stack.md](references/overlay-layer-stack.md)
- [ ] Stock chỉ bg_media — không full-bleed hero khi có registry
- [ ] BGM track 11: `data-start=0`, `data-duration=totalVideoSec`, volume 0.3 (khoảng 0.25–0.35)
- [ ] Không path `assets/` bịa — mọi file qua MCP (trừ logo Spacedev bundled)
- [ ] Registry blocks installed + wired
- [ ] Không linear entrance; stagger mỗi beat
- [ ] Timeline pattern A hoặc B — **không** pattern C — [blank-frame-audit.md](references/blank-frame-audit.md)
- [ ] `window.__timelines` + `data-duration` khớp audio
- [ ] `hyperframes lint` — 0 errors; `inspect` pass caption band
- [ ] `animation-map.mjs` — dead zone ≤1.5s (hoặc ambient cover)
- [ ] Đã đọc `evolution-memory.md` trước beat HTML; reuse ≥1 premium block khi phù hợp
- [ ] `/biong-short-video-evolution` pass — vision audit + `visual-audit-report.json`
- [ ] `evolution-memory.md` appended (lesson và/hoặc premium block + evolution log)
- [ ] Render `--quality high --strict` (draft chỉ debug local)
- [ ] Caption band tách — không overlap
- [ ] Upload MP4 qua MCP

---

## Lệnh mẫu

```
Render video agent ID 9 (phase 2). overlay-layer-stack: caption z9000, watermark z9500.
/biong-short-video-preflight → check-overlay-stack.mjs pass → lint → render --quality high --strict.
```
