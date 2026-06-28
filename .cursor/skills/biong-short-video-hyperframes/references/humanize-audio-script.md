# humanize-audio-script — văn người thật (giữ tag)

Skill phase 1. Invoke: **sau** `/viral-audio-script`, **trước** `save_audio_script`.

**Đọc trước:** [omnivoice-expressive-tags.md](omnivoice-expressive-tags.md) · [omnivoice-speech-script.md](omnivoice-speech-script.md)

---

## Vai trò

| Bước | Làm gì |
|------|--------|
| `/viral-audio-script` | Draft HASCAS **+ gắn expressive tags** |
| **`/humanize-audio-script`** | Polish văn — **giữ tag slots** |
| `save_audio_script` | Lưu — không chèn tag mới |

**Cấm:** sinh script xong rồi chèn tag vô tội vạ ở humanize hoặc save.

---

## Prompt template

Thêm dòng bảo toàn tag vào prompt humanize (xem SKILL.md).

---

## Ví dụ — giữ tag slots

**Draft viral:**
> [excited] 99% dev dùng HyperFrames sai! [whisper] Bạn nghĩ add skill là xong? [sigh] Sai rồi!

**Sau humanize (tag giữ nguyên, văn tự nhiên hơn):**
> [excited] 99% dev xài HyperFrames sai bét! [whisper] Tưởng add skill là xong hả? [sigh] Lệch bét rồi!

---

## Anti-patterns

| Lỗi | Hậu quả |
|-----|----------|
| Humanize thêm `[laughter]` mới | Vượt quota — giọng kịch quá |
| Humanize xóa `[whisper]` | Mất contrast Agitate |
| Di chuyển tag sang section khác | Lệch HASCAS / timeline cảm xúc |
| Save draft viral không humanize | Văn AI khô |

---

## Self-check trước save

- [ ] Số tag và loại tag khớp `expressive_plan`
- [ ] Không tag mới so với viral draft
- [ ] `[SFX]` + `[BGM]` còn nguyên
- [ ] ≤2 phi-ngôn-ngữ / video
- [ ] Mọi câu ≤12 từ
