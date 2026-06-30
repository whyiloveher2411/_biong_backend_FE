# Giphy accent — format & embed (bắt buộc)

## Lỗi thường gặp: ô trắng vuông

MCP `short_video_search_giphy` trả `download_url` dạng **`.mp4`** (H.264 `yuv420p` — **không alpha**).

Dùng `<video src="...mp4">` trong render → **ô trắng** trên mọi frame.

## Quy tắc

| Cấm | Bắt buộc |
|-----|----------|
| `<video>` cho Giphy sticker | `<img>` WebP hoặc GIF có alpha |
| Lưu `accent_*.mp4` | Lưu `accent_*.webp` hoặc `accent_*.gif` |
| Sticker trong beat sub-composition | Floater `<img>` **direct child** `#root` trong `index.html` |

## Tải đúng asset

1. Gọi `short_video_search_giphy({ query, media_type: "sticker" })`
2. Ưu tiên `preview_url` kết thúc `.gif` hoặc `.webp`
3. Nếu chỉ có MP4: đổi URL Giphy sang WebP:
   - `.../100.mp4` → tải `preview_url` (gif) hoặc dùng URL `.../giphy.gif` / `.../200w.webp` từ `id`
4. Verify: `file accent.webp` → `PNG` hoặc `GIF` có alpha

```bash
curl -fsSL "<preview_url_gif>" -o assets/images/accent_hook.gif
# hoặc
curl -fsSL "https://media.giphy.com/media/<id>/200w.webp" -o assets/images/accent_hook.webp
```

## Embed index.html (floater z 80–150)

```html
<img class="clip floater-sticker floater-lane-right" id="accent-hook"
  src="assets/images/accent_hook.webp"
  alt=""
  data-start="0.06" data-duration="16.07" data-track-index="13"
  data-floater-lane="right"
  style="position:absolute;right:32px;top:44%;width:140px;height:140px;z-index:120;object-fit:contain" />
```

- **Lane phải** — cấm `left` rộng đè text cluster — [floater-text-keepout.md](floater-text-keepout.md)
- `z-index` 80–150 (dưới beat host 240+)
- Không `data-composition-src` — img là clip trực tiếp trên host

## GSAP (optional)

Animate floater từ `main` timeline hoặc beat timeline — floater nằm host nên dùng `main` + global time.

## Preflight

- `check-floater-keepout.mjs` — lane + không đè text
- `check-media-stack.mjs --strict`: accent `.webp`/`.gif` — **không** `.mp4`
