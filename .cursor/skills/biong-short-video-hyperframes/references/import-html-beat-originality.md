# Import HTML beat — originality (bắt buộc)

Đọc khi sinh HTML beat trong phase `import_html_full` (Phần A) hoặc chatbot HTML beat.

**Đọc kèm:** [import-html-agent-full-pipeline.md](import-html-agent-full-pipeline.md) · [hf-prompt-beat-contract.md](hf-prompt-beat-contract.md)

---

## Nguồn được phép

| Được | Không được |
|------|------------|
| `short_video_get_import_html_beat_prompt` (server) | `storage/agent-renders/{id_khác}/**` beat HTML |
| `hyperframes/prompts/universal-composer.md` + `visual_style` + `visual_description` | `beats-draft/`, `compositions/beat_*.html` video khác |
| Skill references trong `.cursor/skills/biong-short-video-hyperframes/` | Copy-paste layout/DOM từ project 15/16/17… |
| `import_html.beat_map`, `whisper_words` (pacing only) | Script bulk `gen-and-save-beats.mjs` dùng chung 1 template |
| `creative_brief.marketing_post_images` (ảnh beat) | `evolution-memory.md` của video khác làm visual mẫu |

---

## CẤM mượn visual video cũ

- **Cấm** đọc hoặc copy HTML/CSS/JS từ `storage/agent-renders/*/compositions/`, `beats-draft/`, MP4 final cũ
- **Cấm** reuse block lặp lại mọi beat: `#joint-grid`, `.joint`, `#metric-block`, scaffold equalizer, timecode boilerplate
- **Cấm** một template cố định cho 15 beat — mỗi beat **thiết kế riêng** theo prompt server + `visual_description`
- **Cấm** script Node/Python sinh hàng loạt beat từ 1 hàm `buildBeatHtml()` chung

---

## Workflow đúng (mỗi beat)

1. `short_video_get_import_html_beat_prompt({ short_video_id, beat_id })`
2. Đọc `hyperframes/prompts/universal-composer.md`, `visual_style` và `visual_description`
3. Thiết kế layout **mới** — arc motion theo whisper **pacing** (không render text whisper)
4. Một file HTML self-contained → `short_video_save_import_html_beat`
5. Gate: visual beat này **không** trùng DOM id/class signature với beat video khác trong repo

---

## Checklist originality

- [ ] Không mở file beat HTML video ID khác trong session
- [ ] Prompt server là brief chính; skill là contract kỹ thuật
- [ ] Layout khác beat trước/sau trong cùng video (đa dạng kinetic-type)
- [ ] Không `#joint-grid` / equalizer scaffold trừ khi shot-plan yêu cầu (import_html: không có shot-plan → **cấm**)
