---
name: viral-audio-script
description: Bản nháp HASCAS 60–180s kèm non-verbal tags OmniVoice (k2-fsa/OmniVoice). Dùng sau /hyperframes-creative; bắt buộc /humanize-audio-script rồi /audit-audio-script trước save.
---

# viral-audio-script

Tạo **bản nháp** HASCAS 60–180 giây — **đã gắn non-verbal tags** theo [omnivoice-expressive-tags.md](biong-short-video-hyperframes/references/omnivoice-expressive-tags.md).

**CHỈ allowlist OmniVoice (13 tag)** — tối đa **2 / video**. **Cấm** `[gasp]`, mood tag (`[happy]`, `[singing]`, …).

**Output là draft** — bắt buộc `/humanize-audio-script` → `/audit-audio-script` trước `save_audio_script`.

**Cấm Structural Summarization** — expand `narrative_chain` bằng But/Therefore, không liệt kê fact.

**Đọc trước:**
- `biong-short-video-hyperframes/references/narrative-flow-vi.md` — **bắt buộc**
- `biong-short-video-hyperframes/references/viral-retention-structure.md`
- `biong-short-video-hyperframes/references/vi-voiceover-naturalization.md` (§1 §3 §4 §6)
- `biong-short-video-hyperframes/references/omnivoice-expressive-tags.md`
- `biong-short-video-hyperframes/references/omnivoice-speech-script.md`

## Narrative Flow (bắt buộc)

1. Input: `core_signals.narrative_chain` + `perspective` từ extract
2. Solve section: **expand chain** — cấm đọc feature/spec theo thứ tự
3. **Cấm** blocklist từ liệt kê (xem narrative-flow-vi.md §3)
4. Gom thông số → 1 câu cảm thán/so sánh

## Non-verbal tags — gắn khi viết

| Section | Tag gợi ý | Quota |
|---------|-----------|-------|
| Hook | `[question-en]`, `[question-ah]`, `[question-oh]`, `[question-ei]`, `[question-yi]` | 0–1 |
| Agitate | `[sigh]`, `[dissatisfaction-hnn]`, `[surprise-ah/oh/wa/yo]` | 0–1 |
| Twist / CTA | `[laughter]`, `[confirmation-en]` | 0–1 |
| **Tổng** | allowlist 13 tag | **≤2 / video** |

Mood Hook/Agitate/CTA: **neutral + `?!` + `. . .`** — không mood tag. **Cấm** `[gasp]`.

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

`/humanize-audio-script` — polish văn, **giữ tag slots**, **giữ But/Therefore**.
