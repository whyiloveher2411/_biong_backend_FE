# Media MCP activation — ép agent lấy assets qua MCP (phase render)

AI agent mặc định bịa đường dẫn `assets/foo.mp3` hoặc bỏ qua nhạc nền. **Bắt buộc** đọc file này phase render (sau transcribe) trước khi viết beat HTML.

**Phạm vi:** chỉ phase render — phase 1 script chỉ ghi `[BGM: mood]` + `metadata.markers`, không gọi MCP.

---

## Vai trò

Chuyên gia Motion Graphics viral TikTok/Reels — video **cinematic, có B-roll stock + nhạc nền nhẹ**. Giọng đọc vẫn là chính; BGM không lấn narration.

---

## Quy trình 3 bước

### 1. Phân tích ngữ cảnh

- Đọc `audio_script`, word timestamps (transcribe), `metadata.markers`
- Tính `totalVideoSec` từ transcribe
- Map mood BGM từ `[BGM: ...]` trong script (fallback: `lofi ambient`)
- Map mỗi beat → stock visual trigger

### 2. Gọi MCP (cấm bịa tên file)

**BGM (1 lần / video):**

```text
short_video_search_bgm({
  query: "lofi ambient",
  min_duration_sec: totalVideoSec
})
```

Tải → `storage/agent-renders/{id}/assets/audio/bgm.mp3`

**Stock (mỗi beat):**

```text
short_video_search_stock_media({ query: "...", media_type: "video" })
```

Tải → `storage/agent-renders/{id}/assets/images/`

### 3. Embed HyperFrames

- **BGM global** trong `index.html` root (track 11)
- Stock relative path trong beat HTML
- GSAP **paused** timeline — **cấm** `tl.play()`

---

## Bảng chọn tool

| Trigger | MCP tool | Ghi chú |
|---------|----------|---------|
| `[BGM: ...]` / mood video | `short_video_search_bgm` | 1 track, `data-start=0`, `data-duration=totalVideoSec` |
| Hook / b-roll / tech / edu | `short_video_search_stock_media` | `video` ưu tiên, fallback `image` |

**Ví dụ routing:**

- `lofi ambient`, `soft corporate` → `search_bgm`
- `city night`, `office technology` → `search_stock_media` video

---

## Tần suất bắt buộc

| Quy tắc | Chi tiết |
|---------|----------|
| Mỗi video | ≥ **1** BGM track global (track 11) |
| Mỗi beat (4–8) | ≥ **1** stock visual (Pexels) |
| Beat Hook (beat 1) | Bắt buộc **stock video** (ưu tiên) hoặc stock image |
| BGM volume | **0.15–0.20** — narration track 10 giữ **1.0** |
| CTA beat | Typography + stock nhẹ |

---

## BGM — phát suốt video (chống dừng giữa chừng)

Chọn track `duration_sec >= totalVideoSec`. Nếu không có, chọn track dài nhất và loop khi tải:

```bash
ffmpeg -stream_loop -1 -i bgm_raw.mp3 -t ${totalVideoSec} -c copy assets/audio/bgm.mp3
```

Embed trong `index.html`:

```html
<audio
  id="el-bgm"
  class="clip"
  src="../assets/audio/bgm.mp3"
  data-start="0"
  data-duration="{totalVideoSec}"
  data-track-index="11"
  data-volume="0.18"
></audio>
```

Narration MP3 (track 10): `data-volume="1.0"`.

**Quality gate:** `data-duration` BGM phải bằng `totalVideoSec` — không render nếu nhạc ngắn hơn video.

---

## Deliverable: `media-plan.md`

Tạo **trước** khi viết HTML beat:

`storage/agent-renders/{id}/my-video/media-plan.md`

```markdown
| scope | time_sec | trigger | mcp_tool | query | local_path |
|-------|----------|---------|----------|-------|------------|
| bgm_global | 0.0 | [BGM: lofi ambient] | short_video_search_bgm | lofi ambient | ../assets/audio/bgm.mp3 |
| hook | 0.0 | hook_visual | short_video_search_stock_media | city night | ../assets/images/hook_stock.mp4 |
```

**Quality gate:** không `hyperframes render` nếu thiếu dòng `bgm_global` hoặc beat thiếu stock visual.

---

## Re-encode stock video (tránh frame freeze)

Sau khi tải stock Pexels, chạy `npx hyperframes lint`. Nếu báo **`sparse keyframes`** trên `<video>`, re-encode trước khi embed — nếu không video B-roll có thể đứng hình / blank frame khi seek:

```bash
# Thay hook_stock.mp4 bằng tên file tương ứng
ffmpeg -y -i assets/images/hook_stock.mp4 \
  -c:v libx264 -r 30 -g 30 -keyint_min 30 -movflags +faststart -an \
  assets/images/hook_stock_enc.mp4
mv assets/images/hook_stock_enc.mp4 assets/images/hook_stock.mp4
```

Lặp cho mỗi stock video trong `media-plan.md`. Xem thêm [blank-frame-audit.md](blank-frame-audit.md).

---

## Anti-patterns

| Cấm | Làm đúng |
|-----|----------|
| `assets/fake.mp3` không qua MCP | `search_bgm` → download → `bgm.mp3` |
| Beat chỉ text + nền, không stock | ≥1 MCP stock mỗi beat |
| Không có BGM track | `search_bgm` + embed track 11 |
| BGM `data-duration` < video | Chọn track dài hơn hoặc ffmpeg loop |
| BGM volume > 0.25 | Giữ 0.15–0.20, narration = 1.0 |
| `tl.play()` | `paused: true` + `window.__timelines[id]` |

---

## Đọc kèm

- [layout-9x16-zones.md](layout-9x16-zones.md) — vị trí visual
- [gsap-beat-checklist.md](gsap-beat-checklist.md) — timeline contract
- [motion-complexity-activation.md](motion-complexity-activation.md) — cinematic bar
- [blank-frame-audit.md](blank-frame-audit.md) — lint/inspect trước render
