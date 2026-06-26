---
name: biong-short-video-hyperframes
description: Agent tạo video marketing sáng tạo tự do (HyperFrames) từ marketing post — TTS qua MCP Saydi/Vbee. Upload S3, không commit git.
---

# Biong Short Video — HyperFrames Agent (Creative Freeform)

## Nguồn context

`short_video_get_context(id)` → chỉ dùng `creative_brief` (marketing post), `lang`, `render_spec`.

**Bỏ qua:** `cms_pipeline_reference`, `generate_script`, `generate_scene_audio`.

## Voiceover tiếng Việt — MCP (bắt buộc)

```text
short_video_generate_narration_tts({
  short_video_id,
  text: "lời thoại agent viết từ marketing post",
  clip_id: "beat_1"
})
```

- Saydi → Vbee (hỗ trợ tiếng Việt)
- Trả `url` MP3 → nhúng vào HyperFrames
- Nhiều beat: gọi lại với `clip_id` khác (`hook`, `beat_2`, …)

**CẤM:** Kokoro, `hyperframes tts`, `/hyperframes-media`

## Quy trình

1. `short_video_get_context`
2. `short_video_generate_narration_tts` (mỗi đoạn lời cần voiceover)
3. `short_video_update_agent_status(processing)`
4. HyperFrames render trong `storage/agent-renders/{id}/` (gitignored)
5. `short_video_upload_agent_video`
6. Xóa file local sau upload

## CẤM

- Copy `script_json` / `scene_audio_json` CMS
- Kokoro / HyperFrames local TTS
- Ghi `video_url`, Remotion APIs
- Commit `storage/agent-renders/`

## Lệnh mẫu

```
Tạo video agent sáng tạo cho short video ID 9.
Dùng marketing post từ get_context, voiceover qua generate_narration_tts (Saydi/Vbee), không Kokoro.
Render HyperFrames 9:16, upload MCP, không commit git.
```
