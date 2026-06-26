# Biong Short Video Agent MCP

MCP server cho Cursor agent — **hai chế độ**: manual 2 bước (upload MP3) hoặc auto TTS full pipeline (VieNeu → Saydi → Vbee).

**Phiên bản:** 1.7.0

## Chế độ workflow

| `agent_tts_auto` | Workflow | Copy prompt CMS |
|------------------|----------|-----------------|
| `false` (mặc định) | Script → admin MP3 → render | Bước 1 + bước 2 |
| `true` | Script → TTS MCP → render → upload | Một prompt toàn pipeline |

Bật/tắt qua drawer **Agent audio** hoặc field `agent_tts_auto` trên short video.

## Cài HyperFrames skills (một lần)

```bash
cd _biong_backend_FE
npx skills add heygen-com/hyperframes --all
npx skills add https://github.com/greensock/gsap-skills   # GSAP best practices
```

Skills cài vào `.agents/skills/` (repo-level). Init project render:

```bash
npx hyperframes init storage/agent-renders/{id}/my-video --non-interactive --skip-skills --example=blank
```

## Skill groups (render)

| Nhóm | Skills |
|------|--------|
| Orchestrator | `/general-video` |
| Visual marketing | `/product-launch-video` |
| Caption | `/embedded-captions` |
| Core + animation | `/hyperframes-core`, `/hyperframes-animation`, `/hyperframes-creative` |
| Media | `/hyperframes-media` (transcribe) |
| Accent | `/motion-graphics` |
| Optional URL | `/website-to-video` |
| GSAP | `/gsap-core`, `/gsap-timeline`, `/gsap-performance` |

## Docs Biong (routing)

- `.cursor/skills/biong-short-video-hyperframes/references/hyperframes-skill-routing.md`
- `.cursor/skills/biong-short-video-hyperframes/references/motion-vocabulary-map.md`
- `.cursor/skills/biong-short-video-hyperframes/references/layout-9x16-zones.md`
- `.cursor/skills/biong-short-video-hyperframes/references/gsap-beat-checklist.md`

`get_context` trả: `agent_tts_auto`, `workflow_mode`, `tts_chain`, `tts_providers`, `production_playbook.workflow_modes`.

## Script viral

`get_context` → `/extract-core-signals` → `/viral-audio-script` → `save_audio_script` (kèm `metadata.markers`)

Docs: `references/extract-core-signals.md`, `references/viral-audio-script.md`

## Auto TTS

```text
short_video_generate_narration_tts({ short_video_id, text })
```

- Chain: VieNeu → Saydi → Vbee
- Strip `[SFX]` / `[Dừng Ns]` trước TTS
- Ghi `audio_file` + `tts_provider_used`
- Fallback: admin upload MP3 qua CMS

## Ép video cinematic

- Đọc `motion-complexity-activation.md`
- `npx hyperframes add` registry blocks (caption + transition)
- GSAP: no linear, stagger, 3D depth
- Render: `--quality high` (không draft)

## Workflow manual

1. **Bước 1:** `get_context` → `save_audio_script` → dừng
2. **Admin:** Upload MP3 → `audio_file`
3. **Bước 2:** HyperFrames render → `upload_agent_video`

## Workflow auto TTS

1. `get_context` → `save_audio_script` → `generate_narration_tts`
2. Xác nhận `audio_file` / `ready_for_video`
3. HyperFrames render → `upload_agent_video`

## Tools

| Tool | Mô tả |
|------|--------|
| `short_video_get_context` | Creative brief + workflow_mode + production_playbook |
| `short_video_save_audio_script` | Script viral + metadata markers |
| `short_video_generate_narration_tts` | TTS auto — VieNeu→Saydi→Vbee → `audio_file` |
| `short_video_upload_agent_video` | Upload MP4 → S3 |

## Cài đặt MCP

```bash
cd mcp/short-video-agent && npm install && npm run build
```

Cấu hình Cursor MCP: `BIONG_API_BASE_URL`, `BIONG_MCP_TOKEN`.
