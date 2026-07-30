# OmniVoice — ngôn ngữ thiết kế kịch bản thoại

**Bắt buộc** phase 1 khi TTS chain ưu tiên OmniVoice. Invoke sau `/extract-core-signals`, cùng `/hyperframes-creative` + `/viral-audio-script` + `/audit-audio-script`.

Engine: **k2-fsa/OmniVoice** — OmniVoice FastAPI local (`./omnivoice-tts.sh start`). `OMNIVOICE_GUIDANCE_SCALE=2`. Không hiểu SSML XML.

> **Non-verbal tags đã tắt.** Không gắn `[laughter]` / `[sigh]` / `[dissatisfaction-hnn]`. Chi tiết: [omnivoice-expressive-tags.md](omnivoice-expressive-tags.md).

---

## Cấm tuyệt đối

| Cấm | Lý do |
|-----|-------|
| `<break>`, `<emphasis>`, mọi thẻ SSML | Model đọc thành ký tự — giọng robot |
| Tag voice `[laughter]`, `[sigh]`, `[dissatisfaction-hnn]` | Đã tắt — strip khi save/TTS |
| Mood tag `[happy]`, `[singing]`, `[whisper]`, `[gasp]`, … | Không hỗ trợ — `disallowed_tag` |
| Văn viết học thuật, câu ghép dài | Không có nhịp nói tự nhiên |

---

## Hai lớp thẻ trong script

| Lớp | Thẻ | Gửi OmniVoice TTS | Caption |
|-----|-----|-------------------|---------|
| **Production** | `[BGM: mood]`, `[SFX: vine boom]`, `[Dừng 0.5s]` | Strip / convert → `. . .` | Strip |
| **Prosody dấu câu** | `. . .` (chấm cách nhau), `?!` | **Giữ** | Giữ |

Legacy non-verbal (nếu còn trong script cũ): **strip** trước TTS — không gửi model.

Server: production + legacy non-verbal strip; fallback VieNeu/Saydi/Vbee strip hết bracket.

---

## Quy trình phase 1 (4 bước)

### Bước 1 — `/hyperframes-creative`: văn hội thoại

Đọc [vi-voiceover-naturalization.md](vi-voiceover-naturalization.md) §1.

- Câu tự nhiên; dùng `?` và `!`
- Thay từ nối học thuật bằng văn nói (bảng §1)
- Nói như podcast TikTok — không câu ghép dài

### Bước 2 — `/viral-audio-script`: draft HASCAS

Đọc §3 pacing + §4 punctuation.

- Timeline 60–180s, markers, HASCAS
- **Không** gắn tag voice; `expressive_plan` rỗng
- Mood qua `. . .`, `?!`, câu ngắn
- Metadata `expressive_plan: { hook: [], agitate: [], solve: [], cta: [] }`

### Bước 3 — `/audit-audio-script`: QA + sửa lỗi

Đọc [audit-audio-script.md](audit-audio-script.md).

- Chẩn đoán Bullet Syndrome, Missing Narrative Flow, Hook loop collision
- `script_diagnosis.pass === true` bắt buộc trước save
- Retry tối đa 2 vòng

### Bước 4 — `save_audio_script`

- Verify: `[SFX]` bắt buộc, SSML cấm, không tag voice
- Lưu `script_diagnosis` trong metadata (audit trail)

---

## Ví dụ script 90s

```text
[BGM: lofi ambient] [SFX: vine boom] 99% dev dùng HyperFrames sai?!
Tưởng add skill là xong hả? Sai bét rồi!
Ba bước này . . . init blank, add registry, sync timeline. Làm đúng một lần thôi.
Xong là video tự nổ đấy!
Follow để không bỏ lỡ nè!
```

---

## Sau TTS — caption sync

Prosody đổi duration MP3. Phase 2:

1. Transcribe lại MP3 → `transcript.json`
2. `sync-caption-from-script.mjs` → `verify-caption-sync.mjs --strict` → `gen-captions-html.mjs`

---

## Anti-patterns

- SSML hoặc XML
- Tag voice / mood (`[laughter]`, `[sigh]`, `[happy]`, `[gasp]`, …)
- Câu ghép dài liên tiếp khó nghe TTS
