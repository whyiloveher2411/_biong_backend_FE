# viral-audio-script — kịch bản giữ chân cao

Skill phase 1. Invoke: `/viral-audio-script` sau `/extract-core-signals`.

**Đọc trước:** [viral-retention-structure.md](viral-retention-structure.md)

## Timeline viral (30–45s, mặc định 40s)

```
0s ── Hook ── 3s ── Agitate ── 15s ── Solve ── 35s ── CTA/Loop ── 40s
```

## Công thức HASCAS

| Phần | Giây | Mục tiêu |
|------|------|----------|
| Hook | 0–3 | Ngừng lướt — số shock, câu hỏi |
| Agitate | 3–15 | Đồng cảm — villain, sai lầm phổ biến |
| Solve | 15–35 | Công thức 3 bước + proof ngắn |
| CTA/Loop | 35–40 | CTA 1 hành động **hoặc** câu nối hook |

## Viết cho tai nghe

| Quy tắc | Chi tiết |
|---------|----------|
| Độ dài câu | **≤12 từ** — không 10–15 như cũ |
| Dấu phẩy | Ngắt nghỉ ngắn — không lạm dụng |
| Dấu chấm | Kết thúc ý — giữa Hook/Agitate/Solve |
| Ngôn ngữ | Nói tự nhiên — không văn phong báo |
| Nhịp | Dồn dập — phù hợp TTS VieNeu/Saydi/Vbee |

## Thẻ âm thanh

| Thẻ | Phase 2 MCP |
|-----|-------------|
| `[BGM: mood]` | `short_video_search_bgm` |
| `[SFX: vine boom]` | `short_video_search_meme_sound` — hook giây 0 |
| `[Dừng 0.5s]` | Beat dramatic sau hook |
| `[Dừng 1s]` | Trước Solve |

## Lưu qua MCP

```text
short_video_save_audio_script({
  short_video_id: N,
  text: "[BGM: lofi ambient] [SFX: vine boom] Câu hook. [Dừng 0.5s]. ...",
  metadata: {
    core_signals: { hook, tension, takeaway },
    structure: "hook-agitate-solve-cta",
    timeline: { hook_end: 3, agitate_end: 15, solve_end: 35, total: 40 },
    cta_mode: "loop",
    markers: [{ time: 0, text: "...", section: "hook" }],
    estimated_duration_sec: 40,
    bgm_mood: "lofi ambient"
  }
})
```

## Ví dụ loop CTA

- Hook: "99% người làm video sai bước này."
- Đóng: "…và đó là lý do 99% người vẫn sai."

## Anti-patterns

- Câu >12 từ
- Không dấu chấm giữa các ý
- Hook mơ hồ sau 3s
- Thiếu `[SFX]` khi hook cần punch
- CTA dài + chào tạm biệt — phá infinite loop
- Văn viết dài, không đọc được
