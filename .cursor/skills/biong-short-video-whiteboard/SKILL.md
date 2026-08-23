---
name: biong-short-video-whiteboard
description: Agent short video mode Image (whiteboard) — sinh ảnh beat → editor vùng/timeline → Python whiteboard_engine → mux final. Invoke khi agent_visual_mode=whiteboard.
---

# Biong Short Video — Whiteboard (mode Image)

## Phân biệt mode

| `agent_visual_mode` | Label UI | Skill |
|---------------------|----------|-------|
| `whiteboard` | Image | **Skill này** |
| `hyperframes` | Motion HTML | `/biong-short-video-hyperframes` |

**Cấm nhầm:** Mode Image **không** dùng HyperFrames (GSAP beat HTML, hf-seek, `visual_shot_plan`, preflight HF scripts). Render qua CMS queue PHP + Python `whiteboard_engine`.

---

## Khi nào invoke

- Task liên quan beat region editor, timeline zoom, place/draw effects
- Sửa/debug whiteboard render engine (Python) hoặc PHP helper
- Full-auto pipeline whiteboard (`beat_image_fill` → `whiteboard_render` → `whiteboard_mux`)
- Sync âm thanh SFX với hiệu ứng visual (loang, neon, …)
- Thêm timeline effect mới trên beat

---

## Routing theo task — đọc trước khi sửa code

| Task AI | Đọc trước (theo thứ tự) |
|---------|-------------------------|
| Sửa UI editor / timeline | [data-model.md](references/data-model.md) → [timing-model.md](references/timing-model.md) → [effects-layers.md](references/effects-layers.md) |
| Sửa hiệu ứng render | [effects-layers.md](references/effects-layers.md) → [file-map.md](references/file-map.md) |
| Debug sync âm / hình | [timing-model.md](references/timing-model.md) → [troubleshooting.md](references/troubleshooting.md) |
| Thêm timeline effect | [effects-layers.md](references/effects-layers.md) + `timeline_effects.py` docstring |
| Full-auto / pipeline tổng | [pipeline-overview.md](references/pipeline-overview.md) |
| Không rõ bắt đầu từ đâu | [pipeline-overview.md](references/pipeline-overview.md) → [timing-model.md](references/timing-model.md) → [effects-layers.md](references/effects-layers.md) → [file-map.md](references/file-map.md) |

---

## Thứ tự đọc mặc định

1. [pipeline-overview.md](references/pipeline-overview.md) — luồng end-to-end
2. [timing-model.md](references/timing-model.md) — beat_window vs scene_budget vs intro
3. [effects-layers.md](references/effects-layers.md) — 6 lớp hiệu ứng + quy tắc chồng
4. [data-model.md](references/data-model.md) — BeatRegion, overrides, config
5. [file-map.md](references/file-map.md) — tra cứu file FE / PHP / Python
6. [troubleshooting.md](references/troubleshooting.md) — pitfall thường gặp

---

## Luồng workflow (tóm tắt)

| Bước | Ai làm | Kết quả |
|------|--------|---------|
| 1 | Agent / Admin | `audio_script` + beat map |
| 2 | CMS queue / extension | `beat_image_fill` — ảnh hybrid whiteboard mỗi beat |
| 3 | Admin / User | Chỉnh vùng, timeline, effects trên editor |
| 4 | CMS queue | Render per-beat → concat → mux → `final.mp4` |

Chi tiết: [pipeline-overview.md](references/pipeline-overview.md)

---

## Engine render mỗi beat (thứ tự)

```
frames.py (compose vùng, place/draw effects)
  → camera_motion.py (Ken Burns — SKIP nếu có timeline zoom)
  → timeline_effects.py (zoom in/hold/out)
  → encode.py (MP4 + SFX)
  → transitions.py (transition-out cuối beat)
```

---

## Output paths

```
storage/agent-renders/{shortVideoId}/my-video/renders/
├── beats/{beatId}.mp4      # từng beat (scene + transition-out)
├── visual-silent.mp4       # concat beats
└── final.mp4               # mux narration + BGM + caption
```

---

## Anti-patterns

- Áp dụng skill HyperFrames cho mode whiteboard
- Chạy `check-hf-seek-beat.mjs` / preflight HyperFrames cho whiteboard
- Sửa Ken Burns trong `dynamic-bg-mandatory.md` — đó là GSAP/HTML, không phải `camera_motion.py`
- Đặt timing timeline zoom trên `beat_window_sec` thay vì `scene_budget_sec`
- Fire SFX loang tại frame settle thay vì `place_fix`
