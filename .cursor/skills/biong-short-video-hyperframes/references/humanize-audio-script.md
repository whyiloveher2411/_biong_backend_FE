# humanize-audio-script — văn người thật (giữ tag)

Skill phase 1. Invoke: **sau** `/viral-audio-script`, **trước** `save_audio_script`.

**Đọc trước:** [vi-voiceover-naturalization.md](vi-voiceover-naturalization.md) §2 · [omnivoice-expressive-tags.md](omnivoice-expressive-tags.md) · [omnivoice-speech-script.md](omnivoice-speech-script.md)

---

## Vai trò

| Bước | Làm gì |
|------|--------|
| `/viral-audio-script` | Draft HASCAS **+ gắn expressive tags** |
| **`/humanize-audio-script`** | Polish văn — **từ đệm §2** + bảng thay thế §1 — **giữ tag slots** |
| `save_audio_script` | Lưu — không chèn tag mới |

**Cấm:** sinh script xong rồi chèn tag vô tội vạ ở humanize hoặc save.

---

## Trọng tâm humanize (§2 từ đệm)

Chủ động thêm conversational anchors — không nhồi mỗi câu:

- Đầu: "Biết sao không?…", "Nghe nè…", "Bật mí nhé…"
- Cuối: "…nè", "…đúng không?", "…luôn á!"
- Thay từ học thuật theo bảng [vi-voiceover-naturalization.md](vi-voiceover-naturalization.md) §1

---

## Prompt template

Thêm dòng bảo toàn tag vào prompt humanize (xem SKILL.md slash skill).

---

## Ví dụ — giữ tag slots

**Draft viral:**
> [excited] 99% dev dùng HyperFrames sai! Do đó họ bỏ qua bước quan trọng. [sigh] Sai rồi!

**Sau humanize (tag giữ nguyên, văn tự nhiên hơn):**
> [excited] Nghe nè — 99% dev xài HyperFrames sai bét! [whisper] Tưởng add skill là xong hả? [sigh] Lệch bét rồi!

---

## Anti-patterns

| Lỗi | Hậu quả |
|-----|----------|
| Humanize thêm `[laughter]` mới | Vượt quota — giọng kịch quá |
| Humanize xóa `[whisper]` | Mất contrast Agitate |
| Di chuyển tag sang section khác | Lệch HASCAS / timeline cảm xúc |
| Save draft viral không humanize | Văn AI khô |
| Giữ "do đó", "tiến hành" | Robot, không văn nói |

---

## Self-check trước save

- [ ] Số tag và loại tag khớp `expressive_plan`
- [ ] Không tag mới so với viral draft
- [ ] `[SFX]` + `[BGM]` còn nguyên
- [ ] ≤2 phi-ngôn-ngữ / video
- [ ] Mọi câu ≤12 từ
- [ ] Có 2–4 từ đệm tự nhiên (§2)
