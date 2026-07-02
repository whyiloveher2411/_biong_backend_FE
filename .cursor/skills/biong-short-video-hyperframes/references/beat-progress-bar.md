# Beat Progress Bar — thanh tiến trình trên đầu

**Đọc kèm:** [overlay-layer-stack.md](overlay-layer-stack.md) · [visual-layout-archetypes.md](visual-layout-archetypes.md)

---

## Bắt buộc

- **Một host duy nhất** trong `index.html` — `z-index: 8990` (dưới caption 9000, trên beat content)
- Fill chạy **liên tục** `0% → 100%` theo `totalVideoSec` qua `window.__timelines["main"]`
- **Track trong suốt** — chỉ thấy phần đã chạy (fill), không nền xám phần chưa chạy
- **Cấm** `.header-badge` / `#N/9` trong beat HTML
- **Cấm** `.section-label` (HOOK/AGITATE/SOLVE)

---

## CSS

```css
.beat-progress-host {
  position: absolute;
  top: 0;
  left: 0;
  width: 1080px;
  height: 4px;
  z-index: 8990;
  pointer-events: none;
}
.beat-progress-track {
  width: 100%;
  height: 100%;
  background: transparent;
}
.beat-progress-fill {
  width: 0%;
  height: 100%;
  background: linear-gradient(90deg, #00d9ff, #ffd60a, #ff6b35);
  border-radius: 0 2px 2px 0;
}
```

---

## Wire `index.html`

```html
<div class="beat-progress-host" style="position:absolute;top:0;left:0;width:1080px;height:4px;z-index:8990;pointer-events:none">
  <div class="beat-progress-track" style="width:100%;height:100%;background:transparent">
    <div class="beat-progress-fill" style="width:0%;height:100%;background:linear-gradient(90deg,#00d9ff,#ffd60a,#ff6b35)"></div>
  </div>
</div>
```

```javascript
const mainTl = window.__timelines["main"] || gsap.timeline({ paused: true });
mainTl.to(".beat-progress-fill", { width: "100%", duration: totalVideoSec, ease: "none" }, 0);
window.__timelines["main"] = mainTl;
```

---

## Anti-patterns

| Sai | Đúng |
|-----|------|
| `#3/9` badge trong beat | Global progress bar |
| Track `rgba(255,255,255,.12)` | `background: transparent` |
| height 10px+ | **4px** mỏng |
| Progress per-beat nhảy cục | Continuous fill theo thời gian |
