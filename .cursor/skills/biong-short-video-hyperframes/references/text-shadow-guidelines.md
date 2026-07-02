# Text Shadow Guidelines — Depth & Contrast

**Đọc kèm:** [typography-be-vietnam-pro.md](typography-be-vietnam-pro.md) · [canvas-contract-3-layer.md](canvas-contract-3-layer.md)

---

## Tiered shadow system

| Element | Font size | Text-shadow |
|---------|-----------|-------------|
| Hero/Headline (`.hero`, `.hero-sm`) | ≥48px | `0 3px 8px rgba(0,0,0,0.75), 0 1px 3px rgba(0,0,0,0.9)` |
| Focal (`.focal-*`) | ≥50px | `0 2px 6px rgba(0,0,0,0.7), 0 1px 2px rgba(0,0,0,0.85)` |
| Card title (`.card-title`) | 36px | `0 2px 5px rgba(0,0,0,0.6)` |
| Body text (`.card-body`, `.quote-box`) | 28px | `0 1px 3px rgba(0,0,0,0.5)` |
| Small text (`.badge`, `.context-chip`) | ≤28px | `0 1px 2px rgba(0,0,0,0.4)` |

---

## Implementation

Copy `assets/global-default-styles.css` khi bootstrap — hoặc inline CSS beat templates sau typography styles:

```css
.hero, .hero-sm {
  text-shadow: 0 3px 8px rgba(0,0,0,0.75), 0 1px 3px rgba(0,0,0,0.9);
}
.focal, .focal-large, .focal-medium, .focal-small {
  text-shadow: 0 2px 6px rgba(0,0,0,0.7), 0 1px 2px rgba(0,0,0,0.85);
}
.card-title {
  text-shadow: 0 2px 5px rgba(0,0,0,0.6);
}
.card-body, .card-detail, .quote-box {
  text-shadow: 0 1px 3px rgba(0,0,0,0.5);
}
.badge, .company-chip, .context-chip {
  text-shadow: 0 1px 2px rgba(0,0,0,0.4);
}
```

---

## Anti-patterns

| Sai | Đúng |
|-----|------|
| Không shadow trên hero trên stock video | Tiered shadow theo font size |
| Cùng shadow đậm cho body 28px | Body nhẹ hơn hero |
| `filter: drop-shadow` trên gradient text | `text-shadow` trên `.focal` wrapper hoặc parent |
