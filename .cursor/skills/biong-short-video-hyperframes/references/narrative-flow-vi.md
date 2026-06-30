# Narrative Flow — Luồng kể chuyện (But/Therefore)

Khắc phục lỗi **Structural Summarization** (tóm tắt cấu trúc): agent nhặt ý chính bài nguồn rồi nối bằng dấu chấm — nghe như danh sách liệt kê, không phải kể chuyện.

**Áp dụng:** mọi short video marketing phase 1 — tin tức, promo, tutorial.

**Đọc kèm:** [vi-voiceover-naturalization.md](vi-voiceover-naturalization.md) · [viral-retention-structure.md](viral-retention-structure.md)

---

## Anti-pattern — Structural Summarization

| Dấu hiệu | Ví dụ |
|----------|-------|
| Câu độc lập, không quan hệ nhân quả | "Apple ra chip mới. Chip có 8 nhân. Tiết kiệm pin 30%." |
| Từ nối liệt kê | "Tiếp theo…", "Ngoài ra…", "Đầu tiên…" |
| Mô tả sản phẩm khô | "Sản phẩm A có tính năng X, Y, Z" |
| Đọc spec từng dòng | "CPU 8 nhân. Pin tiết kiệm 30%. Giá 900 USD." |

**Mục tiêu:** mỗi câu **kéo** câu sau — tạo tò mò, twist, hoặc hậu quả.

---

## Bước 1 — But/Therefore (Nguyên nhân – Kết quả)

**Cấm** từ nối liệt kê. **Bắt buộc** liên từ nhân quả hoặc đối lập:

| Loại | Liên từ / cụm gợi ý |
|------|---------------------|
| Đối lập | Nhưng mà… / Thế nhưng… / Tưởng vậy là ngon đúng không? Nhưng mà… |
| Nhân quả | Thành ra… / Chính vì vậy… / Nó dẫn đến… |
| Leo thang | Chưa dừng ở đó… / Và điều bất ngờ là… |
| Giả định | Tưởng chỉ là… / Ai ngờ… |

Mỗi fact từ bài nguồn phải nằm trong chuỗi `{ cause → but → therefore }`, không phải bullet độc lập.

---

## Bước 2 — Storytelling (Góc nhìn nhân vật)

Biến bài tin khô thành câu chuyện có **góc nhìn**:

| Kiểu liệt kê (cấm) | Kiểu kể chuyện (bắt buộc) |
|-------------------|---------------------------|
| "Sản phẩm A có tính năng X, Y, Z" | "Người dùng đang phát điên vì X — nhưng bất ngờ nhất lại là Y" |
| "Công ty B tăng doanh thu 20%" | "CEO B tưởng quý này ổn — ai ngờ con số cuối cùng lại gấp đôi dự báo" |
| "App C hỗ trợ A, B, C" | "Mình thử App C vì đồng nghiệp khen — và lần đầu mở ra thì…" |

Góc nhìn gợi ý: kể như giải thích cho **bạn 12 tuổi** — từ đơn giản, ví dụ đời (xem plain-language-storytelling-vi.md).

---

## Bước 3 — Blocklist từ liệt kê

**Tuyệt đối cấm** trong script voiceover:

- Một là / Hai là / Ba là
- Đầu tiên / Thứ hai / Thứ ba
- Tiếp theo / Tiếp theo là
- Ngoài ra / Bên cạnh đó / Đồng thời
- Cuối cùng (khi dùng như liệt kê thứ tự)
- Các mục / Điểm thứ / Bước một / Bước hai

Thay bằng But/Therefore hoặc câu hỏi tu từ tạo suspense.

---

## Pacing — Gom thông số

Đoạn có danh sách thông số → **gom 1 câu so sánh hoặc cảm thán**, không đọc từng dòng.

| Liệt kê (cấm) | Narrative (bắt buộc) |
|---------------|------------------------|
| "8 nhân CPU. Tiết kiệm pin 30%. Giá 900 USD." | "Con chip 8 nhân này tiết kiệm pin tới 30% — thành ra mức giá 900 USD lần này thực sự là cú hích!" |

---

## Ví dụ before / after

**Before (Structural Summarization):**
> Hôm nay Apple ra mắt chip mới. Chip này có 8 nhân CPU. Tiếp theo, nó tiết kiệm pin hơn ba mươi phần trăm. Ngoài ra, giá bán của nó là chín trăm USD.

**After (Narrative Flow):**
> Apple vừa làm cả thế giới công nghệ chao đảo khi tung ra con chip 8 nhân thế hệ mới! Tưởng chỉ là nâng cấp nhẹ, nhưng mà… [dissatisfaction-hnn] nó lại tiết kiệm pin tới ba mươi phần trăm luôn á! Chính vì vậy… mức giá chín trăm USD lần này thực sự là một cú hích lớn!

---

## Output `narrative_chain` (từ extract-core-signals)

Trước khi viết script, agent xây chuỗi logic:

```json
{
  "narrative_chain": [
    {
      "cause": "Apple tung chip 8 nhân thế hệ mới",
      "but": "Tưởng chỉ nâng cấp nhẹ",
      "therefore": "Pin tiết kiệm 30% — giá 900 USD hợp lý hơn"
    }
  ],
  "perspective": "Kể chuyện cho bạn 12 tuổi — từ đơn giản, ví dụ đời"
}
```

`/viral-audio-script` và `/humanize-audio-script` **bắt buộc** expand `narrative_chain` thành thoại HASCAS — không bỏ qua sang liệt kê.

---

## Self-check trước `save_audio_script`

- [ ] Script **không** chứa từ blocklist §3
- [ ] Solve section dùng But/Therefore — **không** đọc feature/spec theo thứ tự
- [ ] ≥3 mốc But/Therefore trong script 60–90s
- [ ] Thông số gom cảm thán/so sánh — không đọc từng spec
- [ ] Có góc nhìn nhân vật (người dùng / reviewer) — không brochure
- [ ] Vẫn giữ: câu ≤12 từ, HASCAS, OmniVoice tags, `[SFX: vine boom]`

---

## Phân công theo skill

| Skill | Vai trò Narrative Flow |
|-------|------------------------|
| `/extract-core-signals` | Sinh `narrative_chain` + `perspective` |
| `/hyperframes-creative` | Thiết kế luồng But/Therefore + góc nhìn trước khi draft |
| `/viral-audio-script` | Expand chain → HASCAS; cấm structural summarization |
| `/humanize-audio-script` | Polish văn nói; **cấm** thêm từ liệt kê khi humanize |
| `/audit-audio-script` | **Cổng QA cuối** — chẩn đoán + sửa; pass bắt buộc trước save |
