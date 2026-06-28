# viral-audio-script — kịch bản giữ chân cao (bản nháp + expressive tags)

Skill phase 1. Invoke: `/viral-audio-script` sau `/hyperframes-creative`. Output là **bản nháp có tag** — bắt buộc `/humanize-audio-script` trước `save_audio_script`.

**Đọc trước:**
- [viral-retention-structure.md](viral-retention-structure.md)
- [omnivoice-expressive-tags.md](omnivoice-expressive-tags.md)
- [omnivoice-speech-script.md](omnivoice-speech-script.md)

## Expressive tags — gắn trong draft (80/20)

| Section HASCAS | Tag | Quota |
|----------------|-----|-------|
| Hook | `[excited]` / `[happy]` | 0–1 câu ≤10 từ |
| Agitate | `[whisper]` / `[calm]`, `[sigh]` | 0–1 mood; phi-ngôn-ngữ trong budget 2/video |
| Solve | *(neutral)* | Không mood tag |
| CTA | `[laughter]`, `[singing]` (tùy ngữ cảnh) | `[singing]` slogan ngắn nếu tự nhiên |

Metadata: `expressive_plan: { hook, agitate, solve, cta }` — liệt kê tag đã gắn.

## Timeline viral (60–180s)

Word budget: **~2.5 từ/giây**.

| Phần | % | Mục tiêu |
|------|---|----------|
| Hook | ~5% | Shock + **[SFX] bắt buộc** + optional `[excited]` |
| Agitate | ~25% | Nỗi đau + optional `[whisper]` |
| Solve | ~60% | Neutral — giải thích kỹ thuật |
| CTA/Loop | ~10% | Loop hook hoặc slogan |

## Thẻ production

| Thẻ | Phase 2 MCP |
|-----|-------------|
| `[BGM: mood]` | `short_video_search_bgm` |
| `[SFX: vine boom]` | **Bắt buộc** — `short_video_search_meme_sound` |
| `[Dừng 0.5s]` | Convert `. . .` khi TTS |

## Lưu qua MCP

**Không save draft trực tiếp.** `/humanize-audio-script` → `save_audio_script`.

## Anti-patterns

- Chèn tag sau humanize thay vì trong draft
- Bọc cả đoạn Solve trong `[excited]`
- >2 tag phi-ngôn-ngữ / video
- Script < 60s / > 180s; thiếu `[SFX]`; SSML
