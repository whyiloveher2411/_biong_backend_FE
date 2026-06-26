---
name: biong-short-video-hyperframes
description: Agent tạo short video marketing social (HyperFrames) từ marketing post — voiceover MCP Saydi/Vbee, beat map đa dạng, caption sync, animation cao. Upload S3 agent_video_url.
---

# Biong Short Video — HyperFrames Agent (Social Production)

## Mục tiêu chất lượng

**TikTok / Reels / Shorts** — không phải slide typography một màu. Mỗi beat là một **visual world** khác nhau: palette đổi, layout đổi, motion verb rõ (SLAM, CASCADE, PUNCH, morph). Caption **khớp từng từ** với voiceover tiếng Việt.

Đọc `production_playbook` từ `short_video_get_context` — đó là checklist bắt buộc.

---

## Nguồn context

```text
short_video_get_context({ short_video_id })
```

| Dùng | Bỏ qua |
|------|--------|
| `creative_brief` (marketing post) | `script_json`, `scene_audio_json` CMS |
| `production_playbook` | `cms_pipeline_reference` (chỉ tham khảo) |
| `narration_assets` (MP3 đã TTS) | `cms_brand_reference_optional` (chỉ khi user yêu cầu Biennale Yellow) |
| `render_spec` 1080×1920 30fps | Copy layout/scene Remotion |

---

## Skills HyperFrames — gọi theo thứ tự

| Giai đoạn | Skill | Mục đích |
|-----------|-------|----------|
| Routing | `/hyperframes-read-first` | Chọn pipeline đúng |
| Core | `/hyperframes-core`, `/hyperframes-cli` | init, lint, render |
| Visual identity | `/hyperframes-creative` | `house-style.md`, `video-composition.md`, `visual-styles.md` |
| Motion | `/hyperframes-animation` | GSAP timelines, stagger, audio-reactive nhẹ |
| **Pipeline chính** | `/general-video` | **Có voiceover MCP sẵn** — không dùng faceless TTS |
| Tham khảo cấu trúc | `/faceless-explainer` | section_plan, caption_groups, scene fan-out (bỏ bước TTS local) |
| Caption nâng cao | `/embedded-captions` | Karaoke / kinetic nếu cần VFX caption |

**Route:** Input = marketing post + **MP3 narration MCP** → **`/general-video`** (không `/faceless-explainer` vì faceless tự sinh TTS Kokoro).

---

## Voiceover tiếng Việt — MCP (bắt buộc)

```text
short_video_generate_narration_tts({
  short_video_id,
  text: "toàn bộ hoặc từng đoạn lời thoại",
  clip_id: "full" | "hook" | "beat_2" | ...
})
```

- Saydi → Vbee (tiếng Việt)
- Trả `url` MP3 → lưu vào project, dùng làm master audio
- Có thể 1 file full script HOẶC nhiều clip theo beat

**CẤM:** Kokoro, `hyperframes tts`, `/hyperframes-media` local TTS, `generate_scene_audio` CMS.

---

## Quy trình 10 bước (bắt buộc)

### Bước 0 — Plan (trước code)

1. Đọc `creative_brief.content_plain_text`
2. Viết `beat_map.md` — **4–8 beat**, mỗi beat có:
   - **Concept** (2–3 câu: viewer CẢM NHẬN gì)
   - **Mood** (neon / editorial / data-viz / abstract — không lặp)
   - **Layout** (split / full-bleed type / cards / diagram / counter)
   - **Motion verbs** per element
   - **Palette slice** (đổi màu giữa beat)
3. Chọn preset style: `neon-electric` | `bold-energetic` | `jewel-rich` | `warm-editorial` — **KHÔNG** mặc định Biennale Yellow minimal

Tham khảo: `.agents/skills/hyperframes/references/beat-direction.md`

### Bước 1 — Script narration

Viết `narration.vi.txt` từ marketing post: hook → vấn đề → insight → proof → CTA. 30–90 giây đọc.

### Bước 2 — TTS MCP

```text
short_video_update_agent_status({ short_video_id, status: "processing" })
short_video_generate_narration_tts({ short_video_id, text: "...", clip_id: "full" })
```

### Bước 3 — Init project

```bash
PROJECT_DIR="storage/agent-renders/{short_video_id}/my-video"
mkdir -p "$(dirname "$PROJECT_DIR")"
npx hyperframes init "$PROJECT_DIR" --non-interactive --skip-skills --example=blank
```

Tạo `design.md`: palette preset, font pairing (từ `hyperframes-creative/references/typography.md`), rhythm pattern (vd. `fast-fast-SLOW-SHADER-hold`).

### Bước 4 — Transcribe narration (caption sync)

```bash
(cd "$PROJECT_DIR" && npx hyperframes transcribe path/to/narration.mp3)
```

→ `words.json` / timestamps — dùng cho caption word-by-word.

### Bước 5 — Section plan + compositions

Theo `/general-video`:
1. Layout end-state trước (static HTML/CSS) — **chưa GSAP**
2. Mỗi beat → `compositions/beat_N.html` hoặc sub-composition
3. 8–10 elements mỗi scene, edge-anchored detail (`video-composition.md`)
4. Transitions giữa beat (crossfade, wipe, shader — không hard cut trống)

### Bước 6 — Caption sync

Chọn một hoặc kết hợp:
- Registry: `npx hyperframes catalog` → `npx hyperframes add caption-highlight` / `caption-kinetic-slam` / `caption-pill-karaoke`
- Hoặc caption group sync từ word timestamps (pattern faceless `captions.mjs`)

Caption phải **highlight từ đang đọc**, không chỉ subtitle tĩnh.

### Bước 7 — Animation

Theo `/hyperframes-animation`:
- GSAP timeline per beat
- Stagger cards/text
- Audio-reactive nhẹ: scale/glow theo amplitude narration (không equalizer bars generic)
- Mỗi element có **motion verb** — nếu không đặt tên verb, thiết kế chưa xong

### Bước 8 — Registry blocks (nếu cần)

```bash
npx hyperframes catalog
npx hyperframes add <block-id>
```

Gợi ý: `caption-highlight`, `caption-kinetic-slam`, transition blocks.

### Bước 9 — Lint + preview + render

```bash
(cd "$PROJECT_DIR" && npx hyperframes lint)
(cd "$PROJECT_DIR" && npx hyperframes render)
```

Preview frames trước render full nếu CLI hỗ trợ.

### Bước 10 — Upload + dọn

```text
short_video_upload_agent_video({ short_video_id, file_path: ".../output.mp4" })
```

Xóa `storage/agent-renders/{id}/` sau upload thành công.

---

## Quality gates (tự kiểm trước upload)

- [ ] ≥ 4 beat với layout/visual world khác nhau
- [ ] ≥ 2 palette shift rõ ràng trong video
- [ ] Voiceover tiếng Việt từ MCP (có file MP3 trong project)
- [ ] Caption sync word-by-word hoặc karaoke
- [ ] Mỗi beat có GSAP motion (không text tĩnh cả clip)
- [ ] Có transition giữa các beat
- [ ] Không copy scene CMS / không Kokoro
- [ ] File không commit git

---

## Anti-patterns (cấm)

| Sai | Đúng |
|-----|------|
| Nền vàng một màu cả video | Đổi palette theo beat |
| Text tĩnh, không animation | GSAP + motion verbs |
| Không voiceover | MCP `generate_narration_tts` |
| Kokoro / hyperframes tts | MCP Saydi/Vbee |
| Copy `script_json` CMS | Sáng tạo từ marketing post |
| Chỉ subtitle block cố định | Word-highlight / kinetic caption |

---

## Lệnh mẫu cho user

```
Tạo video agent sáng tạo cho short video ID 9 theo skill biong-short-video-hyperframes.
Dùng marketing post từ get_context + production_playbook.
Voiceover: generate_narration_tts (Saydi/Vbee), transcribe → caption sync.
Pipeline general-video: beat_map 4-8 beat, palette neon-electric/bold-energetic, GSAP mạnh, registry caption blocks.
Render 9:16, upload MCP, không commit git.
```
