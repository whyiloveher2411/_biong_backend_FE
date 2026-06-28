# OmniVoice — ngôn ngữ thiết kế kịch bản thoại

**Bắt buộc** phase 1 khi TTS chain ưu tiên OmniVoice. Invoke sau `/extract-core-signals`, cùng `/hyperframes-creative` + `/viral-audio-script` + `/humanize-audio-script`.

Engine: OmniVoice FastAPI — **local** (`./omnivoice-tts.sh start`). Không hiểu SSML XML. Cấu hình: clone `audio_demo`, `OMNIVOICE_NUM_STEP=64`, speed `1.15`.

> **Expressive tags** gắn trong **`/viral-audio-script` draft** theo [omnivoice-expressive-tags.md](omnivoice-expressive-tags.md). `/humanize-audio-script` **giữ tag** — cấm thêm/xóa sau.

---

## Cấm tuyệt đối

| Cấm | Lý do |
|-----|-------|
| `<break>`, `<emphasis>`, mọi thẻ SSML | Model đọc thành ký tự — giọng robot |
| Văn viết học thuật, câu ghép dài | Không có nhịp nói tự nhiên |
| Liệt kê bullet trong một hơi thở | TTS đọc đều, nhàm |
| Chèn tag sau khi đã viết xong script | Giọng méo, phân bổ lệch |

---

## Ba lớp thẻ trong script

| Lớp | Thẻ | Gửi OmniVoice TTS | Caption |
|-----|-----|-------------------|---------|
| **Production** | `[BGM: mood]`, `[SFX: vine boom]`, `[Dừng 0.5s]` | Strip / convert → `. . .` | Strip |
| **Expressive mood** | `[happy]`, `[excited]`, `[whisper]`, `[calm]` | **Giữ** | Strip |
| **Non-verbal** | `[laughter]`, `[sigh]`, `[gasp]`, `[chuckle]` | **Giữ** | Strip |
| **Melodic** | `[singing]` | **Giữ** | Strip |
| **Prosody dấu câu** | `. . .` (chấm cách nhau) | **Giữ** | Giữ |

Chi tiết phân bổ: [omnivoice-expressive-tags.md](omnivoice-expressive-tags.md)

Server: production tags strip; expressive tags giữ cho OmniVoice; fallback VieNeu/Saydi/Vbee strip hết bracket.

---

## Quy trình phase 1 (4 bước)

### Bước 1 — `/hyperframes-creative`: văn hội thoại

Đọc [vi-voiceover-naturalization.md](vi-voiceover-naturalization.md) §1.

- Câu **≤12 từ**; dùng `?` và `!`
- Thay từ nối học thuật bằng văn nói (bảng §1)
- Nói như podcast TikTok — không câu ghép dài

### Bước 2 — `/viral-audio-script`: draft HASCAS + expressive tags

Đọc §3 pacing + §4 punctuation.

- Timeline 60–180s, markers, HASCAS
- **Gắn tag theo bảng expressive** — 80% neutral, 20% expressive
- Hook 0–3s giật gân; Agitate cảm thán ngắn brand-safe
- Dùng `...`, `?!`, chấm rời ở chỗ nhấn
- Metadata `expressive_plan: { hook, agitate, solve, cta }`

### Bước 3 — `/humanize-audio-script`: polish văn, giữ tag

Đọc §2 từ đệm + §1 bảng thay thế.

- Rewrite văn tự nhiên, thành ngữ, từ đệm hội thoại
- **Cấm** thêm/xóa/di chuyển expressive tags
- Self-check quota (docs) trước save

### Bước 4 — `save_audio_script`

- Verify: `[SFX]` bắt buộc, câu ≤12 từ, SSML cấm
- Không chèn tag mới ở bước này

---

## Ví dụ script 90s (Less is More)

```text
[BGM: lofi ambient] [SFX: vine boom] [excited] 99% dev dùng HyperFrames sai! . . .
[whisper] Bạn nghĩ add skill là xong à? [sigh] Sai bét rồi!
Ba bước này . . . init blank, add registry, sync timeline. Làm đúng một lần thôi.
[laughter] Xong là video tự nổ đấy!
```

---

## Sau TTS — caption sync

Prosody + expressive tags đổi duration MP3. Phase 2:

1. Transcribe lại MP3 → `transcript.json`
2. `sync-caption-from-script.mjs` → `verify-caption-sync.mjs --strict` → `gen-captions-html.mjs`

**Không** dùng `npx hyperframes inspect --sync-audio`.

---

## Anti-patterns

- SSML hoặc XML
- Chèn tag sau humanize
- Bọc đoạn dài trong `[excited]`/`[happy]`
- >2 tag phi-ngôn-ngữ / video
- Bỏ qua re-transcribe sau TTS OmniVoice
- Câu >12 từ liên tiếp
