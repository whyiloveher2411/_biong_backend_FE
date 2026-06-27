# Blank frame audit — tránh khung trống / mất chữ khi render

**Bắt buộc** phase 2 trước `hyperframes render`. Blank frames và caption biến mất thường do **timeline GSAP lệch beat**, font chưa nạp, hoặc stock video sparse keyframe — không phải lỗi ngẫu nhiên của Chromium.

Invoke `/hyperframes-cli` + `/hyperframes-core` theo quy trình 3 bước dưới.

---

## Bước 1 — Audit CLI

Chạy trong thư mục project render:

```bash
cd storage/agent-renders/{id}/my-video

# 1. Cấu trúc: track overlap, timeline chưa đăng ký, media thiếu id
npx hyperframes lint

# 2. Layout theo timeline: text bị che, tràn, biến mất ở mốc thời gian cố định
npx hyperframes inspect --json
npx hyperframes inspect --samples 15    # sweep dày hơn nếu nghi caption

# 3. Dead zone animation (khoảng trống không motion >1.5s)
node .agents/skills/hyperframes-animation/scripts/animation-map.mjs .
```

**Quality gate:** `lint` phải **0 errors** trước render final. `inspect` errors (text clipped/off-canvas) phải sửa trước `--quality high`.

---

## Bước 2 — Vá code theo `/hyperframes-core` + `/hyperframes-animation`

| Triệu chứng | Quy tắc sửa | Nguồn |
|-------------|-------------|-------|
| Beat 2+ trống, hero không hiện | Chọn **một** timeline pattern (A hoặc B) — **cấm pattern C** | Bảng dưới; `determinism-rules.md` |
| Chữ nhấp nháy / mất 1–2 frame đầu beat | `tl.fromTo()` thay `tl.from()` trong `.clip` scene | `hyperframes-animation/adapters/gsap-timeline-and-labels.md` |
| Caption biến mất giữa video | Text từ `audio_script` + `fill-timings.cjs` — cấm map tỷ lệ thô | [caption-karaoke-script-sync.md](caption-karaoke-script-sync.md) |
| Stock video đứng hình / freeze | Re-encode keyframe dày trước embed | [media-mcp-activation.md](media-mcp-activation.md) |
| Khung trống do font | Cấm `fonts.googleapis.com`; dùng `sans-serif` hoặc `@font-face` local | `hyperframes lint` rule `google_fonts_import` |

### Timeline pattern — bắt buộc chọn một

| Pattern | Khi nào | GSAP |
|---------|---------|------|
| **A — Single main** (khuyến nghị inline beats) | Mọi beat trong `index.html`; **không** `data-composition-id` từng `<section>` | Một `window.__timelines["main"]`; tween times = **global** (giây từ 0). Tham chiếu: video agent #9 |
| **B — Sub-composition per beat** | Mỗi beat là `compositions/beat_N.html` mount qua `data-composition-src` | Mỗi file: `window.__timelines["beat_N"]`; tween times = **local 0-based** (bắt đầu từ 0 trong beat) |

**Cấm — Pattern C (nguyên nhân phổ biến blank frames):**

- Inline `<section>` có `data-composition-id="beat_N"` **và** timeline riêng `window.__timelines["beat_N"]`
- Nhưng tween dùng thời gian **global** (vd. `6.15`, `14.65`) trong timeline **local**

Khi renderer seek beat tại local t≈1s, tweens vẫn ở trạng thái `from()` ban đầu (opacity 0) → **khung trống**.

### HyperFrames contract (nhắc lại)

```javascript
window.__timelines = window.__timelines || {};
const tl = gsap.timeline({ paused: true });

// Pattern A: mọi beat trên cùng timeline, times global
tl.fromTo(".b2-p1", { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45 }, 6.3);

window.__timelines["main"] = tl; // key = data-composition-id trên #root
```

- `paused: true` — **cấm** `tl.play()`
- Registry key = `data-composition-id` trên composition root
- Duration clip từ `data-duration` — **không** pad timeline rỗng

---

## Bước 3 — Render an toàn

### Iteration (debug local)

```bash
npx hyperframes render --quality draft --output debug.mp4
```

Chỉ dùng để test nhanh — **cấm upload** bản draft lên CMS.

### Final delivery

```bash
npx hyperframes render --output output.mp4 --quality high --fps 30 --strict
```

Composition nặng (nhiều video / asset lớn):

```bash
npx hyperframes render --output output.mp4 --quality high --fps 30 \
  --player-ready-timeout=60000 \
  --browser-timeout=120
```

### Không dùng `hyperframes.start({ delay: 500 })`

API `hyperframes.start({ delay })` **không tồn tại** trong HyperFrames CLI. Thay vào đó:

| Mục đích | Flag CLI |
|----------|----------|
| Đợi player/fonts/assets sẵn sàng | `--player-ready-timeout=<ms>` (mặc định 45000) |
| HTML nặng, chậm domcontentloaded | `--browser-timeout=<sec>` (mặc định 60) |
| Fail nếu lint còn lỗi | `--strict` |

---

## Checklist nhanh

- [ ] `lint` 0 errors
- [ ] `inspect` không có text clipped / missing ở caption band
- [ ] Timeline pattern A **hoặc** B — **không** pattern C
- [ ] Entrance trong `.clip` dùng `fromTo` (không chỉ `from`)
- [ ] Stock video đã re-encode nếu lint báo `sparse keyframes`
- [ ] Không Google Fonts — local `@font-face` hoặc system stack
- [ ] `animation-map.mjs` — dead zone ≤ 1.5s
- [ ] Draft chỉ debug; upload CMS = `--quality high`

---

## Đọc kèm

- [gsap-beat-checklist.md](gsap-beat-checklist.md) — timeline pattern chi tiết
- [hyperframes-skill-routing.md](hyperframes-skill-routing.md) — post-author audit
- [motion-complexity-activation.md](motion-complexity-activation.md) — pre-render audit
- `.agents/skills/hyperframes-core/references/determinism-rules.md`
- `.agents/skills/hyperframes-cli/SKILL.md` — lint, inspect, render flags
