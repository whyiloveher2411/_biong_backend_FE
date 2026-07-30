# humanize-audio-script — polish văn (optional)

**Vai trò:** Lớp polish sau `/viral-audio-script` — văn người thật, **giữ Narrative Flow**. Pipeline chính one-pass thường **không** cần bước này.

**Đọc trước:** [narrative-flow-vi.md](narrative-flow-vi.md) · [vi-voiceover-naturalization.md](vi-voiceover-naturalization.md) §2 · [omnivoice-expressive-tags.md](omnivoice-expressive-tags.md) · [omnivoice-speech-script.md](omnivoice-speech-script.md)

---

## Luồng

| Bước | Skill | Output |
|------|-------|--------|
| `/extract-core-signals` | narrative_chain + perspective |
| `/hyperframes-creative` | Thiết kế But/Therefore |
| `/viral-audio-script` | Draft HASCAS (không tag voice) |
| `/humanize-audio-script` | Polish văn — giữ But/Therefore |
| `/audit-audio-script` | QA + sửa lỗi — pass bắt buộc trước save |
| `save_audio_script` | Lưu script cuối — strip legacy non-verbal nếu còn |

---

## Narrative Flow khi humanize

- **Cấm** thêm từ liệt kê: Tiếp theo, Ngoài ra, Đầu tiên…
- **Giữ** chuỗi But/Therefore từ draft — không flatten thành câu rời
- Gom spec/thông số nếu draft còn rải rác
- **Cấm** thêm `[laughter]` / `[sigh]` / `[dissatisfaction-hnn]`

---

## Ví dụ — Narrative Flow (không tag voice)

**Draft khô:**
> Apple tung chip 8 nhân mới. Chip tiết kiệm pin 30%. Giá 900 USD.

**Sau humanize:**
> Apple vừa làm cả thế giới chao đảo! Tưởng chỉ nâng cấp nhẹ, nhưng mà… pin tiết kiệm tới 30% luôn á! Chính vì vậy… giá 900 USD lần này là cú hích lớn!

**Ví dụ khác:**
> Nghe nè — 99% dev xài HyperFrames sai bét! Tưởng add skill là xong hả? Lệch bét rồi!

---

## Anti-patterns

| Lỗi | Hậu quả |
|-----|---------|
| Thêm tag voice / mood | TTS không dùng; audit `disallowed_tag` |
| Thêm "Tiếp theo / Ngoài ra" khi polish | Structural summarization quay lại |
| Flatten But/Therefore thành câu rời | Script khô, mất retention |

---

## Checklist

- [ ] Không tag voice / SSML
- [ ] Câu tự nhiên, plain language
- [ ] Không từ blocklist liệt kê
- [ ] But/Therefore còn nguyên sau polish
