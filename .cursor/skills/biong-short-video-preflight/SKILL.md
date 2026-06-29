---
name: biong-short-video-preflight
description: Kiểm tra bắt buộc trước render final short video — transcribe VI, caption sync script+Whisper, beat-map timing, karaoke wired, watermark Spacedev, z-index overlay stack. Invoke phase 2 sau TTS, trước hyperframes render --quality high.
---

# Biong Short Video — Preflight

**Chạy bắt buộc** trước mọi `hyperframes render --quality high`. Fail → **sửa code**, không render final.

Đọc: [overlay-layer-stack.md](../biong-short-video-hyperframes/references/overlay-layer-stack.md), [caption-karaoke-script-sync.md](../biong-short-video-hyperframes/references/caption-karaoke-script-sync.md)

---

## Khi nào invoke

- Phase 2 render — sau TTS/transcribe + trước render final
- Trước `upload_agent_video`
- Sau mỗi lần sửa caption/watermark/beat/layer

---

## Bước 0 — Transcribe + caption sync (bắt buộc)

Từ repo root `_biong_backend_FE`, thay `{id}`:

```bash
PROJ=storage/agent-renders/{id}/my-video

# 1. short_video_get_context → lưu response vào $PROJ/assets/get-context-snapshot.json
node .cursor/skills/biong-short-video-preflight/scripts/bootstrap-phase2-assets.mjs $PROJ

# 2. Transcribe đúng ngôn ngữ (CẤM small.en cho non-English — xem transcribe-locale.md)
node .cursor/skills/biong-short-video-preflight/scripts/transcribe-audio.mjs $PROJ
# Override: --lang en --model small.en

# 3. Caption sync
node .cursor/skills/biong-short-video-preflight/scripts/sync-caption-from-script.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/verify-caption-sync.mjs $PROJ --strict

# 4. Beat timing map (sau sync — cần caption-words.json)
node .cursor/skills/biong-short-video-preflight/scripts/map-markers-to-timing.mjs $PROJ

# 5. Captions + watermark
node .cursor/skills/biong-short-video-preflight/scripts/gen-captions-html.mjs $PROJ
mkdir -p $PROJ/assets/images
cp .cursor/skills/biong-short-video-hyperframes/assets/spacedev-logo.png $PROJ/assets/images/
node .cursor/skills/biong-short-video-preflight/scripts/gen-brand-watermark.mjs $PROJ --duration {totalVideoSec}
```

- **transcribe-audio exit 1** → kiểm tra `language` trong agent-metadata.json; xem transcribe-locale.md
- **verify exit 1** → đọc `assets/caption-sync-report.json` (positionalRatio, trustedRatio); chạy lại transcribe-audio → sync (tối đa 2 vòng)
- **Cấm** ghi `caption-words.json` / `captions.html` trực tiếp từ Whisper text

---

## Bước 1 — Beat + overlay stack (bắt buộc)

Viết `index.html` beat theo `assets/beat-map.json` (`data-start` / `data-duration`).

```bash
node .cursor/skills/biong-short-video-preflight/scripts/check-beat-timing.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/check-media-stack.mjs $PROJ --strict
node .cursor/skills/biong-short-video-preflight/scripts/check-overlay-stack.mjs $PROJ
```

`check-beat-timing`: tổng beat duration ≈ `totalVideoSec`, lệch beat-map ≤1.5s.
`check-media-stack`: sfx_hook.mp3 + track 12, bgm.mp3 + track 11, BGM duration ≥ totalVideoSec.

Exit 0 = pass. Exit 1 = **dừng**, sửa lỗi in ra stderr.

---

## Bước 2 — HyperFrames lint + inspect

```bash
cd $PROJ
npx hyperframes lint
npx hyperframes inspect --samples 15
```

Đọc thêm: [blank-frame-audit.md](../biong-short-video-hyperframes/references/blank-frame-audit.md)

---

## Bước 3 — Rà tay (agent)

| # | Kiểm tra | Pass |
|---|----------|------|
| 1 | `assets/transcribe-manifest.json` + `transcript.json` tồn tại | ✓ |
| 2 | `assets/audio-script.txt` + `assets/caption-words.json` tồn tại | ✓ |
| 3 | `verify-caption-sync.mjs --strict` exit 0 | ✓ |
| 4 | `assets/beat-map.json` + `check-beat-timing.mjs` exit 0 | ✓ |
| 5 | `compositions/captions.html` tồn tại (từ gen-captions-html.mjs) | ✓ |
| 6 | `compositions/brand-watermark.html` từ `gen-brand-watermark.mjs` | ✓ |
| 7 | Caption text từ `audio_script` — không Whisper | ✓ |
| 8 | Caption host `data-duration` = `totalVideoSec` | ✓ |
| 9 | Caption host `z-index:9000` | ✓ |
| 10 | Watermark host `z-index:9500`, suốt video | ✓ |

---

## Upload (sau render final)

1. `short_video_upload_agent_video({ short_video_id, file_path })`
2. Nếu lỗi → `node mcp/short-video-agent/scripts/upload-agent-video.mjs --short-video-id {id} --file {abs_path}`

---

## Quality gate

- [ ] `transcribe-audio.mjs` exit 0
- [ ] `sync-caption-from-script.mjs` + `verify-caption-sync.mjs --strict` exit 0
- [ ] `map-markers-to-timing.mjs` + `check-beat-timing.mjs` exit 0
- [ ] `check-media-stack.mjs --strict` exit 0
- [ ] `check-overlay-stack.mjs` exit 0
- [ ] `hyperframes lint` 0 errors
- [ ] Chỉ sau đó: `render --quality high --strict`
