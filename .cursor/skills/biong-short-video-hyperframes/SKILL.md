---
name: biong-short-video-hyperframes
description: Agent short video marketing 2 bước — phase 1 save audio_script; phase 2 render cinematic HyperFrames từ audio_file (registry blocks + motion complexity ép).
---

# Biong Short Video — HyperFrames Agent (2 bước)

## Tổng quan

| Bước | Ai làm | MCP | Kết quả |
|------|--------|-----|---------|
| **1** | Agent | `get_context` + `save_audio_script` | `audio_script` |
| **Giữa** | Admin | Upload MP3 (drawer Agent audio) | `audio_file` |
| **2** | Agent | render cinematic + `upload_agent_video` | `agent_video_url` |

**Ép cinematic phase 2:** [motion-complexity-activation.md](references/motion-complexity-activation.md)

---

## Phase 1 — Audio script viral (extract + viral script)

### Skills

| # | Skill | Output |
|---|-------|--------|
| 1 | `/extract-core-signals` | `core_signals`: hook, tension, takeaway |
| 2 | `/viral-audio-script` | `text` + `[SFX]` + `markers` |

Docs: [extract-core-signals.md](references/extract-core-signals.md) · [viral-audio-script.md](references/viral-audio-script.md)

### Công thức HASCAS

Hook (3s) → Agitate → Solve → CTA — câu 10–15 từ, viết cho tai nghe.

### Lưu MCP

```text
short_video_save_audio_script({
  short_video_id,
  text: "[SFX: ...] ...",
  metadata: { core_signals, markers, estimated_duration_sec: 45 }
})
```

**DỪNG** — admin upload MP3.

---

## Phase 2 — Motion complexity (bắt buộc)

### Vai trò

**Senior Motion Graphics** — dynamic, cinematic. Cấm slide text + đổi nền.

### Registry blocks (ưu tiên)

```bash
cd storage/agent-renders/{id}/my-video
npx hyperframes add caption-pill-karaoke
npx hyperframes add caption-kinetic-slam
```

Dùng block cho caption + transition — customize, không viết từ đầu. Skill: `/hyperframes-registry`.

### GSAP ép

- **Cấm** linear entrance → `power3.out`, `back.out(1.7)`, `elastic.out(1, 0.3)`
- **Stagger** `0.1` trên lists/words/cards
- **3D depth:** scale 0.8→1, rotate ±5°, gradient border glow
- **Sync:** `paused: true` → `window.__timelines[id]`; `data-duration` khớp audio beat

### Render final

```bash
npx hyperframes render --output output.mp4 --quality high --fps 30
```

Không upload bản `--quality draft`.

---

## Tài liệu (đọc theo thứ tự)

1. [motion-complexity-activation.md](references/motion-complexity-activation.md) — **đọc đầu tiên**
2. [hyperframes-skill-routing.md](references/hyperframes-skill-routing.md)
3. [layout-9x16-zones.md](references/layout-9x16-zones.md)
4. [gsap-beat-checklist.md](references/gsap-beat-checklist.md)
5. [motion-vocabulary-map.md](references/motion-vocabulary-map.md)

---

## Skill routing

| Vai trò | Skill |
|---------|-------|
| Orchestrator | `/general-video` |
| Visual | `/product-launch-video` |
| Registry | `/hyperframes-registry` |
| Caption | `/embedded-captions` |
| GSAP | `/hyperframes-animation` + gsap-skills |

---

## Quality gates

- [ ] Registry blocks installed + wired
- [ ] Không linear entrance; stagger mỗi beat
- [ ] `window.__timelines` + `data-duration` khớp audio
- [ ] `animation-map.mjs` — không dead zone >1.5s
- [ ] Render `--quality high`
- [ ] Caption band tách — không overlap
- [ ] Upload MP4 qua MCP

---

## Lệnh mẫu

```
Render video agent ID 9 (phase 2). Đọc motion-complexity-activation.md.
Senior Motion Graphics. hyperframes add registry blocks. stagger + no linear.
Render --quality high. upload_agent_video.
```
