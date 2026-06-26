---
name: biong-short-video-hyperframes
description: Workflow tạo short video marketing bằng HyperFrames local CLI từ Cursor agent, upload qua MCP Biong vào field agent_video_* — không đụng pipeline Remotion.
---

# Biong Short Video — HyperFrames Agent Workflow

Skill này điều phối agent tạo video TikTok 9:16 cho `spacedev_app_short_video` bằng **HyperFrames local CLI**, upload qua **MCP `biong-short-video`**.

Audio narration **bắt buộc** qua MCP backend (Saydi → Vbee), **không** dùng Kokoro hay `/hyperframes-media` TTS local.

## Khi nào dùng

User yêu cầu dạng:

- "Tạo video HyperFrames cho short video ID 123"
- "Làm video agent cho short video #45"

## Điều kiện tiên quyết

1. MCP server `biong-short-video` đã cấu hình trong `.cursor/mcp.json`
2. HyperFrames skills đã cài: `npx skills add heygen-com/hyperframes`
3. HyperFrames CLI hoạt động: `npx hyperframes doctor` (FFmpeg + Chrome; Kokoro **không bắt buộc**)
4. CMS đã cấu hình TTS Saydi và/hoặc Vbee

## Skills HyperFrames cần load

1. `/hyperframes` — entry point
2. `/hyperframes-core` — HTML composition contract
3. `/hyperframes-animation` — GSAP timelines
4. `/hyperframes-creative` — palette, typography (áp dụng Biennale Yellow từ context)
5. `/hyperframes-cli` — lint, preview, render
6. `/general-video` hoặc `/faceless-explainer` — workflow TikTok hook / explainer

**Không dùng** `/hyperframes-media` cho TTS — audio lấy từ MCP backend.

## Quy trình bắt buộc (theo thứ tự)

### 1. Lấy context

```text
short_video_get_context({ short_video_id })
```

Chú ý: `audio_status`, `script_json`, `scene_audio_json`, `design_tokens_excerpt`, `render_spec`.

### 2. Chuẩn bị script (nếu thiếu)

Nếu `audio_status.has_script === false`:

```text
short_video_generate_script({ short_video_id })
```

Sau đó gọi lại `short_video_get_context`.

### 3. Sinh audio scene qua MCP backend

Kiểm tra trạng thái:

```text
short_video_get_audio_status({ short_video_id })
```

Nếu `has_scene_audio === false` hoặc còn `pending_scene_ids`:

```text
short_video_generate_scene_audio({ short_video_id })
```

- Flow TTS: **Saydi trước, fail → Vbee** (giống CMS `generate-audio-batch`)
- Sinh một scene: thêm `scene_id: "s1"`
- Sinh lại: `force: true`

Lặp `generate_scene_audio` / `get_audio_status` cho đến khi `has_scene_audio === true`.

Gọi lại `short_video_get_context` để lấy `scene_audio_json.scenes.*.url` mới nhất.

### 4. Đánh dấu processing video agent

```text
short_video_update_agent_status({ short_video_id, status: "processing" })
```

### 5. Khởi tạo composition HyperFrames

```bash
mkdir -p storage/agent-renders/{short_video_id}
cd storage/agent-renders/{short_video_id}
npx hyperframes init
```

### 6. Author video 9:16

- Mỗi scene trong `script_json` → clip timed
- **Narration**: dùng URL MP3 từ `scene_audio_json.scenes[sceneId].url` (backend S3)
- Áp dụng `design_tokens_excerpt` (Biennale Yellow)
- Caption từ `on_screen_text` hoặc voiceover

### 7. Lint và render

```bash
npx hyperframes lint
npx hyperframes render --output ./output.mp4
```

### 8. Upload qua MCP

```text
short_video_upload_agent_video({
  short_video_id,
  file_path: "/absolute/path/to/output.mp4",
  hyperframes_cli_version: "...",
  composition_path: "storage/agent-renders/{id}/"
})
```

### 9. Xử lý lỗi

```text
short_video_update_agent_status({
  short_video_id,
  status: "failed",
  last_error: "..."
})
```

## CẤM TUYỆT ĐỐI

- Kokoro, HyperFrames local TTS (`hyperframes tts`, `/hyperframes-media`)
- Ghi `video_url`, `render_manifest_json`, `render_json`
- API Remotion: `render-video`, `run-workflow-step`, `build-render-manifest`
- Upload prefix `uploads/short-video/video/`

## MCP tools audio (tóm tắt)

| Tool | Khi nào |
|------|---------|
| `short_video_get_audio_status` | Kiểm tra pending / URL audio |
| `short_video_generate_script` | Chưa có script |
| `short_video_generate_scene_audio` | Sinh MP3 scene (Saydi/Vbee) |

## Kiểm tra sau upload

`short_video_get_context` → `agent_video_status === "completed"`, `agent_video_url` có giá trị, `video_url` Remotion **không đổi**.
