# Cấu trúc viral retention — TikTok / Reels / Shorts

**Bắt buộc** phase 1 (script) + phase 2 (beat map). Mục tiêu: đánh bại thuật toán giữ chân — nhịp dồn dập, tâm lý rõ.

Thời lượng: **60–180 giây** (1–3 phút) — agent **chọn trong khoảng** theo độ dày nội dung marketing post.

Word budget: **~2.5 từ/giây** — 60s ≈ 150 từ, 90s ≈ 225 từ, 180s ≈ 450 từ.

---

## Timeline HASCAS (scale theo `total`)

| Phần | % total | Ví dụ 90s | Ví dụ 180s |
|------|---------|------------|------------|
| **Hook** | ~5% (min 3s) | 0–5s | 0–9s |
| **Agitate** | ~25% | 5–27s | 9–54s |
| **Solve** | ~60% | 27–81s | 54–162s |
| **CTA/Loop** | ~10% | 81–90s | 162–180s |

```
0s ── Hook ── ~5% ── Agitate ── ~30% ── Solve ── ~90% ── CTA/Loop ── total
```

| Phần | Mục tiêu | Script | HyperFrames phase 2 |
|------|----------|--------|---------------------|
| **Hook** | Ngừng lướt | Số shock, câu hỏi + **[SFX: vine boom] bắt buộc** | `search_meme_sound` + `caption-kinetic-slam` + stock hook |
| **Agitate** | "Giống mình thế!" | Sai lầm phổ biến, stakes | Đổi visual mỗi 1.5–2s; 3–5 từ/cụm; đổi palette |
| **Solve** | Giải pháp thỏa mãn | Chuỗi But/Therefore + insight — **không checklist** | UI Cards theo narrative_chain, số đếm, icon stagger |
| **CTA/Loop** | Re-watch | CTA ngắn **hoặc** câu nối hook | BGM fade nhẹ; **ưu tiên infinite loop** |

---

## 3 chỉ số kỹ thuật (ép agent)

1. **Visual change mỗi 1.5–2s** — không frame tĩnh >2s
2. **Câu thoại ≤12 từ** — TTS có nhịp ngắt, dồn dập
3. **Canvas 1080×1920** — layout zones [layout-9x16-zones.md](layout-9x16-zones.md)

---

## Phase 1 — metadata khi `save_audio_script`

```json
{
  "structure": "hook-agitate-solve-cta",
  "timeline": {
    "hook_end": 5,
    "agitate_end": 27,
    "solve_end": 81,
    "total": 90
  },
  "cta_mode": "loop",
  "markers": [
    { "time": 0, "text": "99% sai bước này", "section": "hook" },
    { "time": 5, "text": "Bạn cũng mắc lỗi này", "section": "agitate" },
    { "time": 27, "text": "Tưởng vậy là xong — nhưng mà…", "section": "solve" },
    { "time": 81, "text": "...", "section": "cta" }
  ],
  "estimated_duration_sec": 90,
  "bgm_mood": "lofi ambient"
}
```

Server tự scale `timeline` nếu thiếu. `estimated_duration_sec` **bắt buộc** 60–180.

---

## Hook — SFX qua MCP (bắt buộc)

Script phase 1: **luôn** có `[SFX: vine boom]` hoặc `[SFX: sấm sét]` ở đầu — server reject nếu thiếu.

Phase 2:

```text
short_video_search_meme_sound({ query: "vine boom" })
→ tải assets/audio/sfx_hook.mp3
→ <audio data-start="0" data-duration="2" data-track-index="12" data-volume="0.45">
```

Preflight: `check-media-stack.mjs --strict` trước render.

---

## Anti-patterns

- Script < 60s hoặc > 180s
- Thiếu `[SFX: ...]` ở Hook
- Hook mơ hồ trong 5% đầu
- Một beat dài >15s không đổi visual
- Câu >12 từ
- Render khi thiếu sfx_hook.mp3 / track 12

---

## Đọc kèm

- [viral-audio-script.md](viral-audio-script.md)
- [omnivoice-speech-script.md](omnivoice-speech-script.md)
- [media-mcp-activation.md](media-mcp-activation.md)
