# viral-audio-script — kịch bản giữ chân cao (bản nháp)

Skill phase 1. Invoke: `/viral-audio-script` sau `/hyperframes-creative`. Output là **bản nháp** — bắt buộc `/humanize-audio-script` trước `save_audio_script`.

**Đọc trước:**
- [viral-retention-structure.md](viral-retention-structure.md)
- [omnivoice-speech-script.md](omnivoice-speech-script.md)

## Timeline viral (60–180s)

Agent chọn `estimated_duration_sec` trong **60–180** theo nội dung — không viết quá ngắn.

Word budget: **~2.5 từ/giây** (60s ≈ 150 từ, 180s ≈ 450 từ).

## Công thức HASCAS (scale theo total)

| Phần | % | Mục tiêu |
|------|---|----------|
| Hook | ~5% | Ngừng lướt — số shock, câu hỏi + **[SFX] bắt buộc** |
| Agitate | ~25% | Đồng cảm — villain, sai lầm phổ biến |
| Solve | ~60% | Công thức nhiều bước + proof |
| CTA/Loop | ~10% | CTA ngắn **hoặc** câu nối hook |

## Viết cho tai nghe (OmniVoice)

| Quy tắc | Chi tiết |
|---------|----------|
| Độ dài video | **60–180s** — chọn theo nội dung |
| Độ dài câu | **≤12 từ** |
| Văn hội thoại | `/hyperframes-creative` trước |
| Cấm SSML | Không `<break>`, `<emphasis>` |
| Emotion tags | `[laughter]`, `[sigh]`, `[gasp]` ở Hook/twist |
| Prosody | `. . .` = ngắt dài; `,` = ngắt ngắn |

## Thẻ âm thanh

| Thẻ | Phase 2 MCP |
|-----|-------------|
| `[BGM: mood]` | `short_video_search_bgm` |
| `[SFX: vine boom]` | **`short_video_search_meme_sound` — BẮT BUỘC mọi video** |
| `[Dừng 0.5s]` | Server convert `. . .` khi TTS |

## Lưu qua MCP

**Không save trực tiếp draft.** Chuyển sang `/humanize-audio-script` trước:

```text
/humanize-audio-script → short_video_save_audio_script({
  short_video_id: N,
  text: "[BGM: lofi ambient] [SFX: vine boom] [laughter] Câu hook . . . ...",
  metadata: {
    estimated_duration_sec: 90,
    structure: "hook-agitate-solve-cta",
    timeline: { hook_end: 5, agitate_end: 27, solve_end: 81, total: 90 },
    cta_mode: "loop",
    markers: [...],
    tts_engine_hint: "omnivoice"
  }
})
```

## Anti-patterns

- Script < 60s / > 180s
- Thiếu `[SFX: ...]`
- Câu >12 từ
- SSML hoặc văn viết học thuật
