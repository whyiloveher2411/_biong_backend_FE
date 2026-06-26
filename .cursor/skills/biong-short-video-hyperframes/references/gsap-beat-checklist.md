# GSAP checklist — mỗi beat/slide

Bắt buộc phase 2. Đọc **trước** khi viết animation.

---

## Skills đọc trước

1. `/gsap-core` — [greensock/gsap-skills](https://github.com/greensock/gsap-skills)
2. `/gsap-timeline` — sequencing, stagger, labels
3. `/gsap-performance` — transform aliases, tránh layout props
4. `/hyperframes-animation` + `adapters/gsap.md` — **HyperFrames contract (ưu tiên)**

---

## HyperFrames contract (không bỏ qua)

```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<script>
  window.__timelines = window.__timelines || {};
  const tl = gsap.timeline({ paused: true });

  // entrances + ambient — xem checklist dưới

  window.__timelines["beat_1"] = tl; // key = data-composition-id
</script>
```

- `paused: true` — **không** `tl.play()`
- Registry key = `data-composition-id` trên root
- Duration từ `data-duration` trên root — **không** pad timeline rỗng
- Repeat **hữu hạn** (không `-1`)
- **Cấm** `ease: "none"` / linear cho entrance — dùng `power3.out`, `back.out(1.7)`, `elastic.out`
- **data-duration** root = độ dài beat theo audio — timeline không kết thúc sớm hơn clip

---

## Minimum mỗi beat

| # | Yêu cầu | Ví dụ |
|---|---------|-------|
| 1 | ≥3 entrance tweens | headline SLAM, subtitle fade, diagram stagger |
| 2 | Khác ease/hướng | `power3.out`, `back.out(1.4)`, `elastic.out` — không lặp `y:30 opacity:0` |
| 3 | ≥1 stagger group | cards, arrows, words |
| 4 | ≥1 ambient motion | decorative breathe `scale: 1.02`, glow pulse, finite repeat |
| 5 | Motion verbs đặt tên | SLAM, CASCADE, PUNCH, morph — mỗi element có verb |

---

## Timeline pattern

```javascript
const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });

// Hero — top zone
tl.from(".hero-title", { y: 80, opacity: 0, duration: 0.55, ease: "back.out(1.4)" }, 0);
tl.from(".hero-sub", { y: 40, opacity: 0, duration: 0.4 }, 0.15);

// Support — diagram zone
tl.from(".flow-step", {
  x: -40, opacity: 0, duration: 0.35, stagger: 0.12, ease: "power2.out"
}, 0.35);

// Ambient — decorative only
tl.to(".glow-orb", { scale: 1.08, duration: 2, yoyo: true, repeat: 3, ease: "sine.inOut" }, 0.5);

window.__timelines["beat_1"] = tl;
```

---

## Audio-reactive (nhẹ)

- Scale/glow theo amplitude narration — **không** equalizer bars generic
- Sync caption qua word timestamps — không subtitle tĩnh

---

## Anti-patterns

- Slide tĩnh (0 tween)
- Entrance linear / `ease: "none"`
- Video đứng hình — animation xong trước khi beat audio kết thúc
- Output an toàn: chỉ text + đổi nền
- Mọi element cùng `from({ y: 30, opacity: 0 })`
- Decorative không motion
- `tl.play()` trong HyperFrames render
- Animate `width`/`height`/`top`/`left` thay vì `x`/`y`/`scale`

---

## Preflight trước render

- [ ] `window.__timelines["beat_N"]` tồn tại
- [ ] `hyperframes lint` pass
- [ ] Layout: `layout-9x16-zones.md` — không overlap caption
- [ ] Preview frame tại 0.4 / 0.7 / 0.92 duration
