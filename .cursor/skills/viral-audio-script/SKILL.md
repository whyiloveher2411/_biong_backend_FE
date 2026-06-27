---
name: viral-audio-script
description: Định hình kịch bản audio viral — viết cho tai nghe, câu ≤12 từ, dấu câu rõ, timeline Hook→Agitate→Solve→CTA/Loop. Dùng sau /extract-core-signals trong phase 1.
---

# viral-audio-script

Chuyển `core_signals` thành **audio script** đọc tự nhiên — không văn viết cho mắt.

**Đọc trước:** `biong-short-video-hyperframes/references/viral-retention-structure.md`

## Input

- Output từ `/extract-core-signals`
- Target: **30–45 giây** (mặc định **40s**)

## Timeline viral (bắt buộc)

```
0s Hook (3s) → Agitate (15s) → Solve (35s) → CTA/Loop (40s)
```

| Phần | Giây | Nội dung |
|------|------|----------|
| Hook | 0–3 | Shock / số / câu hỏi — quyết định 80% retention |
| Agitate | 3–15 | Khoét nỗi đau — "giống mình thế" |
| Solve | 15–35 | Công thức 3 bước, giá trị gọn |
| CTA/Loop | 35–40 | CTA ngắn **hoặc** câu nối hook (ưu tiên loop) |

## Quy tắc viết cho tai nghe

- Câu **tối đa 12 từ** — tách câu dài thành 2 câu ngắn
- **Dấu phẩy `,`** — ngắt nghỉ ngắn (0.3–0.5s); tối đa 1–2 phẩy/câu
- **Dấu chấm `.`** — kết thúc ý; bắt buộc giữa các ý lớn
- Ngôn ngữ nói tự nhiên tiếng Việt — podcast ngắn, không báo chí
- Không liệt kê dài trong một hơi thở

## Thẻ âm thanh

| Thẻ | Khi dùng |
|-----|----------|
| `[BGM: lofi ambient]` | Đầu script — phase 2 `search_bgm` |
| `[SFX: vine boom]` | Hook giây 0 — phase 2 `search_meme_sound` |
| `[SFX: sấm sét]` | Shock / myth bust |
| `[Dừng 0.5s]` | Sau hook shock |
| `[Dừng 1s]` | Trước Solve / sau câu hỏi tu từ |

## Output

**text** (lưu `save_audio_script`):

```
[BGM: lofi ambient] [SFX: vine boom] 99% người làm video sai bước này. [Dừng 0.5s]. Bạn nghĩ add skill là đủ? Sai. Bí mật là ép AI dùng Stagger. Ba bước sau đây...
```

**metadata**:

```json
{
  "core_signals": {},
  "structure": "hook-agitate-solve-cta",
  "timeline": { "hook_end": 3, "agitate_end": 15, "solve_end": 35, "total": 40 },
  "cta_mode": "loop",
  "markers": [
    { "time": 0, "text": "99% sai bước này", "section": "hook" },
    { "time": 3, "text": "Sai lầm lớn nhất", "section": "agitate" }
  ],
  "estimated_duration_sec": 40,
  "bgm_mood": "lofi ambient"
}
```

`cta_mode: "loop"` — câu cuối nối mạch hook (infinite re-watch).

Tham khảo: `biong-short-video-hyperframes/references/viral-audio-script.md`
