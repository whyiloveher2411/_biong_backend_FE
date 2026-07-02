# Foreground Continuous Motion — bắt buộc

Tại **mọi thời điểm** trên timeline video, phải có **≥1 content element** đang chuyển động ở foreground. **Không tính** animation của background (stock video, ambient layer, grain, mesh tint).

**Đọc kèm:** [continuous-motion-patterns.md](continuous-motion-patterns.md) · [visual-shot-plan.md](visual-shot-plan.md) · [gsap-beat-checklist.md](gsap-beat-checklist.md)

---

## Luật cứng

| Rule | Mô tả |
|------|--------|
| No dead zone | Không có khoảng trống >1s mà foreground content đứng im hoàn toàn |
| Content only | Chỉ tính elements trong beat HTML: hero, cards, badges, icons, kinetic text, registry blocks |
| Exclude bg | **Không** tính: `ambient-layer`, `.stock-bg`, `.bg-layer`, `.grain-layer`, mesh gradient |
| Loop required | Mỗi beat ≥1 tween có `repeat: -1` hoặc `yoyo: true` + `repeat` trên foreground selector |
| Minimum elements | Mỗi beat ≥5 distinct visual elements trên màn hình |

---

## Phân tầng motion

```
Background (không tính foreground motion)
├── stock-bg <video> — Ken Burns / playback
├── ambient-layer — grain, orbs, parallax
└── bg-layer mesh tint

Foreground (BẮT BUỘC luôn có motion)
├── Hero — registry block, kinetic headline, stat counter
├── Supporting — quote boxes, source badges, company chips
├── Decorative — floating icons, particles, glow rings
└── Micro-motion — breathe, pulse, rotate loops
```

---

## Patterns bắt buộc (≥2 mỗi beat)

### 1. Staggered loops

Element fade in/out tuần tự — không bao giờ tất cả đứng im cùng lúc:

```javascript
tl.to(".chip", {
  opacity: 0.4,
  duration: 1.2,
  yoyo: true,
  repeat: -1,
  stagger: { each: 0.25, from: "random" },
  ease: "sine.inOut",
}, 0.5);
```

### 2. Sequential reveals

Show/hide badges theo timeline trong beat dài:

```javascript
tl.fromTo(".source-badge", { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4 }, 1.2);
tl.to(".source-badge", { boxShadow: "0 0 24px rgba(99,102,241,0.5)", duration: 1.5, yoyo: true, repeat: -1 }, 1.6);
```

### 3. Continuous micro-motion

Scale breathe, rotate loop, glow pulse trên decorative layer:

```javascript
tl.to(".deco-icon", { rotation: 360, duration: 12, repeat: -1, ease: "none" }, 0);
tl.to(".hero-card", { scale: 1.02, duration: 2.5, yoyo: true, repeat: -1, ease: "sine.inOut" }, 0);
tl.to(".glow-ring", { opacity: 0.6, duration: 1.8, yoyo: true, repeat: -1 }, 0);
```

### 4. Text kinetic layers

Words slide/fade liên tục — không chỉ entrance một lần:

```javascript
tl.fromTo(".kw", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.08 }, 0);
tl.to(".kw", { y: -4, duration: 1.5, yoyo: true, repeat: -1, stagger: 0.1, ease: "sine.inOut" }, 1);
```

### 5. Counter / progress loops

Registry stat blocks — count-up + ring pulse:

```javascript
tl.to(".stat-ring", { strokeDashoffset: 0, duration: 2, ease: "power2.out" }, 0.3);
tl.to(".stat-value", { textContent: target, duration: 1.5, snap: { textContent: 1 } }, 0.3);
tl.to(".stat-ring", { opacity: 0.7, duration: 1.2, yoyo: true, repeat: -1 }, 2);
```

---

## GSAP timeline structure (mỗi beat)

```javascript
const tl = gsap.timeline({ paused: true });

// Phase 1: Entrance (0–1s) — stagger groups
tl.fromTo(".header-badge", { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: "back.out(1.7)" }, 0);
tl.fromTo(".hero", { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }, 0.15);
tl.fromTo(".support-card", { x: -20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, stagger: 0.12 }, 0.6);

// Phase 2: Mid-beat reveals (1–3s)
tl.fromTo(".source-badge", { scale: 0 }, { scale: 1, duration: 0.4, ease: "back.out(2)" }, 1.2);

// Phase 3: Continuous loops (0 → beat end) — BẮT BUỘC
tl.to(".deco-icon", { rotation: 360, duration: 10, repeat: -1, ease: "none" }, 0);
tl.to(".particle", { y: "+=12", duration: 2, yoyo: true, repeat: -1, stagger: 0.2, ease: "sine.inOut" }, 0);
tl.to(".ui-card", { scale: 1.015, duration: 2.2, yoyo: true, repeat: -1, ease: "sine.inOut" }, 0.8);

window.__timelines["beat_N"] = tl;
```

**Cấm:**
- Chỉ có entrance tweens, không có loop
- `tl.play()` — HyperFrames seek `paused: true`
- `repeat: -1` trên `window.__timelines["main"]` — chỉ trên beat sub-timelines

---

## Selectors foreground (whitelist)

Preflight coi các selector/class sau là foreground motion:

| Class / selector | Vai trò |
|------------------|---------|
| `.beat-progress-fill` | Global progress bar (index.html) |
| `.hook-title-frame`, `.hook-title-box`, `.hook-title-text` | Hook beat 1 title box |
| `.hero`, `.hero-title`, `.kw` | Kinetic headline |
| `.ui-card`, `.premium-card`, `.support-card` | Glass cards |
| `.source-badge`, `.context-chip` | Metadata badges |
| `.deco-icon`, `.particle`, `.glow-ring` | Decorative motion |
| `.stat-value`, `.stat-ring` | Registry counters |
| `[data-registry-block]` | Registry hero blocks |
| `.company-chip`, `.quote-box` | Supporting graphics |

**Exclude (background):**
`.stock-bg`, `.bg-layer`, `.grain-layer`, `.ambient`, `#ambient`, `.hf-ambient-layer`

---

## Shot-plan fields

Mỗi beat trong `visual_shot_plan` phải có:

```json
{
  "minimum_elements": 5,
  "decorative_elements": [
    { "type": "header_badge", "text": "#2/9" },
    { "type": "decorative_icon", "icon": "atom" }
  ],
  "supporting_graphics": [
    { "type": "source_badge", "text": "404 Media 2024" }
  ],
  "continuous_motion_layers": [
    { "element": "deco-icon", "animation": "rotate_loop", "duration": 10 },
    { "element": "particles", "animation": "float_yoyo", "duration": 2 }
  ]
}
```

---

## Preflight

```bash
node .cursor/skills/biong-short-video-preflight/scripts/check-foreground-motion-density.mjs <project-dir>
```

| Code | Severity | Điều kiện |
|------|----------|-----------|
| `no_foreground_loop` | critical | Beat thiếu `repeat: -1` hoặc `yoyo` loop trên foreground |
| `dead_zone` | critical | Gap >1s không có foreground tween active |
| `insufficient_elements` | critical | Beat HTML <5 distinct element classes |
| `missing_continuous_layers` | warning | Shot-plan thiếu `continuous_motion_layers` |

---

## Anti-patterns

| Sai | Đúng |
|-----|------|
| 1 card tĩnh giữa màn hình | ≥5 elements + loop motion |
| Entrance xong đứng im | Loop breathe/pulse/rotate suốt beat |
| Chỉ ambient layer chuyển động | Foreground content luôn có micro-motion |
| Gradient bg không animation | Stock video HOẶC animated graphics bg |
