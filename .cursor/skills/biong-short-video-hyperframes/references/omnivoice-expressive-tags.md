# OmniVoice Expressive Tags — k2-fsa/OmniVoice

**Model:** `k2-fsa/OmniVoice` (local `./omnivoice-tts.sh start`). **Guidance scale:** `2.0`.

**Less is More:** ~90% giọng neutral + ~10% non-verbal. Tag gắn **khi viết draft** (`/viral-audio-script`), không paste sau humanize.

**Cấm tuyệt đối:** mọi tag **không** có trong bảng allowlist (vd. `[happy]`, `[singing]`, `[chuckle]`). Server **reject** `save_audio_script` nếu có tag lạ.

**Đọc cùng:** [omnivoice-speech-script.md](omnivoice-speech-script.md)

---

## Allowlist (single source of truth)

| Nhóm | Tag | Ghi chú |
|------|-----|---------|
| **Non-verbal** | `[laughter]`, `[sigh]`, `[gasp]` | Phi-ngôn-ngữ — tối đa **2 / video** |
| **Production** | `[BGM:...]`, `[SFX:...]`, `[Dừng Ns]` | Phase 2 media — strip khi TTS |

**Mood / prosody:** dùng `. . .`, `?!`, dấu phẩy, câu ngắn — **không** dùng mood tag.

OmniVoice TTS **giữ** 3 tag non-verbal; caption karaoke **strip** hết.

---

## Quy tắc vàng

1. **Gắn khi viết** — tag nằm trong draft HASCAS; `/humanize-audio-script` **cấm** thêm/xóa/di chuyển tag
2. **1 tag = 1 vị trí** — không xếp chồng nhiều tag liên tiếp
3. **Solve neutral** — giải thích kỹ thuật không tag; dùng `. . .` và `,` đủ
4. **Quota** — tối đa 2 trong `[laughter]` / `[sigh]` / `[gasp]` mỗi video

---

## Bảng phân bổ theo HASCAS

| Tag | Quota | Section | Ghi chú |
|-----|-------|---------|---------|
| *(neutral + ?!)* | ~90% | **Hook / Solve / CTA** | Shock, pacing qua punctuation |
| `[sigh]` | 0–1 | **Agitate** | Trước sai lầm, hối hận |
| `[gasp]` | 0–1 | **Agitate** | Shock, twist |
| `[laughter]` | 0–1 | **CTA / twist** | Trước punchline vui |

---

## Prompt mẫu (phase 1 agent)

```text
Model: k2-fsa/OmniVoice. CHỈ dùng tag allowlist:
[laughter] [sigh] [gasp]
CẤM [happy] [singing] [whisper] và tag khác.

1. Hook: neutral + ?! + [SFX] — không mood tag.
2. Agitate: [sigh] hoặc [gasp] — tối đa 1.
3. Solve: neutral — . . . prosody.
4. CTA: optional [laughter] — slogan ngắn.
5. Tổng non-verbal ≤ 2 / video.
```

---

## Ví dụ script 90s

```text
[BGM: lofi ambient] [SFX: vine boom] 99% dev dùng HyperFrames sai?!
Tưởng add skill là xong hả? [sigh] Sai bét rồi!
Ba bước này . . . Làm đúng một lần thôi.
[laughter] Xong là video tự nổ đấy!
Follow để không bỏ lỡ nè!
```

```json
{
  "expressive_plan": {
    "hook": [],
    "agitate": ["[sigh]"],
    "solve": [],
    "cta": ["[laughter]"]
  }
}
```

---

## Anti-patterns

| Lỗi | Sửa |
|-----|-----|
| `[happy]` / `[singing]` / `[whisper]` | Chỉ 3 tag non-verbal |
| >2 tag `[laughter]`/`[sigh]`/`[gasp]` | Quota tối đa 2 |
| Tag sau humanize | Gắn lúc viral draft |
| Bọc Solve trong tag | Solve neutral + `. . .` |
