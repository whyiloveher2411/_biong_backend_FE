# Spacedev brand watermark — bắt buộc mọi video

Mọi video final phải có **logo Spacedev + text** góc **phải dưới** để đánh dấu bản quyền.

---

## Asset

Nguồn bundled:

```
.cursor/skills/biong-short-video-hyperframes/assets/spacedev-logo.png
```

Copy vào project render:

```bash
mkdir -p storage/agent-renders/{id}/my-video/assets/images
cp .cursor/skills/biong-short-video-hyperframes/assets/spacedev-logo.png \
   storage/agent-renders/{id}/my-video/assets/images/spacedev-logo.png
```

---

## Vị trí

- **Góc phải dưới** — `right: 28px`, `bottom: 28px` (trong safe zone, không che caption chính giữa band)
- Opacity ~0.85–0.95 — đủ đọc, không lấn nội dung
- Logo height **48–64px**; text **18–22px** video-scale
- Text: `"© Spacedev"` hoặc `"Spacedev"` — sentence case, không ALL CAPS

Caption karaoke nằm band 78–100% **giữa** — watermark **góc phải** trong band, không overlap hero/support.

---

## Wiring HyperFrames

Clip global — visible suốt video:

```html
<div class="clip brand-watermark"
     id="spacedev-watermark"
     data-start="0"
     data-duration="{totalVideoSec}"
     data-track-index="99"
     data-composition-src="compositions/brand-watermark.html">
</div>
```

Hoặc inline trong `index.html` nếu composition đơn giản.

---

## Composition scaffold — `compositions/brand-watermark.html`

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 1080px; height: 1920px; overflow: hidden; background: transparent; }
    .brand-wrap {
      position: absolute;
      right: 28px;
      bottom: 28px;
      display: flex;
      align-items: center;
      gap: 10px;
      opacity: 0.9;
      pointer-events: none;
    }
    .brand-wrap img {
      height: 56px;
      width: auto;
      display: block;
    }
    .brand-wrap span {
      font-family: "Outfit", "Inter", system-ui, sans-serif;
      font-size: 20px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.92);
      text-shadow: 0 1px 4px rgba(0, 0, 0, 0.45);
      letter-spacing: 0.02em;
    }
  </style>
</head>
<body>
  <div class="brand-wrap" data-composition-id="brand-watermark">
    <img src="../assets/images/spacedev-logo.png" alt="" />
    <span>© Spacedev</span>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <script>
    window.__timelines = window.__timelines || {};
    const tl = gsap.timeline({ paused: true });
    tl.from(".brand-wrap", { opacity: 0, x: 12, duration: 0.5, ease: "power2.out" }, 0.2);
    window.__timelines["brand-watermark"] = tl;
  </script>
</body>
</html>
```

Đường dẫn `../assets/images/` tương đối từ `compositions/`.

---

## GSAP

- Entrance nhẹ fade+slide — không `tl.play()`
- `window.__timelines["brand-watermark"]` — key = `data-composition-id`

---

## Anti-patterns

| Sai | Đúng |
|-----|------|
| Không watermark | Luôn có logo + text |
| Logo to che caption giữa | Góc phải dưới, compact |
| ALL CAPS "SPACEDEV" | "© Spacedev" |
| Watermark chỉ beat đầu | `data-duration=totalVideoSec` |

---

## Checklist

- [ ] Logo copied vào `assets/images/spacedev-logo.png`
- [ ] Clip watermark `data-start=0`, `data-duration=totalVideoSec`
- [ ] Track index cao (99) — luôn trên cùng
- [ ] Text "© Spacedev" hiển thị cạnh logo
- [ ] Không che diagram / CTA / caption center
