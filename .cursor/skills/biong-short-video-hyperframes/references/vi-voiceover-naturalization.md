# Tối ưu ngôn ngữ nói tiếng Việt (Writing for the Ear)

Chuyển tài liệu thô / văn học thuật thành **kịch bản âm thanh để nói** — tự nhiên, đậm văn nói đời thường, không robot. Áp dụng phase 1 trước `save_audio_script`.

**Đọc kèm:** [plain-language-storytelling-vi.md](plain-language-storytelling-vi.md) · [viral-retention-structure.md](viral-retention-structure.md) · [omnivoice-speech-script.md](omnivoice-speech-script.md) · [omnivoice-expressive-tags.md](omnivoice-expressive-tags.md)

---

## 1. Phá cấu trúc văn viết (mắt đọc → tai nghe)

- **Câu tự nhiên** — không giới hạn số từ cứng; tránh câu ghép 3 mệnh đề khó hiểu
- **Cấm** từ nối trang trọng: "do đó", "vì vậy", "tuy nhiên", "nhằm mục đích", "tiến hành", "chúng ta sở hữu"
- **Cấm em dash** `—` và `–` dùng như ngắt nhịp AI — thay bằng dấu phẩy, câu mới, hoặc `. . .`
- **Thay** bằng từ thuần nói:

| Văn viết / học thuật | Văn nói |
|----------------------|---------|
| Do đó / Vì vậy | Nên là… / Thành ra… |
| Tuy nhiên | Nhưng mà… / Thế nhưng… |
| Tiến hành xử lý | Làm… / Bắt tay vào làm… |
| Phương pháp tối ưu | Cách tốt nhất / Mẹo cực hay… |
| Chúng ta sở hữu | Mình có… |
| Thực hiện | Làm / Chạy / Bật |
| Đảm bảo | Chắc chắn / Yên tâm |
| Tối ưu hóa | Làm cho nhanh hơn / Gọn hơn |

- **Cấm** liệt kê bullet trong một hơi thở — chuyển bullet thành **chuỗi But/Therefore**
- **Cấm** từ nối liệt kê: *Một là, Hai là, Đầu tiên, Tiếp theo, Ngoài ra, Đồng thời, Bên cạnh đó* — xem [narrative-flow-vi.md](narrative-flow-vi.md) §3

---

## 2. Từ đệm hội thoại (conversational anchors)

Gắn khi viết trong `/viral-audio-script` (one-pass):

**Đầu câu:** Biết sao không?… / Nghe nè… / Bật mí nhé… / Thật ra thì… / Nói thật nhé…

**Cuối câu:** …nè / …đúng không? / …luôn á! / …thử xem sao nhé. / …biết chưa?

**Lưu ý:** Không nhồi từ đệm mỗi câu — 2–4 lần / video 60–90s là đủ.

---

## 3. Pacing HASCAS (retention-based)

Align với timeline [viral-retention-structure.md](viral-retention-structure.md). Word budget ~2.5 từ/giây.

| Giai đoạn | Thời gian (trong Hook/Agitate) | Giọng & nội dung |
|-----------|-------------------------------|------------------|
| **Hook** | ~0–3s đầu video | Câu hỏi gai, khẳng định mạnh — dùng `?!` và `. . .` (không mood tag) |
| **Agitate** | ~3–15s (trong block Agitate) | Cảm thán ngắn, khoét nỗi đau. `[sigh]`, `[dissatisfaction-hnn]` |
| **Solve** | ~60% script | Neutral, rõ ràng, plain language. Không mood tag dài |
| **CTA/Loop** | ~10% cuối | Nhẹ, tự tin, dứt khoát. `[laughter]` hoặc slogan ngắn |

---

## 4. Dấu câu cho ngữ điệu TTS (punctuation tuning)

OmniVoice học từ dấu câu để tính pause và pitch. **Không dùng SSML.** **Cấm em dash `—`.**

| Kỹ thuật | Ví dụ | Hiệu ứng |
|----------|-------|----------|
| Ba chấm `...` hoặc `. . .` | `Ba bước này . . .` | Pause ~300–500ms, tò mò |
| Dấu phẩy / câu mới | `Lỗi lớn nhất là bỏ qua bước một` | Ngắt nhịp tự nhiên |
| `?!` cuối câu hỏi tu từ | `Ai cũng mắc lỗi này?!` | Pitch lên cuối câu |
| Chấm rời từng từ | `Sai. Lầm. Lớn. Nhất. Là . . .` | Gằn giọng, nhấn từng ý |

`[Dừng 0.5s]` trong script → server convert thành `. . .` khi TTS.

---

## 5. Phiên âm từ tiếng Anh (chỉ lớp TTS)

`audio_script` **giữ spelling gốc** (caption karaoke đọc đúng brand). Server PHP convert **chỉ khi gửi OmniVoice**.

| Tiếng Anh (trong script) | Phiên âm gửi TTS |
|---------------------------|------------------|
| HyperFrames | Hai-pơ-phờ-reim |
| API | A-pi-ai |
| App | Áp |
| TikTok | Tíc-tóc |
| AI Agent | Ei-Ai Êi-gừnt |

Agent **không** tự ghi phiên âm vào `save_audio_script` — giữ tên gốc trong text lưu CMS.

---

## 6. Narrative Flow (But/Therefore)

Khắc phục **Structural Summarization** — agent nhặt ý chính rồi nối bằng dấu chấm thay vì kể chuyện.

**Canonical:** [narrative-flow-vi.md](narrative-flow-vi.md)

| Kỹ thuật | Quy tắc |
|----------|---------|
| But/Therefore | Nối fact bằng *Nhưng mà, Thành ra, Chính vì vậy, Tưởng vậy là…* |
| Storytelling | Góc nhìn kể cho bạn 12 tuổi — xem [plain-language-storytelling-vi.md](plain-language-storytelling-vi.md) |
| Gom spec | Danh sách thông số → 1 câu cảm thán/so sánh |
| Input | Expand `core_signals.narrative_chain` từ extract-core-signals |

Self-check: ≥3 mốc But/Therefore trong script 60–90s; không từ blocklist §3 của narrative-flow-vi.

---

## Phân công theo skill (Phase 1 — 4 bước)

| Skill / bước | Áp dụng mục |
|--------------|-------------|
| `/extract-core-signals` | Sinh `narrative_chain` + `perspective` (§6) |
| `/hyperframes-creative` | §1 phá cấu trúc + §6 Narrative Flow |
| `/viral-audio-script` | §1–§4 + §6 + từ đệm §2 — **script hoàn chỉnh one-pass** |
| `/audit-audio-script` | QA cổng cuối — pass bắt buộc (§6 + audit-audio-script.md) |
| `save_audio_script` | Self-check §1–§4 §6 + `script_diagnosis.pass`; không chèn tag mới |
| OmniVoice TTS (server) | §5 phiên âm — `marketing_short_video_agent_omnivoice_phonetic_replace()` |

---

## Self-check trước save

- [ ] Câu tự nhiên, plain language; không em dash `—`
- [ ] Có 2–4 từ đệm tự nhiên (§2)
- [ ] Hook giật gân 0–3s; Agitate có cảm thán ngắn (§3)
- [ ] Có `...` / `?!` / chấm rời ở chỗ nhấn (§4)
- [ ] Brand EN giữ nguyên trong script; không SSML (§5)
- [ ] Expressive tag theo [omnivoice-expressive-tags.md](omnivoice-expressive-tags.md) — allowlist 3 tag
- [ ] Narrative Flow: không từ liệt kê; ≥3 But/Therefore (§6)
- [ ] `/audit-audio-script` pass — không issue critical
