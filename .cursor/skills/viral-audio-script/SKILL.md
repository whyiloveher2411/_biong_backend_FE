---
name: viral-audio-script
description: Script HASCAS 60–180s hoàn chỉnh — plain language, từ đệm, OmniVoice tags. One-pass; sau đó /audit-audio-script trước save.
---

# viral-audio-script

Viết **script hoàn chỉnh** HASCAS 60–180 giây **một lần** — gồm non-verbal tags, từ đệm, văn nói tự nhiên. **Không** cần bước `/humanize-audio-script` riêng.

**CHỈ allowlist OmniVoice (3 tag)**. **Cấm** `[gasp]`, mood tag. Ghi đủ trong `expressive_plan`.

**Cấm Structural Summarization** — expand `narrative_chain` bằng But/Therefore.

**Đọc trước:**
- `biong-short-video-hyperframes/references/plain-language-storytelling-vi.md` — **bắt buộc**
- `biong-short-video-hyperframes/references/narrative-flow-vi.md`
- `biong-short-video-hyperframes/references/viral-retention-structure.md`
- `biong-short-video-hyperframes/references/vi-voiceover-naturalization.md`
- `biong-short-video-hyperframes/references/omnivoice-expressive-tags.md`
- `biong-short-video-hyperframes/references/omnivoice-speech-script.md`

## One-pass writing

1. Input: `core_signals` + góc creative từ `/hyperframes-creative`
2. Viết **câu tự nhiên** — kể như giải thích cho bạn 12 tuổi
3. Gắn **2–4 từ đệm** (ừm, thật ra, nói thật…)
4. **Cấm em dash** `—` — dùng phẩy, câu mới, `. . .`
5. Gắn tag OmniVoice + `[BGM]` + `[SFX: vine boom]` hook

## Narrative Flow (bắt buộc)

1. Solve: **expand chain** — cấm đọc feature/spec theo thứ tự
2. **Cấm** blocklist từ liệt kê (narrative-flow-vi.md §3)
3. Gom thông số → 1 câu cảm thán/so sánh

## Non-verbal tags

| Section | Tag gợi ý |
|---------|-----------|
| Agitate | `[sigh]`, `[dissatisfaction-hnn]` |
| Twist / CTA | `[laughter]` |

Mood: **neutral + `?!` + `. . .`** — không mood tag.

## Quy tắc khác

- **Cấm SSML**; cấm tag ngoài allowlist
- **Bắt buộc** `[SFX: vine boom]` ở Hook
- Câu **tự nhiên** — không giới hạn 12 từ

## Bước tiếp

`/audit-audio-script` — QA; chỉ `save_audio_script` khi `pass === true`
