# Motion complexity activation — ép agent không làm video "an toàn"

AI agent mặc định sinh HTML/CSS tối giản (text + đổi nền). **Bắt buộc** đọc file này phase 2 trước khi viết beat HTML.

---

## Vai trò bắt buộc

Đóng vai **Senior Motion Graphics** — video phải **dynamic, cinematic**, không slide PowerPoint.

---

## 1. Registry blocks (ưu tiên — không tự viết từ đầu)

Trong thư mục project render, cài block từ HyperFrames registry:

```bash
cd storage/agent-renders/{id}/my-video
npx hyperframes add caption-pill-karaoke
npx hyperframes add caption-kinetic-slam
npx hyperframes add caption-highlight
# Transitions / VFX — chọn theo beat map:
npx hyperframes add <block-name>   # xem registry: hyperframes-registry skill
```

Browse catalog: `curl -s https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry/registry.json`

**Luật:** Dùng block đã install cho caption, transition shader, social overlay — customize in-place, không reinvent.

Skill: `/hyperframes-registry` — `references/wiring-blocks.md`

---

## 2. Easing — cấm linear

| Cấm | Bắt buộc |
|-----|----------|
| `ease: "none"` cho entrance (trừ progress fill) | `power3.out`, `power2.out` |
| Mọi element cùng tween | `back.out(1.7)` punch, `elastic.out(1, 0.3)` UI accent |
| `linear` / không khai báo ease | Stagger `0.08–0.12` cho lists, words, cards |

---

## 3. Stagger + chiều sâu 3D

- Nhóm text/cards/chips: **không** xuất hiện cùng lúc — `stagger: 0.1` (hoặc per-char `.word`)
- Depth: `from({ scale: 0.8 })` → 1, `rotation: 5` hoặc `-5` nhẹ trên accent
- Exit blur (decorative): `filter: blur(8px)` + `opacity: 0` — chỉ transform trên clip chính
- Ambient: glow orb `yoyo` finite, gradient border pulse

---

## 4. Palette cinematic (dark premium)

- Nền: dark mode premium — `neon-electric` / `bold-energetic` / `jewel-rich`
- Accent: gradient border glow (`box-shadow` + `border-image` linear-gradient)
- **Không** một màu flat `#333` / `#fff` cả scene
- Foreground density: 8–10 elements, metadata chips, edge-anchored decor (xem `hyperframes-creative/video-composition.md`)

---

## 5. Timeline sync — tránh video "đứng hình"

### GSAP registry (bắt buộc mỗi sub-composition)

```javascript
window.__timelines = window.__timelines || {};
const tl = gsap.timeline({ paused: true });
// ... tweens ...
window.__timelines["beat_1"] = tl; // key === data-composition-id trên root
```

- **Không** `tl.play()`
- **Không** pad timeline rỗng — duration từ `data-duration` trên root

### Khớp audio

| Vấn đề | Fix |
|--------|-----|
| Animation xong sớm, frame đứng chờ VO | `data-duration` beat = word timestamps đến beat tiếp theo |
| Timeline ngắn hơn clip | `data-duration` host ≥ GSAP active range; ambient loop finite trong window |
| Caption lệch | `embedded-captions` + transcribe word-level |

Preflight: `animation-map.mjs` — kiểm tra dead zones (khoảng trống không motion).

---

## 6. Render chất lượng cao (final)

```bash
# Preview / iterate
npx hyperframes render --quality draft

# Final delivery — BẮT BUỘC trước upload_agent_video
npx hyperframes render --output output.mp4 --quality high --fps 30
```

Portrait 9:16: đảm bảo `hyperframes.json` / composition root = 1080×1920.

**Cấm** upload MP4 render ở `--quality draft` làm bản final.

---

## Checklist trước render

- [ ] ≥1 registry block wired (caption hoặc transition)
- [ ] Không entrance dùng `ease: "none"` / linear
- [ ] Stagger trên ≥1 nhóm mỗi beat
- [ ] `window.__timelines` đăng ký đúng id mỗi beat
- [ ] `data-duration` khớp audio beat
- [ ] `animation-map.mjs` — không dead zone > 1.5s
- [ ] Render `--quality high`
