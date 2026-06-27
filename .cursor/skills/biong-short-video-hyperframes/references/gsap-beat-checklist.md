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

  // Pattern A (inline beats): tween times = global seconds từ 0
  tl.fromTo(".b1-p1", { y: 80, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, 0.2);
  tl.fromTo(".b2-p1", { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45 }, 6.3);

  window.__timelines["main"] = tl; // key = data-composition-id trên #root
</script>
```

- `paused: true` — **không** `tl.play()`
- Registry key = `data-composition-id` trên composition root
- Duration từ `data-duration` trên root — **không** pad timeline rỗng
- Repeat **hữu hạn** (không `-1`)
- **Cấm** `ease: "none"` / linear cho entrance — dùng `power3.out`, `back.out(1.7)`, `elastic.out`
- **data-duration** root = độ dài beat theo audio — timeline không kết thúc sớm hơn clip
- Entrance trong `.clip` scene: ưu tiên **`fromTo`** thay `from` — tránh opacity 0 khi seek non-linear

---

## Timeline pattern — tránh blank frames

Đọc chi tiết: [blank-frame-audit.md](blank-frame-audit.md)

| Pattern | Khi nào | GSAP |
|---------|---------|------|
| **A — Single main** (khuyến nghị) | Beat inline trong `index.html`; **không** `data-composition-id` từng section | `window.__timelines["main"]`; times **global** |
| **B — Sub-composition per beat** | Beat trong `compositions/beat_N.html` + `data-composition-src` | `window.__timelines["beat_N"]`; times **local 0-based** |
| **C — CẤM** | Inline section + `data-composition-id="beat_N"` + global times | Gây blank frames beat 2+ |

---

## Typography gates (1080×1920)

Đọc [kinetic-typography-brief.md](kinetic-typography-brief.md) trước khi animate.

| Gate | Quy tắc |
|------|---------|
| Headline | 64–120px — hero zone 8–52% |
| Body | ≥28px — cấm <24px không justify |
| Phrases | 3–5 từ/cụm — stagger `0.08–0.12` |
| Lists | UI Card + icon — **không** bullet text thuần |

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

## Timeline pattern (Pattern A — single main)

```javascript
const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });

// Hero — top zone (global time)
tl.fromTo(".hero-title", { y: 80, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, ease: "back.out(1.4)" }, 0);
tl.fromTo(".hero-sub", { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 }, 0.15);

// Support — diagram zone
tl.fromTo(".flow-step", { x: -40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.35, stagger: 0.12, ease: "power2.out" }, 0.35);

// Ambient — decorative only
tl.to(".glow-orb", { scale: 1.08, duration: 2, yoyo: true, repeat: 3, ease: "sine.inOut" }, 0.5);

window.__timelines["main"] = tl;
```

---

## Audio-reactive (nhẹ)

- Scale/glow theo amplitude narration — **không** equalizer bars generic
- Caption karaoke **bắt buộc** — text từ `audio_script`, timing Whisper — xem [caption-karaoke-script-sync.md](caption-karaoke-script-sync.md)
- **Cấm** subtitle tĩnh hoặc text Whisper làm hiển thị

---

## MCP media — BGM + stock

Đọc [media-mcp-activation.md](media-mcp-activation.md).

### BGM global (track 11)

- `search_bgm` sau transcribe — `min_duration_sec = totalVideoSec`
- `index.html`: `data-start="0"`, `data-duration="{totalVideoSec}"`, `data-volume="0.18"`
- Narration track 10: `data-volume="1.0"`
- Nếu track ngắn hơn video → ffmpeg loop trước embed

### Stock per beat

- ≥1 `search_stock_media` mỗi beat — hero / full-bleed
- GSAP paused timeline — **không** `tl.play()`

---

## Anti-patterns

- Slide tĩnh (0 tween)
- Entrance linear / `ease: "none"`
- Video đứng hình — animation xong trước khi beat audio kết thúc
- Output an toàn: chỉ text + đổi nền
- Mọi element cùng `from({ y: 30, opacity: 0 })`
- Decorative không motion
- `tl.play()` trong HyperFrames render
- Bịa path `assets/` không qua MCP search
- Animate `width`/`height`/`top`/`left` thay vì `x`/`y`/`scale`
- **Pattern C timeline** — inline beat + `data-composition-id="beat_N"` + global tween times
- **`tl.from()` trong `.clip`** khi seek non-linear gây mất chữ — dùng `fromTo`
- Google Fonts CDN — font chưa nạp kịp → blank frame

---

## Preflight trước render

- [ ] Caption karaoke wired — script text + transcript timing
- [ ] Watermark Spacedev — [spacedev-brand-watermark.md](spacedev-brand-watermark.md)
- [ ] Font body ≥28px; hero phrases 3–5 từ stagger
- [ ] Timeline pattern A hoặc B — **không** pattern C — [blank-frame-audit.md](blank-frame-audit.md)
- [ ] `window.__timelines["main"]` (A) hoặc `["beat_N"]` per sub-comp (B) đã đăng ký
- [ ] `hyperframes lint` — **0 errors**
- [ ] `hyperframes inspect` — không text clipped/missing ở caption band
- [ ] `animation-map.mjs` — dead zone ≤ 1.5s
- [ ] Layout: `layout-9x16-zones.md` — không overlap caption
- [ ] `media-plan.md` khớp assets đã embed
- [ ] Preview frame tại 0.4 / 0.7 / 0.92 duration
