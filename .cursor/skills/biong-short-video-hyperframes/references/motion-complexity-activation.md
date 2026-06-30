# Motion complexity activation — ép agent không làm video "an toàn"

AI agent mặc định sinh HTML/CSS tối giản (text + đổi nền). **Bắt buộc** đọc file này phase 2 trước khi viết beat HTML.

---

## Vai trò bắt buộc

Đóng vai **Senior Motion Graphics** — video phải **dynamic, cinematic**, không slide PowerPoint.

---

## Mindset shift — từ văn bản sang motion graphics

**Đọc bắt buộc:** [kinetic-typography-brief.md](kinetic-typography-brief.md)

- Invoke `/hyperframes-creative` + `/hyperframes-core` **trước** viết beat HTML
- Cấm đoạn văn dài / font web-size — headline 64–120px, body ≥28px
- Thoại hero: **3–5 từ/cụm**, GSAP stagger; list → UI Card + icon
- Caption karaoke: [caption-karaoke-script-sync.md](caption-karaoke-script-sync.md) — text script, timing Whisper, host z-index **9000**
- Watermark: [spacedev-brand-watermark.md](spacedev-brand-watermark.md) — host z-index **9500**, suốt video
- Font: [typography-be-vietnam-pro.md](typography-be-vietnam-pro.md) — Be Vietnam Pro local
- Viral pacing: [viral-retention-structure.md](viral-retention-structure.md) — beat visual content-driven, không theo HASCAS
- Đọc kèm: [visual-layout-archetypes.md](visual-layout-archetypes.md) — **bắt buộc mỗi beat**
- Giphy accent: [giphy-accent-format.md](giphy-accent-format.md) — **cấm MP4 sticker (ô trắng)**
- Fixture test ≠ template: [fixtures-not-production-templates.md](fixtures-not-production-templates.md)
- Layout căn giữa: [layout-9x16-zones.md](layout-9x16-zones.md) — `.content-cluster` gom hero + support **căn giữa dọc**
- Overlay stack: [overlay-layer-stack.md](overlay-layer-stack.md) — **data-track-index ≠ z-order**
- Preflight: `/biong-short-video-preflight` trước render final

---

## 1. Registry blocks (ưu tiên — không tự viết từ đầu)

**Đọc:** [visual-shot-plan.md](visual-shot-plan.md) — hero block theo shot-plan, không chỉ caption.

Trong thư mục project render, cài block từ HyperFrames registry:

```bash
cd storage/agent-renders/{id}/my-video
npx hyperframes add caption-pill-karaoke
npx hyperframes add caption-kinetic-slam
# Hero UI theo visual_shot_plan:
npx hyperframes add data-chart      # số liệu
npx hyperframes add flowchart       # quy trình
npx hyperframes add stat-motion     # stat counter
# Transitions giữa beat:
npx hyperframes add domain-warp-dissolve
# Ambient components:
npx hyperframes add grain-overlay
npx hyperframes add shimmer-sweep
```

Browse catalog: `agent/skills/motion-graphics/catalog-map.md` + registry.json

**Luật:** ≥2 **non-caption** registry block mỗi video. Customize in-place theo `visual_shot_plan.customize`. **Cấm** ship "1 headline + 1 nền gradient".

---

## Render stack bắt buộc mỗi beat

Chọn **≥2** trong: registry block · GSAP choreography · Lottie · Giphy accent · Three.js/WebGL · shader transition.

Ghi trong `render_stack[]` của shot-plan. Đọc [visual-layout-archetypes.md](visual-layout-archetypes.md).

| Cấm | Bắt buộc |
|-----|----------|
| Echo `phrase_anchor` lên nền | `visual_story` mô tả layout riêng |
| Một archetype cả video | ≥3 archetype unique (video ≥60s) |
| Chỉ caption-* registry | data-chart, flowchart, stat-motion, code-3d-extrude… |

Three.js: scene nhẹ 9:16, `paused: true`, Pattern B `window.__timelines["beat_N"]`. Tham chiếu `.agents/skills/hyperframes/references/narration.md`.

Skill: `/hyperframes-registry` + `/motion-graphics` · `/continuous-motion` cho ambient layer

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

### Dual-timeline (bắt buộc Phase 2)

Invoke `/continuous-motion` — chi tiết: [continuous-motion-patterns.md](continuous-motion-patterns.md)

| Timeline | Key | repeat | Vai trò |
|----------|-----|--------|---------|
| Beat-synced | `main` (hoặc `beat_N`) | **không** | Entrance/exit theo beat-map |
| Ambient | `ambient` | **-1** | Parallax, breathe, grain — suốt video |

```javascript
window.__timelines["main"] = gsap.timeline({ paused: true });
window.__timelines["ambient"] = gsap.timeline({ paused: true, repeat: -1 });
```

Host: `compositions/ambient-layer.html` — z-index 6–10. Preflight: `check-continuous-motion.mjs`.

### GSAP registry (bắt buộc)

**Pattern A (inline beats — khuyến nghị):**

```javascript
window.__timelines = window.__timelines || {};
const tl = gsap.timeline({ paused: true });
// ... tweens với global times ...
window.__timelines["main"] = tl; // key === data-composition-id trên #root
```

**Pattern B (sub-composition per beat):**

```javascript
window.__timelines["beat_1"] = tl; // key === data-composition-id trong compositions/beat_1.html
// tween times = local 0-based trong file đó
```

**Cấm Pattern C** — xem [blank-frame-audit.md](blank-frame-audit.md).

- **Không** `tl.play()`
- **Không** pad timeline rỗng — duration từ `data-duration` trên root
- Entrance trong `.clip`: dùng **`fromTo`** thay `from`

### Khớp audio

| Vấn đề | Fix |
|--------|-----|
| Animation xong sớm, frame đứng chờ VO | `data-start`/`data-duration` beat theo `assets/beat-map.json` (từ `map-shot-plan-to-beat-map.mjs`) |
| Timeline ngắn hơn clip | `data-duration` host ≥ GSAP active range; tổng beat ≈ `totalVideoSec` |
| Caption lệch | `transcribe-audio.mjs` → sync pipeline; verify `--strict` (positional ≤15%) |

Preflight: `check-beat-timing.mjs` + `check-continuous-motion.mjs` + `animation-map.mjs` — dead zone >1.5s chỉ pass nếu có ambient layer.

### Pacing đồn dập (internal acts)

- Beat duration ≥6s: **bắt buộc** ≥2 `internal_acts` trong shot-plan **hoặc** ≥2 `tl.addLabel()` trong beat HTML — [visual-shot-plan.md](visual-shot-plan.md)
- Mỗi beat ≥1 **layout shift**: hero swap, stagger wave, camera push (`scale 0.92→1`), shader transition
- Stat beat: **bắt buộc** `stat-motion` / `apple-money-count` — **cấm** plain `<div>` số liệu
- Meme/logo: `rotation: 3`, `ease: "back.out(1.7)"`
- `visual_enrichment[]`: facts ngắn từ brief **không** cần nằm trong VO — badge ≥32px
- Max ~8–12s một layout world — sau đó beat mới hoặc thêm internal acts
- Micro-motion: không frame tĩnh >2s giữa tween (trừ ambient cover)

---

## Pre-render audit (bắt buộc)

Invoke `/hyperframes-cli` — chi tiết: [blank-frame-audit.md](blank-frame-audit.md)

```bash
cd storage/agent-renders/{id}/my-video
npx hyperframes lint                    # 0 errors
npx hyperframes inspect --json          # caption/text không biến mất
node .agents/skills/hyperframes-animation/scripts/animation-map.mjs .
```

Anti-pattern audit:

- Timeline Pattern C (inline beat + global times) → blank frames
- Google Fonts CDN → font blank frame lúc render
- Stock Pexels chưa re-encode → sparse keyframe freeze — xem [media-mcp-activation.md](media-mcp-activation.md)

---

## 6. Render chất lượng cao (final)

```bash
# Preview / iterate — chỉ debug local, KHÔNG upload CMS
npx hyperframes render --quality draft --output debug.mp4

# Final delivery — BẮT BUỘC trước upload_agent_video
npx hyperframes render --output output.mp4 --quality high --fps 30 --strict
```

Composition nặng: thêm `--player-ready-timeout=60000` (không dùng `hyperframes.start({ delay })` — không phải CLI API).

Portrait 9:16: đảm bảo composition root = 1080×1920.

**Cấm** upload MP4 render ở `--quality draft` làm bản final.

---

## Checklist trước render

- [ ] Caption karaoke wired — text từ `audio_script`, timing transcript
- [ ] Watermark Spacedev góc trên trái — suốt `totalVideoSec`
- [ ] Theme init + canvas 3 lớp — [hyperframes-theme-init.md](hyperframes-theme-init.md) · [canvas-contract-3-layer.md](canvas-contract-3-layer.md)
- [ ] `check-typography-spacing.mjs` exit 0
- [ ] Beat ≥6s có ≥2 internal acts hoặc GSAP labels
- [ ] ≥2 registry block khác tên wired (caption **và** ≥2 non-caption hero)
- [ ] `window.__timelines["ambient"]` + ambient-layer host z 6–10
- [ ] `check-continuous-motion.mjs` exit 0
- [ ] Không entrance dùng `ease: "none"` / linear
- [ ] Stagger trên ≥1 nhóm mỗi beat
- [ ] Timeline pattern A hoặc B — **không** pattern C
- [ ] `window.__timelines` đăng ký đúng id (main hoặc beat_N)
- [ ] `data-duration` khớp audio beat
- [ ] `lint` 0 errors + `inspect` pass caption band
- [ ] `animation-map.mjs` — không dead zone > 1.5s
- [ ] Render `--quality high --strict`
