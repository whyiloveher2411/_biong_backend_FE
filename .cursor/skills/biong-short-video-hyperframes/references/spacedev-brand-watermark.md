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

## Z-index & layer (bắt buộc — đọc trước)

**`data-track-index` KHÔNG quyết định trên/dưới.** Thứ tự vẽ = **CSS z-index**.

Đọc chi tiết: [overlay-layer-stack.md](overlay-layer-stack.md)

| Clip host | z-index | DOM order |
|-----------|---------|-----------|
| Caption | **9000** | Sau beats, trước watermark |
| Watermark | **9500** | **Cuối** `#root` |

---

## Wiring HyperFrames

Clip global — visible **suốt** video (không gắn vào beat cuối):

```html
<!-- CUỐI #root — sau caption host -->
<div class="clip hf-overlay-brand brand-watermark"
     id="spacedev-watermark"
     data-start="0"
     data-duration="{totalVideoSec}"
     data-track-index="21"
     data-composition-src="compositions/brand-watermark.html"
     style="position:absolute;inset:0;z-index:9500;pointer-events:none;">
</div>
```

**Cấm** chỉ đặt logo trong beat CTA — sẽ lúc có lúc không.

---

## Composition scaffold — `compositions/brand-watermark.html`

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 1080px; height: 1920px; overflow: hidden; background: transparent !important; }
    .brand-wrap {
      position: absolute;
      right: 28px;
      bottom: 28px;
      display: flex;
      align-items: center;
      gap: 10px;
      z-index: 10;
      opacity: 0.92;
      pointer-events: none;
      filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.45));
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
| Tin track 99 = trên cùng | z-index 9500 trên host clip |
| Watermark chỉ beat cuối | Host global data-duration=totalVideoSec |
| Logo to che caption giữa | Góc phải dưới, compact |
| ALL CAPS "SPACEDEV" | "© Spacedev" |
| Watermark chỉ beat đầu | `data-duration=totalVideoSec` |

---

## Checklist

- [ ] Logo copied vào `assets/images/spacedev-logo.png`
- [ ] Clip watermark `data-start=0`, `data-duration=totalVideoSec`
- [ ] Host clip `z-index:9500` — **cuối** `#root`
- [ ] `body { background: transparent !important; }`
- [ ] Preflight `check-overlay-stack.mjs` pass
- [ ] Text "© Spacedev" hiển thị cạnh logo
- [ ] Không che diagram / CTA / caption center
