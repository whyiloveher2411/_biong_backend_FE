# Fixture `visual-pipeline-minimal` — KHÔNG phải template sản xuất

## Fixture là gì?

Thư mục:

```text
.cursor/skills/biong-short-video-preflight/scripts/fixtures/visual-pipeline-minimal/
```

Chứa **dữ liệu tối thiểu** để chạy unit test / preflight CI (`run-visual-pipeline-fixture.test.mjs`):

- `beat_1.html` … `beat_6.html` — HTML **cực ngắn**, chỉ đủ pass `check-visual-density` / `check-beat-timing`
- Không phải mẫu thẩm mỹ, không phải catalog motion
- **Cấm** copy nguyên fixture vào `storage/agent-renders/{id}/my-video/`

## Agent phase 2 phải làm gì?

| Fixture (test) | Production (render thật) |
|----------------|--------------------------|
| 6 beat generic | **N beat** từ `visual_shot_plan` + `phrase_anchor` |
| `stat-card` + 3 tween tối thiểu | Registry block **customize in-place** + ≥3 archetype |
| Không MCP media | MCP BGM/SFX/stock/Giphy/Lottie theo shot-plan |
| 60s demo | `totalVideoSec` từ audio thật |

## Tại sao fixture trông “giới hạn sáng tạo”?

Fixture **cố ý** tối giản để test nhanh — không giới hạn video marketing thật.

Agent bị “an toàn” khi:

1. Copy fixture thay vì đọc `visual-layout-archetypes.md`
2. Chỉ viết `.kw` + `.stat-card` tự chế, không `npx hyperframes add` + customize
3. Bỏ qua `visual_story` / `render_stack` trong shot-plan

Preflight `check-visual-density.mjs` **FAIL** nếu fingerprint giống gen-beats scaffold — nhưng vẫn pass HTML đơn giản nếu có `data-registry-block` + class đúng. **Chất lượng viral** cần motion-complexity + layout fill (doc riêng).

## Checklist agent (trước viết beat)

- [ ] Đã sinh `visual_shot_plan` từ caption-words (không HASCAS 1:1)
- [ ] Mỗi beat: `layout_archetype` + `visual_story` khác nhau
- [ ] `npx hyperframes add` ≥2 non-caption registry block
- [ ] **Không** mở fixture `beat_*.html` để copy — chỉ đọc `visual-layout-archetypes.md` + registry showcase
- [ ] Giphy accent: **`<img>` WebP/GIF** — cấm MP4 sticker (xem `giphy-accent-format.md`)
