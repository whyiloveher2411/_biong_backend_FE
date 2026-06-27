---
name: biong-short-video-hyperframes
description: Agent short video marketing — manual 2 bước hoặc auto TTS full pipeline (VieNeu→Saydi→Vbee) + render cinematic HyperFrames.
---

# Biong Short Video — HyperFrames Agent

## Hai chế độ workflow

| Chế độ | `agent_tts_auto` | Copy prompt CMS | Luồng |
|--------|------------------|-----------------|-------|
| **Manual 2 bước** | `false` (mặc định) | Bước 1 + bước 2 | script → admin upload MP3 → render |
| **Auto TTS full** | `true` | Một prompt toàn pipeline | script → `generate_narration_tts` → render → upload |

Toggle **TTS tự động** trên từng short video (drawer Agent audio). Nếu TTS lỗi → upload MP3 fallback.

`get_context` trả `workflow_mode`: `manual_2_step` | `auto_tts_full`, `tts_chain`: VieNeu → Saydi → Vbee.

---

## Manual 2 bước (mặc định)

| Bước | Ai làm | MCP | Kết quả |
|------|--------|-----|---------|
| **1** | Agent | `get_context` + `save_audio_script` | `audio_script` |
| **Giữa** | Admin | Upload MP3 (drawer Agent audio) | `audio_file` |
| **2** | Agent | render cinematic + `upload_agent_video` | `agent_video_url` |

**Cấm** `generate_narration_tts` trong manual mode.

---

## Auto TTS full pipeline

| Bước | MCP | Kết quả |
|------|-----|---------|
| Script | `save_audio_script` | `audio_script` + markers |
| TTS | `generate_narration_tts` (strip `[BGM]`/`[Dừng]`) | `audio_file` |
| Render | HyperFrames cinematic | `output.mp4` |
| Upload | `upload_agent_video` | `agent_video_url` |

Chain TTS: **VieNeu → Saydi → Vbee** — response `tts_provider_used`.

---

## Media assets qua MCP (bắt buộc phase render)

**Đọc trước:** [media-mcp-activation.md](references/media-mcp-activation.md)

Phase 1: ghi `[BGM]`, `[SFX]`, `timeline`, `markers` — **không** gọi MCP. Phase render:

1. Transcribe → `totalVideoSec`
2. `search_meme_sound` (hook) + `search_bgm` + `search_stock_media` mỗi beat
3. Embed SFX track 12 + BGM track 11 + stock; GSAP paused

| Tool | Dùng khi |
|------|----------|
| `short_video_search_meme_sound` | Hook SFX — vine boom, sấm sét (giây 0) |
| `short_video_search_stock_media` | B-roll cinematic (Pexels) — ≥1 mỗi beat |
| `short_video_search_bgm` | Nhạc nền Pixabay — 1 track/video |

Thư mục: `storage/agent-renders/{id}/assets/{images,audio,fonts}/`

Deliverable: `my-video/media-plan.md` — `sfx_hook` + `bgm_global` + mỗi beat stock.

**Tần suất:** hook SFX (nếu script có `[SFX]`); ≥1 BGM; mỗi beat ≥1 stock; hook beat ưu tiên stock video.

`get_context.production_playbook.media_assets` có `priority_matrix`, `frequency_rules`, `alias_hints`.

**Backend env:** `PEXELS_API_KEY`, `PIXABAY_API_KEY` (Audio API — fallback scrape/catalog nếu chưa bật quyền)

---

## Phase 1 — Audio script viral (extract + viral script)

### Skills

| # | Skill | Output |
|---|-------|--------|
| 1 | `/extract-core-signals` | `core_signals`: hook, tension, takeaway |
| 2 | `/viral-audio-script` | `text` + `[BGM]` + `markers` |

Docs: [viral-retention-structure.md](references/viral-retention-structure.md) · [extract-core-signals.md](references/extract-core-signals.md) · [viral-audio-script.md](references/viral-audio-script.md)

### Timeline viral (30–45s)

```
0s Hook (3s) → Agitate (15s) → Solve (35s) → CTA/Loop (40s)
```

- Câu **≤12 từ**; dấu phẩy/chấm rõ; `[Dừng 0.5s/1s]`
- `[SFX: vine boom]` ở hook; `cta_mode: "loop"` khuyến nghị

### Lưu MCP

```text
short_video_save_audio_script({
  short_video_id,
  text: "[BGM: lofi ambient] [SFX: vine boom] ...",
  metadata: {
    timeline: { hook_end: 3, agitate_end: 15, solve_end: 35, total: 40 },
    cta_mode: "loop",
    markers: [{ time: 0, text: "...", section: "hook" }],
    estimated_duration_sec: 40
  }
})
```

**DỪNG** (manual) — admin upload MP3. **Auto TTS:** tiếp tục `generate_narration_tts`.

---

## Phase 2 — Motion complexity (bắt buộc)

### Vai trò

**Senior Motion Graphics** — dynamic, cinematic. Cấm slide text + đổi nền.

**Mindset:** Motion designer — [kinetic-typography-brief.md](references/kinetic-typography-brief.md). Font: [typography-be-vietnam-pro.md](references/typography-be-vietnam-pro.md). Pacing: [viral-retention-structure.md](references/viral-retention-structure.md).

### Caption karaoke (bắt buộc mọi video)

Đọc [caption-karaoke-script-sync.md](references/caption-karaoke-script-sync.md):

- **Text:** `assets/audio-script.txt` từ MCP — cấm text Whisper
- **Timing:** `transcript.json` (start/end only)
- **Sync:** `sync-caption-from-script.mjs` → `verify-caption-sync.mjs --strict` → `gen-captions-html.mjs`
- **Chunk:** 3–5 từ/group trong HTML generator

### Preflight (bắt buộc trước render final)

Invoke `/biong-short-video-preflight` — **Bước 0 caption sync** rồi overlay check:

```bash
PROJ=storage/agent-renders/{id}/my-video
node .cursor/skills/biong-short-video-preflight/scripts/sync-caption-from-script.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/verify-caption-sync.mjs $PROJ --strict
node .cursor/skills/biong-short-video-preflight/scripts/gen-captions-html.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/check-overlay-stack.mjs $PROJ
```

Pass → mới `render --quality high --strict`.

### Watermark Spacedev (bắt buộc)

Đọc [spacedev-brand-watermark.md](references/spacedev-brand-watermark.md) + [overlay-layer-stack.md](references/overlay-layer-stack.md):

- Logo: `assets/spacedev-logo.png` (bundled trong skill)
- Host clip `z-index:9500`, **cuối** `#root`, `data-duration=totalVideoSec`
- **Cấm** gắn logo vào beat cuối — sẽ lúc có lúc không

### Upload (sau render)

1. `short_video_upload_agent_video` — ưu tiên MCP (Buffer multipart v2.1.0)
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

1. [viral-retention-structure.md](references/viral-retention-structure.md) — **timeline viral + retention pacing**
2. [typography-be-vietnam-pro.md](references/typography-be-vietnam-pro.md) — **font Be Vietnam Pro local**
3. [media-mcp-activation.md](references/media-mcp-activation.md) — **phase render: MCP assets bắt buộc**
4. [caption-karaoke-script-sync.md](references/caption-karaoke-script-sync.md) — **caption bắt buộc**
5. [kinetic-typography-brief.md](references/kinetic-typography-brief.md) — **mindset motion graphics, min font**
6. [spacedev-brand-watermark.md](references/spacedev-brand-watermark.md) — **watermark bắt buộc**
7. [overlay-layer-stack.md](references/overlay-layer-stack.md) — **z-index caption 9000 / watermark 9500**
8. [motion-complexity-activation.md](references/motion-complexity-activation.md) — ép cinematic
9. [hyperframes-skill-routing.md](references/hyperframes-skill-routing.md)
10. [layout-9x16-zones.md](references/layout-9x16-zones.md)
11. [gsap-beat-checklist.md](references/gsap-beat-checklist.md)
12. [blank-frame-audit.md](references/blank-frame-audit.md) — **lint + inspect**
13. `/biong-short-video-preflight` — **check-overlay-stack.mjs trước render final**
14. [motion-vocabulary-map.md](references/motion-vocabulary-map.md)

---

## Skill routing

| Vai trò | Skill |
|---------|-------|
| Orchestrator | `/general-video` |
| Visual | `/product-launch-video` |
| Registry | `/hyperframes-registry` |
| Caption | `/embedded-captions` |
| GSAP | `/hyperframes-animation` + gsap-skills |
| Preflight | `/biong-short-video-preflight` — trước render final |

---

## Quality gates

- [ ] Caption host `z-index:9000` + watermark host `z-index:9500` — [overlay-layer-stack.md](references/overlay-layer-stack.md)
- [ ] `check-overlay-stack.mjs` exit 0 — `/biong-short-video-preflight`
- [ ] Caption sync: verify-caption-sync.mjs --strict pass
- [ ] Caption karaoke wired — text audio_script, timing Whisper
- [ ] Watermark Spacedev — logo + © Spacedev góc phải dưới, suốt video
- [ ] Kinetic typography — hero 3–5 từ stagger; body ≥28px; list → UI Card
- [ ] `/hyperframes-creative` + `/hyperframes-core` invoked trước beat HTML
- [ ] `media-plan.md` có dòng `bgm_global` + stock mỗi beat
- [ ] Mỗi beat ≥ 1 MCP stock visual
- [ ] BGM track 11: `data-start=0`, `data-duration=totalVideoSec`, volume 0.15–0.20
- [ ] Không path `assets/` bịa — mọi file qua MCP (trừ logo Spacedev bundled)
- [ ] Registry blocks installed + wired
- [ ] Không linear entrance; stagger mỗi beat
- [ ] Timeline pattern A hoặc B — **không** pattern C — [blank-frame-audit.md](references/blank-frame-audit.md)
- [ ] `window.__timelines` + `data-duration` khớp audio
- [ ] `hyperframes lint` — 0 errors; `inspect` pass caption band
- [ ] `animation-map.mjs` — không dead zone >1.5s
- [ ] Render `--quality high --strict` (draft chỉ debug local)
- [ ] Caption band tách — không overlap
- [ ] Upload MP4 qua MCP

---

## Lệnh mẫu

```
Render video agent ID 9 (phase 2). overlay-layer-stack: caption z9000, watermark z9500.
/biong-short-video-preflight → check-overlay-stack.mjs pass → lint → render --quality high --strict.
```
