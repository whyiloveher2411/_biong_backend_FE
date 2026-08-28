# File map — Whiteboard beat

Tra cứu nhanh file theo vai trò. Đường dẫn tương đối repo root trừ khi ghi rõ.

---

## Frontend (`_biong_backend_FE`)

### Editor UI

| File | Vai trò |
|------|---------|
| `src/plugins/.../AgentVideo/ShortVideoAgentVideoWorkspace.tsx` | Shell workspace |
| `src/plugins/.../AgentVideo/ShortVideoAgentBeatRegionEditor.tsx` | Region editor chính (~3900 dòng) |
| `src/plugins/.../AgentVideo/WhiteboardCustomBackgroundControl.tsx` | Upload / ẩn / xóa custom background per-beat |
| `src/plugins/.../AgentVideo/WhiteboardRegionTimeline.tsx` | Timeline vùng + ảnh thêm + zoom; icon xóa + confirm |
| `src/plugins/.../AgentVideo/WhiteboardBeatTimingPreview.tsx` | Preview timing beat |
| `src/plugins/.../AgentVideo/RegionMediaSettingsPanel.tsx` | Panel **Hiệu ứng gây chú ý** (magenta, grid 1 loại) |
| `src/plugins/.../AgentVideo/regionAttentionTiming.ts` | Timing cửa sổ + `resolveAttentionFxAt` |
| `src/plugins/.../AgentVideo/ShortVideoAgentWhiteboardBeatSettings.tsx` | Beat timing settings |
| `src/plugins/.../AgentVideo/ShortVideoAgentWorkflowPanel.tsx` | Pipeline UI |
| `src/plugins/.../Marketing/WhiteboardTransitionManagerDrawer.tsx` | Quản lý transition catalog |
| `src/plugins/.../Marketing/MarketingImageToWhiteboardDrawer.tsx` | Drawer Image→Whiteboard standalone |

### Types, API, timing

| File | Vai trò |
|------|---------|
| `src/plugins/.../AgentVideo/agentVideoApi.ts` | Types, effect constants, API calls |
| `src/plugins/.../AgentVideo/agentVideoVisualMode.ts` | Mode routing whiteboard/hyperframes |
| `src/plugins/.../AgentVideo/regionTimelineTiming.ts` | Timing helpers, intro constants |
| `src/plugins/.../AgentVideo/agentVideoTimelineModel.ts` | Timeline model |
| `src/plugins/.../AgentVideo/agentVideoPipelineStepLabels.ts` | Full-auto step labels |
| `src/plugins/.../AgentVideo/useAgentVideoContent.ts` | Orchestration render/poll |
| `src/plugins/.../AgentVideo/agentVideoWhiteboardRenderProgress.ts` | Progress render |

### Timeline effects (zoom)

| File | Vai trò |
|------|---------|
| `beatTimelineEffects/registry.ts` | Effect registry |
| `beatTimelineEffects/normalizeTimelineEffects.ts` | Normalize payload |
| `beatTimelineEffects/useBeatTimelineEffects.ts` | React hook |
| `beatTimelineEffects/resolveZoomTransform.ts` | Preview transform |
| `beatTimelineEffects/effects/zoom/definition.ts` | Zoom effect definition |
| `beatTimelineEffects/effects/zoom/ZoomSettingsPanel.tsx` | Zoom settings UI |
| `beatTimelineEffects/timelineBarDrag.ts` | Drag logic timeline bar |

### Beat content prep

| File | Vai trò |
|------|---------|
| `agentVideoBeatDivisionWhiteboard.ts` | Beat division prompts/styles |
| `agentVideoBeatMap.whiteboard.test.ts` | Tests |

---

## Backend PHP (`_biong_backend`)

### Hub & orchestration

| File | Vai trò |
|------|---------|
| `resources/views/plugins/vn4-e-learning/inc/marketing-ai/marketing-short-video-agent-whiteboard-helper.php` | **Hub chính** — timing, regions, enqueue, finalize, concat, mux |
| `resources/views/plugins/vn4-e-learning/inc/marketing-ai/marketing-image-to-whiteboard-helper.php` | Gọi Python CLI, enqueue job |
| `resources/views/plugins/vn4-e-learning/inc/marketing-ai/marketing-short-video-agent-helper.php` | Agent core |
| `resources/views/plugins/vn4-e-learning/inc/marketing-ai/marketing-short-video-full-auto-pipeline.php` | Full-auto orchestration |

### Queue & handlers

| File | Vai trò |
|------|---------|
| `inc/queue/handlers/marketing-ai/image_to_whiteboard.php` | Queue worker → finalize beat |
| `inc/queue/handlers/short-video/gemini_web_beat_image_fill.php` | Sinh ảnh beat Gemini |
| `inc/queue/handlers/short-video/metaai_beat_image_fill.php` | Sinh ảnh beat Meta.ai |

### API endpoints (`inc/api/admin/app-mobile/marketing/short-video/`)

- `save-agent-whiteboard-config.php`
- `save-agent-whiteboard-beat-override.php`
- `get-agent-whiteboard-beat-render-timeline.php`
- `render-whiteboard-agent-beat.php`
- `render-whiteboard-agent-video.php`
- `get-whiteboard-beat-renders.php`
- `stream-whiteboard-agent-beat-video.php`
- `auto-select-agent-whiteboard-region.php`
- `save-agent-visual-mode.php`

### Whiteboard catalog API (`marketing/whiteboard/`)

- `transitions.php`, `backgrounds.php`, `hands.php`, `enqueue.php`, `save-transition.php`

### Scripts

| File | Vai trò |
|------|---------|
| `scripts/mux-whiteboard-agent-video.mjs` | Mux final video |

### Tests

| File | Vai trò |
|------|---------|
| `marketing-short-video-agent-whiteboard-helper.test.php` | PHP helper tests |

---

## Python engine (`_biong_backend`)

Base: `resources/views/plugins/vn4-e-learning/services/image-to-whiteboard/whiteboard_engine/`

| File | Vai trò |
|------|---------|
| `render.py` | CLI entry, scene render, transition-out, skip Ken Burns logic |
| `frames.py` | Frame compose, place/draw effects, hands, SFX trigger frames |
| `attention_effects.py` | Lớp 3b gây chú ý: breathe / spotlight / glitch / ripple / saber / god_rays / light_sweep |
| `camera_motion.py` | Ken Burns (`IMAGE_ANIMATION_EFFECTS`) |
| `timeline_effects.py` | Timeline zoom (in/hold/out) |
| `transitions.py` | Transition registry + renderers |
| `cutout.py` | Photo/doodle masks |
| `auto_select.py` | GrabCut auto-select |
| `encode.py` | MP4 encode + SFX mix |
| `README.md` | CLI standalone docs |

CLI wrapper: `_biong_backend/image-to-whiteboard.sh`

---

## Assets (`_biong_backend/whiteboard/`)

| Thư mục | Nội dung |
|---------|----------|
| `pencil/meta.json` | Tay/bút vẽ |
| `keo-anh/meta.json` | Tay đưa ảnh |
| `next-screen/meta.json` | Transition assets |
| `background/meta.json` | Board themes |

---

## Skills & docs (FE)

| File | Vai trò |
|------|---------|
| `.cursor/skills/biong-short-video-whiteboard/SKILL.md` | Entry point mode Image |
| `.cursor/skills/biong-short-video-whiteboard/references/*` | Chi tiết pipeline/timing/effects |
| `.cursor/skills/biong-short-video-hyperframes/` | **Không dùng** cho whiteboard |

---

## Task → file nhanh

| Task | File đầu tiên nên mở |
|------|---------------------|
| Sửa UI timeline zoom bar | `WhiteboardRegionTimeline.tsx` |
| Sửa preview zoom | `WhiteboardBeatTimingPreview.tsx`, `resolveZoomTransform.ts` |
| Sửa place effect visual | `frames.py` |
| Sửa Ken Burns | `camera_motion.py`, `render.py` |
| Sửa timeline zoom render | `timeline_effects.py`, `render.py` |
| Sửa SFX sync | `frames.py` (trigger frame), `encode.py` (mix) |
| Sửa transition | `transitions.py`, whiteboard-helper PHP |
| Sửa region payload PHP | `marketing-short-video-agent-whiteboard-helper.php` |
| Thêm timeline effect type | `beatTimelineEffects/registry.ts` + `timeline_effects.py` |
