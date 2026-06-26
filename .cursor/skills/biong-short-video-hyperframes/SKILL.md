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

Phase 1 chỉ ghi `[BGM: mood]` + `markers` — **không** gọi MCP. Phase render:

1. Transcribe → `totalVideoSec`
2. `search_bgm` 1 lần (global) + `search_stock_media` mỗi beat
3. Embed BGM track 11 + stock trong beat HTML; GSAP paused

| Tool | Dùng khi |
|------|----------|
| `short_video_search_stock_media` | B-roll cinematic (Pexels) — ≥1 mỗi beat |
| `short_video_search_bgm` | Nhạc nền Pixabay — 1 track/video, nhẹ, phát suốt chiều dài |

Thư mục: `storage/agent-renders/{id}/assets/{images,audio}/`

Deliverable: `my-video/media-plan.md` — dòng `bgm_global` + mỗi beat stock.

**Tần suất:** mỗi video ≥1 BGM; mỗi beat ≥1 stock visual; hook beat ưu tiên stock video.

`get_context.production_playbook.media_assets` có `priority_matrix`, `frequency_rules`, `alias_hints`.

**Backend env:** `PEXELS_API_KEY`, `PIXABAY_API_KEY` (Audio API — fallback scrape/catalog nếu chưa bật quyền)

---

## Phase 1 — Audio script viral (extract + viral script)

### Skills

| # | Skill | Output |
|---|-------|--------|
| 1 | `/extract-core-signals` | `core_signals`: hook, tension, takeaway |
| 2 | `/viral-audio-script` | `text` + `[BGM]` + `markers` |

Docs: [extract-core-signals.md](references/extract-core-signals.md) · [viral-audio-script.md](references/viral-audio-script.md)

### Công thức HASCAS

Hook (3s) → Agitate → Solve → CTA — câu 10–15 từ, viết cho tai nghe.

### Lưu MCP

```text
short_video_save_audio_script({
  short_video_id,
  text: "[BGM: lofi ambient] ...",
  metadata: { core_signals, markers, estimated_duration_sec: 45 }
})
```

**DỪNG** (manual) — admin upload MP3. **Auto TTS:** tiếp tục `generate_narration_tts`.

---

## Phase 2 — Motion complexity (bắt buộc)

### Vai trò

**Senior Motion Graphics** — dynamic, cinematic. Cấm slide text + đổi nền.

**Mindset:** Motion designer TikTok/Reels — đọc [kinetic-typography-brief.md](references/kinetic-typography-brief.md). Invoke `/hyperframes-creative` + `/hyperframes-core` trước beat HTML.

### Caption karaoke (bắt buộc mọi video)

Đọc [caption-karaoke-script-sync.md](references/caption-karaoke-script-sync.md):

- **Text:** `audio_script` từ MCP — cấm text Whisper
- **Timing:** transcribe → `transcript.json` (start/end only)
- **Chunk:** 3–5 từ/group; map tuần tự như `fill-timings.cjs`
- **Style:** registry blocks — mặc định `caption-pill-karaoke`

### Watermark Spacedev (bắt buộc)

Đọc [spacedev-brand-watermark.md](references/spacedev-brand-watermark.md):

- Logo: `assets/spacedev-logo.png` (bundled trong skill)
- Góc phải dưới + `"© Spacedev"` — suốt `totalVideoSec`

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
npx hyperframes render --output output.mp4 --quality high --fps 30
```

Không upload bản `--quality draft`.

---

## Tài liệu (đọc theo thứ tự)

1. [media-mcp-activation.md](references/media-mcp-activation.md) — **phase render: MCP assets bắt buộc**
2. [caption-karaoke-script-sync.md](references/caption-karaoke-script-sync.md) — **caption bắt buộc: script text + Whisper timing**
3. [kinetic-typography-brief.md](references/kinetic-typography-brief.md) — **mindset motion graphics, min font**
4. [spacedev-brand-watermark.md](references/spacedev-brand-watermark.md) — **watermark bắt buộc**
5. [motion-complexity-activation.md](references/motion-complexity-activation.md) — ép cinematic
6. [hyperframes-skill-routing.md](references/hyperframes-skill-routing.md)
7. [layout-9x16-zones.md](references/layout-9x16-zones.md)
8. [gsap-beat-checklist.md](references/gsap-beat-checklist.md)
9. [motion-vocabulary-map.md](references/motion-vocabulary-map.md)

---

## Skill routing

| Vai trò | Skill |
|---------|-------|
| Orchestrator | `/general-video` |
| Visual | `/product-launch-video` |
| Registry | `/hyperframes-registry` |
| Caption | `/embedded-captions` |
| GSAP | `/hyperframes-animation` + gsap-skills |

---

## Quality gates

- [ ] Caption karaoke wired — text `audio_script`, timing transcript, registry block
- [ ] Watermark Spacedev — logo + © Spacedev góc phải dưới, suốt video
- [ ] Kinetic typography — hero 3–5 từ stagger; body ≥28px; list → UI Card
- [ ] `/hyperframes-creative` + `/hyperframes-core` invoked trước beat HTML
- [ ] `media-plan.md` có dòng `bgm_global` + stock mỗi beat
- [ ] Mỗi beat ≥ 1 MCP stock visual
- [ ] BGM track 11: `data-start=0`, `data-duration=totalVideoSec`, volume 0.15–0.20
- [ ] Không path `assets/` bịa — mọi file qua MCP (trừ logo Spacedev bundled)
- [ ] Registry blocks installed + wired
- [ ] Không linear entrance; stagger mỗi beat
- [ ] `window.__timelines` + `data-duration` khớp audio
- [ ] `animation-map.mjs` — không dead zone >1.5s
- [ ] Render `--quality high`
- [ ] Caption band tách — không overlap
- [ ] Upload MP4 qua MCP

---

## Lệnh mẫu

```
Render video agent ID 9 (phase 2). Đọc motion-complexity-activation.md.
Senior Motion Graphics. hyperframes add registry blocks. stagger + no linear.
Render --quality high. upload_agent_video.
```
