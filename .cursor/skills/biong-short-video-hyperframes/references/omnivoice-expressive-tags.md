# OmniVoice Expressive Tags — k2-fsa/OmniVoice

**Model:** `k2-fsa/OmniVoice` (local `./omnivoice-tts.sh start`). **Guidance scale:** `2.0`.

**Less is More:** ~90% giọng neutral + ~10% non-verbal. Tag gắn **khi viết draft** (`/viral-audio-script`), không paste sau humanize.

**Cấm tuyệt đối:** mọi tag **không** có trong bảng allowlist (vd. `[happy]`, `[singing]`, `[gasp]`, `[whisper]`). Server **reject** `save_audio_script` nếu có tag lạ.

**Đọc cùng:** [omnivoice-speech-script.md](omnivoice-speech-script.md)

---

## Allowlist (single source of truth)

Theo tài liệu chính thức OmniVoice — **13 tag non-verbal**:

| Tag | Nhóm | Ghi chú |
|-----|------|---------|
| `[laughter]` | Cười | CTA / twist vui |
| `[sigh]` | Thở | Agitate — hối hận, mệt mỏi |
| `[confirmation-en]` | Xác nhận | CTA — khẳng định ngắn |
| `[question-en]` | Câu hỏi | Hook — câu hỏi retoric |
| `[question-ah]` | Câu hỏi | Hook — ngữ điệu "ah" |
| `[question-oh]` | Câu hỏi | Hook — ngữ điệu "oh" |
| `[question-ei]` | Câu hỏi | Hook — ngữ điệu "ei" |
| `[question-yi]` | Câu hỏi | Hook — ngữ điệu "yi" |
| `[surprise-ah]` | Bất ngờ | Agitate — shock, twist |
| `[surprise-oh]` | Bất ngờ | Agitate — shock, twist |
| `[surprise-wa]` | Bất ngờ | Agitate — shock, twist |
| `[surprise-yo]` | Bất ngờ | Agitate — shock, twist |
| `[dissatisfaction-hnn]` | Bất mãn | Agitate — ức chế, thất vọng |

| Nhóm khác | Tag | Ghi chú |
|-----------|-----|---------|
| **Production** | `[BGM:...]`, `[SFX:...]`, `[Dừng Ns]` | Phase 2 media — strip khi TTS |

**Mood / prosody:** dùng `. . .`, `?!`, dấu phẩy, câu ngắn — **không** dùng mood tag.

OmniVoice TTS **giữ** 13 tag non-verbal; caption karaoke **strip** hết.

**Cấm:** `[gasp]` — không được OmniVoice hỗ trợ; dùng `[surprise-oh]` / `[surprise-ah]` thay cho shock Agitate.

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
| Câu hỏi | `[question-en]`, `[question-ah]`, `[question-oh]`, `[question-ei]`, `[question-yi]` | **Hook** | Câu hỏi gai, retoric |
| Thở / bất mãn | `[sigh]`, `[dissatisfaction-hnn]` | **Agitate** | Trước sai lầm, ức chế |
| Bất ngờ | `[surprise-ah]`, `[surprise-oh]`, `[surprise-wa]`, `[surprise-yo]` | **Agitate** | Shock, twist (thay `[gasp]`) |
| Cười / xác nhận | `[laughter]`, `[confirmation-en]` | **CTA / twist** | Punchline vui, khẳng định |
| *(neutral + ?!)* | — | **Hook / Solve / CTA** | Shock, pacing qua punctuation |

---

## Prompt mẫu (phase 1 agent)

```text
Model: k2-fsa/OmniVoice. CHỈ dùng tag allowlist (13 tag):
[laughter] [sigh] [confirmation-en]
[question-en] [question-ah] [question-oh] [question-ei] [question-yi]
[surprise-ah] [surprise-oh] [surprise-wa] [surprise-yo] [dissatisfaction-hnn]
CẤM [happy] [singing] [whisper] [gasp] và tag khác.

1. Hook: neutral + ?! + [SFX] — optional [question-*].
2. Agitate: [sigh] / [dissatisfaction-hnn] / [surprise-*] theo narrative.
3. Solve: neutral — . . . prosody.
4. CTA: optional [laughter] hoặc [confirmation-en] — slogan ngắn.
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

Ví dụ Agitate shock (thay `[gasp]`):

```text
Apple vừa làm cả thế giới chao đảo! [surprise-oh] Tưởng chỉ nâng cấp nhẹ, nhưng mà…
```

---

## Anti-patterns

| Lỗi | Sửa |
|-----|-----|
| `[happy]` / `[singing]` / `[whisper]` / `[gasp]` | Chỉ 13 tag allowlist |
| Tag sau humanize | Gắn lúc viral draft |
| Bọc Solve trong tag | Solve neutral + `. . .` |
