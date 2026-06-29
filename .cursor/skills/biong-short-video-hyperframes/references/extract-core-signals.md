# extract-core-signals — trích tín hiệu viral

Skill phase 1. Invoke: `/extract-core-signals`

**Đọc:** [viral-retention-structure.md](viral-retention-structure.md) · [narrative-flow-vi.md](narrative-flow-vi.md)

## Mục tiêu

Từ `creative_brief.content_plain_text` (marketing post), trích tín hiệu cho timeline **HASCAS 60–180s** — **không** tóm tắt dài dòng, **không** structural summarization.

Xây `narrative_chain` (But/Therefore) **trước** khi viết script.

## Ba trục + Narrative Flow

### 1. The Hook (điểm móc)

- Câu gây sốc, số liệu tranh cãi, myth cần phá
- `draft_line` **≤12 từ** — đặt lên đầu script, giữ người xem trong 3 giây đầu

### 2. The Tension (kịch tính)

- **Villain:** thói quen xấu, sai lầm mất tiền, tool/process lỗi thời
- **Stakes:** điều gì xảy ra nếu không đổi
- **Rescue:** hướng giải pháp (chưa spoil chi tiết — để Solve)

### 3. The Takeaway (giá trị cốt lõi)

- Insight dễ nhớ — **cấm** liệt kê "bước 1, bước 2, bước 3"
- Bám proof từ nguồn — không bịa số liệu

### 4. narrative_chain (But/Therefore)

Mỗi fact quan trọng từ bài nguồn → 1 link:

```json
{
  "cause": "Sự kiện / fact",
  "but": "Twist / đối lập",
  "therefore": "Hậu quả / insight kéo tiếp"
}
```

`perspective`: góc nhìn kể chuyện (reviewer TikTok, người dùng, người trong cuộc).

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
    "formula": "Signals → narrative script → cinematic render",
    "proof": "Từ nội dung marketing post / case thực tế"
  },
  "narrative_chain": [
    {
      "cause": "Team add skill HyperFrames",
      "but": "Video vẫn chỉ text + đổi nền",
      "therefore": "Thiếu narrative flow + motion vocabulary"
    },
    {
      "cause": "Ép registry blocks + GSAP stagger",
      "but": "Tưởng phức tạp",
      "therefore": "Render cinematic giữ chân gấp đôi"
    }
  ],
  "perspective": "Reviewer TikTok — giật gân, hội thoại",
  "loop_hook_line": "…và đó là lý do 99% team vẫn nhàm chán",
  "beat_suggestions": {
    "hook": "meme SFX + kinetic slam + stock",
    "agitate": "palette shift mỗi phrase",
    "solve": "UI cards theo narrative_chain",
    "cta": "loop line + BGM fade"
  }
}
```

## Anti-patterns

- Tóm tắt bullet học thuật
- Structural summarization — fact rời không But/Therefore
- Hook chung chung không số liệu/insight
- Takeaway dạng checklist "3 bước / 5 mẹo" — kích thích liệt kê

Bước tiếp: [/hyperframes-creative](hyperframes-skill-routing.md) → [/viral-audio-script](viral-audio-script.md) → [/humanize-audio-script](humanize-audio-script.md) → [/audit-audio-script](audit-audio-script.md) → `save_audio_script`
