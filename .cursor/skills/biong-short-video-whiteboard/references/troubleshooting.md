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

## 3. SFX loang phát trước hình loang / chỉ tiếng không hình

**Triệu chứng:** Nghe tiếng loang ~2–3s trước khi thấy hiệu ứng visual loang; hoặc 2 vùng loang gần nhau — vùng 1 có hình+âm, vùng 2 chỉ âm.

**Nguyên nhân:**
- SFX fire tại frame **settle** (ảnh vừa đặt xong) thay vì **place_fix** (visual loang bắt đầu)
- Merge timeline deadline: khi place anim của vùng B chồng post_fx (loang) của vùng A → chỉ giữ pe, **nuốt** `_fx` → mất hình loang A nhưng settle-fallback vẫn phát SFX
- `encode.py` kéo start SFX sớm (`max_start_fr`) để fit duration → càng lệch

**Fix pattern:**
- `frames.py`: gắn `co_post_fx` khi pe + fx cùng frame; gộp `object_indexes` khi nhiều loang chồng; **bỏ settle-fallback SFX**
- `frames.py`: `_maybe_fire` loang — chỉ ghi metadata settle, không phát; SFX chỉ từ place_fix / co_post_fx
- `encode.py`: bỏ `max_start_fr`; fade out gần cuối scene thay vì lùi start

**Files:** `frames.py`, `encode.py`

**Lưu ý:** Sau fix phải **render lại beat** — preview cũ không reflect SFX mới.

---

## 3b. Nhảy cốc hiện thumbnail cốc / ảnh snap đích rồi quay lại

**Triệu chứng:** Sprite cốc (thumbnail UI `nhay_coc.png`) hiện như tay; hoặc cutout đang hop thì nhảy về đúng vùng rồi bay tiếp từ vị trí cũ.

**Nguyên nhân:**
- `place_hand_styles` load PNG hop như tay và paste khi `show_hand` (cặp song song với tay thường)
- Cặp parallel dùng chung `place_stage` — oi2 settle/hop lệch nhịp bị snap `final_tip` rồi lại tip hop
- `tip2` thiếu → fallback `final_tip` khi vẫn inflight

**Fix pattern:**
- Không load hop/magnet vào `place_hand_styles`; `_paste_place_hands` skip hop/magnet oi
- Merge parallel: `place_stage2` + `tip2`; render oi2 theo stage riêng
- Resample hop: nội suy tip (không nearest-frame)
- Không pair hop với tay thường

**Files:** `frames.py`, `whiteboard/keo-anh/meta.json` (`kind: hop` = UI only)
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

## 8. Vùng cha hiện rồi tắt / mất cuối beat (nhiều place chồng)

**Triệu chứng:** Vùng 1 (cha, `hand_move`) vừa vào đã flash rồi tắt; cuối beat phần cha không hiện dù 2 con vẫn có. Audit: milestone chỉ `oi=hop`, pixel dest R1 corr≈0.

**Nguyên nhân:**
1. `parallel_pairs` **cấm** ghép hop + tay thường → 2 track riêng; merge deadline chỉ giữ pe **cuối** (= hop) → pe tay bị nuốt
2. `show_hand=False` trên hop → không gọi `_paste_place_hands` dù extra có tay
3. Loang R1 vẫn fire trên slot trống → flash trắng rồi tắt
4. (cũ) `while placed_upto < oi-1` force-paste dest sớm

**Fix pattern:**
- Ghép hop + tay qua `parallel_pairs` + `place_stage2` (magnet vẫn solo)
- Merge còn lại: ưu tiên `show_hand` làm primary + `extra_places` / `_flatten_place_anims`
- `_paste_place_hands` luôn chạy ở phase place (không gate `show_hand` primary)
- Bake dest khi `t ≥ complete_by` nếu chưa bake (`_ensure_unbaked_places_committed`)
- `_new_end` quét `oi2` + `extra_places` + `all_place_ois`

**File:** `frames.py`

---

## 9. Saber (năng lượng viền) lệch tốc độ / màu vs preview

**Triệu chứng:** Video chạy nhanh hơn preview; thanh cyan mờ / không rõ.

**Nguyên nhân:**
- Engine vẽ theo **contour mask** (chu vi ngắn) — preview dùng **`region.points`** (chu vi dài hơn) → cùng dash 14/86 *3 nhưng path ngắn = nhanh hơn
- Alpha stroke nhân với `glow/255` → mờ; stroke theo `min(w,h)` không stretch như SVG `preserveAspectRatio=none`

**Fix pattern:** Truyền `saber_points` (= `region.points`); vẽ viewBox 400 rồi resize full canvas; glow tách (drop-shadow), stroke giữ `rgba(80,220,255,0.35+0.55*I)`; `offset=(1-phase)*100*3`. Attention `t` trừ `intro_sec`.

**File:** `attention_effects.py`, `frames.py`

---

## 10. Vẽ / đưa ảnh xong sớm hơn marker timeline

**Triệu chứng:** Cửa sổ frame đúng `start→complete_by` nhưng motion settle giữa slot (ảnh đã nằm đích / tay biến mất sớm).

**Nguyên nhân:**
- `_stride_window_fit` giữ settle/hop, cắt move; pair pad settle rồi resample → settle chiếm nửa cửa sổ
- Pair: `place_stage=move` + `place_stage2=hop` không nhận `_has_hop`
- Draw: `_HAND_HIDE_PROGRESS=0.88` ẩn tay sớm; `reveal_progress` outline xong trước khi hết slot

**Fix pattern:**
- `fit_place_motion_to_window`: resample **chỉ motion** đầy `target-2`, settle 1–2 frame cuối
- Pair: resample từng track motion, không pad settle
- Draw: linear ink theo cửa sổ; ẩn tay ở progress ~0.97

**File:** `frames.py`

---

## 11. Ảnh thêm không hiện trong MP4

**Triệu chứng:** Upload ảnh trên canvas/timeline thấy preview, video render không có ảnh.

**Nguyên nhân:**
- Overlay URL S3/private — Python `urlretrieve` fail im lặng
- Engine cũ chỉ fade+paste, bỏ `place_effect` / cutout / tay
- Không `hold_to_end` thì ảnh tắt đúng `end_sec` trong khi attention neo sau mốc đó

**Fix pattern:**
- PHP `marketing_image_to_whiteboard_materialize_image_overlays` ghi `local_path`
- `apply_image_overlays_to_frames`: load local, log fail, compose place/draw, `hold_to_end`
- Overlay `t_sec` trừ `intro_sec` (cùng region)

**Files:** `marketing-image-to-whiteboard-helper.php`, `frames.py`, `render.py`

---

## 12. Ảnh thêm méo / viền vuông / không có tay

**Triệu chứng:** Preview OK nhưng MP4 bóp méo; viền/saber bao khung trong suốt; `drag_in` không thấy bàn tay.

**Nguyên nhân:** Engine stretch fill box; attention mask chữ nhật; overlay compose không load `place_hand`.

**Fix pattern:** Crop alpha → `contain` trong box; mask attention theo silhouette; load tay `keo-anh` (default `ban_tay_dua_anh_vao`) khi `drag_in`.

**File:** `frames.py`, `render.py` (`hands_root`)

---

## 13. GIF ảnh thêm chỉ hiện frame đầu / không nhảy

**Triệu chứng:** Upload GIF thấy animate trên editor, MP4 chỉ ảnh tĩnh.

**Nguyên nhân:** Loader cũ `convert("RGBA")` một frame; preload PHP đổi đuôi thành `.png`.

**Fix:** `_decode_overlay_animation` + chọn frame theo `(t − start_sec)`; materialize giữ `.gif`.

**Files:** `frames.py`, `marketing-image-to-whiteboard-helper.php`

---

## Checklist debug render beat

1. Xác nhận `agent_visual_mode=whiteboard`
2. Poll `getWhiteboardBeatRenders` — status `completed`?
3. So sánh payload: `get-agent-whiteboard-beat-render-timeline.php`
4. Kiểm tra `intro_sec`, `scene_budget_sec`, `timeline_effects` trong payload
5. Render lại beat sau sửa engine (không reuse MP4 cũ)
6. Stream preview: `stream-whiteboard-agent-beat-video.php`
