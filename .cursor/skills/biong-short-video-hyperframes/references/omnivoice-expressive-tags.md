# OmniVoice Expressive Tags — k2-fsa/OmniVoice

**Model:** `k2-fsa/OmniVoice` (local `./omnivoice-tts.sh start`). **Guidance scale:** `2.0`.

**Less is More:** ~90% giọng neutral + ~10% non-verbal. Tag gắn **khi viết draft** (`/viral-audio-script`), không paste sau humanize.

**Cấm tuyệt đối:** mọi tag **không** có trong bảng allowlist (vd. `[happy]`, `[singing]`, `[gasp]`, `[whisper]`, `[question-oh]`, `[surprise-ah]`). Server **reject** `save_audio_script` nếu có tag lạ.

**Đọc cùng:** [omnivoice-speech-script.md](omnivoice-speech-script.md)

---

## Allowlist (single source of truth)

Theo tài liệu chính thức OmniVoice — **3 tag non-verbal**:

| Tag | Nhóm | Ghi chú |
|-----|------|---------|
| `[laughter]` | Cười | CTA / twist vui |
| `[sigh]` | Thở | Agitate — hối hận, mệt mỏi |
| `[dissatisfaction-hnn]` | Bất mãn | Agitate — ức chế, thất vọng |

| Nhóm khác | Tag | Ghi chú |
|-----------|-----|---------|
| **Production** | `[BGM:...]`, `[SFX:...]`, `[Dừng Ns]` | Phase 2 media — strip khi TTS |

**Mood / prosody:** dùng `. . .`, `?!`, dấu phẩy, câu ngắn — **không** dùng mood tag.

OmniVoice TTS **giữ** 3 tag non-verbal; caption karaoke **strip** hết.

**Cấm:** `[gasp]`, `[question-*]`, `[surprise-*]`, `[confirmation-en]` — không được OmniVoice hỗ trợ; dùng `?!`, `. . .` hoặc `[sigh]` / `[dissatisfaction-hnn]` cho Agitate.

---

## Quy tắc vàng

1. **Gắn khi viết** — tag nằm trong draft HASCAS; `/humanize-audio-script` **cấm** thêm/xóa/di chuyển tag
2. **1 tag = 1 vị trí** — không xếp chồng nhiều tag liên tiếp
3. **Solve neutral** — giải thích kỹ thuật không tag; dùng `. . .` và `,` đủ
4. **Less is more** — ưu tiên ít tag, đặt đúng HASCAS; **không** giới hạn số lượng cứng — khớp `expressive_plan`

---

## Bảng phân bổ theo HASCAS

| Nhóm tag | Tag gợi ý | Gợi ý / section | Ghi chú |
|----------|-----------|-----------------|---------|
| Thở / bất mãn | `[sigh]`, `[dissatisfaction-hnn]` | **Agitate** | Trước sai lầm, ức chế |
| Cười | `[laughter]` | **CTA / twist** | Punchline vui |
| *(neutral + ?!)* | — | **Hook / Solve / CTA** | Shock, pacing qua punctuation |

---

## Prompt mẫu (phase 1 agent)

```text
Model: k2-fsa/OmniVoice. CHỈ dùng tag allowlist (3 tag):
[laughter] [sigh] [dissatisfaction-hnn]
CẤM [happy] [singing] [whisper] [gasp] [question-*] [surprise-*] [confirmation-en] và tag khác.

1. Hook: neutral + ?! + [SFX] — không tag.
2. Agitate: [sigh] / [dissatisfaction-hnn] theo narrative.
3. Solve: neutral — . . . prosody.
4. CTA: optional [laughter] — slogan ngắn.
5. Ghi đủ tag trong expressive_plan — không giới hạn số lượng cứng.
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

Ví dụ Agitate ức chế:

```text
Apple vừa làm cả thế giới chao đảo! [dissatisfaction-hnn] Tưởng chỉ nâng cấp nhẹ, nhưng mà…
```

---

## Anti-patterns

| Lỗi | Sửa |
|-----|-----|
| `[happy]` / `[singing]` / `[whisper]` / `[gasp]` / `[question-*]` / `[surprise-*]` | Chỉ 3 tag allowlist |
| Tag sau humanize | Gắn lúc viral draft |
| Bọc Solve trong tag | Solve neutral + `. . .` |
