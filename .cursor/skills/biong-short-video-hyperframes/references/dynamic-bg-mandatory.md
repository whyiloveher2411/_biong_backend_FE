# Background động — bắt buộc (cấm nền tĩnh)

Mọi short video phase 2 **phải** có nền **video stock** hoặc **ảnh stock Ken Burns** (animated). **Cấm** ship với chỉ CSS gradient/mesh tĩnh.

---

## Cấm

| Loại | Ví dụ | Lý do |
|------|-------|-------|
| `bg_media.type: gradient_only` | Chỉ `#root` linear-gradient | Trông phẳng, không cinematic |
| Chỉ `ambient-layer` + mesh | Orbs/grain không thay video | Ambient là lớp phụ, không phải B-roll |
| `#root { background: #0B0F1A }` opaque | Solid color | Che hết depth |
| Stock image tĩnh không motion | `<img>` bg không GSAP | Cần pan/zoom hoặc dùng `stock_video` |

---

## Bắt buộc

1. **Mỗi beat** trong `visual_shot_plan`: `bg_media.type` = `stock_video` (ưu tiên) hoặc `stock_image` + Ken Burns trong beat/ambient.
2. **`index.html`**: ≥1 `<video class="stock-bg">` full-bleed 1080×1920, `object-fit: cover`, opacity **0.1–0.15** (khuyến nghị **0.11**, trên ambient-layer, dưới content).
3. **Coverage timeline**: tổng `data-duration` các clip `stock-bg` **phủ kín** `0 → totalVideoSec` (cho phép overlap, không gap > 2s).
4. Gọi MCP: `short_video_search_stock_media({ media_type: "video", query: "…" })` — **mỗi beat khác query** khi có thể.

---

## Stack z-index (nền) — thứ tự bắt buộc

**Từ dưới lên:** animation (opacity 1) → stock video (opacity thấp) → content.

```
z 2–6   ambient-layer (gradient, particles, mesh) — opacity 1.0  ← LỚP DƯỚI
z 7–10  stock-bg <video> — opacity 0.1–0.15 (khuyến nghị 0.11)  ← LỚP GIỮA
z 240+  beat content (scene-root) — KHÔNG bg-animated opaque   ← LỚP TRÊN
```

**DOM `index.html`:** ambient host **trước** stock-bg-wrap; stock z-index **cao hơn** ambient.

| Lớp | Opacity | Vai trò |
|-----|---------|---------|
| `ambient-layer.html` | **1.0** | Nền animation chính (gradient-flow, particles, mesh) |
| `stock-bg` video | **0.1–0.15** (khuyến nghị **0.11**) | B-roll texture phía trên animation, dưới content |
| Beat `.scene-root` | transparent | Chỉ UI cards + typography |

## Beat background — cấm trùng lớp nền

Trong mỗi beat HTML:
- **Cấm** `<div class="bg-animated">` / `.bg-layer` / `.grain-layer` opaque — animation đã ở `ambient-layer` global
- **Được** giữ `.particle-field`, `.deco-icon`, `.bg-mesh` làm foreground decorative (z trong beat)
- **Cấm** opacity ≥ 0.5 trên lớp nền beat khi đã có stock-bg + ambient ở `index.html`

---

## Shot-plan mẫu

```json
"bg_media": { "type": "stock_video", "query": "abstract dark technology motion" }
```

**Cấm** trong shot-plan production:

```json
"bg_media": { "type": "gradient_only" }
```

---

## Preflight

- `check-dynamic-background.mjs` — FAIL nếu `gradient_only` trong shot-plan hoặc gap stock > 2s
- `check-stock-full-bleed.mjs` — CSS + object-fit cover

## Tham khảo

- [media-mcp-activation.md](media-mcp-activation.md)
- [visual-shot-plan.md](visual-shot-plan.md)
- [foreground-continuous-motion.md](foreground-continuous-motion.md)

---

## Animated Graphics Patterns (option 2)

Khi không dùng stock video, **bắt buộc** animated graphics trong beat hoặc ambient:

| Pattern | GSAP / CSS | Khi dùng |
|---------|------------|----------|
| Gradient shift | `backgroundPosition`, hue rotate | Nền abstract tech |
| Particle systems | `.particle` float yoyo stagger | Decorative layer |
| Shape morphing | SVG `strokeDashoffset`, path tween | Tech diagrams |
| Mesh warping | `clip-path` animation, scale breathe | Hero backdrop |
| Orb drift | `x/y` loop `repeat: -1` | Ambient + beat deco |

**Mix approach (khuyến nghị):**
- Beats hook/stat: stock video bg
- Beats process/CTA: animated graphics bg (gradient + particles)
- Mỗi beat **phải** specify `bg_media.type` cụ thể trong shot-plan

```json
"bg_media": { "type": "animated_graphics", "pattern": "gradient_particles" }
```

`animated_graphics` được coi tương đương `stock_video` cho preflight — miễn có GSAP motion trên `.bg-layer` hoặc `.bg-animated`.
