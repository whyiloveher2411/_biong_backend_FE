# Plain language storytelling — kể chuyện dễ hiểu (tiếng Việt)

Áp dụng **Phase 1** khi viết và audit `audio_script`. Mục tiêu: nghe như đang **giải thích cho bạn 12 tuổi** — không đọc báo cáo, không văn AI.

**Đọc kèm:** [narrative-flow-vi.md](narrative-flow-vi.md) · [vi-voiceover-naturalization.md](vi-voiceover-naturalization.md)

---

## 1. Quy tắc "12 tuổi"

- Dùng **từ ngắn, đời thường** — tránh jargon không giải thích
- Mỗi khái niệm khó: **1 câu ví dụ** hoặc so sánh đời (điện thoại, game, bài tập…)
- Giọng **kể chuyện** — như nói với bạn nghe podcast, không brochure công ty
- Giữ **But/Therefore** — nối ý bằng *Nhưng mà, Thành ra, Tưởng vậy là…* (xem narrative-flow-vi.md)
- **Cấm** từ liệt kê: *Một là, Tiếp theo, Ngoài ra, Đầu tiên…*

| Khó hiểu | Nói đơn giản |
|----------|--------------|
| Tối ưu hóa hiệu suất | Làm cho chạy nhanh hơn |
| Triển khai giải pháp | Bắt đầu dùng cách mới |
| Hệ sinh thái AI | Cả đám công cụ AI quanh bạn |
| Thị phần | Bao nhiêu người đang dùng |

---

## 2. Câu tự nhiên (không giới hạn 12 từ)

- **Không** đếm từ cứng — ưu tiên **nhịp nói tự nhiên**
- Tránh câu ghép 3 mệnh đề trở lên — tách thành 2 câu nếu khó thở
- Cảnh báo audit (`unnatural_sentence`) chỉ khi câu **>25 từ** **và** khó hiểu / nhiều mệnh đề
- Hook vẫn **ngắn gọn, gây tò mò** — không cần đúng 12 từ

---

## 3. Cấm ký hiệu văn AI

| Cấm | Thay bằng |
|-----|-----------|
| Em dash `—` | Dấu phẩy, câu mới, hoặc `. . .` |
| Bullet `•` trong thoại | But/Therefore nối câu |
| Dấu ngoặc dài giải thích `(…)` | Tách câu hoặc ví dụ ngắn |

Audit: `em_dash_detected` = **critical** nếu script có `—` hoặc `–` (en dash dùng như em dash).

---

## 4. Từ đệm (gộp trong viral-audio-script)

Viết **một lần** kèm script hoàn chỉnh — không cần bước humanize riêng:

- **2–4 lần / video:** *ừm, thật ra, nói thật, biết sao không…*
- Không nhồi mỗi câu

---

## 5. Phân công skill Phase 1

| Skill | Áp dụng |
|-------|---------|
| `/extract-core-signals` | `perspective`: kể cho bạn 12 tuổi |
| `/hyperframes-creative` | Góc nhìn + But/Therefore |
| `/viral-audio-script` | **One-pass:** tag + từ đệm + plain language + HASCAS |
| `/audit-audio-script` | Gate `em_dash_detected`, `jargon_heavy`, narrative flow |

`/humanize-audio-script` — **không** trong pipeline; chỉ dùng optional nếu audit báo giọng robot.
