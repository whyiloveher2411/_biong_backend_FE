# viral-audio-script — kịch bản giữ chân cao

Skill phase 1. Invoke: `/viral-audio-script` sau `/extract-core-signals`.

## Công thức HASCAS

```
Hook (3s) → Agitate → Solve → CTA
```

| Phần | Nội dung |
|------|----------|
| Hook | Nỗi sợ / tò mò — câu đầu ≤15 từ |
| Agitate | Khoét villain từ tension |
| Solve | Takeaway formula + proof ngắn |
| CTA | Một hành động — xem, thử, bấm link |

## Viết cho tai nghe

- Mỗi câu **10–15 từ**
- Ngắt nhịp bằng `.` và `,` — tránh câu 40+ từ
- Tiếng Việt nói tự nhiên — như podcast ngắn, không báo chí

## Thẻ âm thanh (trong text)

| Thẻ | Khi dùng |
|-----|----------|
| `[SFX: Tiếng sấm sét]` | Hook shock |
| `[SFX: Chuông báo]` | Cảnh báo / myth bust |
| `[BGM: Đẩy cao trào]` | Trước Solve |
| `[Dừng 1s]` | Beat dramatic sau hook |

Admin ghi âm MP3 thủ công — thẻ hướng dẫn người đọc và phase 2 beat map.

## Lưu qua MCP

```text
short_video_save_audio_script({
  short_video_id: N,
  text: "[SFX: ...] Câu hook. [Dừng 1s]. ...",
  metadata: {
    core_signals: { hook, tension, takeaway },
    markers: [{ time: 0, text: "..." }, { time: 3, text: "..." }],
    estimated_duration_sec: 45,
    structure: "hook-agitate-solve-cta"
  }
})
```

## Ví dụ output

```json
{
  "audio_script": "[SFX: Tiếng kính vỡ] 99% mọi người đang dùng HyperFrames sai cách! [Dừng 1s]. Bạn nghĩ cứ add skill là video tự đẹp? Sai lầm. [SFX: Tiếng chuông báo động]. Bí mật nằm ở Stagger và Easing. Xem ngay 3 bước sau...",
  "markers": [
    { "time": 0, "text": "99% mọi người sai cách" },
    { "time": 3, "text": "Sai lầm lớn nhất" }
  ]
}
```

Phase 2: `markers` + transcribe MP3 → caption kinetic + beat cuts.

## Anti-patterns

- Văn viết dài, không đọc được
- Không có hook 3 giây đầu
- Thiếu SFX tại cao trào
- CTA mơ hồ hoặc nhiều CTA
