# Dynamic Background Patterns — tránh orb scale đơn giản

Background **không bao giờ tĩnh**. Ưu tiên patterns phức tạp; **cấm** chỉ dùng vòng tròn blur scale to/nhỏ.

**Đọc kèm:** [dynamic-bg-mandatory.md](dynamic-bg-mandatory.md) · [foreground-continuous-motion.md](foreground-continuous-motion.md)

---

## Pattern catalog

### `particle-complex`

- 20+ hạt: circles, squares, triangles
- Sizes 4–14px, opacity 0.15–0.5
- GSAP: stagger `y`/`x`/`rotation` yoyo, `from: "random"`
- Dùng beat hook / agitate

### `mesh-warp`

- SVG blob paths morph `d` attribute
- 2–3 blobs opacity thấp, blur filter
- GSAP `attr: { d: "..." }` yoyo
- Dùng beat solve / twist

### `geometric`

- Grid polygons (triangle, hex) xoay stagger
- Parallax layers (slow / fast)
- Không dùng `border-radius: 50%` scale-only
- Dùng beat process / insight

### `gradient-flow`

- Multi-stop gradient ≥5 stops
- `background-size: 300% 300%` + position loop
- Optional diagonal shimmer band
- Base layer mọi beat + ambient

---

## Ambient layer (`ambient-layer.html`)

Stack **tất cả** pattern layers (opacity thấp), animate song song:

```
grain → gradient-flow (base) → particle-complex → mesh-warp → geometric-grid
```

Finite timeline repeat theo `data-duration` video.

---

## Per-beat foreground (trong beat HTML)

**Cấm** `.bg-animated` / `.bg-layer` / `.grain-layer` trong beat — nền animation nằm ở `ambient-layer.html` global (opacity 1).

Mỗi beat chỉ thêm **foreground decorative** (không che stock):

| Element | z trong beat | Dùng khi |
|---------|--------------|----------|
| `.particle-field` | 4+ | Hook / agitate sparkles |
| `.bg-mesh` SVG | 2 | Solve / twist accent |
| `.deco-icon` | 50 | Emoji/icon trang trí |

Stock video opacity **0.1–0.15** (khuyến nghị 0.11) wire ở `index.html` — **không** duplicate trong beat.

---

## GSAP examples (finite)

```javascript
const DUR = 126.4;
const r = (c) => Math.max(1, Math.floor(DUR / c) - 1);

tl.to(".gradient-flow", { backgroundPosition: "200% 200%", duration: 10, repeat: r(10), ease: "none" }, 0);
tl.to(".p-square", { y: "+=30", rotation: 180, duration: 4, repeat: r(4), yoyo: true, stagger: { each: 0.08, from: "random" } }, 0);
tl.to(".morph-blob", { attr: { d: "M..." }, duration: 8, repeat: r(8), yoyo: true, ease: "sine.inOut" }, 0);
tl.to(".geo-shape", { rotation: 360, duration: 14, repeat: r(14), stagger: 0.15, ease: "none" }, 0);
```

---

## Anti-patterns

| Sai | Đúng |
|-----|------|
| 3 orb blur scale only | particle + mesh + geometric mix |
| Static grain only | grain + animated layers |
| `repeat: -1` | Finite repeat tính từ duration |
| Full opaque bg che stock | Stock opacity 0.15–0.25 **trên** ambient opacity 1 |
