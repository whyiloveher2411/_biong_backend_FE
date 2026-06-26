---
name: biong-short-video-hyperframes
description: Agent tạo video marketing sáng tạo tự do (HyperFrames) từ nội dung marketing post — không copy scene/script CMS. Upload S3 qua MCP, không commit git.
---

# Biong Short Video — HyperFrames Agent (Creative Freeform)

Agent tạo video **9:16** gắn `short_video_id`, nhưng **nội dung và cấu trúc video hoàn toàn do agent sáng tạo** từ **marketing post** — không bị ràng buộc `script_json`, `scene_audio_json`, hay layout Remotion hiện có.

## Nguồn context duy nhất

Sau `short_video_get_context(id)`, chỉ dùng:

- `creative_brief.content_plain_text` / `creative_brief.content_text`
- `creative_brief.marketing_post_title`
- `lang`, `render_spec` (1080×1920, 30fps)

`brand_design_hint` — gợi ý thương hiệu, **không bắt buộc** cấu trúc scene.

**Bỏ qua hoàn toàn** (chỉ nằm trong `cms_pipeline_reference`):

- `script_json`, `scene_audio_json`
- `generate_script`, `generate_scene_audio`, `get_audio_status`

## Tự do sáng tạo

Agent được phép:

- Tự chia beat/scene, không theo `s1`, `s2`… của CMS
- Bất kỳ loại track/element HyperFrames hỗ trợ (text, image, video, GSAP, caption, nhạc…)
- Không mirror timeline Remotion manifest

Narration/audio: tự viết lời từ marketing post, nhúng trong composition (HyperFrames media/CLI) hoặc video không voiceover — **không** gọi TTS scene CMS.

## Quy trình

### 1. Context

```text
short_video_get_context({ short_video_id })
```

Đọc `creative_brief.instructions`.

### 2. Processing

```text
short_video_update_agent_status({ short_video_id, status: "processing" })
```

### 3. Render local (gitignored)

```bash
mkdir -p storage/agent-renders/{short_video_id}
cd storage/agent-renders/{short_video_id}
npx hyperframes init
# Author tự do từ creative_brief — KHÔNG đọc script_json CMS
npx hyperframes lint
npx hyperframes render --output ./output.mp4
```

Thư mục `storage/agent-renders/` **đã gitignore** — không add/commit.

### 4. Upload lên store (bắt buộc)

```text
short_video_upload_agent_video({
  short_video_id,
  file_path: "/absolute/path/to/output.mp4"
})
```

MP4 lên S3 → `agent_video_url`. **Đây là bản lưu chính thức.**

### 5. Dọn local (khuyến nghị)

Sau upload thành công, xóa `storage/agent-renders/{id}/` hoặc chỉ giữ tạm debug.

### 6. Hoàn tất / lỗi

- Thành công: `short_video_update_agent_status({ status: "completed" })` (upload tool đã set completed)
- Lỗi: `status: "failed"`, `last_error: "..."`

## CẤM

- Dùng `script_json` / `scene_audio_json` / scene CMS để dựng video
- Gọi `generate_script`, `generate_scene_audio` cho agent video
- Ghi `video_url`, `render_manifest_json`, Remotion APIs
- `git add` file trong `storage/agent-renders/` hoặc `output.mp4`

## Skills HyperFrames

`/hyperframes`, `/hyperframes-core`, `/hyperframes-animation`, `/hyperframes-creative`, `/hyperframes-cli`, `/general-video` hoặc `/faceless-explainer`

## Lệnh mẫu cho user

```
Tạo video agent sáng tạo cho short video ID 9.
Chỉ dùng nội dung marketing post từ MCP get_context — không copy scene/script CMS.
Render HyperFrames 9:16, upload MCP, không commit git.
```
