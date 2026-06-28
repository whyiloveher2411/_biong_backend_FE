---
name: humanize-audio-script
description: Polish văn nói tự nhiên từ viral draft — GIỮ expressive tags OmniVoice, cấm thêm/xóa tag. Dùng sau /viral-audio-script, trước save_audio_script.
---

# humanize-audio-script

Polish **bản nháp** từ `/viral-audio-script` — văn người thật, thành ngữ, từ đệm hội thoại.

**Cấm thêm/xóa/di chuyển expressive tags** — tag đã gắn trong viral draft.

**Đọc trước:**
- `biong-short-video-hyperframes/references/vi-voiceover-naturalization.md` (§1 §2)
- `biong-short-video-hyperframes/references/humanize-audio-script.md`
- `biong-short-video-hyperframes/references/omnivoice-expressive-tags.md`

## Input

- Draft HASCAS + `expressive_plan` từ `/viral-audio-script`
- `core_signals` từ `/extract-core-signals`

## Prompt cốt lõi

```text
Hãy viết lại đoạn văn sau theo văn phong tự nhiên, dùng từ ngữ giao tiếp hàng ngày của người thật.
Thêm từ đệm hội thoại (biết sao không, nghe nè, …nè, …đúng không?) — 2–4 lần / video, không nhồi mỗi câu.
Thay từ học thuật: do đó→nên là, tuy nhiên→nhưng mà, tiến hành→làm, phương pháp tối ưu→cách tốt nhất.
Hãy thêm thành ngữ hoặc cách nói ví von; tách câu dài thành câu ≤12 từ.
QUAN TRỌNG: Giữ nguyên mọi thẻ [excited], [happy], [whisper], [calm], [laughter], [sigh], [gasp], [singing] — cấm thêm hoặc xóa tag.
Giữ [BGM], [SFX], [Dừng] nguyên vị trí.
Dưới đây là đoạn văn cần sửa: [DRAFT_SCRIPT]
```

## Ràng buộc

| Giữ nguyên | Được đổi |
|------------|----------|
| HASCAS + timeline + markers | Từ ngữ, thành ngữ, từ đệm §2 |
| **Mọi expressive tag + vị trí** | Cấu trúc câu quanh tag |
| `[BGM]`, `[SFX]`, `[Dừng]` | Loại từ nối học thuật §1 |
| Facts từ marketing post | Brand EN giữ spelling gốc (§5) |

## Self-check trước save (docs — không server gate)

1. Tag count khớp `expressive_plan` — không tag mới
2. ≤2 phi-ngôn-ngữ (`[laughter]`/`[sigh]`/`[gasp]`) / video
3. Câu ≤12 từ; `[SFX]` ở Hook; `[BGM]` đầu script
4. Có 2–4 từ đệm tự nhiên
5. Cấm SSML; không "do đó", "tiến hành"

## Output

```json
{
  "estimated_duration_sec": 90,
  "expressive_plan": { "hook": ["[excited]"], "agitate": ["[whisper]", "[sigh]"], "solve": [], "cta": [] },
  "tts_engine_hint": "omnivoice"
}
```

## Bước tiếp

`short_video_save_audio_script` — **không chèn tag mới** ở bước này.
