# Advanced Effects Catalog — Text & Card (v5)

**Đọc kèm:** [text-animation-catalog.md](text-animation-catalog.md) · [card-animation-catalog-v2.md](card-animation-catalog-v2.md) · [keyword-highlighting.md](keyword-highlighting.md)

---

## Animation budget rule

Mỗi beat: **tối đa 1–3 loop animation effects** (không tính static styles: `.kw-*`, `.box-*`, `.focal`).

---

## Text advanced

### Liquid (`.fx-liquid`)

```css
.fx-liquid { filter: blur(0) contrast(1); }
```

```javascript
tl.to(".fx-liquid", { filter: "blur(3px) contrast(1.5)", scale: 1.05, duration: 2, repeat: r(2), yoyo: true }, 0.8);
```

### SVG path (`.fx-svg-path`)

Stroke outline → fill animation via `clip-path` on `::after`.

```javascript
function svgPathText(text) {
  return `<span class="fx-svg-path" data-text="${plain}">${hk(text)}</span>`;
}
```

### Particle text (`.fx-particle-text`)

```javascript
function particleText(text) {
  // split into .particle-char spans
}
tl.to(".particle-char", { x: "random(-20,20)", y: "random(-15,15)", ... }, 1.2);
```

---

## Card advanced

### Warp (`.fx-warp`)

```javascript
tl.to(".fx-warp", { rotateX: 2, rotateY: 3, duration: 3.5, repeat: r(3.5), yoyo: true }, 0.9);
```

### Liquid card (`.fx-liquid-card`)

Bubbles via `::before`/`::after` + CSS variables `--bubble1-x`, `--bubble2-x`.

### Glass refraction (`.fx-glass-refract`)

`backdrop-filter: blur(12px)` + moving radial highlight `--refract-x/y`.

---

## Focal point system

| Priority | Detect | Gradient |
|----------|--------|----------|
| 1 | Số (`65–75%`, `512`, `10×`) | `.focal-gradient-2` orange/yellow |
| 2 | Công ty (`OpenAI`, `Sam Altman`) | `.focal-gradient-3` pink/cyan |
| 3 | Keyword action/tech | `.focal-gradient-1` cyan/purple |

| Size class | Chars | Font | Zone |
|------------|-------|------|------|
| `.focal-large` | ≤10 | 80–100px | **Headline `.hero` only** |
| `.focal-medium` | 11–20 | 60–80px | Hero hoặc stat card capped |
| `.focal-small` | >20 | 50–65px | Support |

**Cấm** `.focal-large` + `.focal-gradient-*` trong `.mockup-body`, `.card-body`, `.ui-card`, `.quote-box` — dùng solid `.kw-number` / `.kw-tech`.

```javascript
function autoFocal(text) { /* auto size + gradient */ }
```

---

## Breathing

| Class | Cycle | Use |
|-------|-------|-----|
| `.fx-breathe` | 4s | Cards |
| `.fx-breathe-slow` | 6s | Mockup |
| `.fx-breathe-text` | 5s | Hero/CTA |

Scale only 1→1.05 — không opacity fade.

---

## Anti-patterns (v5)

| Sai | Đúng |
|-----|------|
| Marquee trong quote-box | Static `hk()` text |
| Border gradient lấp fill | `padding-box` + `--bg-color` |
| Hero 3 dòng tách div | 1 `.hero` auto-wrap |
| Flip card không radius | `border-radius:22px` + `overflow:hidden` |
| >3 loop fx/beat | Tier attention + ambient mix |
