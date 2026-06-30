# Floater / accent — keep-out text (bắt buộc)

Sticker Giphy, GIF, Lottie accent **không được đè lên chữ**. Được phép đè lên **khung visual** (card, chart container) nếu không che typography.

---

## Lỗi thường gặp

Sticker đặt `left: 32–48px` + `width: 140–200px` → bbox xấm **content-cluster** (bắt đầu ~x 70px) → che text trong bento/card/stat.

---

## Vùng an toàn (1080×1920)

Content cluster: `max-width: 940px`, căn giữa → **x ∈ [70, 1010]**, **y ∈ [80, 1560]** (trên caption band).

```
|←70px→|══════ CONTENT + TEXT ══════|←70px→|
 gutter          (cấm floater)        gutter
```

| Lane | CSS | Khi dùng |
|------|-----|----------|
| **R** (ưu tiên) | `right: 16–48px; left: auto; max-width: 160px` | Mọi beat có card/text |
| **T** | `top: 100–140px; right: 24px; left: auto` | Hook kinetic, không card trái |
| **L-micro** | `left: 8–16px; max-width: 56px` | Chỉ icon nhỏ — **cấm** sticker người/face lớn |

**Cấm:**
- `left: 24–120px` + `width ≥ 100px` — overlap text cluster
- Floater `z-index` > beat host (240+) — luôn giữ floater **z 80–150**, beat **z 240+**
- Sticker **trong** beat sub-composition che `.hero-block` / `.support-block` text

**Được phép:**
- Sticker ở lane R, chồng lên **viền** card (glass border) nếu không che glyph
- Lottie nhỏ góc phải support zone

---

## Class bắt buộc (index.html)

```html
<img class="clip floater-sticker floater-lane-right" …
  style="position:absolute;right:32px;top:44%;width:140px;height:140px;z-index:120;object-fit:contain" />
```

```css
.floater-lane-right { left: auto !important; right: 32px; max-width: 160px; }
.floater-lane-top-right { left: auto !important; right: 28px; top: 120px; max-width: 120px; }
/* Cấm .floater-lane-left trừ max-width: 56px */
```

Mọi `<img class="floater-sticker">` phải có **một trong**: `floater-lane-right`, `floater-lane-top-right`, hoặc `data-floater-lane="right|top-right"`.

---

## Shot-plan

`accent_media.placement`: `"lane_right"` | `"lane_top_right"` — agent map sang class trên.

---

## Preflight

`check-floater-keepout.mjs` — FAIL nếu:
- Floater có `left:` < 70px và width > 56px
- Thiếu lane class / `data-floater-lane`
- `z-index` > 200 trên floater

## Tham khảo

- [giphy-accent-format.md](giphy-accent-format.md) — format WebP
- [layout-9x16-zones.md](layout-9x16-zones.md) — content-cluster
