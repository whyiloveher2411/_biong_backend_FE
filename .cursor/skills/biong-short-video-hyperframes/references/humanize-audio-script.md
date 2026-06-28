# humanize-audio-script — polish văn, giữ non-verbal tags

**Vai trò:** Lớp polish sau `/viral-audio-script` — văn người thật, **giữ nguyên** `[laughter]` `[sigh]` `[gasp]`.

**Đọc trước:** [vi-voiceover-naturalization.md](vi-voiceover-naturalization.md) §2 · [omnivoice-expressive-tags.md](omnivoice-expressive-tags.md) · [omnivoice-speech-script.md](omnivoice-speech-script.md)

---

## Luồng

| Bước | Skill | Output |
|------|-------|--------|
| `/viral-audio-script` | Draft HASCAS **+ gắn non-verbal tags** |
| `/humanize-audio-script` | Polish văn — **giữ tag slots** |
| `save_audio_script` | Lưu — server validate allowlist |

---

## Ví dụ — giữ tag slots

**Draft viral:**
> 99% dev dùng HyperFrames sai! Do đó họ bỏ qua bước quan trọng. [sigh] Sai rồi!

**Sau humanize (tag giữ nguyên, văn tự nhiên hơn):**
> Nghe nè — 99% dev xài HyperFrames sai bét! Tưởng add skill là xong hả? [sigh] Lệch bét rồi!

---

## Anti-patterns

| Lỗi | Hậu quả |
|-----|---------|
| Humanize thêm `[laughter]` mới | Vượt quota — giọng kịch quá |
| Dùng `[happy]` hoặc tag ngoài allowlist | Server reject save_audio_script |
| Di chuyển `[sigh]` sang câu khác | expressive_plan lệch |

---

## Checklist

- [ ] Số tag và loại tag khớp `expressive_plan`
- [ ] ≤2 non-verbal / video — chỉ `[laughter]` `[sigh]` `[gasp]`
- [ ] Không SSML; câu ≤12 từ
