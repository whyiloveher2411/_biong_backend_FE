---
name: biong-short-video-preflight
description: Kiểm tra bắt buộc trước render final short video — caption sync script+Whisper, karaoke wired, watermark Spacedev, z-index overlay stack. Invoke phase 2 sau transcribe, trước hyperframes render --quality high.
---

# Biong Short Video — Preflight

**Chạy bắt buộc** trước mọi `hyperframes render --quality high`. Fail → **sửa code**, không render final.

Đọc: [overlay-layer-stack.md](../biong-short-video-hyperframes/references/overlay-layer-stack.md), [caption-karaoke-script-sync.md](../biong-short-video-hyperframes/references/caption-karaoke-script-sync.md)

---

## Khi nào invoke

- Phase 2 render — sau transcribe + trước render final
- Trước `upload_agent_video`
- Sau mỗi lần sửa caption/watermark/layer

---

## Bước 0 — Caption sync (bắt buộc TRƯỚC overlay check)

Từ repo root `_biong_backend_FE`, thay `{id}`:

```bash
PROJ=storage/agent-renders/{id}/my-video

# 1. Lưu audio_script từ get_context → $PROJ/assets/audio-script.txt
# 2. transcribe → $PROJ/transcript.json

node .cursor/skills/biong-short-video-preflight/scripts/sync-caption-from-script.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/verify-caption-sync.mjs $PROJ --strict
node .cursor/skills/biong-short-video-preflight/scripts/gen-captions-html.mjs $PROJ
```

- **verify exit 1** → đọc `assets/caption-sync-report.json`, sửa script/map, chạy lại sync (tối đa 2 vòng)
- **Cấm** ghi `caption-words.json` / `captions.html` trực tiếp từ Whisper text

---

## Bước 1 — Script overlay stack (bắt buộc)

```bash
node .cursor/skills/biong-short-video-preflight/scripts/check-overlay-stack.mjs $PROJ
```

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
| 1 | `assets/audio-script.txt` + `assets/caption-words.json` tồn tại | ✓ |
| 2 | `verify-caption-sync.mjs --strict` exit 0 | ✓ |
| 3 | `compositions/captions.html` tồn tại (từ gen-captions-html.mjs) | ✓ |
| 4 | `compositions/brand-watermark.html` tồn tại | ✓ |
| 5 | Caption text từ `audio_script` — không Whisper | ✓ |
| 6 | Caption host `data-duration` = `totalVideoSec` | ✓ |
| 7 | Caption host `z-index:9000` | ✓ |
| 8 | Watermark host `z-index:9500`, suốt video | ✓ |

---

## Upload (sau render final)

1. `short_video_upload_agent_video({ short_video_id, file_path })`
2. Nếu lỗi → `node mcp/short-video-agent/scripts/upload-agent-video.mjs --short-video-id {id} --file {abs_path}`

---

## Quality gate

- [ ] `sync-caption-from-script.mjs` + `verify-caption-sync.mjs --strict` exit 0
- [ ] `check-overlay-stack.mjs` exit 0
- [ ] `hyperframes lint` 0 errors
- [ ] Chỉ sau đó: `render --quality high --strict`
