---
name: extract-core-signals
description: Trích xuất tín hiệu viral từ tài liệu thô (marketing post, bài báo, ghi chú) — Hook, Tension, Takeaway. Dùng phase 1 short video agent trước khi viết audio_script.
---

# extract-core-signals

**Không** tóm tắt học thuật. Quét văn bản để tìm 3 yếu tố giữ chân người xem.

## Input

- `creative_brief.content_plain_text` từ `short_video_get_context`
- Hoặc tài liệu thô user đính kèm

## Output (JSON)

```json
{
  "hook": {
    "angle": "Câu gây sốc / số liệu tranh cãi / hiểu lầm phổ biến",
    "draft_line": "Một câu mở đầu ≤15 từ"
  },
  "tension": {
    "villain": "Thói quen xấu / sai lầm / nỗi đau",
    "stakes": "Hậu quả cụ thể nếu không đổi",
    "rescue": "Giải pháp / insight cứu cánh"
  },
  "takeaway": {
    "formula": "Quy tắc 3 bước / mẹo 5 giây / công thức dễ nhớ",
    "proof": "Số liệu hoặc ví dụ từ nguồn — không bịa"
  }
}
```

## Quy tắc

1. **Hook** — số liệu giật gân, insight gây tranh cãi, hoặc myth-bust từ nguồn
2. **Tension** — đặt tên "kẻ phản diện" rõ (thói quen, tool sai, quy trình lỗi thời)
3. **Takeaway** — đóng gói thành công thức nhớ được, bám nội dung marketing post
4. **Không** invent claims ngoài `content_plain_text`

## Bước tiếp

Chuyển output sang `/viral-audio-script` → `save_audio_script`.

Tham khảo: `biong-short-video-hyperframes/references/extract-core-signals.md`
