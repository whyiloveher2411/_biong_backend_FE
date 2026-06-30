# Visual Layout Archetypes — catalog Phase 2

Agent **bắt buộc** chọn `layout_archetype` cho mỗi beat trong `visual_shot_plan`. Mỗi beat = **một layout world riêng** — không lặp >2 beat liên tiếp cùng archetype.

**Cấm:** chỉ hiện `phrase_anchor` dạng text trên nền gradient.

**Đọc kèm:** [visual-shot-plan.md](visual-shot-plan.md) · [motion-complexity-activation.md](motion-complexity-activation.md) · [catalog-map.md](../../../../agent/skills/motion-graphics/catalog-map.md)

---

## Render stack (mỗi beat)

Chọn **≥2** trong:

| Token | Khi dùng |
|-------|----------|
| `registry:<block>` | `npx hyperframes add` + customize in-place |
| `gsap` | Timeline paused, stagger, 3D depth |
| `lottie` | Accent vector từ `assets/lotties/` |
| `giphy` | Sticker reaction qua MCP |
| `threejs` | Hero 3D nhẹ, particle field, code extrude |
| `shader` | Transition registry: domain-warp, whip-pan, sdf-iris |

Ghi trong `render_stack[]` của shot-plan entry.

---

## Archetype catalog

### `kinetic_hook_slam`

| | |
|--|--|
| **Khi dùng** | Hook shock, câu hỏi punch, mở đầu viral |
| **Stack** | `registry:caption-kinetic-slam` + `gsap` + `giphy` + SFX hook |
| **Visual story** | Từng từ slam stagger + sticker nổ + grain ambient |
| **Registry** | `caption-kinetic-slam` |
| **Cấm** | Chỉ 1 dòng text tĩnh |

### `stat_punch_card`

| | |
|--|--|
| **Khi dùng** | Một số liệu đơn, %, counter |
| **Stack** | `registry:stat-motion` hoặc `apple-money-count` + `gsap` |
| **Visual story** | Counter punch + ring fill + label card |
| **Registry** | `stat-motion`, `apple-money-count` |

### `comparison_split`

| | |
|--|--|
| **Khi dùng** | So sánh A vs B, before/after, "hay / hoặc" |
| **Stack** | `registry:data-chart` + `gsap` + `shader` transition in **hoặc** hand-authored vs cards |
| **Visual story** | **Stack dọc** trên 9:16 — headline căn giữa trên, hàng vs cards bên dưới (như editorial poster) |
| **Registry** | `data-chart` (2 series) hoặc 2× `.ui-card` + badge `vs` |
| **Layout 9:16** | **Cấm** chia màn hình trái/phải (headline trái \| cards phải). `layout_variant`: `stack_center` (mặc định) |
| **Typography** | Mỗi card title ≥36px; subtitle ≥28px; card `min-width` ≥320px hoặc `flex:1` trong hàng vs |

**Mẫu đúng (portrait):**

```
     [ Headline căn giữa — full width ]
              gap 24–32px
     [ Card A ]  vs  [ Card B ]   ← cùng hàng, mỗi card đủ rộng
```

**Anti-pattern:** headline cột trái + cards cột phải (screen split) — đọc kém trên mobile.

### `process_flow`

| | |
|--|--|
| **Khi dùng** | Quy trình, bước, cause-effect chain |
| **Stack** | `registry:flowchart` + `gsap` + `lottie` (arrow) |
| **Visual story** | Nodes cascade theo thoại — **1 act = 1 node reveal** |
| **Registry** | `flowchart` |
| **Layout** | **Cấm** 4 node ngang; vertical flow hoặc reveal tuần tự |
| **Typography** | Node title ≥36px; subtitle ≥28px; gap ≥24px |

### `social_proof_card`

| | |
|--|--|
| **Khi dùng** | Follower, metrics social, testimonial số |
| **Stack** | `registry:ig` / `tiktok` / `yt` + `gsap` |
| **Visual story** | Social card mock + metric count-up |
| **Registry** | `ig`, `tiktok`, `yt` |

### `bento_insight_grid`

| | |
|--|--|
| **Khi dùng** | Nhiều điểm nhỏ, 3–4 insight trong một beat |
| **Stack** | `gsap` stagger + hand-authored bento grid + optional `registry:stat-motion` |
| **Visual story** | Bento cards stagger in — mỗi card 1 insight ngắn + icon |
| **Layout** | Tối đa **2 cột × 2 hàng**; cell `min-height: 160px`; `gap ≥ 24px` |
| **Hand-author** | HTML grid + `.ui-card` glass — không bullet text thuần |

### `shader_hero_3d`

| | |
|--|--|
| **Khi dùng** | Climax visual, tech reveal, wow moment |
| **Stack** | `threejs` hoặc `registry:code-3d-extrude` + `gsap` + `shader` |
| **Visual story** | 3D hero object hoặc extrude + camera dolly nhẹ |
| **Registry** | `code-3d-extrude`, `code-shader-dissolve` |
| **Ghi chú** | Three.js scene nhẹ — 1080×1920, pause timeline |

### `annotation_fusion`

| | |
|--|--|
| **Khi dùng** | Asset ảnh/screenshot + data overlay |
| **Stack** | `gsap` + stock/image + scribble annotation kit |
| **Visual story** | Asset full-bleed + data graphics fused vào geometry asset |
| **Tham chiếu** | catalog-map § asset-fusion |

### `cta_orbit`

| | |
|--|--|
| **Khi dùng** | CTA, follow, loop hook |
| **Stack** | `registry:caption-kinetic-slam` + `gsap` + `lottie` |
| **Visual story** | Orbit collapse blueprint hoặc logo-outro + CTA words |
| **Blueprint** | `hyperframes-animation/blueprints/cta-orbit-collapse.md` |

### `code_reveal`

| | |
|--|--|
| **Khi dùng** | Snippet code, terminal, API demo |
| **Stack** | `registry:code-typing` / `code-highlight` + `gsap` |
| **Visual story** | Typing reveal sync phrase anchor |
| **Registry** | `code-typing`, `code-diff`, `code-scroll` |

---

## Chọn archetype theo nội dung

| Tín hiệu trong thoại | Archetype ưu tiên |
|----------------------|-------------------|
| Số shock đầu video | `kinetic_hook_slam` |
| Một con số lớn | `stat_punch_card` |
| "Trước / sau", "A vs B" | `comparison_split` |
| "Bước 1, 2, 3" / quy trình | `process_flow` |
| Follower, review, social | `social_proof_card` |
| 3+ insight trong một đoạn | `bento_insight_grid` |
| Wow / climax | `shader_hero_3d` |
| Screenshot sản phẩm + số | `annotation_fusion` |
| "Theo dõi", "link bio" | `cta_orbit` |
| Code / API | `code_reveal` |

---

## Diversity rules (preflight)

- Video ≥60s: **≥3** `layout_archetype` unique
- **Không** >2 beat liên tiếp cùng archetype
- Mỗi beat: `visual_story` mô tả **khác** việc echo text

---

## Three.js trong short video 9:16

Khi `render_stack` có `threejs`:

1. Scene nhẹ — 1 hero mesh hoặc particle field; không full game loop
2. GSAP timeline `paused: true` — sync với `data-duration` beat
3. `window.__timelines["beat_N"]` — Pattern B sub-composition
4. Fallback registry: `code-3d-extrude` nếu không cần custom scene

Tham chiếu: `.agents/skills/hyperframes/references/narration.md` — GSAP, Lottie, Shaders, Three.js.

---

## Anti-patterns

| Sai | Đúng |
|-----|------|
| Mọi beat `kinetic_hook_slam` | Đa dạng archetype theo nội dung |
| `visual_story` = copy `phrase_anchor` | Mô tả layout + motion riêng |
| 1 headline + gradient bg | Registry + stack ≥2 |
| Solve 90s = 1 `process_flow` | Tách nhiều beat archetype khác nhau |
