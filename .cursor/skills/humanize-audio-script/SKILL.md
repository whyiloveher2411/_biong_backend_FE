---
name: humanize-audio-script
description: Viết lại bản nháp viral script thành văn nói tự nhiên — thành ngữ, ví von, giao tiếp hàng ngày. Dùng sau /viral-audio-script, trước save_audio_script.
---

# humanize-audio-script

Chuyển **bản nháp** từ `/viral-audio-script` sang văn **người thật nói** — không còn giọng AI khô khan.

**Đọc trước:**
- `biong-short-video-hyperframes/references/humanize-audio-script.md`
- `biong-short-video-hyperframes/references/omnivoice-speech-script.md`

## Input

- Bản nháp HASCAS từ `/viral-audio-script` (text + timeline + markers)
- `core_signals` từ `/extract-core-signals`

## Prompt cốt lõi

Áp dụng cho toàn bộ draft (hoặc từng section HASCAS nếu draft dài):

```text
Hãy viết lại đoạn văn sau theo văn phong tự nhiên, dùng từ ngữ giao tiếp hàng ngày của người thật.
Hãy thêm các thành ngữ hoặc cách nói ví von, thay đổi cấu trúc câu linh hoạt để bài viết không bị khô khan và máy móc.
Dưới đây là đoạn văn cần sửa: [DRAFT_SCRIPT]
```

## Ràng buộc sau humanize

| Giữ nguyên | Được đổi |
|------------|----------|
| Cấu trúc HASCAS (Hook → Agitate → Solve → CTA) | Từ ngữ, cấu trúc câu, thành ngữ, ví von |
| `estimated_duration_sec` trong 60–180 | Giọng điệu tự nhiên hơn |
| `timeline` / `markers` (cập nhật text marker nếu cần) | Cách nói giao tiếp hàng ngày |
| Facts/claims từ marketing post — **không bịa** | Loại bỏ từ nối học thuật |

## Checklist OmniVoice (bắt buộc trước save)

1. Câu **≤12 từ** — tách câu dài sau khi humanize
2. **Bắt buộc** `[SFX: vine boom]` (hoặc tương đương) ở Hook
3. `[BGM: mood]` ở đầu script
4. Emotion tags: `[laughter]`, `[sigh]`, `[gasp]` ở Hook/twist
5. Prosody: `. . .` = ngắt dramatic; `,` = ngắt ngắn
6. **Cấm SSML** — không `<break>`, `<emphasis>`
7. `cta_mode: "loop"` — câu cuối nối hook

## Output

Script cuối + metadata sẵn sàng `short_video_save_audio_script`:

```json
{
  "estimated_duration_sec": 90,
  "structure": "hook-agitate-solve-cta",
  "timeline": { "hook_end": 5, "agitate_end": 27, "solve_end": 81, "total": 90 },
  "cta_mode": "loop",
  "tts_engine_hint": "omnivoice",
  "markers": [{ "time": 0, "text": "...", "section": "hook" }]
}
```

## Bước tiếp

`short_video_save_audio_script` → DỪNG (manual) hoặc `generate_narration_tts` (auto TTS).
