# Continuous motion patterns — ambient layer

Phase 2 — file `compositions/ambient-layer.html` + `window.__timelines["ambient"]`.

Borrow từ website-to-video: **không để frame tĩnh >1.5s** khi không có beat entrance.

---

## Template ambient-layer.html

```html
<!DOCTYPE html>
<html>
<head>
<style>
  html, body { margin:0; width:1080px; height:1920px; overflow:hidden; background:transparent!important; }
  #root { position:relative; width:100%; height:100%; }
  .ambient-bg { position:absolute; inset:-5%; z-index:1; }
  .ambient-orb { position:absolute; border-radius:50%; filter:blur(40px); opacity:0.35; }
  .orb-a { width:280px; height:280px; left:10%; top:20%; background:#6366f1; }
  .orb-b { width:200px; height:200px; right:8%; top:45%; background:#ec4899; }
</style>
</head>
<body>
<div id="root" data-composition-id="ambient" data-duration="{totalVideoSec}">
  <div class="ambient-bg" id="ambient-parallax"></div>
  <div class="ambient-orb orb-a" id="orb-a"></div>
  <div class="ambient-orb orb-b" id="orb-b"></div>
</div>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<script>
window.__timelines = window.__timelines || {};
const tl = gsap.timeline({ paused: true, repeat: -1 });
const LOOP = 8; // giây mỗi vòng ambient

tl.fromTo("#ambient-parallax",
  { x: 24, y: 12, scale: 1.04 },
  { x: -24, y: -12, scale: 1, duration: LOOP, ease: "none" },
  0
);
tl.to("#orb-a", { y: "+=30", scale: 1.08, duration: 2.5, yoyo: true, repeat: -1, ease: "sine.inOut" }, 0);
tl.to("#orb-b", { y: "-=25", scale: 0.95, duration: 3, yoyo: true, repeat: -1, ease: "sine.inOut" }, 0.5);

window.__timelines["ambient"] = tl;
</script>
</body>
</html>
```

---

## Pattern catalog

| ID | Mô tả | Khi dùng |
|----|-------|----------|
| `ambient_parallax` | Slow drift trên bg mesh | Mọi video |
| `ambient_breathe` | scale 1→1.03 yoyo | Hero cards, orbs |
| `ambient_grain` | grain-overlay component | Dark premium palette |
| `ambient_neon_sweep` | shimmer-sweep trên border | Tech / edu |
| `ambient_particles` | CSS dots + opacity pulse | Hook, agitate |
| `ken_burns_composed` | scale/x trên `.scene-root` — **không** trên stock `<video>` | Beat dài >3s |

---

## Phối hợp với beat timeline

| Timeline | Vai trò | repeat |
|----------|---------|--------|
| `main` | Entrance, exit, stagger theo beat-map | **không** |
| `ambient` | Parallax, breathe, grain, particles | **-1** |

Dead zone audit (`animation-map.mjs`): khoảng >1.5s không tween trên `main` **được phép** nếu `ambient` active.

---

## motion_hint trong visual_shot_plan

Map `motion_hint` string → patterns:

- `cascade + ambient_parallax` → main stagger + ambient parallax
- `slam + ambient_grain` → kinetic slam + grain component
- `punch + parallax` → back.out entrance + ambient drift
- `breathe` → ambient breathe trên hero container

---

## Checklist

- [ ] `compositions/ambient-layer.html` tồn tại
- [ ] Host clip trong `index.html` z-index 6–10
- [ ] `window.__timelines["ambient"]` đăng ký
- [ ] ≥2 ambient pattern active
- [ ] `check-continuous-motion.mjs` exit 0
