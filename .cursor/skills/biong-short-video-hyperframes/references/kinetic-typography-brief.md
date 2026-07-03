# Kinetic typography — mindset motion graphics

**Bắt buộc** phase 2. Chuyển tư duy từ **viết tài liệu** sang **thiết kế đồ họa động cho video ngắn** (TikTok/Reels).

---

## Vai trò agent

Đóng vai **Motion Designer** — không phải copywriter hay technical writer.

Trước khi viết bất kỳ beat HTML nào:

1. Invoke `/hyperframes-creative` — đọc `references/video-composition.md`
2. Invoke `/hyperframes-core` — đọc `references/tracks-and-clips.md`
3. Đọc [typography-be-vietnam-pro.md](typography-be-vietnam-pro.md) — Be Vietnam Pro local

---

## Quy tắc scale (1080×1920)

| Element | Min size | Ghi chú |
|---------|----------|---------|
| Headline hero | `clamp(56px, 5.5vw, 80px)` — `.hero` mặc định beats 2–N |
| Headline dài (>8 từ) | `.hero-sm` `clamp(48px, 4.5vw, 64px)` |
| Body / support | 28–42px | Cấm <28px |
| Label / chip | 18–24px | Chỉ metadata phụ |
| Bất kỳ text | <24px | Phải justify — mặc định cấm |

Nguồn: `hyperframes-creative/references/video-composition.md`

---

## Beat pacing (bắt buộc)

- **5s–20s/beat** — mỗi beat trong khoảng này; nếu >20s tách beat, nếu <5s gộp beat
- **Mỗi beat 1 focal point** — 1 số lớn / 1 headline / 1 so sánh
- **Không lặp nội dung** — beat sau phải khác chủ đề/số liệu beat trước

---

## Nội dung beat — hero & support zone

### Cấm

- Đoạn văn >2 dòng liên tục
- Bullet list thuần (`• item • item`)
- Headline nhỏ, căn giữa canvas như slide web
- Một màu nền flat không decor

### Bắt buộc

- **Kinetic typography:** cắt thoại thành **3–5 từ/cụm**; mỗi cụm xuất hiện theo giọng nói
- **Center hero zone** (8–52% cao) — không đặt headline trong caption band
- **GSAP stagger** `0.08–0.12` trên `.word` hoặc `.phrase`
- **Liệt kê / danh sách** → **UI Card** (icon SVG + label ngắn 1–3 từ), stagger cards
- **Mật độ** 8–10 elements/scene — decor, metadata chips, edge accents

---

## Headline hierarchy (bắt buộc)

Beat 1: `.hook-title-text` là text lớn nhất scene.

Beats 2–N:

| Element | Max size |
|---------|----------|
| `.hero` | `clamp(56px, 5.5vw, 80px)` |
| `.hero-sm` | chỉ khi headline >8 từ |
| `.stat-val`, `.focal-large` trong `.ui-card` / `.mockup-body` | `≤ 56px` — dùng `.focal-medium` hoặc `.kw-number` |
| `.card-title` | `36px` |

**Cấm:** stat/mockup số lớn hơn headline (ví dụ `512` 100px > `Công cụ Caveman` 56px).

```css
.content-cluster:has(.hero) .stat-val,
.content-cluster:has(.hero) .focal-large {
  font-size: clamp(44px, 4.5vw, 56px);
}
```

---

## Prompt tham khảo (áp dụng khi rà soát beat HTML)

> Sử dụng skill `/hyperframes-creative` và `/hyperframes-core`, tối ưu toàn bộ phần text trong video cho định dạng ngắn (TikTok/Reels).
>
> Rà soát HTML — **không** để đoạn văn dài hoặc chữ nhỏ. Tăng cỡ chữ chính lên mức đọc rõ trên di động.
>
> **Kinetic typography:** cắt câu thoại; mỗi thời điểm chỉ **3–5 từ** ở vùng hero; GSAP stagger để chữ xuất hiện mượt theo giọng nói.
>
> Đoạn có danh sách → **UI Card** trực quan kèm icon — không văn bản thuần.

---

## Pattern GSAP — phrase stagger

```javascript
const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });

tl.from(".phrase", {
  y: 60,
  opacity: 0,
  scale: 0.85,
  duration: 0.45,
  stagger: 0.1,
  ease: "back.out(1.4)",
}, 0);

// UI cards thay bullet list
tl.from(".info-card", {
  x: -50,
  opacity: 0,
  duration: 0.4,
  stagger: 0.12,
  ease: "power2.out",
}, 0.3);

window.__timelines["beat_1"] = tl;
```

---

## List → UI Card scaffold

```html
<div class="info-card">
  <span class="card-icon" aria-hidden="true">⚡</span>
  <span class="card-label">Tốc độ</span>
</div>
```

- Icon: emoji hoặc inline SVG đơn giản
- Label: 1–3 từ, font 32–40px, bold
- Card: border 2–3px, gradient glow, `border-radius: 16px`

---

## Phân tách caption vs hero kinetic

| Layer | Vùng | Nội dung |
|-------|------|----------|
| Beat HTML | Hero 8–52% | Hook visual, số lớn, cards — kinetic 3–5 từ |
| Caption sub-composition | Band 78–100% | Karaoke sync VO — xem [caption-karaoke-script-sync.md](caption-karaoke-script-sync.md) |

Không trùng vai trò: hero = ý chính visual; caption = verbatim theo giọng nói.

---

## Checklist trước render

- [ ] Đã invoke `/hyperframes-creative` + `/hyperframes-core`
- [ ] Không đoạn văn dài / font <28px body
- [ ] Hero phrases 3–5 từ + stagger
- [ ] Lists → UI cards + icon
- [ ] ≥8 visual elements mỗi scene
- [ ] Layout zones — [layout-9x16-zones.md](layout-9x16-zones.md)
