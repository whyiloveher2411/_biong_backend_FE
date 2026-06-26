# Biong Short Video Agent MCP

MCP server cho Cursor agent — workflow **2 bước**: (1) sinh `audio_script`; (2) render video từ `audio_file` admin upload.

**Phiên bản:** 1.6.0

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

## Skill groups (phase 2)

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

`get_context.production_playbook` trả: `motion_complexity_activation`, `registry_blocks`, `timeline_sync`, `render_settings`, `skill_routing`, ...

## Ép video cinematic (không đơn sơ)

Agent mặc định output an toàn (text + nền). Copy prompt bước 2 đã ép:

- Đọc `motion-complexity-activation.md`
- `npx hyperframes add` registry blocks (caption + transition)
- GSAP: no linear, stagger, 3D depth
- Timeline sync: `data-duration` khớp audio
- Render: `--quality high` (không draft)

Doc: `.cursor/skills/biong-short-video-hyperframes/references/motion-complexity-activation.md`

## Workflow

1. **Bước 1:** `get_context` → `save_audio_script` → dừng
2. **Admin:** Upload MP3 → `audio_file`
3. **Bước 2:** `get_context` → HyperFrames render (skill routing) → `upload_agent_video`

## Tools

| Tool | Mô tả |
|------|--------|
| `short_video_get_context` | Creative brief + production_playbook (skill routing) |
| `short_video_save_audio_script` | Phase 1 — lưu lời thoại |
| `short_video_upload_agent_video` | Upload MP4 → S3 |

## Cài đặt MCP

```bash
cd mcp/short-video-agent && npm install && npm run build
```

Reload MCP `biong-short-video-agent` trong Cursor.

Skill: `.cursor/skills/biong-short-video-hyperframes/SKILL.md`
