# extract-core-signals — trích tín hiệu viral

Skill phase 1. Invoke: `/extract-core-signals`

**Đọc:** [viral-retention-structure.md](viral-retention-structure.md)

## Mục tiêu

Từ `creative_brief.content_plain_text` (marketing post), trích tín hiệu cho timeline **HASCAS 60–180s** — không tóm tắt dài dòng.

## Ba trục

### 1. The Hook (điểm móc)

- Câu gây sốc, số liệu tranh cãi, myth cần phá
- `draft_line` **≤12 từ** — đặt lên đầu script, giữ người xem trong 3 giây đầu

### 2. The Tension (kịch tính)

- **Villain:** thói quen xấu, sai lầm mất tiền, tool/process lỗi thời
- **Stakes:** điều gì xảy ra nếu không đổi
- **Rescue:** hướng giải pháp (chưa spoil chi tiết — để Solve)

### 3. The Takeaway (giá trị cốt lõi)

- Công thức dễ nhớ: 3 bước, 5 giây, quy tắc vàng
- Bám proof từ nguồn — không bịa số liệu

## Output mẫu

```json
{
  "hook": {
    "angle": "Insight gây tranh cãi về workflow video",
    "draft_line": "99% team add skill nhưng video vẫn nhàm chán"
  },
  "tension": {
    "villain": "Agent output an toàn — chỉ text + đổi nền",
    "stakes": "Video social không giữ chân, CTA thấp",
    "rescue": "Ép registry blocks + motion vocabulary"
  },
  "takeaway": {
    "formula": "3 bước: signals → viral script → cinematic render",
    "proof": "Từ nội dung marketing post / case thực tế"
  },
  "loop_hook_line": "…và đó là lý do 99% team vẫn nhàm chán",
  "beat_suggestions": {
    "hook": "meme SFX + kinetic slam + stock",
    "agitate": "palette shift mỗi phrase",
    "solve": "UI cards 3 bước",
    "cta": "loop line + BGM fade"
  }
}
```

## Anti-patterns

- Tóm tắt bullet học thuật
- Hook chung chung không số liệu/insight
- Takeaway không nhớ được sau 1 lần nghe

Bước tiếp: [/viral-audio-script](viral-audio-script.md) → [/humanize-audio-script](humanize-audio-script.md) → `save_audio_script`
