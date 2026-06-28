---
name: viral-audio-script
description: Bản nháp HASCAS 60–180s kèm Expressive Tags OmniVoice theo section. Dùng sau /hyperframes-creative; bắt buộc /humanize-audio-script trước save.
---

# viral-audio-script

Tạo **bản nháp** HASCAS 60–180 giây — **đã gắn expressive tags** theo [omnivoice-expressive-tags.md](biong-short-video-hyperframes/references/omnivoice-expressive-tags.md).

**Output là draft** — bắt buộc `/humanize-audio-script` trước `save_audio_script`.

**Đọc trước:**
- `biong-short-video-hyperframes/references/viral-retention-structure.md`
- `biong-short-video-hyperframes/references/omnivoice-expressive-tags.md`
- `biong-short-video-hyperframes/references/omnivoice-speech-script.md`

## Input

- Output từ `/extract-core-signals`
- Draft văn hội thoại từ `/hyperframes-creative`
- Target: **60–180 giây**

## Expressive tags — gắn khi viết (Less is More)

| Section | Tag gợi ý | Quota |
|---------|-----------|-------|
| Hook | `[excited]` hoặc `[happy]` | 0–1 câu ≤10 từ |
| Agitate | `[whisper]` hoặc `[calm]`, `[sigh]` | 0–1 mood + 0–1 phi-ngôn-ngữ |
| Solve | *(neutral)* | Không mood tag — `. . .` đủ |
| CTA | `[laughter]`, `[singing]` (tùy ngữ cảnh) | `[singing]` chỉ slogan ngắn tự nhiên |

- **80% neutral** — phần lớn Solve không bọc tag
- **Tối đa 2** tag phi-ngôn-ngữ (`[laughter]`/`[sigh]`/`[gasp]`) / video
- **Cấm** bọc cả đoạn dài trong một tag

## Timeline HASCAS

| Phần | % | Ví dụ 90s |
|------|---|-----------|
| Hook | ~5% | 0–5s |
| Agitate | ~25% | 5–27s |
| Solve | ~60% | 27–81s |
| CTA/Loop | ~10% | 81–90s |

Word budget: ~2.5 từ/giây.

## Quy tắc khác

- Câu **≤12 từ**; **cấm SSML**
- **Bắt buộc** `[SFX: vine boom]` ở Hook
- `[BGM: mood]` đầu script

## Output (draft + expressive_plan)

```
[BGM: lofi ambient] [SFX: vine boom] [excited] 99% dev dùng HyperFrames sai! . . .
[whisper] Bạn nghĩ add skill là xong? [sigh] Sai rồi! ... (60–180s)
```

```json
{
  "estimated_duration_sec": 90,
  "structure": "hook-agitate-solve-cta",
  "timeline": { "hook_end": 5, "agitate_end": 27, "solve_end": 81, "total": 90 },
  "cta_mode": "loop",
  "tts_engine_hint": "omnivoice",
  "expressive_plan": {
    "hook": ["[excited]"],
    "agitate": ["[whisper]", "[sigh]"],
    "solve": [],
    "cta": ["[laughter]"]
  }
}
```

## Bước tiếp

`/humanize-audio-script` — polish văn, **giữ tag slots**.
