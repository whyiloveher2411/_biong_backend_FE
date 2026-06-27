---
name: extract-core-signals
description: Trích xuất tín hiệu viral từ tài liệu thô — Hook, Tension, Takeaway, loop line. Dùng phase 1 short video agent trước khi viết audio_script.
---

# extract-core-signals

**Không** tóm tắt học thuật. Quét văn bản để tìm yếu tố giữ chân người xem.

**Đọc:** `biong-short-video-hyperframes/references/viral-retention-structure.md`

## Input

- `creative_brief.content_plain_text` từ `short_video_get_context`

## Output (JSON)

```json
{
  "hook": {
    "angle": "Số shock / myth-bust / câu hỏi nỗi sợ",
    "draft_line": "Một câu mở ≤12 từ"
  },
  "tension": {
    "villain": "Thói quen xấu / sai lầm",
    "stakes": "Hậu quả cụ thể",
    "rescue": "Insight cứu cánh"
  },
  "takeaway": {
    "formula": "3 bước / mẹo 5 giây",
    "proof": "Số liệu từ nguồn — không bịa"
  },
  "loop_hook_line": "Câu cuối nối mạch draft_line — cho infinite loop",
  "beat_suggestions": {
    "hook": "meme SFX + kinetic slam + stock hook",
    "agitate": "đổi palette mỗi phrase, pain cards",
    "solve": "UI cards 3 bước, số đếm",
    "cta": "loop line hoặc CTA ngắn + BGM fade"
  }
}
```

## Quy tắc

1. **Hook** — `draft_line` **≤12 từ**; số liệu / myth-bust / câu hỏi
2. **Tension** — villain rõ, stakes cụ thể
3. **Takeaway** — công thức nhớ được
4. **loop_hook_line** — semantic bridge về hook (cho `cta_mode: loop`)
5. **Không** invent claims ngoài nguồn

## Bước tiếp

`/viral-audio-script` → `save_audio_script` với `timeline` + `markers`.

Tham khảo: `biong-short-video-hyperframes/references/extract-core-signals.md`
