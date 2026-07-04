Ghép video agent cho short video ID 16 (import HTML chatbot — CHỈ ghép, KHÔNG sáng tạo visual mới).

Tiêu đề: Lập trình bằng AI chia rẽ cộng đồng kỹ sư phần mềm: Người hào hứng, kẻ hoài nghi và những người ở giữa — Short video #1
## Ngôn ngữ nội dung — Tiếng Việt (bắt buộc)
Toàn bộ script voiceover, caption on-screen, CTA và văn nói phải **100% tiếng Việt**.
Bài nguồn có thể tiếng Anh — bắt buộc viết lại hoàn toàn bằng tiếng Việt, không trộn tiếng Anh.
Audio đã sẵn sàng: https://file-spacedev-app.spacedev.vn/uploads/short-video/agent-audio/16_vi_full.mp3?v=1782983084
render_mode=import_html | beats=12/12 | whisper_status=completed
hf_prompt_type gốc (tham khảo): premium-spot
data-duration mục tiêu: 140.07s

## Ghép lại từ HTML chatbot — nguồn truth = CMS (khớp preview admin) (render lúc 2026-07-03T18:38:28+07:00)
CMS đã có agent video final — đây là **ghép lại** từ `import_html.beat_map` + `import_html.beat_html` trên CMS, không phải creative phase 2.
- **BẮT BUỘC** lấy beat-map + beat HTML từ MCP `short_video_get_context` — đây là nội dung admin đã preview
- **Ghi đè** `compositions/beat_N.html` và `assets/beat-map.json` trên disk từ CMS (không giữ beat cũ nếu lệch)
- **CẤM** visual_shot_plan, assign-beat-prompt-types, map-shot-plan-to-beat-map, transcribe-audio.mjs
- **CẤM** suy luận visual từ MP4 final cũ — chỉ dùng beat_html CMS + audio + whisper_words CMS
- Upload MP4 mới thay `agent_video_url` sau render

## Vai trò — ASSEMBLE ONLY
Admin đã dán beat-map + HTML từng beat từ chatbot ngoài. Agent **KHÔNG** được:
- Sinh beat HTML mới hoặc viết lại visual của user
- Chạy visual_shot_plan, assign-beat-prompt-types, map-shot-plan-to-beat-map
- Sửa layout/animation/nội dung trong HTML user (chỉ được chỉnh data-duration nếu lệch beat-map)
- Thêm BGM/SFX/stock media trong v1
- Chấp nhận karaoke/caption/subtitle **trong HTML user** — nếu có phải báo admin xóa và chỉ ghép visual thuần

HTML beat user **KHÔNG ĐƯỢC** chứa karaoke, phụ đề, caption on-screen, hay text sync voiceover — caption do agent sinh riêng ở bước 6.
Mỗi beat_html user dán là **một file HTML self-contained** (`<!doctype html>` … `</html>`) — không css/js file riêng, không multi-file.

Agent **BẮT BUỘC**:
1. MCP short_video_get_context → đọc import_html.beat_map + import_html.beat_html + whisper_words từ CMS
2. hyperframes init storage/agent-renders/16/my-video --example=vignelli
3. Ghi assets/beat-map.json từ import_html.beat_map CMS (giữ nguyên sections startSec/endSec/durationSec)
4. Ghi mỗi beat user vào compositions/{beat_id}.html (vd. beat_1.html) — giữ nguyên visual hf-seek
5. Wire index.html beat-host theo beat-map (data-start/data-duration từng section) — tham chiếu sync-index-beats-from-map.mjs
6. Sinh compositions/captions.html — text từ audio_script, timing từ whisper_words CMS (KHÔNG dùng text whisper)
7. Sinh compositions/ambient-layer.html + window.__timelines["ambient"] (invoke /continuous-motion)
8. Watermark Spacedev bắt buộc — brand-watermark.html hoặc overlay host z-index 9500
9. Wire index.html: narration + beat compositions + captions + ambient + watermark
10. Preflight tối thiểu:
   node .cursor/skills/biong-short-video-preflight/scripts/check-overlay-stack.mjs storage/agent-renders/16/my-video
   node .cursor/skills/biong-short-video-preflight/scripts/verify-caption-sync.mjs storage/agent-renders/16/my-video --strict
   node .cursor/skills/biong-short-video-preflight/scripts/check-beat-timing.mjs storage/agent-renders/16/my-video
11. hyperframes render --quality high --strict → short_video_upload_agent_video

## Overlay stack — caption & watermark LUÔN trên cùng (KHÓA CỨNG)
Đọc @overlay-layer-stack.md — data-track-index KHÔNG quyết định z-order; dùng CSS z-index.

Trong index.html (#root), thứ tự DOM bắt buộc:
1. Beat sections + ambient layer (z-index bands 0–800 — xem @overlay-layer-stack.md)
2. Caption host — class hf-overlay-caption, style z-index:9000, data-track-index=20
3. Watermark host — class hf-overlay-brand, style z-index:9500, data-track-index=21 (CUỐI #root)

compositions/captions.html + brand-watermark.html: html/body background: transparent !important

## Caption karaoke (bắt buộc — mọi video)
Đọc @caption-karaoke-script-sync.md
1. short_video_get_context → lưu **toàn bộ response** vào assets/get-context-snapshot.json
   node .cursor/skills/biong-short-video-preflight/scripts/bootstrap-phase2-assets.mjs storage/agent-renders/16/my-video
   (tạo assets/audio-script.txt + assets/agent-metadata.json từ audio_script + audio_script_metadata)
2. **Transcribe (bắt buộc):** node .cursor/skills/biong-short-video-preflight/scripts/transcribe-audio.mjs storage/agent-renders/16/my-video
   — đọc language từ agent-metadata.json; CẤM npx hyperframes transcribe không flag (default small.en)
3. **Pipeline sync (bắt buộc — cấm ghi tay Whisper vào caption):**
   Map script↔Whisper: exact→fuzzy→positional→interpolate (caption-script-align.mjs) — text hiển thị LUÔN từ audio-script.txt
   node .cursor/skills/biong-short-video-preflight/scripts/sync-caption-from-script.mjs storage/agent-renders/16/my-video
   node .cursor/skills/biong-short-video-preflight/scripts/verify-caption-sync.mjs storage/agent-renders/16/my-video --strict
   → FAIL: đọc assets/caption-sync-report.json → transcribe-audio lại → sync (tối đa 2 vòng) — KHÔNG render
   node .cursor/skills/biong-short-video-preflight/scripts/assign-beat-prompt-types.mjs storage/agent-renders/16/my-video
   node .cursor/skills/biong-short-video-preflight/scripts/map-shot-plan-to-beat-map.mjs storage/agent-renders/16/my-video
   node .cursor/skills/biong-short-video-preflight/scripts/build-beat-element-timing.mjs storage/agent-renders/16/my-video
   node .cursor/skills/biong-short-video-preflight/scripts/sync-index-beats-from-map.mjs storage/agent-renders/16/my-video
   # Agent viết compositions/beat_N.html thủ công — CẤM gen-beats-from-shot-plan.mjs
   node .cursor/skills/biong-short-video-preflight/scripts/gen-captions-html.mjs storage/agent-renders/16/my-video
4. Wire host clip compositions/captions.html — z-index:9000, data-duration=totalVideoSec

## Upload MP4 (sau render final)
1. Đọc assets/visual-audit-report.json (bắt buộc sau vision pass)
2. short_video_upload_agent_video({
     short_video_id: 16,
     file_path: "<abs/output.mp4>",
     metadata: {
       visual_audit_report: <nội dung visual-audit-report.json>,
       evolution_memory_updated: true
     }
   })
3. Nếu lỗi multipart/upload → CLI fallback:
   node mcp/short-video-agent/scripts/upload-agent-video.mjs --short-video-id 16 --file "<abs/output.mp4>"
3. Cấm bỏ qua upload khi render xong

## Typography & motion (bắt buộc)
Đọc @typography-be-vietnam-pro.md + @hf-prompt-beat-contract.md + @viral-retention-structure.md
- cp BeVietnamPro-*.ttf → assets/fonts/; @font-face mọi beat HTML — cấm Google Fonts CDN
- Beat map theo assets/beat-map.json; **cấm beat overlap** — sync-index-beats-from-map.mjs
- assign-beat-prompt-types.mjs → build-beat-element-timing.mjs — timing element từ Whisper
- **CẤM scaffold:** text "Beat 1/2/3…", gen-beats-from-shot-plan.mjs, GSAP beat timeline
- Mỗi beat: đọc @hyperframes/prompts/{hf_prompt_type}.md → viết compositions/beat_N.html (hf-seek)
- Hook: search_meme_sound giây 0

## Watermark Spacedev (bắt buộc — suốt video)
Đọc @spacedev-brand-watermark.md
- cp .cursor/skills/biong-short-video-hyperframes/assets/spacedev-logo.png → storage/agent-renders/16/my-video/assets/images/
- **Sinh watermark bằng script** (cấm hand-author sai #root):
  node .cursor/skills/biong-short-video-preflight/scripts/gen-brand-watermark.mjs storage/agent-renders/16/my-video --duration {totalVideoSec}
- Cấu trúc: #root full canvas 1080×1920 + child `.brand-wrap { left:28px; top:28px }` — **CẤM** left/top trên `#root`
- Host clip z-index:9500, data-start=0, data-duration=totalVideoSec — CẤM gắn vào beat cuối

## Preflight bắt buộc TRƯỚC render final
Invoke /biong-short-video-preflight — đọc @blank-frame-audit.md
node .cursor/skills/biong-short-video-preflight/scripts/gen-brand-watermark.mjs storage/agent-renders/16/my-video --duration {totalVideoSec}
# CẤM gen-beats-from-shot-plan.mjs — agent viết beat HTML thủ công
node .cursor/skills/biong-short-video-preflight/scripts/patch-stock-full-bleed.mjs storage/agent-renders/16/my-video
node .cursor/skills/biong-short-video-preflight/scripts/check-continuous-motion.mjs storage/agent-renders/16/my-video
node .cursor/skills/biong-short-video-preflight/scripts/check-stock-full-bleed.mjs storage/agent-renders/16/my-video
node .cursor/skills/biong-short-video-preflight/scripts/check-visual-density.mjs storage/agent-renders/16/my-video
node .cursor/skills/biong-short-video-preflight/scripts/check-typography-spacing.mjs storage/agent-renders/16/my-video
node .cursor/skills/biong-short-video-preflight/scripts/check-beat-timing.mjs storage/agent-renders/16/my-video
node .cursor/skills/biong-short-video-preflight/scripts/check-media-stack.mjs storage/agent-renders/16/my-video --strict
node .cursor/skills/biong-short-video-preflight/scripts/check-overlay-stack.mjs storage/agent-renders/16/my-video
→ exit 0 + npx hyperframes lint 0 errors → invoke /biong-short-video-evolution (vision loop)
→ vision pass + evolution-memory.md updated → mới được render --quality high --strict

## MCP tools
1. short_video_get_context({ short_video_id: 16 })
   — gate: beat_map hợp lệ, đủ beat_html mọi section, whisper_status=completed, audio_file có URL
2. CẤM: short_video_generate_narration_tts, transcribe-audio.mjs (whisper đã có trên CMS)
3. Bootstrap: node .cursor/skills/biong-short-video-preflight/scripts/bootstrap-phase2-assets.mjs storage/agent-renders/16/my-video
   — ghi assets/caption-words.json từ whisper_words CMS + audio_script
4. Upload MP4 final

## CẤM
Sửa HTML user; shot-plan; media MCP search; evolution vision loop (v1); GSAP beat timeline; tl.play()
