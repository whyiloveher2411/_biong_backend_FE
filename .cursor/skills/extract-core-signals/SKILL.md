---
name: extract-core-signals
description: Trích xuất tín hiệu viral từ tài liệu thô — Hook, Tension, Takeaway, narrative_chain, loop line. Dùng phase 1 short video agent trước khi viết audio_script.
---

# extract-core-signals

**Không** tóm tắt học thuật. **Không** structural summarization. Quét văn bản để tìm yếu tố giữ chân người xem và xây **chuỗi But/Therefore**.

**Đọc:**
- `biong-short-video-hyperframes/references/viral-retention-structure.md`
- `biong-short-video-hyperframes/references/narrative-flow-vi.md`

## Input

- `creative_brief.content_plain_text` từ `short_video_get_context`

## Output (JSON)

```json
{
  "hook": {
    "angle": "Số shock / myth-bust / câu hỏi nỗi sợ",
    "draft_line": "Một câu mở ngắn gọn, gây tò mò"
  },
  "tension": {
    "villain": "Thói quen xấu / sai lầm",
    "stakes": "Hậu quả cụ thể",
    "rescue": "Insight cứu cánh"
  },
  "takeaway": {
    "formula": "Insight nhớ được — không liệt kê số thứ tự",
    "proof": "Số liệu từ nguồn — không bịa"
  },
  "narrative_chain": [
    {
      "cause": "Sự kiện / fact từ nguồn",
      "but": "Twist / đối lập / giả định sai",
      "therefore": "Hậu quả / insight kéo câu tiếp"
    }
  ],
  "perspective": "Kể chuyện cho bạn 12 tuổi — từ đơn giản, ví dụ đời",
  "loop_hook_line": "Câu cuối nối mạch draft_line — cho infinite loop",
  "beat_suggestions": {
    "hook": "meme SFX + kinetic slam + stock hook",
    "agitate": "đổi palette mỗi phrase, pain cards",
    "solve": "UI cards theo narrative_chain — không checklist",
    "cta": "loop line hoặc CTA ngắn + BGM fade"
  }
}
```

## Quy tắc

1. **Hook** — `draft_line` ngắn gọn, gây tò mò; plain language
2. **Tension** — villain rõ, stakes cụ thể
3. **Takeaway** — insight nhớ được; **cấm** "bước 1, bước 2" hoặc liệt kê số thứ tự
4. **narrative_chain** — ≥1 link `{ cause, but, therefore }`; mỗi fact nguồn phải nằm trong chuỗi nhân quả
5. **perspective** — góc nhìn cụ thể, không mô tả brochure
6. **loop_hook_line** — semantic bridge về hook (cho `cta_mode: loop`)
7. **Không** invent claims ngoài nguồn

## Phase 2 — visual enrichment

Facts trong `narrative_chain`, `takeaway.proof`, hoặc marketing post **chưa** đưa vào VO → ghi vào `visual_enrichment[]` trong `visual_shot_plan` (Phase 2). On-screen ngắn; không lặp caption narration.

**Content freedom:** Khi có marketing post liên kết, agent được dùng nội dung bài gốc (`content_plain_text`, `marketing_post_images`) để làm giàu visual — **không** bó buộc bám sát từng câu `audio_script`.

**Ảnh marketing post:** Nếu `creative_brief.marketing_post_images` không rỗng → mỗi ảnh 1 beat riêng, `.browser-mockup-card`, tối đa 1 ảnh/beat. Đọc [marketing-post-image-card.md](../biong-short-video-hyperframes/references/marketing-post-image-card.md).

## Anti-patterns

- Tóm tắt bullet học thuật
- Structural summarization — fact rời không nối But/Therefore
- `takeaway.formula: "3 bước"` — kích thích liệt kê trong script

## Bước tiếp

`/hyperframes-creative` → `/viral-audio-script` → `/audit-audio-script` → `save_audio_script`

Tham khảo: `biong-short-video-hyperframes/references/extract-core-signals.md`
