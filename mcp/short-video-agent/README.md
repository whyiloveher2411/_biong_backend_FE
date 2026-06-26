# Biong Short Video Agent MCP

MCP server cho Cursor agent — lấy context short video, **sinh voiceover qua TTS CMS (Saydi/Vbee)**, render HyperFrames local với beat map đa dạng + caption sync, upload MP4 lên S3 (`agent_video_*`).

**Phiên bản:** 1.5.0

## Yêu cầu

- Node.js 18+
- CMS backend `_biong_backend` đã deploy API mới (có `production_playbook` trong get-context)
- Token MCP: `marketing_short_video/agent_mcp_token`
- HyperFrames CLI: FFmpeg + Chrome (`npx hyperframes doctor`)
- CMS đã cấu hình TTS Saydi và/hoặc Vbee
- Skill: `.cursor/skills/biong-short-video-hyperframes/SKILL.md`

## Creative freeform + production quality

`get_context` trả:

- `creative_brief` — marketing post only
- `production_playbook` — beat structure, palette presets, mandatory techniques, workflow phases, anti-patterns
- `cms_brand_reference_optional` — Biennale Yellow chỉ khi user yêu cầu (không mặc định)

Agent **không** dùng `script_json` / `scene_audio_json` CMS.

## Local render (không commit git)

- Làm việc trong `storage/agent-renders/{id}/` (đã `.gitignore`)
- Upload bắt buộc qua `short_video_upload_agent_video` → S3 `agent_video_url`
- Xóa file local sau upload

## Tools

| Tool | Mô tả |
|------|--------|
| `short_video_get_context` | Creative brief + **production_playbook** (animation, caption, palette) |
| `short_video_generate_narration_tts` | **Voiceover agent** — Saydi → Vbee, text tự do |
| `short_video_get_audio_status` | [CMS Remotion only] |
| `short_video_generate_script` | [CMS Remotion only] |
| `short_video_generate_scene_audio` | [CMS Remotion only] |
| `short_video_update_agent_status` | Cập nhật `agent_video_status` |
| `short_video_upload_agent_video` | Upload MP4 HyperFrames → S3 |

## Flow agent (social production)

1. `get_context` → `creative_brief` + `production_playbook`
2. Viết `beat_map.md` (4–8 beat, layout/palette khác nhau)
3. `generate_narration_tts` → MP3 tiếng Việt
4. HyperFrames: transcribe → caption sync → GSAP animation → registry blocks
5. Render `storage/agent-renders/{id}/`
6. `upload_agent_video` → S3

Pipeline: **`/general-video`** + tham khảo `/faceless-explainer` (section plan, captions). **CẤM** Kokoro.

## API backend

- `.../mcp/short-video/get-context`
- `.../mcp/short-video/generate-narration-tts`
- `.../mcp/short-video/update-status`
- `.../mcp/short-video/upload-video` (multipart `video`)

Header: `Authorization: Bearer <token>`

## Cài đặt

```bash
cd mcp/short-video-agent && npm install && npm run build
```

Reload MCP `biong-short-video-agent` trong Cursor sau khi build.

Setting CMS: `marketing_short_video/agent_mcp_token`
