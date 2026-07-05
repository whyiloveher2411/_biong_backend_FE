# Import HTML assemble — BGM chain (nhiều bài + crossfade)

Đọc khi `render_mode=import_html` — ghép beat HTML cần nhạc nền **liên tục đến hết clip**.

**Cấm** attribute `loop` — HyperFrames render seek timeline, loop HTML không phủ cuối video.

**Đọc kèm:** [media-mcp-activation.md](media-mcp-activation.md) (BGM only) · [overlay-layer-stack.md](overlay-layer-stack.md)

---

## Quy trình

1. **Mood** — parse `[BGM: mood]` từ `assets/audio-script.txt` (fallback: `lofi ambient`)
2. **totalVideoSec** — beat-map / `assets/caption-sync-report.json`
3. **MCP** (1 lần, cùng mood):
   ```text
   short_video_search_bgm({ query: "<mood>", limit: 8 })
   ```
   **Cấm** `min_duration_sec=totalVideoSec` — API thường trả ít/ rỗng.
4. **Tải tuần tự** candidate khác nhau → `assets/audio/bgm_1.mp3`, `bgm_2.mp3`, … cho đến khi tổng `duration_sec` ≥ `totalVideoSec`
5. **Manifest** `assets/bgm-chain.json`:
   ```json
   {
     "mood": "lofi ambient",
     "totalVideoSec": 121.4,
     "crossfadeSec": 0.5,
     "segments": [
       { "id": "bgm-1", "file": "assets/audio/bgm_1.mp3", "fileDurationSec": 45 },
       { "id": "bgm-2", "file": "assets/audio/bgm_2.mp3", "fileDurationSec": 40 }
     ]
   }
   ```
6. **Wire script** (bắt buộc):
   ```bash
   node .cursor/skills/biong-short-video-preflight/scripts/wire-bgm-chain.mjs $PROJ
   ```
   - ffprobe duration thực tế
   - Sinh `<audio>` track **11, 13, 15, 17, 19** (bỏ 12 = SFX hook)
   - Crossfade **0.5s** — volume fade trên `mainTl` / `tl`
   - Segment cuối cắt `data-duration` = phần còn lại của video

7. **media-plan.md** — row `bgm_global`, `bgm_2`, …

---

## Ví dụ index.html (sau wire-bgm-chain.mjs)

```html
<!-- bgm-chain:begin -->
<audio id="bgm-1" class="clip bgm-chain-segment" src="assets/audio/bgm_1.mp3"
       data-start="0.000" data-duration="45.000" data-track-index="11" data-volume="0.30"></audio>
<audio id="bgm-2" class="clip bgm-chain-segment" src="assets/audio/bgm_2.mp3"
       data-start="44.500" data-duration="76.900" data-track-index="13" data-volume="0.30"></audio>
<!-- bgm-chain:end -->
```

---

## Preflight

```bash
node .cursor/skills/biong-short-video-preflight/scripts/wire-bgm-chain.mjs $PROJ
node .cursor/skills/biong-short-video-preflight/scripts/check-media-stack.mjs $PROJ --strict
```

---

## Fallback MCP

Pixabay down / `curated_fallback` 403: tái dùng nhiều `bgm_*.mp3` từ `storage/agent-renders/{id_khác}/my-video/` — ghi `source: cache_reuse` trong media-plan.md.

Legacy `assets/audio/bgm.mp3` đơn: script coi là 1 segment — **phải thêm** file nếu ngắn hơn video.

---

## Cấm (import assemble)

| Cấm | Lý do |
|-----|-------|
| `loop` trên BGM | Không hoạt động khi render |
| `min_duration_sec=totalVideoSec` | Gây 1 file ngắn / search rỗng |
| `search_meme_sound` / stock / giphy | Ngoài scope assemble |
