# OmniVoice script tags — non-verbal **đã tắt**

**Model:** `k2-fsa/OmniVoice` (local `./omnivoice-tts.sh start`). **Guidance scale:** `2.0`.

**Non-verbal tags đã tắt:** không còn `[laughter]`, `[sigh]`, `[dissatisfaction-hnn]` trong script mới hay TTS. Server **strip** nếu script cũ còn; caption cũng strip.

**Đọc cùng:** [omnivoice-speech-script.md](omnivoice-speech-script.md)

---

## Cấm tuyệt đối (tag voice)

| Tag | Trạng thái |
|-----|------------|
| `[laughter]` | **Cấm** — strip khi save/TTS |
| `[sigh]` | **Cấm** — strip khi save/TTS |
| `[dissatisfaction-hnn]` | **Cấm** — strip khi save/TTS |
| `[gasp]`, `[happy]`, `[singing]`, `[whisper]`, … | **Cấm** — `disallowed_tag` / reject nếu còn sau strip |

**Mood / prosody:** dùng `. . .`, `?!`, dấu phẩy, câu ngắn — **không** dùng mood/non-verbal tag.

---

## Marker sản xuất (vẫn hợp lệ)

| Tag | Ghi chú |
|-----|---------|
| `[BGM:...]` | Phase 2 media — strip khi TTS |
| `[SFX:...]` | Hook bắt buộc `[SFX: vine boom]` — strip khi TTS |
| `[Dừng Ns]` | Convert → `. . .` khi TTS |

---

## `expressive_plan`

Metadata vẫn có field `{ hook, agitate, solve, cta }` — **luôn mảng rỗng** (không gắn tag voice).

```json
{
  "expressive_plan": {
    "hook": [],
    "agitate": [],
    "solve": [],
    "cta": []
  }
}
```

---

## Ví dụ script 90s (không tag voice)

```text
[BGM: lofi ambient] [SFX: vine boom] 99% dev dùng HyperFrames sai?!
Tưởng add skill là xong hả? Sai bét rồi!
Ba bước này . . . Làm đúng một lần thôi.
Xong là video tự nổ đấy!
Follow để không bỏ lỡ nè!
```

---

## Anti-patterns

| Lỗi | Sửa |
|-----|-----|
| `[laughter]` / `[sigh]` / `[dissatisfaction-hnn]` | Xóa — dùng `. . .` / `?!` / văn nói |
| `[happy]` / `[gasp]` / SSML | Xóa — chỉ `[BGM]`/`[SFX]`/`[Dừng]` |
| Mood tag | Prosody dấu câu |
