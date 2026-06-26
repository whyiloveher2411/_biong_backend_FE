# Layout 9:16 — Agent short video (1080×1920)

Quy tắc bắt buộc phase 2. Mục tiêu: **nội dung chính top-center**, **caption chỉ ở band dưới**, không đè diagram/CTA.

Canvas mặc định: **1080×1920** (portrait TikTok/Reels).

---

## Vùng canvas

```
+----------------------------------+
|  Top chrome (optional)     y 0   |
|  +----------------------------+  |
|  | HERO 8%–52% (~154–998px)   |  |  ← headline, hook, số chính
|  | anchor top-center          |  |
|  +----------------------------+  |
|  | SUPPORT 52%–78%            |  |  ← diagram, flow, chips phụ
|  | (~998–1498px)              |  |
|  +----------------------------+  |
|  | CAPTION BAND 78%–100%      |  |  ← CHỈ karaoke/caption rail
|  | (~1498–1920) HARD          |  |
+----------------------------------+
```

| Vùng | % cao | px (1920h) | Nội dung |
|------|-------|------------|----------|
| Hero | 8–52% | 154–998 | Headline, hook, stat chính, CTA text lớn |
| Support | 52–78% | 998–1498 | Sơ đồ, mũi tên flow, badge, metadata |
| Caption | 78–100% | 1498–1920 | **Chỉ** `compositions/captions.html` hoặc registry caption |

Hero anchor portrait: **y ≈ 0.42 × height** (~806px) — không dùng midpoint canvas (960px) khi có caption.

---

## Quy tắc cứng

1. **Cấm** `justify-content: center` hoặc `flex-end` trên **root scene** khi có caption — dùng `flex-start` + padding-top.
2. **Cấm** đặt diagram/flow/CTA trong caption band (bottom 320px).
3. **Cấm** headline chính trong support zone hoặc caption band.
4. Caption sub-composition **tách file** — không nhúng karaoke inline trong beat HTML cùng layer diagram.
5. Preflight: mọi `.clip` nội dung (trừ caption) có `bottom` edge **≥ 320px** từ đáy canvas (hoặc nằm trong hero+support qua padding).

---

## CSS scaffold (copy vào mỗi beat)

```css
.scene-root {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  height: 100%;
  padding: 140px 80px 340px; /* bottom = caption keep-out ~17% */
  box-sizing: border-box;
}

.hero-block {
  flex: 0 0 auto;
  width: 100%;
  max-height: 44%; /* ~844px — stays in hero zone */
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.support-block {
  flex: 1 1 auto;
  width: 100%;
  max-height: 26%; /* support zone only */
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 24px;
}

/* Background/ambient layers may be position:absolute full-bleed */
```

---

## Caption keep-out

- Band cao **~320px** (17% của 1920).
- Dùng `npx hyperframes add caption-highlight` / `caption-pill-karaoke` → sub-composition riêng.
- Beat HTML: `padding-bottom: 340px` minimum để content không tràn xuống band.

---

## Anti-patterns (gây overlap như frame lỗi)

| Sai | Đúng |
|-----|------|
| Diagram + caption cùng bottom 30% | Diagram ở support zone; caption ở band riêng |
| Toàn scene `justify-content: center` | `flex-start` + hero top-center |
| Headline ở giữa dọc canvas | Headline top 15–25% |
| Karaoke inline trong beat HTML | `compositions/captions.html` overlay |

---

## Tham khảo

- `product-launch-video/references/composition.md` — portrait zones
- `hyperframes-creative/references/video-composition.md` — density, scale
- Skill: `gsap-beat-checklist.md` — animation mỗi slide
