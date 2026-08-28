# Timing model — Whiteboard beat

Hai **trục thời gian** song song — nhầm lẫn đây là nguyên nhân phổ biến của bug zoom/SFX.

---

## Khái niệm cốt lõi

| Khái niệm | Công thức | Dùng cho |
|-----------|-----------|----------|
| `beat_window_sec` | Cửa sổ beat đầy đủ (audio timing) | Region `start_sec`, `complete_by_sec`, playhead timeline UI |
| `transition_duration_sec` | Transition sang beat kế (mặc định ~1.2s) | Trừ khỏi scene |
| `scene_budget_sec` | `beat_window_sec − transition_duration_sec` | Timeline zoom effects |
| `intro_sec` | ~0.15s (có regions) hoặc ~0.3s (mặc định) | Cố định đầu scene — timeline zoom bắt đầu **sau** intro |

**Mirror FE ↔ PHP:** `regionTimelineTiming.ts` ↔ `marketing_short_video_agent_whiteboard_regions_scene_payload()` trong whiteboard-helper.

---

## Sơ đồ thời gian một beat

```
|-- intro --|-- scene_budget (regions + timeline zoom) --|-- transition-out --|
|<------------------------ beat_window_sec ------------------------------->|
```

- **Regions** timing: trên `beat_window_sec` (scene-relative từ đầu beat)
- **Timeline zoom**: trên `scene_budget_sec`, engine trừ thêm `intro_sec` khi tính frame
- **Transition-out**: nằm cuối file MP4 beat, không tính vào scene budget

---

## Intro cố định

```typescript
// regionTimelineTiming.ts
WHITEBOARD_SCENE_INTRO_SEC = {
  withRegions: 0.15,
  default: 0.3,
}
```

Intro là khoảng đệm đầu scene trước khi vùng/timeline bắt đầu animate. Timeline zoom `start_sec=0` nghĩa là zoom bắt đầu ngay sau intro, **không** phải frame 0 của file MP4.

---

## Region timing

Mỗi `BeatRegion` có:

| Field | Ý nghĩa |
|-------|---------|
| `start_sec` | Thời điểm vùng **bắt đầu** render (ưu tiên hơn `script_start_word`) |
| `end_sec` / `complete_by_sec` | Thời điểm vùng render **xong** |
| `script_start_word` / `script_end_word` | Fallback từ whisper word index |

Khi user kéo marker trên timeline → ghi `start_sec`/`end_sec`, xóa script word cũ (`regionTimingPatchFromDrag`).

**Place effect** (loang, neon, …) chạy **sau** khi vùng đặt xong — duration thêm theo `PLACE_EFFECT_AFTER_SEC` (vd. loang = 1.0s).

---

## photo_place_mode

Chia phase intro/duration/color/hold trong scene:

| Mode | Hành vi |
|------|---------|
| `draw` | Tay vẽ outline trước, rồi reveal màu |
| `drag` | Tay kéo ảnh vào |
| `instant` | Hiện ngay, không animation tay |

Tính timing: `marketing_short_video_agent_whiteboard_scene_timing_from_beat()` trong PHP helper.

---

## Playhead vs video time

File beat = scene + transition-out. Preview map:

```
videoTime = intro_sec + playheadSec   (khi playhead trong scene)
```

Scene events (vùng, zoom) tính trên `scene_budget`; playhead timeline chạy trên `beat_window` đầy đủ.

Ref: `beatPlayheadToVideoSec()` trong `regionTimelineTiming.ts`

---

## Timeline zoom timing

`timeline_effects[]` dùng `start_sec`, `end_sec`, `zoom_in_end_sec`, `hold_end_sec` — **scene-relative trên scene_budget**, engine trừ `intro_sec`:

```
t_engine = frame_time - intro_sec
```

3 phase zoom: **zoom in** → **hold** → **zoom out** (mỗi phase tối thiểu 0.3s).

---

## Quy tắc vàng

1. Region cuối beat phải nằm trong `beat_window_sec`, không vượt qua transition
2. Timeline zoom không overlap transition — chỉ trên `scene_budget_sec`
3. Ken Burns chạy trên toàn scene; timeline zoom chạy sau intro — **không chồng** nếu có timeline zoom (Ken Burns bị tắt)
4. SFX loang fire tại frame **place_fix** (khi visual loang bắt đầu), không phải frame settle (ảnh vừa đặt)
5. **Hiệu ứng gây chú ý** (`attention_*`): `start` ≥ `end_sec` + thời lượng hiệu ứng sau ảnh; không kéo vào vùng transition (`scene_budget_sec`)
