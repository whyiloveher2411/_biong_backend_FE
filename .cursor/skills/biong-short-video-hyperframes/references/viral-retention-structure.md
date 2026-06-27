# Cấu trúc viral retention — TikTok / Reels / Shorts

**Bắt buộc** phase 1 (script) + phase 2 (beat map). Mục tiêu: đánh bại thuật toán giữ chân — nhịp dồn dập, tâm lý rõ.

Thời lượng mặc định: **30–45 giây** (khuyến nghị **40s**).

---

## Timeline vàng

```
0s ── [ Hook: Giữ chân ] ── 3s ── [ Agitate: Khoét sâu ] ── 15s ── [ Solve: Giá trị ] ── 35s ── [ CTA / Loop ] ── 40s
```

| Phần | Giây | Mục tiêu | Script | HyperFrames phase 2 |
|------|------|----------|--------|---------------------|
| **Hook** | 0–3 | Ngừng lướt | Số shock, câu hỏi, myth-bust | `search_meme_sound` + `caption-kinetic-slam` + stock hook |
| **Agitate** | 3–15 | "Giống mình thế!" | Sai lầm phổ biến, stakes | Đổi visual mỗi 1.5–2s; 3–5 từ/cụm; đổi palette |
| **Solve** | 15–35 | Giải pháp thỏa mãn | Công thức 3 bước / mẹo 5 giây | UI Cards, số đếm, icon stagger |
| **CTA/Loop** | 35–40 | Tương tác / re-watch | CTA ngắn **hoặc** câu nối hook | BGM fade nhẹ; **ưu tiên infinite loop** |

---

## 3 chỉ số kỹ thuật (ép agent)

1. **Visual change mỗi 1.5–2s** — không frame tĩnh >2s; `animation-map.mjs` dead zone ≤1.5s
2. **Câu thoại ≤12 từ** — TTS có nhịp ngắt, dồn dập
3. **Canvas 1080×1920** — layout zones [layout-9x16-zones.md](layout-9x16-zones.md)

---

## Phase 1 — metadata khi `save_audio_script`

```json
{
  "structure": "hook-agitate-solve-cta",
  "timeline": {
    "hook_end": 3,
    "agitate_end": 15,
    "solve_end": 35,
    "total": 40
  },
  "cta_mode": "loop",
  "markers": [
    { "time": 0, "text": "99% sai bước này", "section": "hook" },
    { "time": 3, "text": "Bạn cũng mắc lỗi này", "section": "agitate" },
    { "time": 15, "text": "Ba bước sau đây", "section": "solve" },
    { "time": 35, "text": "...", "section": "cta" }
  ],
  "estimated_duration_sec": 40,
  "bgm_mood": "lofi ambient"
}
```

`cta_mode`: `"loop"` (khuyến nghị) — câu cuối nối mạch câu hook; `"cta"` — kêu gọi hành động ngắn.

---

## Phase 2 — beat map theo timeline

| Beat | data-start | data-duration | Visual |
|------|------------|---------------|--------|
| hook | 0 | ~3 | Meme SFX giây 0, kinetic slam, stock video |
| agitate_1 | 3 | ~4 | Palette shift, phrase stagger |
| agitate_2 | 7 | ~4 | Diagram / pain point cards |
| agitate_3 | 11 | ~4 | Stat / villain callout |
| solve_1 | 15 | ~7 | UI Card bước 1–2 |
| solve_2 | 22 | ~7 | UI Card bước 3 + proof |
| solve_3 | 29 | ~6 | Recap formula |
| cta_loop | 35 | ~5 | CTA hoặc loop line + fade BGM |

Điều chỉnh `data-duration` theo transcribe thực tế — timeline metadata là khung, không cứng số.

---

## Hook — SFX qua MCP

Script phase 1: `[SFX: vine boom]` hoặc `[SFX: sấm sét]` ở đầu.

Phase 2:

```text
short_video_search_meme_sound({ query: "vine boom" })
→ tải assets/audio/sfx_hook.mp3
→ <audio data-start="0" data-duration="2" data-track-index="12" data-volume="0.45">
```

1 SFX hook/video — không lấn narration (track 10).

---

## Infinite loop (khuyến nghị)

Câu cuối script phải **nối ngữ nghĩa** với câu đầu — khi video loop, người xem không nhận ra điểm cắt.

Ví dụ:
- Hook: "99% người làm video sai bước này."
- Loop close: "…và đó là lý do 99% người vẫn sai."

---

## Anti-patterns

- Hook mơ hồ, không shock trong 3s đầu
- Một beat dài >15s không đổi visual
- Câu >12 từ — TTS hụt hơi, caption khó sync
- CTA dài + chào tạm biệt — phá loop
- Bỏ `[SFX]` hook khi script đã ghi

---

## Đọc kèm

- [viral-audio-script.md](viral-audio-script.md) — quy tắc viết thoại
- [kinetic-typography-brief.md](kinetic-typography-brief.md) — hero 3–5 từ
- [media-mcp-activation.md](media-mcp-activation.md) — BGM + meme + stock
