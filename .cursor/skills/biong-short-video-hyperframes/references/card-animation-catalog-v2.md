# Card Animation Catalog v2 — border, idle, flip

**Đọc kèm:** [box-animation-catalog.md](box-animation-catalog.md) · [text-animation-catalog.md](text-animation-catalog.md)

---

## Border animations

### Breathing (`.fx-breathe`, `.fx-breathe-slow`, `.fx-breathe-text`)

Scale 1→1.05, chu kỳ 4–6s — thay thế shadow pulse.

### Border 3D (`.border-3d`) — khuyến nghị

Inset box-shadow tạo viền sáng trên / tối dưới — **không** dùng drop-shadow ngoài (góc bị vuông).

```css
.border-3d {
  box-shadow: inset 0 4px 0 0 rgba(255,255,255,.3), inset 0 -4px 0 0 rgba(0,0,0,.5);
}
.box-info.border-3d {
  box-shadow: inset 0 4px 0 0 rgba(99,102,241,.65), inset 0 -4px 0 0 rgba(0,0,0,.5);
}
```

Kết hợp `.fx-breathe` trên mọi `.ui-card.premium-card`, `.quote-box`, `.flow-node`.

**NOTE:** Từ v8, `.border-3d` được áp dụng tự động qua `global-default-styles.css`.
Không cần thêm class này thủ công trừ khi muốn customize màu variant (`.box-info`, `.box-warning`…).

### Anti-pattern: border chase / gradient rotate

**Cấm** `.fx-border-chase` và `.fx-border-gradient` — lỗi render trên pill nhỏ và box bo tròn.

---

## Idle animations

| Class | GSAP | Chu kỳ | Dùng cho |
|-------|------|--------|----------|
| `.fx-shine` | CSS `::after` sweep | **4s** | Quote, stat card |
| `.fx-float` | y ±12, rotation 0.8° | 4s | Quote, flow-node |
| `.fx-glow-breathe` | box-shadow pulse | 5s | Stat hero, VS card |
| `.fx-heartbeat` | double-beat scale | 3s + delay 2s | CTA, premium stat |

### Heartbeat (double-beat)

```javascript
const hb = gsap.timeline({ repeat: r(3), repeatDelay: 2 });
hb.to(".fx-heartbeat", { scale: 1.08, duration: 0.15 })
  .to(".fx-heartbeat", { scale: 1, duration: 0.15 })
  .to(".fx-heartbeat", { scale: 1.12, duration: 0.2 }, "+=0.05")
  .to(".fx-heartbeat", { scale: 1, duration: 0.2 });
```

---

## Anti-pattern: auto flip

**Cấm** `.fx-auto-flip` / flip 3D — text bị mirror khi lật trong HyperFrames render.

**Thay bằng:** static cards trong `.vs-grid` (2×2) — mỗi mặt front/back thành 1 card riêng.

---

## Distribution per beat

Mỗi beat: **≥3** card effect types khác nhau.

| Element | Effects |
|---------|---------|
| Quote box | `.fx-shine` + `.fx-breathe` + `.border-3d` |
| Stat card | `.fx-breathe` + `.border-3d` |
| Flow node | `.fx-breathe` + `.border-3d` |
| Company chip | `.border-3d` static border |
| VS compare | static `.vs-grid` 4 cards |
| Context chip | `.border-3d` static border |

---

## Frequency tiering

| Tier | Chu kỳ | Effects |
|------|--------|---------|
| Attention | 1–2.5s | chase, heartbeat, shake |
| Ambient | 4–6s | shine (4s), float, glow-breathe, gradient rotate, auto-flip |

---

## Anti-patterns

| Sai | Đúng |
|-----|------|
| Opacity yoyo trên box content | Transform / box-shadow only |
| Shine 3s (quá nhanh) | Shine **4s** |
| Static border only | Mix gradient + chase |
| Cùng combo fx >2 beat liên tiếp | Rotate effect mix |
| Flip card thiếu border-radius | `.flip-card` + `.flip-front/back` `border-radius:22px; overflow:hidden` |
| Gradient border lấp nội dung | `padding-box` + `--bg-color` solid |

---

## Advanced card effects (v5)

| Class | Mô tả | GSAP |
|-------|-------|------|
| `.fx-warp` | Card uốn 3D | `rotateX/Y` yoyo 3.5s |
| `.fx-liquid-card` | Bubble blend bên trong | CSS vars `--bubble1-x/y` |
| `.fx-glass-refract` | Glassmorphism + refraction | `--refract-x/y` + backdrop-filter |

**Animation budget:** max 1–3 loop effects/beat (không tính focal static).
