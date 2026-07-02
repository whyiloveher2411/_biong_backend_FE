# Beat Transition SFX — tiếng động chuyển beat (bắt buộc)

**Đọc kèm:** [overlay-layer-stack.md](overlay-layer-stack.md) · [viral-retention-structure.md](viral-retention-structure.md)

---

## Bắt buộc mọi video

Mỗi lần **chuyển beat** (beat 2 → N) phải phát **`short_video_beat_move.mp3`** — không tùy chọn.

| Bước | Hành động |
|------|-----------|
| 1 | Copy `short_video_beat_move.mp3` → `assets/audio/sfx_beat_move.mp3` |
| 2 | Mount **1 clip `<audio>`** tại `data-start` của **mỗi beat-host từ beat 2** trong `index.html` |
| 3 | Preflight `check-beat-transition-sfx.mjs` **FAIL** nếu thiếu |

**Nguồn file gốc:** repo root `_biong_backend_FE/short_video_beat_move.mp3`  
**Skill bundled:** `.cursor/skills/biong-short-video-hyperframes/assets/audio/sfx_beat_move.mp3`

**Auto-wire (khuyến nghị):**

```bash
node .cursor/skills/biong-short-video-preflight/scripts/wire-beat-transition-sfx.mjs $PROJ
```

Chạy sau `sync-index-beats-from-map.mjs` khi beat timing đã sync.

---

## Wire `index.html`

```html
<audio class="clip sfx-beat-move" id="sfx-beat-2" src="assets/audio/sfx_beat_move.mp3"
  data-start="36.330" data-duration="0.58" data-track-index="14" data-volume="0.55"></audio>
<!-- lặp beat 3…N — data-start = data-start của beat-host tương ứng -->
```

| Thuộc tính | Giá trị |
|------------|---------|
| `class` | `clip sfx-beat-move` |
| `id` | `sfx-beat-N` (bắt buộc strict mode) |
| `src` | `assets/audio/sfx_beat_move.mp3` |
| `data-start` | Khớp `data-start` beat-host beat N |
| `data-duration` | `0.58` (đo ffprobe nếu file đổi) |
| `data-volume` | **0.5–0.6** (khuyến nghị `0.55`) |
| `data-track-index` | 14–25 (tránh 20 caption, 21 brand) |

Beat 1 **không** mount sfx beat-move — dùng `sfx_hook` track 12 riêng.

---

## Preflight

```bash
node .cursor/skills/biong-short-video-preflight/scripts/check-beat-transition-sfx.mjs $PROJ
```

Kiểm tra:
- File `assets/audio/sfx_beat_move.mp3` tồn tại
- Số clip = số beat transition (beat count − 1)
- `data-start` khớp beat-host (±0.05s)
- Cấm mount trong beat HTML

---

## Anti-patterns

| Sai | Đúng |
|-----|------|
| Không SFX khi chuyển beat | Bắt buộc mọi transition |
| SFX trong beat HTML `<audio>` | Clip root `index.html` only |
| SFX loop / mỗi giây | Chỉ tại boundary beat |
| Volume > 0.7 | 0.5–0.6 |
| Thiếu `id="sfx-beat-N"` | Bắt buộc cho strict render |
| Dùng file SFX khác | Chỉ `short_video_beat_move.mp3` |
