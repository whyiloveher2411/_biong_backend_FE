---
name: viral-audio-script
description: Định hình kịch bản audio viral — viết cho tai nghe, câu ngắn, BGM hints, cấu trúc Hook→Agitate→Solve→CTA. Dùng sau /extract-core-signals trong phase 1.
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
- Chèn `[BGM: lofi ambient]` (hoặc mood phù hợp nội dung) ở đầu script — phase 2 gọi `search_bgm`
- `[Dừng 0.5s]` hoặc `[Dừng 1s]` cho beat dramatic
- **`[BGM]` dùng mood search Pixabay-friendly** (lofi ambient, soft corporate, cinematic ambient, electronic minimal…)
- **Markers** `{ time, text }` cho caption sync — không bắt buộc theo từng BGM tag

## Output

**text** (lưu vào `save_audio_script`):

```
[BGM: lofi ambient] 99% người làm video sai bước này. [Dừng 1s]. Bạn nghĩ add skill là đủ? Sai. Bí mật là ép AI dùng Stagger và Easing. Ba bước sau đây...
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
  "structure": "hook-agitate-solve-cta",
  "bgm_mood": "lofi ambient"
}
```

`markers` dùng phase 2 map caption kinetic / beat cuts.

**Lưu ý phase 2:** không gọi MCP lúc viết script — chỉ chuẩn bị `[BGM]` + markers để agent render gọi `search_bgm` / `search_stock_media`.

Tham khảo: `biong-short-video-hyperframes/references/viral-audio-script.md`
