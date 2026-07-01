---
name: biong-short-video-evolution
description: Vision audit + tự vá + tích lũy kinh nghiệm thẩm mỹ cho short video HyperFrames. Invoke sau preflight pass, trước render --quality high.
---

# Biong Short Video — Auto-Evolution (Vision Loop)

**Bắt buộc** phase 2 sau `/biong-short-video-preflight` pass, **trước** `hyperframes render --quality high`.

**Tự động hoàn toàn** — không hỏi user. Max **2 vòng** fix; sau đó fail + vẫn ghi memory.

Đọc trước: [evolution-memory.md](../biong-short-video-hyperframes/references/evolution-memory.md) · [blank-frame-audit.md](../biong-short-video-hyperframes/references/blank-frame-audit.md) · [overlay-layer-stack.md](../biong-short-video-hyperframes/references/overlay-layer-stack.md) · [layout-9x16-zones.md](../biong-short-video-hyperframes/references/layout-9x16-zones.md)

Port rubric từ `website-to-video/references/step-6-validate.md`: contact-sheet cell-by-cell, per-beat verdict, **cấm** "snapshots look good" không kèm evidence.

---

## Khi nào invoke

1. **Đầu phase 2** (trước beat HTML): đọc `evolution-memory.md` — reuse premium blocks, tuân constraints
2. **Sau preflight pass** (lint + inspect + check scripts exit 0): chạy vision loop
3. **Sau mỗi lần sửa** trong vision loop: chạy lại preflight rồi snapshot

---

## Quy trình 5 bước

### Bước 0 — Đọc memory (trước code)

```text
Đọc .cursor/skills/biong-short-video-hyperframes/references/evolution-memory.md
→ Copy cấu trúc premium blocks phù hợp layout_archetype
→ Không viết lại từ đầu nếu đã có pattern pass vision
```

### Bước 1 — Capture frames

```bash
PROJ=storage/agent-renders/{id}/my-video
node .cursor/skills/biong-short-video-preflight/scripts/capture-visual-audit.mjs $PROJ
```

Output: `assets/visual-audit-manifest.json`, `snapshots/`, `snapshots/contact-sheet.jpg`

### Bước 2 — Vision audit (agent đọc ảnh)

Đọc **từng** frame trong `snapshots/` + `contact-sheet.jpg` cell-by-cell.

**Rubric layout (FAIL = bắt buộc fix):**

| Hạng mục | Fail nếu | Hướng vá |
|----------|----------|----------|
| Text overflow | Chữ cắt / ra ngoài 9:16 | `max-width: 85%`, giảm `font-size`, `check-typography-spacing.mjs` |
| Blank/dark frame | >0.5s không hero motion | Timeline pattern A/B; ambient cover |
| Layer stack | Caption/sticker/watermark sai thứ tự | `overlay-layer-stack.md` z9000/9500 |
| Caption band | Hero text trong band 78–100% | `layout-9x16-zones.md`, padding-bottom ≥340px |
| Stock full-bleed | Hero stock che registry | `check-stock-full-bleed.mjs` |

**Rubric thẩm mỹ (chấm 1–10):**

| Điểm | Tiêu chí |
|------|----------|
| 1–4 | Layout phẳng, nền đơn, thiếu depth |
| 5–6 | Có motion nhưng thiếu glass/gradient/glow |
| 7–8 | 3 lớp canvas, stagger GSAP, registry wired |
| 9–10 | Cinematic — ambient + transition + premium card reuse |

**Pass gate:** 0 fail layout + aesthetic **≥7/10**.

Ghi per-beat verdict:

```text
Beat N (Xs–Ys) — layout_archetype
  Frame t=Xs: [mô tả 1 câu cụ thể]
  Layout: PASS/FAIL — evidence
  Aesthetic note: ...
  VERDICT: PASS / NEEDS FIX
```

Lưu draft: `assets/visual-audit-report.json` (schema bên dưới).

### Bước 3 — Fix loop (max 2 vòng)

Nếu FAIL:

1. Sửa `compositions/beat_N.html`, CSS, GSAP — **không** sửa SKILL.md
2. Chạy lại `/biong-short-video-preflight` (toàn bộ check scripts + lint + inspect)
3. Chạy lại `capture-visual-audit.mjs`
4. Vision audit lại

Vòng 3 vẫn fail → `short_video_update_agent_status({ status: "failed", metadata: { last_error, visual_audit_report } })` + ghi lesson vào memory.

### Bước 4 — Tích lũy memory (sau pass hoặc sau vòng 2 fail)

Append vào [evolution-memory.md](../biong-short-video-hyperframes/references/evolution-memory.md):

**Lesson (nếu đã fix lỗi):**

```markdown
### [YYYY-MM-DD] short_video_{id} — tiêu đề ngắn
- Lỗi phát hiện: frame + giây + file
- Cách vá: diff tóm tắt
- Rule cứng: constraint 1 dòng
```

**Premium block (nếu aesthetic ≥8 và có snippet tái sử dụng):**

```markdown
### [pattern_id] layout_archetype — mô tả
- CSS/GSAP snippet
- Khi dùng / cấm
```

**Evolution log:**

```markdown
- Video #{id}: score X/10 — nhận xét — action taken
```

**Prune:** >15 blocks hoặc >30 lessons → merge entry cũ nhất cùng archetype.

### Bước 5 — Gate final render

Chỉ khi pass vision:

```bash
cd $PROJ
npx hyperframes render --output output.mp4 --quality high --fps 30 --strict
```

Upload kèm metadata:

```text
short_video_upload_agent_video({
  short_video_id,
  file_path: "<abs/output.mp4>",
  metadata: {
    visual_audit_report: { ... từ assets/visual-audit-report.json ... },
    evolution_memory_updated: true
  }
})
```

Borderline 6–7: optional draft MP4 spot-check tại 0%, 50%, 90% duration.

---

## Schema `assets/visual-audit-report.json`

```json
{
  "short_video_id": 0,
  "captured_at": "ISO-8601",
  "frame_count": 0,
  "fix_loops_used": 0,
  "layout_pass": true,
  "aesthetic_score": 8,
  "issues": [
    { "beat": "beat_2", "time_sec": 12.5, "type": "text_overflow", "fixed": true, "evidence": "snapshots/frame_012.png" }
  ],
  "beat_verdicts": [],
  "premium_patterns_extracted": ["glass_ui_card"],
  "memory_appended": true
}
```

---

## Quality gates

- [ ] Đã đọc `evolution-memory.md` trước beat HTML
- [ ] `capture-visual-audit.mjs` exit 0
- [ ] Vision audit có per-beat verdict + evidence paths
- [ ] Layout 0 fail + aesthetic ≥7 (hoặc failed sau 2 vòng + lesson ghi)
- [ ] `evolution-memory.md` updated (lesson và/hoặc premium block + log)
- [ ] `visual-audit-report.json` trong `assets/`
- [ ] Upload metadata có `visual_audit_report`

---

## Cấm

- Sửa `SKILL.md` hoặc skill khác trong session render
- `render --quality high` trước vision pass
- Upload draft MP4
- Bỏ qua memory append dù pass hay fail sau vòng 2
