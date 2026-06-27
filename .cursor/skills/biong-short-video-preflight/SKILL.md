---
name: biong-short-video-preflight
description: Kiểm tra bắt buộc trước render final short video — caption karaoke wired, watermark Spacedev, z-index overlay stack, file tồn tại. Invoke phase 2 sau khi viết HTML, trước hyperframes render --quality high.
---

# Biong Short Video — Preflight

**Chạy bắt buộc** trước mọi `hyperframes render --quality high`. Fail → **sửa code**, không render final.

Đọc: [overlay-layer-stack.md](../biong-short-video-hyperframes/references/overlay-layer-stack.md)

---

## Khi nào invoke

- Phase 2 render — sau khi wire `index.html` + compositions
- Trước `upload_agent_video`
- Sau mỗi lần sửa caption/watermark/layer

---

## Bước 1 — Script tự động (bắt buộc)

```bash
cd storage/agent-renders/{id}/my-video

node ../../../../.cursor/skills/biong-short-video-preflight/scripts/check-overlay-stack.mjs .
```

Từ repo root `_biong_backend_FE`:

```bash
node .cursor/skills/biong-short-video-preflight/scripts/check-overlay-stack.mjs \
  storage/agent-renders/{id}/my-video
```

Exit 0 = pass. Exit 1 = **dừng**, sửa lỗi in ra stderr.

---

## Bước 2 — HyperFrames lint + inspect

```bash
npx hyperframes lint
npx hyperframes inspect --samples 15
```

Đọc thêm: [blank-frame-audit.md](../biong-short-video-hyperframes/references/blank-frame-audit.md)

---

## Bước 3 — Rà tay (agent)

| # | Kiểm tra | Pass |
|---|----------|------|
| 1 | `compositions/captions.html` tồn tại | ✓ |
| 2 | `compositions/brand-watermark.html` tồn tại | ✓ |
| 3 | `assets/images/spacedev-logo.png` tồn tại | ✓ |
| 4 | Caption text từ `audio_script` — không Whisper | ✓ |
| 5 | Caption host `data-duration` = `totalVideoSec` | ✓ |
| 6 | Watermark host `data-duration` = `totalVideoSec` | ✓ |
| 7 | Caption host `z-index:9000` (hoặc ≥9000) | ✓ |
| 8 | Watermark host `z-index:9500` (hoặc ≥9500) | ✓ |
| 9 | Sub-composition `background: transparent` | ✓ |
| 10 | Beat section không có `z-index` > 100 | ✓ |

---

## Sửa lỗi thường gặp

### Karaoke chìm dưới nền

1. Thêm host clip caption **sau** beats với `z-index:9000`
2. `compositions/captions.html` → `body { background: transparent !important; }`
3. Không tin `data-track-index` — chỉ dùng z-index

### Logo lúc có lúc không / bị chìm

1. Watermark host **cuối** `#root`, `z-index:9500`
2. `data-start=0`, `data-duration={totalVideoSec}` — không gắn vào beat cuối
3. Copy logo vào `assets/images/spacedev-logo.png`
4. `filter: drop-shadow` trên `.brand-wrap`

---

## Quality gate

- [ ] `check-overlay-stack.mjs` exit 0
- [ ] `hyperframes lint` 0 errors
- [ ] `inspect` không báo caption/watermark clipped
- [ ] Chỉ sau đó: `render --quality high --strict`
