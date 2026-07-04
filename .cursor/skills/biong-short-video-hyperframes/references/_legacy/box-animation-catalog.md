# Box Animation Catalog — sặc sỡ + loop motion

Mọi `.ui-card`, `.quote-box`, `.flow-node`, `.company-chip`, `.context-chip`, `.badge` phải có **màu nền đặc** (không trong suốt hoàn toàn) + **≥1 hiệu ứng loop**.

**Đọc kèm:** [foreground-continuous-motion.md](foreground-continuous-motion.md) · [keyword-highlighting.md](keyword-highlighting.md)

---

## Box color variants (bắt buộc)

| Class | Background | Border |
|-------|------------|--------|
| `.box-info` | `rgba(99,102,241,0.18)` | `rgba(99,102,241,0.45)` |
| `.box-warning` | `rgba(251,146,60,0.18)` | `rgba(251,146,60,0.45)` |
| `.box-success` | `rgba(74,222,128,0.18)` | `rgba(74,222,128,0.45)` |
| `.box-accent` | `rgba(236,72,153,0.18)` | `rgba(236,72,153,0.45)` |
| `.box-neutral` | `rgba(148,163,184,0.12)` | `rgba(148,163,184,0.35)` |

**List cùng beat:** mỗi box **màu khác** khi có ≥2 items (flow nodes, bento grid, company chips).

**Accent borders:** `.border-bottom-accent`, `.border-left-accent`, `.border-right-accent` — viền 4px một cạnh.

---

## Mirror / glossy (4 variants)

| Class | Mô tả | CSS / GSAP |
|-------|-------|------------|
| `.fx-shine` | Ánh sáng lướt trái→phải | `::after` gradient + `@keyframes shine-sweep` **4s** |
| `.fx-glossy` | Gradient bóng di chuyển | `background-position` loop |
| `.fx-glint` | Reflection band | `::before` opacity pulse |
| `.fx-glass-shimmer` | Glass + shimmer overlay | `backdrop-filter` + opacity yoyo |

---

## Border 3D (khuyến nghị)

| Class | Mô tả |
|-------|-------|
| `.border-3d` | Inset shadow sáng trên / tối dưới theo `.box-*` |

**BẮT BUỘC MỌI BOX:**

Không cần thêm class `.border-3d` thủ công — `global-default-styles.css` tự động áp dụng cho:

- `.ui-card`, `.premium-card`, `.quote-box`, `.flow-node`
- `.company-chip`, `.context-chip`, `.badge`, `.vs-card`

Nếu cần override (rare), dùng `box-shadow: none !important;`.

**Cấm:** drop-shadow ngoài trên card bo tròn — góc bị lỗi.

## Anti-pattern: border animations

**Cấm** `.fx-border-chase`, `.fx-border-gradient` — vệt sáng bay trong box.

---

## Shake / wobble (3 variants)

| Class | GSAP pattern |
|-------|--------------|
| `.fx-shake` | `x: [-2,2,-1,1,0]` rapid |
| `.fx-wobble` | `rotation: ±0.5°` elastic yoyo |
| `.fx-pulse` | `scale: 1→1.04` sine yoyo |

---

## Background gradient loop

| Class | Animation |
|-------|-----------|
| `.fx-gradient-flow` | `backgroundPosition` 200% loop |
| `.fx-hue` | `filter: hue-rotate` (dùng GSAP, finite repeat) |
| `.fx-radial-pulse` | `background-size` radial yoyo |

---

## Distribution rules

- Mỗi beat: **≥2** fx classes khác nhau trên các box
- Không lặp cùng combo fx **>2 beat liên tiếp**
- Flow nodes: node 1/2/3 = info / warning / success + fx khác nhau
- Quote box: thường `fx-shine` hoặc `fx-border-sweep`
- Stat card: `fx-pulse` + `box-accent`

---

## GSAP (lint-safe)

Dùng **finite repeat** theo beat duration:

```javascript
const r = (cycle) => Math.max(1, Math.floor(D / cycle) - 1);
tl.to(".quote-box.fx-wobble", { rotation: 0.5, duration: 2.2, repeat: r(2.2), yoyo: true, ease: "elastic.inOut(2,0.3)", overwrite: "auto" }, 0.8);
```

Cấm `repeat: -1` trong beat HTML (HyperFrames lint).

---

## Anti-patterns

| Sai | Đúng |
|-----|------|
| `background: rgba(255,255,255,.04)` only | `.box-*` solid tint |
| Tất cả box cùng màu xám | Đa màu trong list |
| Chỉ scale breathe | Mix shine + border + wobble |
| Static quote box | `fx-shine` hoặc border loop |
| **Opacity fade trong loopMotion** | **Cấm** — content mất readability |
| Shine 3s | Shine **4s** |
| Marquee trong quote-box | **Cấm** — dùng `hk()` static |
