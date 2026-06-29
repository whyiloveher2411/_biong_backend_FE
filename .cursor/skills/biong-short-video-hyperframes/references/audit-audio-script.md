# audit-audio-script — QA & sửa kịch bản voiceover

Skill phase 1 — cổng kiểm tra **bắt buộc** sau `/humanize-audio-script`, trước `save_audio_script`.

**Đọc kèm:** [narrative-flow-vi.md](narrative-flow-vi.md) · [vi-voiceover-naturalization.md](vi-voiceover-naturalization.md) · [omnivoice-expressive-tags.md](omnivoice-expressive-tags.md)

---

## 3 lỗi cốt lõi (Script Diagnosis)

| # | Lỗi | Triệu chứng | Hậu quả TTS |
|---|-----|-------------|-------------|
| 1 | **Bullet-point Syndrome** | Câu đơn độc lập, nối bằng dấu chấm; không transition | OmniVoice đọc đều đều như slide PowerPoint |
| 2 | **Missing Narrative Flow** | Số liệu/tên riêng thô nhảy ý; chưa hiểu ý nghĩa đã sang fact mới | Người nghe mất nhịp, retention thấp |
| 3 | **Hook loop collision** | CTA/loop lặp ≥80% hook verbatim, không bridge | Cấu trúc cụt, không tự nhiên |

---

## Rubric — mã lỗi `script_diagnosis.issues[].code`

| Code | Severity | Phát hiện | Cách sửa |
|------|----------|-----------|----------|
| `bullet_point_syndrome` | critical | ≥3 câu liên tiếp không But/Therefore | Nối *Thế nhưng, Thành ra, Nhưng mà, Chưa dừng ở đó…* |
| `orphan_stat` | critical | Số liệu/tên riêng đứng câu riêng | Gom + bọc nhân quả; `. . .` / `...` trước keyword |
| `listing_connector` | critical | Hit blocklist narrative-flow-vi §3 | Thay bằng But/Therefore |
| `hook_loop_collision` | warning→critical nếu CTA = hook | CTA lặp hook không bridge | Viết CTA mới nối `loop_hook_line` |
| `weak_prosody` | warning | Solve thiếu `...` hoặc `. . .` | Thêm punctuation tuning §4 vi-voiceover |
| `sentence_too_long` | critical | Câu >12 từ (trừ dòng `[BGM]`/`[SFX]`) | Tách + nối narrative |
| `disallowed_tag` | critical | Tag ngoài allowlist 13 tag (vd. `[gasp]`) | Thay bằng tag allowlist hoặc bỏ |
| `missing_sfx` | critical | Thiếu `[SFX: ...]` hook | Thêm `[SFX: vine boom]` |
| `duration_short` | warning | <60s word budget (~2.5 từ/giây) | Mở rộng Solve từ `narrative_chain` |
| `missing_but_therefore` | warning | <3 mốc But/Therefore trong 60–90s | Thêm liên từ nhân quả/đối lập |

**Pass:** `pass: true` khi **không còn** issue `critical`.

---

## Ví dụ Google — Before (FAIL)

```text
[BGM: dark tech ambient] [SFX: vine boom] Google tìm kiếm đạt đỉnh lịch sử — công ty vẫn hoảng loạn?!
Sundar Pichai xác nhận lượt truy vấn cao nhất mọi thời đại.
ChatGPT đã vượt 1 tỷ người dùng hàng tháng.
DuckDuckGo bán tính năng loại bỏ AI hoàn toàn.
[sigh] Google kẹt giữa hai phe đối nghịch.
Bạn thấy nút Chế độ AI ngay trong ô tìm kiếm.
Google cược tương lai vào câu trả lời hội thoại.
90% thị phần vẫn thuộc Google — nhưng gần bất động.
Mỗi bản tóm tắt AI . . . đồng nghĩa một cú nhấp quảng cáo bị mất.
Noam Shazeer rời Google sang OpenAI.
Cuộc chiến nhân tài AI leo thang toàn ngành.
[laughter] Tìm kiếm đạt đỉnh — Google vẫn hoảng loạn?!
Theo dõi để không bỏ lỡ nhé!
```

**Chẩn đoán:**
- `bullet_point_syndrome` — câu 2–4, 6–7, 9–10 rời nhau
- `orphan_stat` — "1 tỷ", "90%", "Noam Shazeer" không có ngữ cảnh
- `hook_loop_collision` — CTA lặp hook verbatim

---

## Ví dụ Google — After (PASS)

```text
[BGM: dark tech ambient] [SFX: vine boom] Google tìm kiếm đạt đỉnh lịch sử ... nhưng công ty lại đang hoảng loạn?!

[surprise-ah] Sự thật là CEO Sundar Pichai vừa xác nhận ... lượng truy cập đang cao nhất mọi thời đại!

Thế nhưng ... ChatGPT đã chạm mốc một tỷ người dùng . . . còn DuckDuckGo thì chơi lớn ... tung luôn tính năng xóa sạch AI!

[sigh] Thành ra ... Google đang bị kẹt cứng giữa hai phe!

Nếu tìm kiếm bây giờ ... bạn sẽ thấy ngay nút Chế độ AI chễm chệ ở ô tìm kiếm.

Google đang cược toàn bộ tương lai vào đây! Nhưng mà ... chính các bản tóm tắt AI này ... lại đang tự tay giết chết quảng cáo của họ!

Cứ mỗi câu trả lời AI hiện ra ... là Google lại mất đi một cú nhấp chuột hái ra tiền!

Chưa dừng lại ở đó đâu nhé ... cuộc chiến nhân tài đang cực kỳ khốc liệt! Ngay cả cánh tay phải Noam Shazeer ... cũng dứt áo ra đi sang OpenAI!

[laughter] Đúng là đỉnh cao công nghệ ... nhưng nội bộ thì rối ren!

Bạn nghĩ sao về tương lai của Google? . . . Bình luận bên dưới ... và theo dõi kênh để không bỏ lỡ nhé!
```

**Lưu ý tag:** Ví dụ trên có 3 tag (`[surprise-ah]`, `[sigh]`, `[laughter]`) — hợp lệ khi khớp `expressive_plan`. Audit chỉ kiểm tra tag nằm trong allowlist và không thêm/xóa ngoài plan.

---

## Output JSON mẫu

```json
{
  "script_diagnosis": {
    "pass": false,
    "issues": [
      {
        "code": "bullet_point_syndrome",
        "severity": "critical",
        "detail": "Câu 2–4: fact rời không But/Therefore"
      },
      {
        "code": "hook_loop_collision",
        "severity": "critical",
        "detail": "CTA lặp y nguyên hook — thiếu bridge"
      }
    ]
  },
  "fixed_script": "[BGM: dark tech ambient] [SFX: vine boom] ...",
  "expressive_plan": {
    "hook": [],
    "agitate": ["[sigh]"],
    "solve": [],
    "cta": ["[laughter]"]
  },
  "estimated_duration_sec": 90
}
```

---

## Luật sửa (bắt buộc)

1. **Cấm** thêm/xóa/di chuyển non-verbal tags ngoài `expressive_plan`
2. **Cấm** SSML; giữ `[BGM]`, `[SFX]`, `[Dừng]` nguyên vị trí
3. Số liệu: ưu tiên **bọc ngữ cảnh** But/Therefore; chữ hóa số đứng câu riêng (*một tỷ*, *chín mươi phần trăm*) nếu OmniVoice đọc vấp
4. CTA: nối `loop_hook_line` — **không** copy-paste hook
5. Retry: tối đa **2 vòng** audit trước save

---

## Self-check trước `save_audio_script`

- [ ] `script_diagnosis.pass === true`
- [ ] Không issue `critical` còn lại
- [ ] ≥3 mốc But/Therefore (script 60–90s)
- [ ] Không từ blocklist liệt kê
- [ ] CTA không lặp hook verbatim
- [ ] Non-verbal tags khớp `expressive_plan`; chỉ allowlist 13 tag
- [ ] Câu ≤12 từ; có `[SFX: ...]` hook
- [ ] Metadata lưu `script_diagnosis` (audit trail)

---

## Metadata gợi ý

```json
{
  "core_signals": { "narrative_chain": [], "perspective": "..." },
  "script_diagnosis": { "pass": true, "issues": [] },
  "expressive_plan": {},
  "estimated_duration_sec": 90
}
```
