# Motion vocabulary map — ngôn ngữ tự nhiên → code

Agent map lệnh tự nhiên sang GSAP/CSS theo skill HyperFrames. Contract render: [gsap-beat-checklist.md](gsap-beat-checklist.md).

---

## Easing & motion feel

| Bạn nói | GSAP ease | Khi dùng |
|---------|-----------|----------|
| smooth, mượt | `power2.out` | Entrance mặc định, fade/slide nhẹ |
| snappy, nhanh | `power3.out` | Headline slam, stat reveal |
| bouncy, nảy | `back.out(1.6)` | Chip landing, logo pop, CTA punch |
| springy, lò xo | `elastic.out(1, 0.3)` | Emphasis word, playful accent |
| linear scroll | `none` | Marquee, progress bar fill |
| impact | `back.out(2.2)` | Kinetic slam (xem motion-graphics vocabulary) |

**Cấm entrance:** `ease: "none"` / `linear` — chỉ `none` cho progress/marquee fill.

Tham khảo: `.agents/skills/motion-graphics/references/motion-vocabulary.md`

---

## 3D depth + cinematic glow

| Hiệu ứng | GSAP / CSS |
|----------|------------|
| Zoom in | `from({ scale: 0.8, opacity: 0, ease: "power3.out" })` |
| Tilt card | `rotation: 5` hoặc `-5` |
| Border glow | gradient `box-shadow` + ambient pulse |
| Exit blur | `filter: blur(8px)` + `opacity: 0` (decorative exit) |

Chi tiết: [motion-complexity-activation.md](motion-complexity-activation.md)

---

## Marker highlights (chữ trên màn hình)

| Bạn nói | Pattern | File HF |
|---------|---------|---------|
| highlight, tô vàng | Marker sweep bar sau text | `.agents/skills/hyperframes/references/css-patterns.md` § Highlight Mode |
| circle this word, khoanh tròn | Hand-drawn ellipse ring | `css-patterns.md` § Circle Mode |
| underline, gạch chân | Grow-x bar dưới text | `css-patterns.md` § Underline Mode |
| scribble, gạch tay | SVG path draw | `hyperframes-animation` blueprints |

**Lưu ý:** Marker trên **on-screen copy** (headline ngắn) — không lặp lại câu narration (caption track đã hiển thị lời thoại).

---

## Entrance verbs (đa dạng mỗi beat)

| Verb | GSAP pattern |
|------|--------------|
| SLAM | `from({ y: 80, opacity: 0, ease: "power4.out" })` |
| CASCADE | `stagger: 0.08` trên nhóm `.word` / `.card` |
| PUNCH | `from({ scale: 0.6, ease: "back.out(2.2)" })` |
| MORPH | `fromTo` scale + rotation trên decorative |
| BREATHE | ambient `yoyo: true, repeat: 2` scale 1→1.03 (finite) |

Mỗi beat ≥3 entrance **khác** ease/hướng — không lặp `y:30 opacity:0` cho mọi element.

---

## Audio-reactive (nhẹ — từ MP3 transcribe)

Pre-extract bands: `.agents/skills/hyperframes-creative/references/audio-reactive.md`

| Tín hiệu | Map vào | Hiệu ứng |
|----------|---------|----------|
| Bass `bands[0]` | `scale` | Pulse theo nhịp narration |
| Treble `bands[12-14]` | `textShadow`, `boxShadow` | Glow intensity |
| Amplitude tổng | `opacity`, `y` nhẹ | Breathe trên decorative |

**Cấm:** equalizer bars, waveform display, spectrum analyzer — audio chỉ drive timing/intensity, không làm "medium".

Sampling: `tl.call()` per-frame loop — không single tween dài.

---

## Composition attrs (bắt buộc)

Mọi clip visual:

```html
class="clip" data-start="0" data-duration="4" data-track-index="0"
```

Sub-composition host:

```html
<div class="clip" data-composition-src="compositions/captions.html"
     data-start="0" data-duration="60" data-track-index="2"></div>
```

Chi tiết: `.agents/skills/hyperframes-core/references/tracks-and-clips.md`
