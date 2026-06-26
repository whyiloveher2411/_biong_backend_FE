# Biong Short Video Agent MCP

MCP server cho Cursor agent — lấy context short video, **sinh script/audio qua TTS CMS (Saydi/Vbee)**, render HyperFrames local, upload MP4 lên S3 (`agent_video_*`).

## Yêu cầu

- Node.js 18+
- CMS backend `_biong_backend` đã deploy API mới
- Token MCP: `marketing_short_video/agent_mcp_token`
- HyperFrames CLI: FFmpeg + Chrome (`npx hyperframes doctor` — **Kokoro không bắt buộc**)
- CMS đã cấu hình TTS Saydi và/hoặc Vbee

## Tools

| Tool | Mô tả |
|------|--------|
| `short_video_get_context` | Script, audio, marketing post, design tokens, `audio_status` |
| `short_video_get_audio_status` | Pending scenes, URL audio, TTS providers |
| `short_video_generate_script` | DeepSeek script (flow CMS) |
| `short_video_generate_scene_audio` | TTS Saydi → Vbee per scene (flow `generate-audio-batch`) |
| `short_video_update_agent_status` | Cập nhật `agent_video_status` |
| `short_video_upload_agent_video` | Upload MP4 HyperFrames → S3 |

## Flow audio (không dùng Kokoro)

1. `short_video_get_audio_status` — kiểm tra `pending_scene_ids`
2. Nếu thiếu script → `short_video_generate_script`
3. `short_video_generate_scene_audio` — lặp đến khi `has_scene_audio === true`
4. `short_video_get_context` — lấy `scene_audio_json.scenes.*.url` cho HyperFrames

## API backend

- `.../mcp/short-video/get-context`
- `.../mcp/short-video/get-audio-status`
- `.../mcp/short-video/generate-script`
- `.../mcp/short-video/generate-scene-audio`
- `.../mcp/short-video/update-status`
- `.../mcp/short-video/upload-video` (multipart `video`)

Header: `Authorization: Bearer <token>`

## HyperFrames

```bash
npx hyperframes doctor   # Kokoro optional
npx skills add heygen-com/hyperframes
```

Workflow: `.cursor/skills/biong-short-video-hyperframes/SKILL.md`

## Cài đặt & token

```bash
cd mcp/short-video-agent && npm install && npm run build
```

Setting CMS: `marketing_short_video/agent_mcp_token` = `openssl rand -hex 32`

Cập nhật `.cursor/mcp.json` → reload MCP trong Cursor.
