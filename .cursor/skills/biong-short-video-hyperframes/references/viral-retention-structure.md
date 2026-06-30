# Cấu trúc viral retention — TikTok / Reels / Shorts

**Phase 1:** HASCAS cho kịch bản thoại. **Phase 2:** visual pacing độc lập — beat bám audio, không theo HASCAS.

Thời lượng: **60–180 giây** (1–3 phút) — agent **chọn trong khoảng** theo độ dày nội dung marketing post.

Word budget: **~2.5 từ/giây** — 60s ≈ 150 từ, 90s ≈ 225 từ, 180s ≈ 450 từ.

---

## Phase 1 — Timeline HASCAS (chỉ audio script)

HASCAS định hình **cấu trúc thoại** — Hook, Agitate, Solve, CTA. **Không** quyết định số beat visual.

| Phần | % total | Ví dụ 90s | Ví dụ 180s |
|------|---------|------------|------------|
| **Hook** | ~5% (min 3s) | 0–5s | 0–9s |
| **Agitate** | ~25% | 5–27s | 9–54s |
| **Solve** | ~60% | 27–81s | 54–162s |
| **CTA/Loop** | ~10% | 81–90s | 162–180s |

```
0s ── Hook ── ~5% ── Agitate ── ~30% ── Solve ── ~90% ── CTA/Loop ── total
```

| Phần | Mục tiêu script |
|------|-----------------|
| **Hook** | Ngừng lướt — số shock, câu hỏi + **[SFX: vine boom] bắt buộc** |
| **Agitate** | "Giống mình thế!" — sai lầm phổ biến, stakes |
| **Solve** | Giải pháp thỏa mãn — But/Therefore, **không checklist** |
| **CTA/Loop** | Re-watch — CTA ngắn hoặc câu nối hook |

---

## Phase 2 — Visual pacing (độc lập HASCAS)

Visual beat **không** map 1:1 HASCAS. Số beat **không giới hạn** — chia theo nội dung đang nói.

| Quy tắc | Chi tiết |
|---------|----------|
| **Đổi layout world** | Khi đổi ý, số liệu, quy trình, twist — mỗi beat = layout archetype riêng |
| **Max một layout world** | ~8–12s trước khi cần beat mới hoặc `internal_acts` trong beat |
| **Micro-motion trong beat** | GSAP stagger, ambient, lottie — không frame tĩnh >2s |
| **Solve section** | **Tách nhiều beat** — không gom 60% video vào 1 composition |

Đọc: [visual-shot-plan.md](visual-shot-plan.md) · [visual-layout-archetypes.md](visual-layout-archetypes.md)

---

## 3 chỉ số kỹ thuật

### Phase 1 (script)

1. **Câu thoại ≤12 từ** — TTS có nhịp ngắt, dồn dập
2. **Canvas 1080×1920** — layout zones [layout-9x16-zones.md](layout-9x16-zones.md)
3. **`[SFX: vine boom]`** ở Hook — bắt buộc

### Phase 2 (visual)

1. **Mỗi beat:** `layout_archetype` + `render_stack` ≥2 tech — không text-only
2. **Beat timing:** `map-shot-plan-to-beat-map.mjs` bám `phrase_anchor` trên audio thật
3. **Archetype diversity:** ≥3 archetype unique / video ≥60s; không >2 liên tiếp cùng archetype

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

`markers` = **narrative anchors** cho script — **không** dùng làm nguồn beat visual mặc định. Beat visual từ `visual_shot_plan` Phase 2.

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
- **4 beat visual = 4 section HASCAS** — sai; Solve cần nhiều beat
- Một beat dài >12s không `internal_acts` / multi-clip
- Beat chỉ hiện chữ đang nói trên nền gradient
- Câu >12 từ (script)
- Render khi thiếu sfx_hook.mp3 / track 12

---

## Đọc kèm

- [viral-audio-script.md](viral-audio-script.md)
- [visual-shot-plan.md](visual-shot-plan.md)
- [visual-layout-archetypes.md](visual-layout-archetypes.md)
- [omnivoice-speech-script.md](omnivoice-speech-script.md)
- [media-mcp-activation.md](media-mcp-activation.md)
