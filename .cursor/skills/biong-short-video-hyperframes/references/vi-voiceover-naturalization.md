# Tối ưu ngôn ngữ nói tiếng Việt (Writing for the Ear)

Chuyển tài liệu thô / văn học thuật thành **kịch bản âm thanh để nói** — tự nhiên, đậm văn nói đời thường, không robot. Áp dụng phase 1 trước `save_audio_script`.

**Đọc kèm:** [viral-retention-structure.md](viral-retention-structure.md) · [omnivoice-speech-script.md](omnivoice-speech-script.md) · [omnivoice-expressive-tags.md](omnivoice-expressive-tags.md)

---

## 1. Phá cấu trúc văn viết (mắt đọc → tai nghe)

- **Tuyệt đối** không dùng câu phức, câu ghép dài. Mỗi câu thoại **≤12 từ**.
- **Cấm** từ nối trang trọng: "do đó", "vì vậy", "tuy nhiên", "nhằm mục đích", "tiến hành", "chúng ta sở hữu".
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

- **Cấm** liệt kê bullet trong một hơi thở — tách thành nhiều câu ngắn.

---

## 2. Từ đệm hội thoại (conversational anchors)

Chủ động thêm từ đệm để giống bạn bè kể chuyện — **ưu tiên ở bước `/humanize-audio-script`**.

**Đầu câu:** Biết sao không?… / Nghe nè… / Bật mí nhé… / Thật ra thì… / Nói thật nhé…

**Cuối câu:** …nè / …đúng không? / …luôn á! / …thử xem sao nhé. / …biết chưa?

**Lưu ý:** Không nhồi từ đệm mỗi câu — 2–4 lần / video 60–90s là đủ.

---

## 3. Pacing HASCAS (retention-based)

Align với timeline [viral-retention-structure.md](viral-retention-structure.md). Word budget ~2.5 từ/giây.

| Giai đoạn | Thời gian (trong Hook/Agitate) | Giọng & nội dung |
|-----------|-------------------------------|------------------|
| **Hook** | ~0–3s đầu video | Câu hỏi gai, khẳng định mạnh, số shock. Dùng `[excited]`/`[happy]` + `?!` — **không** ALL CAPS |
| **Agitate** | ~3–15s (trong block Agitate) | Cảm thán ngắn, khoét nỗi đau. `[whisper]`/`[sigh]`. Brand-safe: "Ức chế quá đi!", "Chịu không nổi luôn á!" — tránh từ thô |
| **Solve** | ~60% script | Neutral, rõ ràng, từng bước. Không mood tag dài |
| **CTA/Loop** | ~10% cuối | Nhẹ, tự tin, dứt khoát. `[laughter]` hoặc slogan ngắn |

---

## 4. Dấu câu cho ngữ điệu TTS (punctuation tuning)

OmniVoice học từ dấu câu để tính pause và pitch. **Không dùng SSML.**

| Kỹ thuật | Ví dụ | Hiệu ứng |
|----------|-------|----------|
| Ba chấm `...` hoặc `. . .` | `Ba bước này . . .` | Pause ~300–500ms, tò mò |
| Gạch ngang `—` | `Lỗi lớn nhất — bỏ qua bước một` | Ngắt nhịp trước từ khóa |
| `?!` cuối câu hỏi tu từ | `Ai cũng mắc lỗi này?!` | Pitch lên cuối câu |
| Chấm rời từng từ | `Sai. Lầm. Lớn. Nhất. Là . . .` | Gằn giọng, nhấn từng ý |
| `?` và `!` đơn | Câu ≤12 từ | Nhịp podcast TikTok |

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

## Phân công theo skill

| Skill / bước | Áp dụng mục |
|--------------|-------------|
| `/hyperframes-creative` | §1 phá cấu trúc văn viết |
| `/viral-audio-script` | §1 + §3 pacing + §4 punctuation draft + expressive tags |
| `/humanize-audio-script` | §2 từ đệm + §1 bảng thay thế (giữ tag) |
| `save_audio_script` | Self-check §1–§4; không chèn tag mới |
| OmniVoice TTS (server) | §5 phiên âm — `marketing_short_video_agent_omnivoice_phonetic_replace()` |

---

## Self-check trước save

- [ ] Mọi câu ≤12 từ; không từ nối học thuật (§1)
- [ ] Có 2–4 từ đệm tự nhiên (§2)
- [ ] Hook giật gân 0–3s; Agitate có cảm thán ngắn (§3)
- [ ] Có `...` / `?!` / chấm rời ở chỗ nhấn (§4)
- [ ] Brand EN giữ nguyên trong script; không SSML (§5)
- [ ] Expressive tag quota the [omnivoice-expressive-tags.md](omnivoice-expressive-tags.md)
