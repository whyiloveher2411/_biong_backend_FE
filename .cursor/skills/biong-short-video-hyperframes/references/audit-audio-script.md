# audit-audio-script — QA & sửa kịch bản voiceover

Skill phase 1 — cổng kiểm tra **bắt buộc** sau `/viral-audio-script`, trước `save_audio_script`.

**Đọc kèm:** [plain-language-storytelling-vi.md](plain-language-storytelling-vi.md) · [narrative-flow-vi.md](narrative-flow-vi.md) · [vi-voiceover-naturalization.md](vi-voiceover-naturalization.md) · [omnivoice-expressive-tags.md](omnivoice-expressive-tags.md)

**Không** gate `visual_shot_plan` — shot-plan thuộc Phase 2.

---

## 3 lỗi cốt lõi (Script Diagnosis)

| # | Lỗi | Triệu chứng | Hậu quả TTS |
|---|-----|-------------|-------------|
| 1 | **Bullet-point Syndrome** | Câu đơn độc lập, nối bằng dấu chấm; không transition | OmniVoice đọc đều đều như slide PowerPoint |
| 2 | **Missing Narrative Flow** | Số liệu/tên riêng thô nhảy ý | Người nghe mất nhịp, retention thấp |
| 3 | **Hook loop collision** | CTA lặp ≥80% hook verbatim | Cấu trúc cụt, không tự nhiên |

---

## Rubric — mã lỗi `script_diagnosis.issues[].code`

| Code | Severity | Phát hiện | Cách sửa |
|------|----------|-----------|----------|
| `bullet_point_syndrome` | critical | ≥3 câu liên tiếp không But/Therefore | Nối *Thế nhưng, Thành ra, Nhưng mà…* |
| `orphan_stat` | critical | Số liệu/tên riêng đứng câu riêng | Gom + bọc nhân quả; `. . .` trước keyword |
| `listing_connector` | critical | Hit blocklist narrative-flow-vi §3 | Thay bằng But/Therefore |
| `hook_loop_collision` | warning→critical | CTA lặp hook | Viết CTA mới nối `loop_hook_line` |
| `em_dash_detected` | critical | Có `—` hoặc `–` trong script | Thay bằng phẩy, câu mới, `. . .` |
| `unnatural_sentence` | warning | Câu >25 từ và khó hiểu | Tách câu, đơn giản hóa |
| `jargon_heavy` | warning | Thuật ngữ không giải thích | Plain language — ví dụ đời |
| `weak_prosody` | warning | Solve thiếu `...` hoặc `. . .` | Thêm punctuation §4 vi-voiceover |
| `disallowed_tag` | critical | Tag ngoài allowlist 3 tag | Thay/bỏ |
| `missing_sfx` | critical | Thiếu `[SFX: ...]` hook | Thêm `[SFX: vine boom]` |
| `duration_short` | warning | <60s word budget | Mở rộng Solve |
| `missing_but_therefore` | warning | <3 mốc But/Therefore (60–90s) | Thêm liên từ nhân quả |

**Pass:** `pass: true` khi **không còn** issue `critical`.

---

## Ví dụ Google — Before (FAIL)

```text
[BGM: dark tech ambient] [SFX: vine boom] Google tìm kiếm đạt đỉnh lịch sử — công ty vẫn hoảng loạn?!
...
[laughter] Tìm kiếm đạt đỉnh — Google vẫn hoảng loạn?!
```

**Chẩn đoán:** `em_dash_detected`, `bullet_point_syndrome`, `hook_loop_collision`

---

## Ví dụ Google — After (PASS)

```text
[BGM: dark tech ambient] [SFX: vine boom] Google tìm kiếm đạt đỉnh lịch sử ... nhưng công ty lại đang hoảng loạn?!
...
[laughter] Bạn nghĩ sao về tương lai của Google? . . . Theo dõi kênh để không bỏ lỡ nhé!
```

---

## Luật sửa (bắt buộc)

1. **Cấm** thêm/xóa/di chuyển non-verbal tags ngoài `expressive_plan`
2. **Cấm** SSML; giữ `[BGM]`, `[SFX]`, `[Dừng]` nguyên vị trí
3. **Cấm** em dash trong `fixed_script`
4. CTA: nối `loop_hook_line` — **không** copy-paste hook
5. Retry: tối đa **2 vòng** audit trước save

---

## Self-check trước `save_audio_script`

- [ ] `script_diagnosis.pass === true`
- [ ] Không issue `critical`
- [ ] Không em dash `—`
- [ ] Plain language; ≥3 But/Therefore (60–90s)
- [ ] CTA không lặp hook verbatim
- [ ] Tags allowlist; có `[SFX: ...]` hook
- [ ] Metadata: `script_diagnosis`, `core_signals`, `expressive_plan` — **không** `visual_shot_plan`
