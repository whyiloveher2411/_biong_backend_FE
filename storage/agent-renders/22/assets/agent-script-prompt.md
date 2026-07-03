Tạo kịch bản voiceover viral cho short video agent ID 22 (phase 1 — chỉ script).

Tiêu đề: Google thử nghiệm trợ lý gia sư AI trong lớp học thực tế và đạt hiệu quả bất ngờ — Short video #1
## Ngôn ngữ nội dung — Tiếng Việt (bắt buộc)
Toàn bộ script voiceover, caption on-screen, CTA và văn nói phải **100% tiếng Việt**.
Bài nguồn có thể tiếng Anh — bắt buộc viết lại hoàn toàn bằng tiếng Việt, không trộn tiếng Anh.

## Skills — invoke theo thứ tự (không đoán, không đọc path thay thế)
- /biong-short-video-hyperframes
- /extract-core-signals
- /hyperframes-creative
- /viral-audio-script
- /audit-audio-script

## Reference Biong — @ attach
- @.cursor/skills/biong-short-video-hyperframes/references/viral-retention-structure.md
- @.cursor/skills/biong-short-video-hyperframes/references/narrative-flow-vi.md
- @.cursor/skills/biong-short-video-hyperframes/references/plain-language-storytelling-vi.md
- @.cursor/skills/biong-short-video-hyperframes/references/viral-audio-script.md
- @.cursor/skills/biong-short-video-hyperframes/references/vi-voiceover-naturalization.md
- @.cursor/skills/biong-short-video-hyperframes/references/omnivoice-speech-script.md
- @.cursor/skills/biong-short-video-hyperframes/references/omnivoice-expressive-tags.md
- @.cursor/skills/biong-short-video-hyperframes/references/extract-core-signals.md
- @.cursor/skills/biong-short-video-hyperframes/references/audit-audio-script.md

## Cấu trúc viral retention + plain language + OmniVoice (bắt buộc)
Đọc @plain-language-storytelling-vi.md + @viral-retention-structure.md + @narrative-flow-vi.md + @vi-voiceover-naturalization.md + @omnivoice-expressive-tags.md
Thời lượng: **60–180 giây** — agent chọn theo nội dung
Timeline HASCAS: Hook ~5%, Agitate ~25%, Solve ~60%, CTA ~10%
Word budget: ~2.5 từ/giây

## Narrative Flow + plain language
1. Kể như giải thích cho **bạn 12 tuổi** — từ đơn giản, ví dụ đời
2. **Cấm em dash** `—` — dùng phẩy, câu mới, `. . .`
3. **Cấm từ liệt kê** — nối But/Therefore
4. Câu **tự nhiên** — không giới hạn 12 từ

Quy trình **4 bước**:
1. /extract-core-signals — hook + narrative_chain + perspective
2. /hyperframes-creative — Narrative Flow + plain language
3. /viral-audio-script — script hoàn chỉnh one-pass (tag + từ đệm + HASCAS)
4. /audit-audio-script — QA — pass bắt buộc; retry tối đa 2 vòng
5. save_audio_script — chỉ khi pass=true → **DỪNG** chờ admin duyệt CMS

- Non-verbal CHỈ allowlist 3 tag OmniVoice — cấm [gasp]; cấm SSML
- Bắt buộc [SFX: vine boom] hook
- metadata: timeline, expressive_plan, core_signals, script_diagnosis, markers, estimated_duration_sec — **không** visual_shot_plan

## MCP tools — gọi đúng tên
1. short_video_get_context({ short_video_id: 22 })
   — đọc production_playbook.audio_script_pipeline + creative_brief.content_plain_text
2. short_video_save_audio_script({
     short_video_id: 22,
     text: "<script OmniVoice: [SFX] [BGM] . . . [sigh] [laughter] prosody>",
     metadata: {
       core_signals: { hook, tension, takeaway },
       structure: "hook-agitate-solve-cta",
       timeline: { hook_end: 5, agitate_end: 27, solve_end: 81, total: 90 },
       expressive_plan: { hook: [], agitate: ["[sigh]"], solve: [], cta: ["[laughter]"] },
       cta_mode: "loop",
       markers: [{ time: 0, text: "...", section: "hook" }],
       estimated_duration_sec: 90,
       script_diagnosis: { pass: true, issues: [] },
       bgm_mood: "lofi ambient",
       tts_engine_hint: "omnivoice"
     }
   })

## Quy trình (sau khi invoke skill)
- /extract-core-signals → /hyperframes-creative → /viral-audio-script (one-pass) → /audit-audio-script
- script_diagnosis.pass=true → save_audio_script (fixed_script) → DỪNG — admin duyệt trên CMS

## CẤM MCP phase 1
short_video_generate_narration_tts, short_video_search_*, short_video_upload_agent_video, visual_shot_plan

## CẤM khác
render, save khi audit chưa pass, em dash —, structural summarization, từ liệt kê
