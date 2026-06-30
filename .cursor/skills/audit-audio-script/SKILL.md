---
name: audit-audio-script
description: Chẩn đoán + sửa lỗi kịch bản sau viral-audio-script — Bullet Syndrome, Narrative Flow, em dash, plain language. Bắt buộc trước save_audio_script.
---

# audit-audio-script

Cổng **QA + sửa lỗi** sau `/viral-audio-script` — trước `save_audio_script`.

**Luật:** Chỉ gọi `save_audio_script` khi `script_diagnosis.pass === true`. Fail → sửa → audit lại (tối đa 2 vòng).

**Đọc trước:**
- `biong-short-video-hyperframes/references/audit-audio-script.md` — **bắt buộc**
- `biong-short-video-hyperframes/references/plain-language-storytelling-vi.md`
- `biong-short-video-hyperframes/references/narrative-flow-vi.md`
- `biong-short-video-hyperframes/references/vi-voiceover-naturalization.md`
- `biong-short-video-hyperframes/references/omnivoice-expressive-tags.md`

## Input

| Field | Nguồn |
|-------|-------|
| `draft_script` | Output `/viral-audio-script` |
| `core_signals` | `/extract-core-signals` |
| `expressive_plan` | `/viral-audio-script` |
| `content_plain_text` | Optional |

**Không** audit `visual_shot_plan` — shot-plan sinh ở Phase 2.

## Rubric nhanh (critical = phải sửa)

| Code | Sửa |
|------|-----|
| `bullet_point_syndrome` | Nối But/Therefore |
| `orphan_stat` | Bọc ngữ cảnh + prosody |
| `listing_connector` | Thay blocklist |
| `hook_loop_collision` | CTA mới + bridge |
| `em_dash_detected` | Thay `—` / `–` bằng phẩy, câu mới, `. . .` |
| `unnatural_sentence` | Tách câu >25 từ khó hiểu |
| `jargon_heavy` | Đơn giản hóa thuật ngữ |
| `disallowed_tag` | Thay/bỏ tag ngoài allowlist |
| `missing_sfx` | Thêm `[SFX: vine boom]` |

## Bước tiếp

`pass === true` → `save_audio_script({ text: fixed_script, metadata: { script_diagnosis, core_signals, expressive_plan, ... } })` — **không** `visual_shot_plan`
