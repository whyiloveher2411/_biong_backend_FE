# Data model — Whiteboard beat

Types chính trong `agentVideoApi.ts`. Lưu trên short video record qua PHP helper.

---

## AgentVisualMode

```typescript
type AgentVisualMode = 'hyperframes' | 'whiteboard';
```

- `whiteboard` → UI label **Image**
- `hyperframes` → UI label **Motion HTML**

Ref: `agentVideoVisualMode.ts`

---

## AgentWhiteboardConfig (clip-level)

Lưu qua `saveAgentWhiteboardConfig` → field `agent_whiteboard_config`.

| Field | Ý nghĩa |
|-------|---------|
| `resolution` | `720p` \| `1080p` |
| `board_theme` | Theme nền bảng (`whiteboard/background/meta.json`) |
| `transition` | Transition giữa beats: id \| `random` \| `none` |
| `transition_duration_sec` | Thời lượng transition (mặc định ~1.2) |
| `hand` | Tay vẽ mặc định |
| `gen_style` | Style sinh ảnh: `hybrid`, `whiteboard`, `sketch`, … |
| `photo_place_mode` | `draw` \| `drag` \| `instant` |
| `hold_ratio`, `color_ratio` | Tỷ lệ phase hold/color |
| `image_animation_effect` | Ken Burns mặc định toàn clip (`random` mặc định) |
| `beats_per_job` | Số beat render mỗi job queue (1 = mỗi beat 1 job) |
| `assets_mode` | Chỉ xuất tài nguyên, không render final |

---

## AgentWhiteboardBeatOverride (per-beat)

Lưu trong `agent_whiteboard_beat_overrides[beatId]` qua `saveAgentWhiteboardBeatOverride`.

| Field | Ý nghĩa |
|-------|---------|
| `hand`, `board_theme`, `gen_style` | Override clip-level |
| `photo_place_mode` | Override mode đặt ảnh |
| `duration_sec`, `hold_sec`, `color_sec` | Timing beat |
| `transition_duration_sec` | Override transition beat này |
| `image_animation_effect` | Ken Burns: `common` \| concrete \| `none` \| `random` |
| `focus_x`, `focus_y` | Điểm tập trung frame cuối (0–1) |
| `regions` | Mảng `BeatRegion[]` |
| `image_overlays` | Mảng `BeatImageOverlay[]` (sticker ảnh upload) |
| `timeline_effects` | Mảng `BeatTimelineEffect[]` (hiện chỉ zoom) |

---

## BeatRegion

Polygon chuẩn hóa **0–1** trên ảnh beat gốc.

### Identity & hierarchy

| Field | Ý nghĩa |
|-------|---------|
| `id` | UUID vùng |
| `name` | Tên hiển thị |
| `points` | Polygon [[x,y], …] normalized 0–1 |
| `action` | `draw` \| `place` \| `erase` |
| `parent_id` | Cây cha/con — engine khoét mask con khỏi cha |
| `parent_leftover_instant` | Vùng cha hiện ngay phần thừa (trừ con) |

### Timing

| Field | Ý nghĩa |
|-------|---------|
| `start_sec` | Bắt đầu render (ưu tiên) |
| `end_sec` | Render xong (= `complete_by_sec` trên PHP payload) |
| `script_start_word`, `script_end_word` | Fallback whisper word index |

### Selection & background

| Field | Ý nghĩa |
|-------|---------|
| `select_mode` | `object` (GrabCut) \| `full` |
| `object_points` | Contour vật thể |
| `full_points` | Polygon gốc trước refine |
| `bg_sample` | Mẫu nền tile riêng vùng |
| `background_image` | Ảnh inpaint (giữ nền) |

### Effects (xem effects-layers.md)

| Field | Ý nghĩa |
|-------|---------|
| `place_effect` | Hiệu ứng sau place/draw |
| `place_effect_color` | Màu neon |
| `place_hand`, `place_entry_direction` | Tay + hướng đưa ảnh |
| `place_shadow`, `place_border`, `place_border_color`, `place_torn_paper` | Cutout style |
| `draw_hand` | Bút vẽ |
| `entry_mode` | Cách đưa vào (chỉ `action=place`): `draw` \| `drag_in` \| `instant` — override `photo_place_mode` beat-level |
| `attention_start_sec`, `attention_end_sec` | Cửa sổ hiệu ứng gây chú ý (Thở). `start` ≥ `end_sec` + hiệu ứng sau ảnh |
| `attention_scale_max` | Biên scale tối đa (clamp 1.0–1.3, mặc định 1.2) |
| `attention_cycle_sec` | Chu kỳ một nhịp thở (giây, mặc định ~1.2) |

---

## BeatImageOverlay (sticker ảnh upload)

Rect tự do trên ảnh beat — không dùng GrabCut. Lưu trong `image_overlays[]`.

| Field | Ý nghĩa |
|-------|---------|
| `id`, `name` | Identity |
| `image_url` | URL ảnh upload (`uploadAgentVisualImage`) |
| `x`, `y`, `width`, `height` | Tâm + kích thước rect normalized 0–1 |
| `rotation_deg` | Xoay sticker |
| `start_sec`, `end_sec` | Thời gian xuất hiện (scene-relative) |
| `entry_mode` | `draw` \| `drag_in` \| `instant` |
| `place_effect`, `place_hand`, … | Cùng stack hiệu ứng như vùng place |
| `attention_*` | Cùng công thức thở như `BeatRegion` |

Helpers FE: `regionAttentionTiming.ts`, `normalizeBeatImageOverlay()` trong `agentVideoApi.ts`

---

## BeatTimelineEffect (zoom)

```typescript
type BeatZoomEffect = {
  id: string;
  type: 'zoom';
  start_sec: number;
  end_sec: number;
  layer: number;
  zoom_level: number;      // 1.0 – 2.0
  focus_x: number;           // 0 – 1
  focus_y: number;
  zoom_in_end_sec: number;
  hold_end_sec: number;
  name?: string;
};
```

Normalize: `beatTimelineEffects/normalizeTimelineEffects.ts`  
Min duration: `BEAT_TIMELINE_EFFECT_MIN_DUR_SEC = 1.0`

---

## WhiteboardBeatRenderEntry

Trạng thái render per-beat từ `getWhiteboardBeatRenders`:

| Field | Giá trị |
|-------|---------|
| `status` | `none` \| `queued` \| `processing` \| `completed` \| `failed` |
| `video_url` | URL stream preview beat |
| `silent_mp4`, `video_path` | Path file local |

---

## API endpoints chính

| FE function | PHP endpoint | Mục đích |
|-------------|--------------|----------|
| `saveAgentWhiteboardConfig` | `save-agent-whiteboard-config.php` | Config clip |
| `saveAgentWhiteboardBeatOverride` | `save-agent-whiteboard-beat-override.php` | Override beat |
| `renderWhiteboardAgentBeat` | `render-whiteboard-agent-beat.php` | Render 1 beat |
| `renderWhiteboardAgentVideo` | `render-whiteboard-agent-video.php` | Render toàn clip |
| `getWhiteboardBeatRenders` | `get-whiteboard-beat-renders.php` | Poll status |
| — | `get-agent-whiteboard-beat-render-timeline.php` | Debug timeline server |
| — | `auto-select-agent-whiteboard-region.php` | GrabCut auto-select |
| — | `stream-whiteboard-agent-beat-video.php` | Stream preview |
| `saveAgentVisualMode` | `save-agent-visual-mode.php` | Chọn whiteboard/hyperframes |

Paths: `inc/api/admin/app-mobile/marketing/short-video/` và `marketing/whiteboard/`

---

## Storage keys trên short video record

```
agent_visual_mode              → 'whiteboard' | 'hyperframes'
agent_whiteboard_config        → AgentWhiteboardConfig
agent_whiteboard_beat_overrides → Record<beatId, AgentWhiteboardBeatOverride>
```

PHP resolve payload render: `marketing_short_video_agent_whiteboard_regions_scene_payload()`
