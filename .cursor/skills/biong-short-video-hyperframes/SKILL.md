---
name: biong-short-video-hyperframes
description: Agent short video marketing 2 bước — phase 1 save audio_script; admin upload MP3; phase 2 render HyperFrames từ audio_file.
---

# Biong Short Video — HyperFrames Agent (2 bước)

## Tổng quan

| Bước | Ai làm | MCP | Kết quả |
|------|--------|-----|---------|
| **1** | Agent | `get_context` + `save_audio_script` | `audio_script` trong CMS |
| **Giữa** | Admin | Upload MP3 qua CMS (drawer Agent audio) | `audio_file` URL |
| **2** | Agent | `get_context` + render + `upload_agent_video` | `agent_video_url` MP4 |

Admin copy prompt từ CMS (nút **Copy prompt bước 1/2**) và dán vào Cursor.

---

## Phase 1 — Chỉ sinh kịch bản audio

```text
short_video_get_context({ short_video_id })
short_video_save_audio_script({ short_video_id, text: "toàn bộ lời thoại..." })
```

**Làm:**
1. Đọc `creative_brief` từ marketing post
2. Viết lời thoại tiếng Việt 30–90s: hook → vấn đề → insight → proof → CTA
3. Lưu qua `save_audio_script`
4. **DỪNG** — báo admin upload MP3

**CẤM phase 1:** `generate_narration_tts`, render, `upload_agent_video`, Kokoro

---

## Phase 2 — Render video từ audio có sẵn

### Gate bắt buộc

```text
short_video_get_context({ short_video_id })
```

Kiểm tra:
- `agent_workflow.ready_for_video === true`
- `audio_file` có URL

Nếu **chưa có** `audio_file` → **DỪNG**, báo admin upload MP3 qua CMS.

### Quy trình render

1. Download MP3 từ `audio_file`
2. `hyperframes transcribe` → word timestamps
3. Beat map 4–8 beat (palette social, layout khác nhau)
4. `/general-video`: GSAP, caption sync, registry blocks
5. Render `storage/agent-renders/{id}/` (gitignored)
6. `short_video_upload_agent_video`
7. Xóa local sau upload

**CẤM phase 2:** `generate_narration_tts`, Kokoro, copy `script_json` CMS

---

## Context quan trọng

| Dùng | Bỏ qua |
|------|--------|
| `creative_brief` | `script_json`, `scene_audio_json` |
| `audio_script`, `audio_file` | `generate_narration_tts` |
| `agent_workflow`, `production_playbook` | `cms_pipeline_reference` |

---

## Skills HyperFrames (phase 2)

- `/general-video` — pipeline chính (có MP3 sẵn)
- `/hyperframes-creative`, `/hyperframes-animation`
- Registry: `caption-highlight`, `caption-kinetic-slam`

Palette: `neon-electric`, `bold-energetic` — không ép Biennale Yellow.

---

## Quality gates (phase 2)

- [ ] `audio_file` từ admin (không TTS agent)
- [ ] ≥ 4 beat, caption word-sync
- [ ] GSAP motion mỗi beat
- [ ] Upload MP4 qua MCP
- [ ] Không commit `storage/agent-renders/`

---

## Lệnh mẫu

**Bước 1:**
```
Tạo audio_script cho short video ID 9 (phase 1). Skill biong-short-video-hyperframes.
get_context → save_audio_script. Dừng, không TTS không render.
```

**Bước 2:**
```
Render video agent short video ID 9 (phase 2). audio_file đã upload.
get_context → transcribe → HyperFrames → upload_agent_video. Không generate_narration_tts.
```
