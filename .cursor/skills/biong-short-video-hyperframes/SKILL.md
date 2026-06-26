---
name: biong-short-video-hyperframes
description: Agent short video marketing 2 bước — phase 1 save audio_script; admin upload MP3; phase 2 render HyperFrames từ audio_file với full HF skill routing.
---

# Biong Short Video — HyperFrames Agent (2 bước)

## Tổng quan

| Bước | Ai làm | MCP | Kết quả |
|------|--------|-----|---------|
| **1** | Agent | `get_context` + `save_audio_script` | `audio_script` trong CMS |
| **Giữa** | Admin | Upload MP3 qua CMS (drawer Agent audio) | `audio_file` URL |
| **2** | Agent | `get_context` + render + `upload_agent_video` | `agent_video_url` MP4 |

Admin copy prompt từ CMS (nút **Copy prompt bước 1/2**) và dán vào Cursor.

**Skills HF:** Cài repo-level qua `npx skills add heygen-com/hyperframes --all` → `.agents/skills/`

---

## Phase 1 — Chỉ sinh kịch bản audio

```text
short_video_get_context({ short_video_id })
short_video_save_audio_script({ short_video_id, text: "toàn bộ lời thoại..." })
```

**Làm:**
1. Đọc `creative_brief` + `production_playbook.skill_routing`
2. Borrow `/faceless-explainer` scriptwriting: hook → problem → insight → proof → CTA (30–90s)
3. Lưu qua `save_audio_script` → **DỪNG**

**CẤM:** TTS, render, `upload_agent_video`, faceless-explainer full pipeline

---

## Phase 2 — Render video từ audio có sẵn

### Gate

- `agent_workflow.ready_for_video === true`
- `audio_file` có URL

### Skill routing (đọc trước khi code)

[references/hyperframes-skill-routing.md](references/hyperframes-skill-routing.md)

| Vai trò | Skill |
|---------|-------|
| Orchestrator | `/general-video` |
| Visual marketing | `/product-launch-video` |
| Caption karaoke | `/embedded-captions` |
| Clip contract | `/hyperframes-core` |
| GSAP + blueprints | `/hyperframes-animation` |
| Palette + audio-reactive | `/hyperframes-creative` |
| Transcribe MP3 | `/hyperframes-media` |
| Accent stingers | `/motion-graphics` (tùy chọn) |
| URL capture | `/website-to-video` (nếu brief có URL) |

### Tài liệu Biong (bắt buộc)

1. [hyperframes-skill-routing.md](references/hyperframes-skill-routing.md)
2. [motion-vocabulary-map.md](references/motion-vocabulary-map.md)
3. [layout-9x16-zones.md](references/layout-9x16-zones.md)
4. [gsap-beat-checklist.md](references/gsap-beat-checklist.md)

### Composition contract

Mọi visual clip:

```html
<div class="clip" data-start="0" data-duration="4" data-track-index="0">...</div>
```

Caption: `compositions/captions.html` qua `data-composition-src` — tách khỏi beat HTML.

GSAP: `paused: true` → `window.__timelines["beat_N"]` — xem gsap-beat-checklist.

### Quy trình

1. `hyperframes init --skip-skills` trong `storage/agent-renders/{id}/`
2. Transcribe MP3 → beat map 4–8 beat
3. Mỗi beat: layout zones → HTML clips → GSAP + motion vocabulary
4. `embedded-captions` sub-composition
5. `animation-map.mjs` audit + `hyperframes lint` + overlap preflight
6. Render → `upload_agent_video`

---

## Motion vocabulary

[references/motion-vocabulary-map.md](references/motion-vocabulary-map.md)

- smooth → `power2.out` | bouncy → `back.out(1.6)` | springy → `elastic.out(1, 0.3)`
- highlight / circle → `hyperframes/references/css-patterns.md`
- bass pulse → scale | treble → glow (audio-reactive nhẹ)

---

## Context quan trọng

| Dùng | Bỏ qua |
|------|--------|
| `production_playbook` (skill_routing, composition_contract) | `script_json`, `scene_audio_json` |
| `audio_script`, `audio_file` | `generate_narration_tts` |
| `.agents/skills/*` repo-level | faceless TTS pipeline |

---

## Quality gates (phase 2)

- [ ] `audio_file` từ admin
- [ ] Skill routing đúng (general-video + product-launch visual)
- [ ] `class="clip"` + data attrs trên visual elements
- [ ] Hero top-center — caption band tách, không overlap
- [ ] `window.__timelines` mỗi beat + motion vocabulary đa dạng
- [ ] `animation-map.mjs` + `hyperframes lint` pass
- [ ] Upload MP4 qua MCP

---

## Lệnh mẫu

```
Render video agent short video ID 9 (phase 2). audio_file đã upload.
get_context → hyperframes-skill-routing + motion-vocabulary-map.
general-video + product-launch visual. embedded-captions tách file. upload_agent_video.
```
