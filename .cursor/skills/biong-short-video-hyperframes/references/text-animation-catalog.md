# Text Animation Catalog — loop + auto-play

**Đọc kèm:** [keyword-highlighting.md](keyword-highlighting.md) · [foreground-continuous-motion.md](foreground-continuous-motion.md)

---

## 5 effect patterns

| Class | Mô tả | Element | Chu kỳ |
|-------|-------|---------|--------|
| `.fx-marquee` | Chạy chữ ngang liên tục | Quote dài, banner | 8s |
| `.fx-carousel` + `.fx-carousel-word` | Đổi từ khóa fade/slide | Headline rotating keywords | 6s |
| `.fx-wave` + `.char` | Sóng chữ sine bob | Hero title, stat label | 1.5s stagger |
| `.fx-neon` | Neon flicker text-shadow | CTA, accent keywords | 2s + delay 1.5s |
| `.fx-glitch` + `data-text` | Glitch cyberpunk | Tech terms, AI keywords | 0.8s CSS |

**Keyword background:** `.kw-bg` trên `.kw-*` — padding + tinted background để nổi bật.

---

## Implementation

### Marquee

```html
<div class="marquee-wrap">
  <div class="fx-marquee">Text · Text</div>
</div>
```

```javascript
tl.to(".fx-marquee", { x: "-=50%", duration: 8, repeat: r(8), ease: "none" }, 0);
```

### Carousel

```html
<span class="fx-carousel">
  <span class="fx-carousel-word" style="opacity:1">Word A</span>
  <span class="fx-carousel-word" style="opacity:0">Word B</span>
</span>
```

GSAP timeline trong `loopMotion` — fade out current, slide in next.

### Sine wave

Wrap từng ký tự: `<span class="char">A</span>`

```javascript
gsap.utils.toArray(".fx-wave .char").forEach((char, i) => {
  tl.to(char, { y: "+=12", duration: 1.5, repeat: r(1.5), yoyo: true, ease: "sine.inOut" }, i * 0.08);
});
```

### Neon flicker

**Chỉ animate `textShadow`** — cấm opacity trong loop (làm mờ nội dung).

```css
.fx-neon { text-shadow: 0 0 10px currentColor, 0 0 20px currentColor; }
```

### Glitch

```html
<span class="fx-glitch" data-text="Plain text">Highlighted HTML</span>
```

Pseudo `::before` / `::after` dùng `content: attr(data-text)`.

---

## Distribution rules

| Beat type | Text effects |
|-----------|--------------|
| Hook (1) | `.fx-wave` hero + `.fx-neon` chip |
| Agitate (2–3) | `.kw-bg` headline + `.fx-marquee` quote |
| Solve (4–5) | `.fx-glitch` tech + `.fx-wave` stat label |
| Twist/Insight (6–8) | `.fx-carousel` keywords |
| CTA (9) | `.fx-neon` + `.fx-wave` hero |

Mỗi beat: **≥2** text effect types.

---

## Anti-patterns

| Sai | Đúng |
|-----|------|
| Opacity yoyo trên text content trong loop | Chỉ textShadow / transform |
| Marquee trên headline ngắn | Marquee cho quote ≥40 ký tự |
| **Marquee trong quote-box** | **Cấm** — nội dung bị cắt/mất |
| Glitch trên toàn bộ paragraph | Glitch 1–3 từ tech |
| Carousel >5 từ | Carousel 2–4 từ ngắn |

---

## Accessibility

Effects decorative — base text phải đọc được khi tắt animation. Không dùng opacity < 0.85 trên readable content.

---

## Advanced text effects (v5)

| Class | Mô tả | Kỹ thuật |
|-------|-------|----------|
| `.fx-liquid` | Chữ tan chảy nhẹ | `filter: blur() contrast()` + GSAP yoyo |
| `.fx-svg-path` | Viền chữ vẽ rồi fill | `text-stroke` + `clip-path` animation |
| `.fx-particle-text` + `.particle-char` | Hạt chữ scatter/gather | GSAP stagger random x/y |

**Focal point (static, không tính animation budget):**

| Class | Mô tả |
|-------|-------|
| `.focal` + `.focal-large/medium/small` | 50–100px adaptive |
| `.focal-gradient-1/2/3` | Gradient text fill |
| `autoFocal(text)` | Auto-detect số > công ty > keyword |

Mỗi beat **1 focal point** — số hoặc keyword quan trọng nhất.
