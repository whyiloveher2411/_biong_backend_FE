# HF Prompt Catalog — 9 type per beat

Catalog prompt type từ HyperFrames playground. Agent **sinh shot-plan content** trước; `hf_prompt_type` do script `assign-beat-prompt-types.mjs` gán — **không** tự chọn khi render.

**Đọc kèm:** [hf-prompt-beat-contract.md](hf-prompt-beat-contract.md) · [visual-shot-plan.md](visual-shot-plan.md)

---

## Catalog

| `hf_prompt_type` | File prompt | Gợi ý nội dung (lúc sinh shot-plan) |
|------------------|-------------|--------------------------------------|
| `cinematic-title` | `hyperframes/prompts/cinematic-title.md` | Hook, title card, mood editorial |
| `kinetic-type` | `hyperframes/prompts/kinetic-type.md` | Hook punch, headline lớn, word stagger |
| `social-reel` | `hyperframes/prompts/social-reel.md` | Hook reel, claim ngắn, safe-area vertical |
| `data-story` | `hyperframes/prompts/data-story.md` | Số liệu, counter, sparkline, delta |
| `product-reveal` | `hyperframes/prompts/product-reveal.md` | Sản phẩm, feature, mockup |
| `lower-third-overlay` | `hyperframes/prompts/lower-third-overlay.md` | Badge nguồn, credit, lower third |
| `sting-transition` | `hyperframes/prompts/sting-transition.md` | Beat ngắn 5–8s, punch transition |
| `premium-spot` | `hyperframes/prompts/premium-spot.md` | Climax, brand moment, CTA |
| `universal-composer` | `hyperframes/prompts/universal-composer.md` | Fallback đa năng |

---

## Rule gán random

| Rule | Giá trị |
|------|---------|
| Beat 1 pool | `kinetic-type`, `cinematic-title`, `social-reel` (hook whitelist) |
| Beat 2+ pool | Đủ 9 type |
| Cấm trùng | 2 beat liên tiếp **không** cùng `hf_prompt_type` |
| `sting-transition` | Chỉ gán beat có `durationSec ≤ 8` (sau beat-map) |

Script: `node .cursor/skills/biong-short-video-preflight/scripts/assign-beat-prompt-types.mjs <project-dir>`

Output: patch `assets/visual-shot-plan.json` + `assets/prompt-assignment.json`

---

## Gợi ý content_intent → type (chỉ khi sinh shot-plan, script vẫn random)

Agent có thể ghi `content_intent` để script ưu tiên nhẹ (không bắt buộc):

| `content_intent` | Type ưu tiên |
|------------------|--------------|
| `hook_shock` | kinetic-type, cinematic-title, social-reel |
| `stat`, `comparison` | data-story |
| `process` | universal-composer, product-reveal |
| `cta` | premium-spot, social-reel |
| `transition` | sting-transition |

---

## Đa dạng trong 1 video

- Video ≥60s: khuyến nghị ≥3 `hf_prompt_type` unique (preflight warn nếu <3)
- Mix type tạo nhịp visual — không cần map semantic 1:1 archetype cũ

---

## Attach khi render

Mỗi beat, agent đọc:

```
@hyperframes/prompts/{hf_prompt_type}.md
@hf-prompt-beat-contract.md
assets/beat-timing/beat_N.json
```
