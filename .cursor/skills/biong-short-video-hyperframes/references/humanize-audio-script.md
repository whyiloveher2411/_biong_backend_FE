# humanize-audio-script — polish văn, giữ non-verbal tags

**Vai trò:** Lớp polish sau `/viral-audio-script` — văn người thật, **giữ nguyên** non-verbal tags allowlist OmniVoice (3 tag), **giữ Narrative Flow**.

**Đọc trước:** [narrative-flow-vi.md](narrative-flow-vi.md) · [vi-voiceover-naturalization.md](vi-voiceover-naturalization.md) §2 · [omnivoice-expressive-tags.md](omnivoice-expressive-tags.md) · [omnivoice-speech-script.md](omnivoice-speech-script.md)

---

## Luồng

| Bước | Skill | Output |
|------|-------|--------|
| `/extract-core-signals` | narrative_chain + perspective |
| `/hyperframes-creative` | Thiết kế But/Therefore |
| `/viral-audio-script` | Draft HASCAS **+ gắn non-verbal tags** |
| `/humanize-audio-script` | Polish văn — **giữ tag slots + But/Therefore** |
| `/audit-audio-script` | QA + sửa lỗi — pass bắt buộc trước save |
| `save_audio_script` | Lưu script cuối — server validate allowlist |

---

## Narrative Flow khi humanize

- **Cấm** thêm từ liệt kê: Tiếp theo, Ngoài ra, Đầu tiên…
- **Giữ** chuỗi But/Therefore từ draft — không flatten thành câu rời
- Gom spec/thông số nếu draft còn rải rác

---

## Ví dụ — giữ tag slots + narrative

**Draft viral:**
> Apple tung chip 8 nhân mới. Chip tiết kiệm pin 30%. Giá 900 USD.

**Sau humanize (tag + But/Therefore):**
> Apple vừa làm cả thế giới chao đảo! Tưởng chỉ nâng cấp nhẹ, nhưng mà… [dissatisfaction-hnn] pin tiết kiệm tới 30% luôn á! Chính vì vậy… giá 900 USD lần này là cú hích lớn!

**Ví dụ khác — giữ tag slots:**
> 99% dev dùng HyperFrames sai! Do đó họ bỏ qua bước quan trọng. [sigh] Sai rồi!

**Sau humanize:**
> Nghe nè — 99% dev xài HyperFrames sai bét! Tưởng add skill là xong hả? [sigh] Lệch bét rồi!

---

## Anti-patterns

| Lỗi | Hậu quả |
|-----|---------|
| Humanize thêm tag mới ngoài `expressive_plan` | expressive_plan lệch; giọng kịch quá |
| Dùng `[happy]`, `[gasp]` hoặc tag ngoài allowlist | Server reject save_audio_script |
| Di chuyển `[sigh]` sang câu khác | expressive_plan lệch |
| Thêm "Tiếp theo / Ngoài ra" khi polish | Structural summarization quay lại |
| Flatten But/Therefore thành câu rời | Script khô, mất retention |

---

## Checklist

- [ ] Số tag và loại tag khớp `expressive_plan`
- [ ] Chỉ allowlist 3 tag (xem omnivoice-expressive-tags.md)
- [ ] Không SSML; câu ≤12 từ
- [ ] Không từ blocklist liệt kê
- [ ] But/Therefore còn nguyên sau polish
