---
name: audit-audio-script
description: Chẩn đoán + sửa lỗi kịch bản sau humanize — Bullet Syndrome, Narrative Flow, Hook loop. Bắt buộc trước save_audio_script.
---

# audit-audio-script

Cổng **QA + sửa lỗi** sau `/humanize-audio-script` — trước `save_audio_script`.

**Luật:** Chỉ gọi `save_audio_script` khi `script_diagnosis.pass === true`. Fail → sửa → audit lại (tối đa 2 vòng).

**Đọc trước:**
- `biong-short-video-hyperframes/references/audit-audio-script.md` — **bắt buộc**
- `biong-short-video-hyperframes/references/narrative-flow-vi.md`
- `biong-short-video-hyperframes/references/vi-voiceover-naturalization.md` (§4 §6)
- `biong-short-video-hyperframes/references/omnivoice-expressive-tags.md`

## Input

| Field | Nguồn |
|-------|-------|
| `draft_script` | Output `/humanize-audio-script` |
| `core_signals` | `/extract-core-signals` — `narrative_chain`, `perspective`, `loop_hook_line` |
| `expressive_plan` | `/viral-audio-script` — tag slots |
| `content_plain_text` | Optional — đối chiếu fact |

## 3 lỗi cốt lõi

1. **Bullet-point Syndrome** — câu rời, không transition
2. **Missing Narrative Flow** — stat/tên riêng nhảy ý
3. **Hook loop collision** — CTA lặp hook verbatim

Chi tiết rubric: [audit-audio-script.md](biong-short-video-hyperframes/references/audit-audio-script.md)

## Rubric nhanh (critical = phải sửa)

| Code | Sửa |
|------|-----|
| `bullet_point_syndrome` | Nối But/Therefore |
| `orphan_stat` | Bọc ngữ cảnh + prosody |
| `listing_connector` | Thay blocklist |
| `hook_loop_collision` | CTA mới + bridge |
| `sentence_too_long` | Tách ≤12 từ |
| `tag_quota_exceeded` | Giữ `expressive_plan` |
| `missing_sfx` | Thêm `[SFX: vine boom]` |

## Prompt cốt lõi

```text
Bạn là biên tập viên QA kịch bản voiceover TikTok.
Chẩn đoán draft theo rubric audit-audio-script.md.
Nếu pass=false → viết lại fixed_script áp dụng Narrative Flow (But/Therefore).
Giữ nguyên expressive_plan tag slots. Cấm từ liệt kê. CTA không lặp hook verbatim.

Draft: [DRAFT_SCRIPT]
core_signals: [JSON]
expressive_plan: [JSON]
```

## Output

```json
{
  "script_diagnosis": {
    "pass": false,
    "issues": [
      { "code": "bullet_point_syndrome", "severity": "critical", "detail": "..." }
    ]
  },
  "fixed_script": "[BGM: ...] [SFX: vine boom] ...",
  "expressive_plan": { "hook": [], "agitate": ["[sigh]"], "solve": [], "cta": ["[laughter]"] },
  "estimated_duration_sec": 90
}
```

## Luật sửa

- **Cấm** thêm/xóa/di chuyển tag ngoài `expressive_plan`
- **Cấm** SSML
- Số liệu: bọc ngữ cảnh trước; chữ hóa nếu đứng câu riêng
- Golden example: Google before/after trong [audit-audio-script.md](biong-short-video-hyperframes/references/audit-audio-script.md)

## Bước tiếp

`pass === true` → `save_audio_script({ text: fixed_script, metadata: { script_diagnosis, core_signals, expressive_plan, ... } })`
