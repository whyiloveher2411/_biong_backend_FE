# OmniVoice — ngôn ngữ thiết kế kịch bản thoại

**Bắt buộc** phase 1 khi TTS chain ưu tiên OmniVoice. Invoke sau `/extract-core-signals`, cùng `/hyperframes-creative` + `/viral-audio-script` + `/humanize-audio-script`.

Engine: OmniVoice FastAPI — **Kaggle GPU** (`./kaggle/omnivoice-tts/resume-kaggle.sh`) hoặc **local** (`./omnivoice-tts.sh start`). Không hiểu SSML XML. Cấu hình: clone `audio_demo`, `OMNIVOICE_NUM_STEP=64`, speed `1.15`.

> **Thẻ emotion/prosody** (`[laughter]`, `. . .`, `[SFX]`, `[BGM]`) áp **sau** `/humanize-audio-script` — bước cuối trước `save_audio_script`.

---

## Cấm tuyệt đối

| Cấm | Lý do |
|-----|-------|
| `<break>`, `<emphasis>`, mọi thẻ SSML | Model đọc thành ký tự — giọng robot |
| Văn viết học thuật, câu ghép dài | Không có nhịp nói tự nhiên |
| Liệt kê bullet trong một hơi thở | TTS đọc đều, nhàm |

---

## Hai lớp thẻ trong script

| Lớp | Thẻ | Mục đích | Gửi OmniVoice TTS | Caption hiển thị |
|-----|-----|----------|-------------------|------------------|
| **Production** | `[BGM: mood]`, `[SFX: vine boom]`, `[Dừng 0.5s]` | Phase 2 MCP media | Strip / convert pause → `. . .` | Strip |
| **Prosody OmniVoice** | `[laughter]`, `[sigh]`, `[gasp]`, `[chuckle]`, `[whisper]` | Ngữ điệu phi ngôn ngữ | **Giữ** | Strip |
| **Prosody dấu câu** | `. . .` (chấm cách nhau) | Ngắt nghỉ dài | **Giữ** | Giữ |

Server tự xử lý khi `generate_narration_tts`: production tags bị loại; emotion tags giữ cho OmniVoice; fallback VieNeu/Saydi/Vbee strip hết bracket.

---

## Quy trình phase 1 (4 bước)

### Bước 1 — `/hyperframes-creative`: văn hội thoại

Phá cấu trúc câu ghép marketing → câu nói lướt, cảm thán, hỏi tu từ:

- Câu **≤12 từ**
- Dùng `?` và `!` thay vì giải thích dài
- Tránh từ nối học thuật: "do đó", "tuy nhiên", "ngoài ra"
- Nói như podcast TikTok — không như báo chí

### Bước 2 — `/viral-audio-script`: bản nháp HASCAS

- Timeline 60–180s, markers, cấu trúc Hook → Agitate → Solve → CTA
- Có thể còn giọng AI — **chưa save**

### Bước 3 — `/humanize-audio-script`: văn người thật

Viết lại draft theo văn phong tự nhiên, thành ngữ, ví von — đọc [humanize-audio-script.md](humanize-audio-script.md).

### Bước 4 — Checklist OmniVoice (trong humanize hoặc ngay sau)

1. **Thẻ cảm xúc inline** — trước/sau Hook và twist:

   `[laughter]` cười nhẹ · `[sigh]` thở dài · `[gasp]` thở dốc · `[chuckle]` cười khẽ · `[whisper]` thì thầm

2. **Dấu câu ép ngắt nghỉ (prosody control)** — OmniVoice tính độ trễ từ dấu câu:

   - Ngắt ngắn: dấu phẩy `,`
   - Ngắt dài / dramatic: `. . .` (chấm cách nhau)
   - Ví dụ: `Bạn nghĩ code dễ? . . . Sai lầm rồi!`

3. **Thẻ production** — giữ cho phase 2:

   `[BGM: lofi ambient]` · `[SFX: vine boom]` · `[Dừng 0.5s]` (server convert → `. . .` khi TTS)

4. **Tốc độ & chất lượng** — `OMNIVOICE_SHORT_VIDEO_SPEED=1.15`, `OMNIVOICE_NUM_STEP=64` (Kaggle + local đồng bộ).

5. **Script dài 60–180s** — vẫn single-pass clone; nếu >120s theo dõi timeout OmniVoice (`OMNIVOICE_TTS_TIMEOUT_SECONDS`). Viết đủ word budget (~2.5 từ/giây).

---

## Ví dụ script lý tưởng

```text
[BGM: lofi ambient] [SFX: vine boom] [laughter] 99% mọi người đang dùng HyperFrames sai cách . . . mà không hề biết! [sigh] Bạn nghĩ cứ add skill là video tự đẹp? . . . Sai lầm! Bí mật nằm ở chỗ này nè. Ba bước sau đây . . . Làm đúng một lần thôi.
```

---

## Sau TTS — caption sync

Prosody tags và `. . .` làm **đổi duration MP3**. Phase 2 bắt buộc:

1. Transcribe lại `audio_file` → `transcript.json`
2. `sync-caption-from-script.mjs` → `verify-caption-sync.mjs --strict` → `gen-captions-html.mjs`

**Không** dùng text Whisper làm subtitle — chỉ lấy timing.

---

## Anti-patterns

- SSML hoặc XML trong script
- `[laughter]` hiển thị trên caption (server strip tự động)
- Bỏ qua re-transcribe sau MCP TTS OmniVoice
- Script không có emotion tag ở Hook
- Câu >12 từ liên tiếp
