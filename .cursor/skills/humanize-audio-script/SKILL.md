---
name: humanize-audio-script
description: Polish văn nói tự nhiên từ viral draft — GIỮ non-verbal tags OmniVoice, cấm thêm/xóa tag. Dùng sau /viral-audio-script, trước save_audio_script.
---

# humanize-audio-script

Polish **bản nháp** từ `/viral-audio-script` — văn người thật, thành ngữ, từ đệm hội thoại.

**Cấm thêm/xóa/di chuyển non-verbal tags** — tag đã gắn trong viral draft.

**Đọc trước:**
- `biong-short-video-hyperframes/references/vi-voiceover-naturalization.md` (§1 §2)
- `biong-short-video-hyperframes/references/humanize-audio-script.md`
- `biong-short-video-hyperframes/references/omnivoice-expressive-tags.md`

## Prompt cốt lõi

```text
QUAN TRỌNG: Giữ nguyên mọi thẻ allowlist — [laughter] [sigh] [gasp] — cấm thêm/xóa tag. Cấm [happy] [singing] [whisper].
Giữ [BGM], [SFX], [Dừng] nguyên vị trí.
Dưới đây là đoạn văn cần sửa: [DRAFT_SCRIPT]
```

## Self-check trước save

1. Tag count khớp `expressive_plan` — không tag mới
2. ≤2 non-verbal (`[laughter]`/`[sigh]`/`[gasp]`) / video
3. Câu ≤12 từ; `[SFX]` ở Hook; `[BGM]` đầu script

## Output

```json
{
  "estimated_duration_sec": 90,
  "expressive_plan": { "hook": [], "agitate": ["[sigh]"], "solve": [], "cta": ["[laughter]"] },
  "tts_engine_hint": "omnivoice"
}
```
