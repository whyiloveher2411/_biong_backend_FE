---
name: viral-audio-script
description: Bản nháp kịch bản audio viral 60–180s — HASCAS, timeline, markers. Dùng sau /hyperframes-creative; bắt buộc /humanize-audio-script trước save.
---

# viral-audio-script

Tạo **bản nháp** HASCAS 60–180 giây từ `core_signals` — agent chọn thời lượng theo nội dung marketing post.

**Output là draft** — bắt buộc `/humanize-audio-script` trước `save_audio_script`.

**Đọc trước:**
- `biong-short-video-hyperframes/references/viral-retention-structure.md`
- `biong-short-video-hyperframes/references/omnivoice-speech-script.md`

## Input

- Output từ `/extract-core-signals`
- Draft văn hội thoại từ `/hyperframes-creative`
- Target: **60–180 giây** (không default cố định)

## Timeline HASCAS (scale theo total)

| Phần | % | Ví dụ 90s |
|------|---|-----------|
| Hook | ~5% | 0–5s |
| Agitate | ~25% | 5–27s |
| Solve | ~60% | 27–81s |
| CTA/Loop | ~10% | 81–90s |

Word budget: ~2.5 từ/giây → 60s ≈ 150 từ, 180s ≈ 450 từ.

## Quy tắc viết cho tai nghe (OmniVoice)

- Thời lượng **60–180s** — không viết clip 30–45s
- Câu **tối đa 12 từ**
- **Cấm SSML**
- **Bắt buộc** `[SFX: vine boom]` (hoặc tương đương) ở Hook
- Emotion: `[laughter]`, `[sigh]`, `[gasp]`
- Prosody: `. . .` dramatic pause

## Thẻ production

| Thẻ | Khi dùng |
|-----|----------|
| `[BGM: lofi ambient]` | Đầu script — phase 2 `search_bgm` |
| `[SFX: vine boom]` | **Bắt buộc** Hook — `search_meme_sound` |
| `[Dừng 0.5s]` | Beat dramatic |

## Output (bản nháp — chưa save)

Draft HASCAS + metadata — chuyển sang `/humanize-audio-script` trước khi lưu:

```
[BGM: lofi ambient] [SFX: vine boom] 99% mọi người dùng HyperFrames sai . . . Bạn nghĩ add skill là đủ? ... (đủ dài cho 60–180s)
```

```json
{
  "estimated_duration_sec": 90,
  "structure": "hook-agitate-solve-cta",
  "timeline": { "hook_end": 5, "agitate_end": 27, "solve_end": 81, "total": 90 },
  "cta_mode": "loop",
  "tts_engine_hint": "omnivoice"
}
```
