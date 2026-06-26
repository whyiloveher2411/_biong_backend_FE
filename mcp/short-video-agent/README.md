# Biong Short Video Agent MCP

MCP server cho Cursor agent — lấy context short video, **sinh script/audio qua TTS CMS (Saydi/Vbee)**, render HyperFrames local, upload MP4 lên S3 (`agent_video_*`).

## Yêu cầu

- Node.js 18+
- CMS backend `_biong_backend` đã deploy API mới
- Token MCP: `marketing_short_video/agent_mcp_token`
- HyperFrames CLI: FFmpeg + Chrome (`npx hyperframes doctor` — **Kokoro không bắt buộc**)
- CMS đã cấu hình TTS Saydi và/hoặc Vbee

## Creative freeform mode

`get_context` trả `creative_brief` từ **marketing post only** — agent **không** dùng `script_json` / `scene_audio_json` CMS.

Tools `generate_script`, `generate_scene_audio`, `get_audio_status` chỉ cho pipeline Remotion CMS.

## Local render (không commit git)

- Làm việc trong `storage/agent-renders/{id}/` (đã `.gitignore`)
- Upload bắt buộc qua `short_video_upload_agent_video` → S3 `agent_video_url`
- Xóa file local sau upload

## Tools

| Tool | Mô tả |
|------|--------|
| `short_video_get_context` | Creative brief từ marketing post |
| `short_video_generate_narration_tts` | **Voiceover agent** — Saydi → Vbee, text tự do |
| `short_video_get_audio_status` | [CMS Remotion only] |
| `short_video_generate_script` | [CMS Remotion only] |
| `short_video_generate_scene_audio` | [CMS Remotion only] |
| `short_video_update_agent_status` | Cập nhật `agent_video_status` |
| `short_video_upload_agent_video` | Upload MP4 HyperFrames → S3 |

## Flow agent (creative)

1. `get_context` → `creative_brief`
2. `generate_narration_tts` → MP3 tiếng Việt (Saydi/Vbee)
3. HyperFrames render → `storage/agent-renders/{id}/`
4. `upload_agent_video` → S3

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
