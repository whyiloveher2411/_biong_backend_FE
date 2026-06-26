# Biong Short Video Agent MCP

MCP server cho Cursor agent — workflow **2 bước**: (1) sinh `audio_script`; (2) render video từ `audio_file` admin upload.

**Phiên bản:** 1.6.0

## Workflow 2 bước

1. **Bước 1 (agent):** `get_context` → `save_audio_script` → dừng
2. **Admin:** Upload MP3 qua CMS (drawer Agent audio) → `audio_file`
3. **Bước 2 (agent):** `get_context` (gate `audio_file`) → HyperFrames render → `upload_agent_video`

**Không** dùng `generate_narration_tts` trong luồng chính.

## Tools

| Tool | Mô tả |
|------|--------|
| `short_video_get_context` | Creative brief + audio_script/audio_file + agent_workflow |
| `short_video_save_audio_script` | **Phase 1** — lưu lời thoại vào CMS |
| `short_video_generate_narration_tts` | [Legacy] TTS Saydi/Vbee |
| `short_video_update_agent_status` | Cập nhật agent_video_status |
| `short_video_upload_agent_video` | Upload MP4 → S3 |

## CMS

- Tab Agent video: `audio_script`, `audio_file`, ...
- Actions: Copy prompt bước 1/2, drawer Agent audio
- API: `short-video/upload-agent-audio`, `short-video/get-agent-prompt`

## Cài đặt

```bash
cd mcp/short-video-agent && npm install && npm run build
```

Reload MCP `biong-short-video-agent` trong Cursor.

Skill: `.cursor/skills/biong-short-video-hyperframes/SKILL.md`
