# humanize-audio-script — văn người thật

Skill phase 1. Invoke: `/humanize-audio-script` **sau** `/viral-audio-script` (bản nháp), **trước** `save_audio_script`.

**Đọc trước:** [omnivoice-speech-script.md](omnivoice-speech-script.md)

---

## Vai trò trong pipeline

| Bước | Output |
|------|--------|
| `/viral-audio-script` | Bản **nháp** HASCAS — cấu trúc đúng, có thể còn giọng AI |
| **`/humanize-audio-script`** | Script **cuối** — văn nói tự nhiên, thành ngữ, ví von |
| Checklist OmniVoice | `[SFX]`, emotion tags, prosody, ≤12 từ/câu |
| `save_audio_script` | Lưu + validation server |

---

## Prompt template

```text
Hãy viết lại đoạn văn sau theo văn phong tự nhiên, dùng từ ngữ giao tiếp hàng ngày của người thật.
Hãy thêm các thành ngữ hoặc cách nói ví von, thay đổi cấu trúc câu linh hoạt để bài viết không bị khô khan và máy móc.
Dưới đây là đoạn văn cần sửa: [DRAFT_SCRIPT]
```

Humanize **toàn bộ** draft hoặc từng section (Hook, Agitate, Solve, CTA) rồi ghép lại — giữ timeline và markers.

---

## Ví dụ before / after

**Before (giọng AI):**
> Do đó, việc sử dụng HyperFrames không đúng cách sẽ dẫn đến kết quả không mong muốn trong quá trình tạo video marketing.

**After (văn người thật):**
> Dùng HyperFrames kiểu này . . . [sigh] Video ra toàn lỗi thôi!

**Before:**
> Ngoài ra, bạn cần lưu ý rằng việc thêm skill vào project là chưa đủ.

**After:**
> Tưởng add skill là xong? . . . [laughter] Còn lâu mới đủ!

---

## Anti-patterns

| Lỗi | Hậu quả |
|-----|----------|
| Bỏ qua humanize, save draft viral trực tiếp | Script khô, máy móc — TTS nghe robot |
| Humanize xong mất `[SFX: ...]` | Server reject `save_audio_script` |
| Câu >12 từ sau humanize | OmniVoice đọc đều, mất nhịp viral |
| Thêm claims/facts không có trong nguồn | Sai nội dung marketing |
| Giọng quá slang / thô tục | Không phù hợp brand Spacedev |
| SSML `<break>` sau humanize | OmniVoice đọc thành ký tự |

---

## Checklist trước save

- [ ] Đã humanize toàn bộ draft
- [ ] Giữ HASCAS + `estimated_duration_sec` 60–180
- [ ] Có `[SFX: vine boom]` (hoặc tương đương) ở Hook
- [ ] Có `[BGM: mood]` ở đầu
- [ ] Emotion tags + prosody `. . .` ở Hook/twist
- [ ] Mọi câu ≤12 từ
- [ ] Không SSML
- [ ] `markers` text khớp script cuối
