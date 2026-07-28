# Layout 16:9 — Agent short video (1920×1080)

Quy tắc bắt buộc phase 2 khi `agent_clip_aspect = 16:9`. Mục tiêu: **nội dung chính gom cụm ở giữa ngang**, caption chỉ ở band dưới.

Canvas: **1920×1080** (landscape YouTube / Facebook video ngang).

---

## Nguyên tắc cốt lõi — CONTENT CLUSTER (căn giữa)

**Hero + support phải nằm trong MỘT cụm**, căn giữa theo chiều dọc của vùng an toàn (trên caption band).

```
+----------------------------------------------------------+
|  (padding top ~48px)                                     |
|                                                          |
|        ┌──────────────────────────────┐                  |
|        │  HERO (stat/headline)        │                  |
|        │  gap 16–24px                 │  ← content-cluster
|        │  SUPPORT (chart/flow)        │                  |
|        └──────────────────────────────┘                  |
|              ↑ tâm cụm ≈ y 45–50%                        |
|                                                          |
|  CAPTION band ~120px (karaoke only)                      |
+----------------------------------------------------------+
```

| Vùng | px (1080h) | Nội dung |
|------|------------|----------|
| Safe content | 48–960 | **Toàn bộ** `.content-cluster` |
| Caption | 960–1080 | Chỉ `compositions/captions.html` |

**Padding ngang:** x = 64–1856 (mỗi bên 64px).

---

## Cấu trúc HTML bắt buộc

Giống 9:16 — dùng `.content-cluster` + `.hero-block` / `.support-block`.

**Ưu tiên layout ngang:**
- `stack_center` — headline trên, visual dưới (mặc định)
- `vs_row` — so sánh A vs B cùng hàng
- **Cấm** chia màn hình dọc kiểu mobile portrait trên canvas ngang

---

## Scaffold CSS (bắt buộc)

```css
#stage { width: 1920px; height: 1080px; }
.content-area {
  top: 48px; right: 64px; bottom: 120px; left: 64px;
}
.bg-layer { position: absolute; inset: 0; z-index: 0; }
```

---

## Caption / karaoke band

- Band dưới **~120px** — nhỏ hơn 9:16 vì UI YouTube/Facebook ngang ít che hơn TikTok dọc.
- Beat HTML **không** render karaoke — band vẫn trống content.

---

## Anti-patterns trên 16:9

| Anti-pattern | Vì sao |
|--------------|--------|
| Copy layout dọc 9:16 (headline top, tall stack) | Lãng phí không gian ngang |
| Text micro-size vì co từ canvas dọc | Không đọc được trên TV/desktop |
| PiP avatar che headline center | Avatar PiP đặt góc, không center |
