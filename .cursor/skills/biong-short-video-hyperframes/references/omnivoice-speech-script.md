# OmniVoice — ngôn ngữ thiết kế kịch bản thoại

**Bắt buộc** phase 1 khi TTS chain ưu tiên OmniVoice. Invoke sau `/extract-core-signals`, cùng `/hyperframes-creative` + `/viral-audio-script` + `/humanize-audio-script` + `/audit-audio-script`.

Engine: **k2-fsa/OmniVoice** — OmniVoice FastAPI local (`./omnivoice-tts.sh start`). `OMNIVOICE_GUIDANCE_SCALE=2`. Không hiểu SSML XML.

> **Non-verbal tags** gắn trong **`/viral-audio-script` draft** theo [omnivoice-expressive-tags.md](omnivoice-expressive-tags.md). `/humanize-audio-script` **giữ tag** — cấm thêm/xóa sau.

---

## Cấm tuyệt đối

| Cấm | Lý do |
|-----|-------|
| `<break>`, `<emphasis>`, mọi thẻ SSML | Model đọc thành ký tự — giọng robot |
| Mood tag `[happy]`, `[singing]`, `[whisper]`, … | Base OmniVoice không hỗ trợ — server reject |
| Văn viết học thuật, câu ghép dài | Không có nhịp nói tự nhiên |
| Chèn tag sau khi đã viết xong script | Giọng méo, phân bổ lệch |

---

## Ba lớp thẻ trong script

| Lớp | Thẻ | Gửi OmniVoice TTS | Caption |
|-----|-----|-------------------|---------|
| **Production** | `[BGM: mood]`, `[SFX: vine boom]`, `[Dừng 0.5s]` | Strip / convert → `. . .` | Strip |
| **Non-verbal** | allowlist 13 tag OmniVoice (xem omnivoice-expressive-tags.md) | **Giữ** | Strip |
| **Prosody dấu câu** | `. . .` (chấm cách nhau), `?!` | **Giữ** | Giữ |

Chi tiết allowlist: [omnivoice-expressive-tags.md](omnivoice-expressive-tags.md).

Server: production tags strip; 3 tag non-verbal giữ cho OmniVoice; fallback VieNeu/Saydi/Vbee strip hết bracket.

---

## Quy trình phase 1 (4 bước)

### Bước 1 — `/hyperframes-creative`: văn hội thoại

Đọc [vi-voiceover-naturalization.md](vi-voiceover-naturalization.md) §1.

- Câu **≤12 từ**; dùng `?` và `!`
- Thay từ nối học thuật bằng văn nói (bảng §1)
- Nói như podcast TikTok — không câu ghép dài

### Bước 2 — `/viral-audio-script`: draft HASCAS + non-verbal tags

Đọc §3 pacing + §4 punctuation.

- Timeline 60–180s, markers, HASCAS
- **Gắn tag** theo allowlist OmniVoice (13 tag) — tối đa 2 / video; xem omnivoice-expressive-tags.md
- Mood qua `. . .`, `?!`, câu ngắn — **không** mood tag
- Metadata `expressive_plan: { hook, agitate, solve, cta }`

### Bước 3 — `/humanize-audio-script`: polish văn, giữ tag

- **Cấm** thêm/xóa/di chuyển non-verbal tags
- Chuyển sang `/audit-audio-script` — không save trực tiếp

### Bước 4 — `/audit-audio-script`: QA + sửa lỗi

Đọc [audit-audio-script.md](audit-audio-script.md).

- Chẩn đoán Bullet Syndrome, Missing Narrative Flow, Hook loop collision
- `script_diagnosis.pass === true` bắt buộc trước save
- Retry tối đa 2 vòng

### Bước 5 — `save_audio_script`

- Verify: `[SFX]` bắt buộc, câu ≤12 từ, SSML cấm, tag trong allowlist
- Lưu `script_diagnosis` trong metadata (audit trail)

---

## Ví dụ script 90s

```text
[BGM: lofi ambient] [SFX: vine boom] 99% dev dùng HyperFrames sai?!
Tưởng add skill là xong hả? [sigh] Sai bét rồi!
Ba bước này . . . init blank, add registry, sync timeline. Làm đúng một lần thôi.
[laughter] Xong là video tự nổ đấy!
Follow để không bỏ lỡ nè!
```

---

## Sau TTS — caption sync

Prosody + non-verbal tags đổi duration MP3. Phase 2:

1. Transcribe lại MP3 → `transcript.json`
2. `sync-caption-from-script.mjs` → `verify-caption-sync.mjs --strict` → `gen-captions-html.mjs`

---

## Anti-patterns

- SSML hoặc XML
- `[happy]` / `[singing]` / `[gasp]` / mood tag
- Chèn tag sau humanize
- >2 tag non-verbal / video
- Câu >12 từ liên tiếp
