# Troubleshooting — Whiteboard beat

Pitfall thường gặp khi debug mode Image. Đọc [timing-model.md](timing-model.md) và [effects-layers.md](effects-layers.md) trước.

---

## 1. Zoom timeline `start_sec=0` nhưng frame đầu đã zoom sẵn

**Triệu chứng:** Timeline zoom bắt đầu t=0, zoom in ~0.5s, nhưng frame đầu video đã ở mức zoom đích.

**Nguyên nhân:**
- Ken Burns (`camera_motion.py`) chồng lên timeline zoom
- Engine không trừ `intro_sec` khi tính phase zoom

**Fix pattern:**
- `render.py`: skip `apply_camera_motion` khi có `timeline_effects` type `zoom`
- `timeline_effects.py`: nhận `intro_sec`, tính `t = frame_time - intro_sec`
- `frames.py`: truyền `intro_sec` vào `timeline_meta`

**Files:** `render.py`, `timeline_effects.py`, `frames.py`

---

## 2. Timeline zoom bar hiển thị sai dòng

**Triệu chứng:** Bar zoom nằm trên hàng label "Hiệu ứng" thay vì track zoom riêng.

**Nguyên nhân:** UI có hàng label thừa gây lệch index track.

**Fix pattern:** Xóa hàng label "Hiệu ứng" trong timeline (cột label + track).

**File:** `WhiteboardRegionTimeline.tsx`

---

## 3. SFX loang phát trước hình loang

**Triệu chứng:** Nghe tiếng loang ~2–3s trước khi thấy hiệu ứng visual loang (~5s).

**Nguyên nhân:**
- SFX fire tại frame **settle** (ảnh vừa đặt xong) thay vì **place_fix** (visual loang bắt đầu)
- `encode.py` kéo start SFX sớm (`max_start_fr`) để fit duration → càng lệch

**Fix pattern:**
- `frames.py`: `_maybe_fire` loang — ghi `_loang_start_by_oi` tại frame đầu place_fix; settle chỉ ghi metadata
- `encode.py`: bỏ `max_start_fr`; fade out gần cuối scene thay vì lùi start

**Files:** `frames.py`, `encode.py`

**Lưu ý:** Sau fix phải **render lại beat** — preview cũ không reflect SFX mới.

---

## 4. Region cuối beat bị cắt / vượt scene

**Triệu chứng:** Vùng `complete_by_sec` gần cuối beat bị cắt visual hoặc SFX.

**Nguyên nhân:** Nhầm `beat_window_sec` với `scene_budget_sec`; không trừ `transition_duration_sec`.

**Check:**
- Region timing trên `beat_window_sec`
- Place effect after-duration (`PLACE_EFFECT_AFTER_SEC`) có làm vùng + effect vượt transition không
- `scene_budget_sec = beat_window - transition`

**Files:** `regionTimelineTiming.ts`, whiteboard-helper PHP, `WhiteboardRegionTimeline.tsx`

---

## 5. Ken Burns và timeline zoom chạy cùng lúc

**Triệu chứng:** Zoom bị "nhảy", không smooth; preview khác render.

**Nguyên nhân:** Beat có cả `image_animation_effect` và `timeline_effects` zoom.

**Quy tắc:** Timeline zoom **thay thế** Ken Burns — engine phải skip camera motion.

**Files:** `render.py` (điều kiện skip), `ShortVideoAgentImageAnimationControls.tsx` (UI hint)

---

## 6. Nhầm Ken Burns HyperFrames vs whiteboard

**Triệu chứng:** AI sửa `dynamic-bg-mandatory.md` hoặc GSAP Ken Burns cho bug zoom whiteboard.

**Phân biệt:**

| | HyperFrames | Whiteboard |
|---|-------------|------------|
| Ken Burns | GSAP/CSS trong beat HTML | `camera_motion.py` |
| Timeline zoom | Không có | `timeline_effects.py` |
| Skill | `biong-short-video-hyperframes` | `biong-short-video-whiteboard` |

---

## 7. Preflight HyperFrames fail trên whiteboard

**Triệu chứng:** Chạy `check-hf-seek-beat.mjs` / preflight scripts trên project whiteboard.

**Quy tắc:** Preflight HyperFrames **chỉ** cho `agent_visual_mode=hyperframes`. Whiteboard render qua CMS queue PHP — không có beat HTML, không cần hf-seek audit.

**Skill:** `biong-short-video-preflight` — xem note whiteboard.

---

## Checklist debug render beat

1. Xác nhận `agent_visual_mode=whiteboard`
2. Poll `getWhiteboardBeatRenders` — status `completed`?
3. So sánh payload: `get-agent-whiteboard-beat-render-timeline.php`
4. Kiểm tra `intro_sec`, `scene_budget_sec`, `timeline_effects` trong payload
5. Render lại beat sau sửa engine (không reuse MP4 cũ)
6. Stream preview: `stream-whiteboard-agent-beat-video.php`
