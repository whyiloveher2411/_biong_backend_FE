---
name: viral-audio-script
description: Bản nháp HASCAS 60–180s kèm non-verbal tags OmniVoice (k2-fsa/OmniVoice). Dùng sau /hyperframes-creative; bắt buộc /humanize-audio-script trước save.
---

# viral-audio-script

Tạo **bản nháp** HASCAS 60–180 giây — **đã gắn non-verbal tags** theo [omnivoice-expressive-tags.md](biong-short-video-hyperframes/references/omnivoice-expressive-tags.md).

**CHỈ allowlist:** `[laughter]` `[sigh]` `[gasp]` — tối đa **2 / video**. **Cấm** mood tag (`[happy]`, `[singing]`, …).

**Output là draft** — bắt buộc `/humanize-audio-script` trước `save_audio_script`.

**Đọc trước:**
- `biong-short-video-hyperframes/references/viral-retention-structure.md`
- `biong-short-video-hyperframes/references/vi-voiceover-naturalization.md` (§1 §3 §4)
- `biong-short-video-hyperframes/references/omnivoice-expressive-tags.md`
- `biong-short-video-hyperframes/references/omnivoice-speech-script.md`

## Non-verbal tags — gắn khi viết

| Section | Tag gợi ý | Quota |
|---------|-----------|-------|
| Agitate | `[sigh]` hoặc `[gasp]` | 0–1 |
| Twist / CTA | `[laughter]` | 0–1 |
| Tổng | `[laughter]` `[sigh]` `[gasp]` | **≤2 / video** |

Mood Hook/Agitate/CTA: **neutral + `?!` + `. . .`** — không mood tag.

## Quy tắc khác

- Câu **≤12 từ**; **cấm SSML**; cấm tag ngoài allowlist
- **Bắt buộc** `[SFX: vine boom]` ở Hook

## Output (draft + expressive_plan)

```
[BGM: lofi ambient] [SFX: vine boom] 99% dev dùng HyperFrames sai! . . .
Tưởng add skill là xong? [sigh] Sai rồi! ... (60–180s)
```

```json
{
  "estimated_duration_sec": 90,
  "expressive_plan": {
    "hook": [],
    "agitate": ["[sigh]"],
    "solve": [],
    "cta": ["[laughter]"]
  }
}
```

## Bước tiếp

`/humanize-audio-script` — polish văn, **giữ tag slots**.
