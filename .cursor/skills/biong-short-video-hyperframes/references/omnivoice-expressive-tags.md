# OmniVoice Expressive Tags — phân bổ theo HASCAS

**Less is More:** 80% giọng neutral + 20% expressive. Tag gắn **khi viết draft** (`/viral-audio-script`), không paste sau humanize.

**Đọc cùng:** [omnivoice-speech-script.md](omnivoice-speech-script.md)

---

## Taxonomy thẻ

| Nhóm | Thẻ | Vai trò |
|------|-----|---------|
| **Semantic mood** | `[happy]`, `[excited]`, `[whisper]`, `[calm]` | Ngữ điệu cảm xúc theo câu ngắn |
| **Non-verbal** | `[laughter]`, `[sigh]`, `[gasp]`, `[chuckle]` | Âm thanh phi ngôn ngữ giữa câu |
| **Melodic** | `[singing]` | Ngữ điệu giai điệu — slogan CTA ngắn, không hát pop dài |
| **Production** | `[BGM:...]`, `[SFX:...]`, `[Dừng Ns]` | Phase 2 media — không phải biểu cảm giọng |

OmniVoice TTS **giữ** expressive tags; caption karaoke **strip** hết.

---

## Quy tắc vàng

1. **Gắn khi viết** — tag nằm trong draft HASCAS; `/humanize-audio-script` **cấm** thêm/xóa/di chuyển tag
2. **1 tag = 1 câu ngắn** (≤10 từ với mood tags) — cấm bọc cả đoạn dài
3. **80% neutral** — phần Solve giải thích kỹ thuật không bọc tag; dùng `. . .` và `,` đủ
4. **[singing]** — agent tự quyết khi tự nhiên (slogan CTA ngắn); ưu tiên không dùng cho nội dung changelog/kỹ thuật thuần

---

## Bảng phân bổ theo HASCAS

| Tag | Quota gợi ý | Section | Ghi chú |
|-----|-------------|---------|---------|
| `[excited]` hoặc `[happy]` | 0–1 / video | **Hook** (0–3s) hoặc **Solve** peak | Câu ≤10 từ; không liên tiếp |
| `[whisper]` hoặc `[calm]` | 0–1 / video | **Agitate** (~5–15s) | Bí mật, khoét nỗi đau |
| `[laughter]`, `[sigh]`, `[gasp]` | **Tối đa 2 tổng** | Giữa khoảng nghỉ | `[sigh]` trước sai lầm; `[laughter]` trước twist |
| `[singing]` | Tùy ngữ cảnh, hiếm | **CTA/Loop** | 1 cụm slogan ngắn — melodic |
| *(neutral)* | ~80% | **Solve** | Không tag |

### Phase 2 visual (gợi ý)

Beat Agitate có `[whisper]` → ưu tiên blur background + zoom cận text (contrast cao).

---

## Prompt mẫu (phase 1 agent)

```text
Viết kịch bản thoại tiếng Việt theo HASCAS. Phân bổ Expressive Tags OmniVoice — Less is More:

1. Chỉ đặt [excited] hoặc [happy] cho đúng 1 câu Hook mở (≤10 từ) hoặc 1 câu Solve peak.
2. Agitate (nỗi đau/sai lầm): [whisper] hoặc [calm] cho 1 câu; chèn [sigh] giữa khoảng nghỉ nếu cần.
3. Tối đa 2 tag phi-ngôn-ngữ ([laughter]/[sigh]/[gasp]) cho cả video.
4. Solve giải thích kỹ thuật: neutral — không bọc tag.
5. CTA: [singing] chỉ khi slogan ngắn tự nhiên — không bắt buộc.
6. Cấm bọc cả đoạn văn trong một tag — tránh giọng méo/hụt hơi.
```

---

## Ví dụ script 90s

```text
[BGM: lofi ambient] [SFX: vine boom] [excited] 99% dev dùng HyperFrames sai! . . .
[whisper] Bạn nghĩ add skill là xong à? [sigh] Sai bét rồi!
Ba bước này . . . Làm đúng một lần thôi. Bước một: init project blank. Bước hai: add registry blocks. Bước ba: sync timeline audio.
[laughter] Xong là video tự nổ đấy! . . .
[singing] Nghe đến đây mà chưa follow là dở rồi nè!
```

```json
{
  "expressive_plan": {
    "hook": ["[excited]"],
    "agitate": ["[whisper]", "[sigh]"],
    "solve": [],
    "cta": ["[laughter]", "[singing]"]
  }
}
```

---

## Sau TTS — cập nhật timeline

Emotion tags làm **đổi duration MP3**. Phase 2 bắt buộc:

1. Transcribe lại `audio_file` → `transcript.json`
2. `sync-caption-from-script.mjs` → `verify-caption-sync.mjs --strict` → `gen-captions-html.mjs`

**Cấm** `npx hyperframes inspect --sync-audio` — lệnh không có trong pipeline Biong.

---

## Anti-patterns

| Sai | Đúng |
|-----|------|
| Sinh script xong rồi chèn tag vô tội vạ | Tag gắn trong `/viral-audio-script` draft |
| Humanize thêm tag mới | Humanize giữ tag slots, chỉ sửa câu chữ |
| Bọc cả đoạn Solve trong `[excited]` | Solve neutral, prosody `. . .` |
| >2 tag phi-ngôn-ngữ / video | Tối đa 2 `[laughter]`/`[sigh]`/`[gasp]` |
| `[singing]` cho đoạn giải thích dài | Chỉ slogan CTA ngắn |
| Tag ở mọi câu | 80% neutral |
