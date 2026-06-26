---
name: viral-audio-script
description: Định hình kịch bản audio viral — viết cho tai nghe, câu ngắn, SFX/BGM hints, cấu trúc Hook→Agitate→Solve→CTA. Dùng sau /extract-core-signals trong phase 1.
---

# viral-audio-script

Chuyển `core_signals` thành **audio script** đọc tự nhiên — không văn viết cho mắt.

## Input

- Output từ `/extract-core-signals`
- Target: 30–90 giây (mặc định ~45s social)

## Cấu trúc HASCAS (bắt buộc)

| Phần | Thời lượng | Mục tiêu |
|------|------------|----------|
| **Hook** | ~3s đầu | Nỗi sợ / tò mò — đánh thẳng |
| **Agitate** | 10–20s | Khoét sâu vấn đề (tension.villain) |
| **Solve** | 15–30s | Giải pháp bất ngờ (takeaway.formula) |
| **CTA** | 5–10s | Một hành động ngắn |

## Quy tắc viết cho tai nghe

- Câu **10–15 từ** — không câu dài hụt hơi
- Dấu phẩy, chấm hợp lý — nhịp ngắt nghỉ kịch tính
- Ngôn ngữ nói tự nhiên tiếng Việt — không văn phong báo chí
- Chèn `[SFX: ...]` tại cao trào; `[BGM: ...]` khi cần đẩy năng lượng
- `[Dừng 0.5s]` hoặc `[Dừng 1s]` cho beat dramatic

## Output

**text** (lưu vào `save_audio_script`):

```
[SFX: Tiếng kính vỡ] 99% người làm video sai bước này. [Dừng 1s]. Bạn nghĩ add skill là đủ? Sai. [SFX: Chuông báo]. Bí mật là ép AI dùng Stagger và Easing. Ba bước sau đây...
```

**metadata** (truyền qua MCP `metadata`):

```json
{
  "core_signals": { },
  "markers": [
    { "time": 0, "text": "99% sai bước này" },
    { "time": 3, "text": "Sai lầm lớn nhất" }
  ],
  "estimated_duration_sec": 45,
  "structure": "hook-agitate-solve-cta"
}
```

`markers` dùng phase 2 map caption kinetic / beat cuts.

Tham khảo: `biong-short-video-hyperframes/references/viral-audio-script.md`
