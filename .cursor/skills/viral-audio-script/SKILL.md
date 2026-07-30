---
name: viral-audio-script
description: Script HASCAS 60–180s hoàn chỉnh — plain language, từ đệm. One-pass; sau đó /audit-audio-script trước save. Không tag voice OmniVoice.
---

# viral-audio-script

Viết **script hoàn chỉnh** HASCAS 60–180 giây **một lần** — từ đệm, văn nói tự nhiên, marker sản xuất. **Không** cần bước `/humanize-audio-script` riêng.

**Cấm** tag voice non-verbal: `[laughter]`, `[sigh]`, `[dissatisfaction-hnn]`. Mood qua `. . .` / `?!`. `expressive_plan` luôn rỗng.

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
5. Gắn `[BGM]` + `[SFX: vine boom]` hook — **không** tag voice

## Narrative Flow (bắt buộc)

1. Solve: **expand chain** — cấm đọc feature/spec theo thứ tự
2. **Cấm** blocklist từ liệt kê (narrative-flow-vi.md §3)
3. Gom thông số → 1 câu cảm thán/so sánh

## Prosody (không tag voice)

| Section | Cách nhấn |
|---------|-----------|
| Hook | `?!` + `[SFX]` |
| Agitate | Cảm thán ngắn + `. . .` |
| Twist / CTA | Slogan ngắn + `?!` |

## Quy tắc khác

- **Cấm SSML**; cấm mọi tag ngoài `[BGM]`/`[SFX]`/`[Dừng]`
- **Bắt buộc** `[SFX: vine boom]` ở Hook
- Câu **tự nhiên** — không giới hạn 12 từ

## Bước tiếp

`/audit-audio-script` — QA; chỉ `save_audio_script` khi `pass === true`
