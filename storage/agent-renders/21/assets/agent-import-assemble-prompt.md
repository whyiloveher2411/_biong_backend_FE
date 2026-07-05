Ghép video agent cho short video ID 21 (import HTML chatbot — CHỈ ghép, KHÔNG sáng tạo visual mới).

Tiêu đề: Phân tích: Mô hình AI giá rẻ mới của Trung Quốc đang bám đuổi Anthropic và OpenAI ngay trên sân nhà — Short video #1
## Ngôn ngữ nội dung — Tiếng Việt (bắt buộc)
Toàn bộ script voiceover, caption on-screen, CTA và văn nói phải **100% tiếng Việt**.
Bài nguồn có thể tiếng Anh — bắt buộc viết lại hoàn toàn bằng tiếng Việt, không trộn tiếng Anh.
Audio đã sẵn sàng: https://file-spacedev-app.spacedev.vn/uploads/short-video/agent-audio/21_vi_full.mp3?v=1782992270
render_mode=import_html | beats=18/18 | whisper_status=completed
hf_prompt_type gốc (tham khảo): universal-composer
data-duration mục tiêu: 212.71s

## Ghép lại từ HTML chatbot — nguồn truth = CMS (khớp preview admin) (render lúc 2026-07-03T18:25:38+07:00)
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
- Thêm stock/Giphy/Lottie media (visual đã có trong beat HTML user)
- Chấp nhận karaoke/caption/subtitle **trong HTML user** — nếu có phải báo admin xóa và chỉ ghép visual thuần

HTML beat user **KHÔNG ĐƯỢC** chứa karaoke, phụ đề, caption on-screen, hay text sync voiceover — caption do agent sinh riêng ở bước 6.
Mỗi beat_html user dán là **một file HTML self-contained** (`<!doctype html>` … `</html>`) — không css/js file riêng, không multi-file.

Agent **BẮT BUỘC**:
1. MCP short_video_get_context → đọc import_html.beat_map + import_html.beat_html + whisper_words từ CMS
2. hyperframes init storage/agent-renders/21/my-video --example=vignelli
3. Ghi assets/beat-map.json từ import_html.beat_map CMS (giữ nguyên sections startSec/endSec/durationSec)
4. Ghi mỗi beat user vào compositions/{beat_id}.html (vd. beat_1.html) — **giữ nguyên visual** (CSS/DOM/render logic)
4b. **BẮT BUỘC** chuẩn hóa beat cho HyperFrames render (scaffolding — không sửa visual):
   node .cursor/skills/biong-short-video-preflight/scripts/normalize-import-html-beat-for-render.mjs storage/agent-renders/21/my-video --localize-images
   — bọc `<template>` + `window.__timelines["beat_N"]` (bridge GSAP gọi render()); gỡ prefers-reduced-motion; localize ảnh ngoài
   — đọc @import-html-beat-render.md
5. Wire index.html beat-host theo beat-map (data-start/data-duration từng section) — tham chiếu sync-index-beats-from-map.mjs
6. Sinh compositions/captions.html — `gen-captions-html.mjs` (caption pill **sát mép dưới** `bottom:48px` — beat import_html không chừa caption band; **CẤM** `bottom:12%`)
7. Sinh compositions/ambient-layer.html + window.__timelines["ambient"] (invoke /continuous-motion)
8. Watermark Spacedev bắt buộc — brand-watermark.html hoặc overlay host z-index 9500
8a. Bootstrap + BGM (bắt buộc trước wire index.html):
   node .cursor/skills/biong-short-video-preflight/scripts/bootstrap-phase2-assets.mjs storage/agent-renders/21/my-video
   — ghi assets/audio-script.txt + assets/caption-words.json từ whisper_words CMS + audio_script
   → thực hiện block BGM bên dưới (search_bgm limit=8 → bgm_1…n.mp3 + bgm-chain.json → wire-bgm-chain.mjs)
9. Wire index.html: narration track 10 + BGM chain (track 11/13/15…) + beat compositions + captions + ambient + watermark
10. Preflight tối thiểu:
   node .cursor/skills/biong-short-video-preflight/scripts/check-import-html-beat-render.mjs storage/agent-renders/21/my-video
   node .cursor/skills/biong-short-video-preflight/scripts/check-overlay-stack.mjs storage/agent-renders/21/my-video
   node .cursor/skills/biong-short-video-preflight/scripts/verify-caption-sync.mjs storage/agent-renders/21/my-video --strict
   node .cursor/skills/biong-short-video-preflight/scripts/check-beat-timing.mjs storage/agent-renders/21/my-video
   node .cursor/skills/biong-short-video-preflight/scripts/check-media-stack.mjs storage/agent-renders/21/my-video --strict
11. hyperframes render --quality high --strict → short_video_upload_agent_video

## BGM chain (bắt buộc — import HTML assemble)
Đọc @import-html-assemble-bgm.md + @media-mcp-activation.md (phần BGM only — cấm stock/giphy/SFX MCP).

Sau bootstrap-phase2-assets.mjs:
1. Parse mood từ `[BGM: ...]` trong assets/audio-script.txt (fallback: `lofi ambient`)
2. Tính totalVideoSec từ beat-map hoặc assets/caption-sync-report.json
3. short_video_search_bgm({ query: "<mood>", limit: 8 }) — **cấm** min_duration_sec=totalVideoSec
4. Tải tuần tự download_url → assets/audio/bgm_1.mp3, bgm_2.mp3, … (cùng mood, candidate khác nhau) cho đến khi tổng duration_sec ≥ totalVideoSec
5. Ghi assets/bgm-chain.json — segments[] (id, file, fileDurationSec từ MCP)
6. Ghi media-plan.md — row bgm_global + bgm_2, bgm_3… (mcp_tool, query, local_path)
7. node .cursor/skills/biong-short-video-preflight/scripts/wire-bgm-chain.mjs storage/agent-renders/{id}/my-video
   — ffprobe + wire track 11/13/15… + crossfade volume 0.5s trên main timeline; **cấm** attribute loop
8. Narration track 10: data-volume=1.0 — BGM không lấn voiceover

Fallback MCP fail (Pixabay down / curated_fallback 403): tái dùng nhiều assets/audio/bgm_*.mp3 từ storage/agent-renders/{id_khác}/my-video/ cùng mood — ghi rõ source trong media-plan.md (xem @evolution-memory.md).

**Cấm** import assemble: short_video_search_meme_sound, short_video_search_stock_media, short_video_search_giphy, Lottie MCP; **cấm** loop BGM.

## Overlay stack — caption & watermark LUÔN trên cùng (KHÓA CỨNG)
Đọc @overlay-layer-stack.md — data-track-index KHÔNG quyết định z-order; dùng CSS z-index.

Trong index.html (#root), thứ tự DOM bắt buộc:
1. Beat sections + ambient layer (z-index bands 0–800 — xem @overlay-layer-stack.md)
2. Caption host — class hf-overlay-caption, style z-index:9000, data-track-index=20
3. Watermark host — class hf-overlay-brand, style z-index:9500, data-track-index=21 (CUỐI #root)

compositions/captions.html + brand-watermark.html: html/body background: transparent !important
Caption pill: **bottom:48px** sát mép dưới (gen-captions-html.mjs) — import_html beat không chừa caption band; **cấm bottom:12%**

## Caption karaoke (bắt buộc — mọi video)
Đọc @caption-karaoke-script-sync.md
1. short_video_get_context → lưu **toàn bộ response** vào assets/get-context-snapshot.json
   node .cursor/skills/biong-short-video-preflight/scripts/bootstrap-phase2-assets.mjs storage/agent-renders/21/my-video
   (tạo assets/audio-script.txt + assets/agent-metadata.json từ audio_script + audio_script_metadata)
2. **Transcribe (bắt buộc):** node .cursor/skills/biong-short-video-preflight/scripts/transcribe-audio.mjs storage/agent-renders/21/my-video
   — đọc language từ agent-metadata.json; CẤM npx hyperframes transcribe không flag (default small.en)
3. **Pipeline sync (bắt buộc — cấm ghi tay Whisper vào caption):**
   Map script↔Whisper: exact→fuzzy→positional→interpolate (caption-script-align.mjs) — text hiển thị LUÔN từ audio-script.txt
   node .cursor/skills/biong-short-video-preflight/scripts/sync-caption-from-script.mjs storage/agent-renders/21/my-video
   node .cursor/skills/biong-short-video-preflight/scripts/verify-caption-sync.mjs storage/agent-renders/21/my-video --strict
   → FAIL: đọc assets/caption-sync-report.json → transcribe-audio lại → sync (tối đa 2 vòng) — KHÔNG render
   node .cursor/skills/biong-short-video-preflight/scripts/assign-beat-prompt-types.mjs storage/agent-renders/21/my-video
   node .cursor/skills/biong-short-video-preflight/scripts/map-shot-plan-to-beat-map.mjs storage/agent-renders/21/my-video
   node .cursor/skills/biong-short-video-preflight/scripts/build-beat-element-timing.mjs storage/agent-renders/21/my-video
   node .cursor/skills/biong-short-video-preflight/scripts/sync-index-beats-from-map.mjs storage/agent-renders/21/my-video
   # Agent viết compositions/beat_N.html thủ công — CẤM gen-beats-from-shot-plan.mjs
   node .cursor/skills/biong-short-video-preflight/scripts/gen-captions-html.mjs storage/agent-renders/21/my-video
4. Wire host clip compositions/captions.html — z-index:9000, data-duration=totalVideoSec

## Upload MP4 (sau render final)
1. Đọc assets/visual-audit-report.json (bắt buộc sau vision pass)
2. short_video_upload_agent_video({
     short_video_id: 21,
     file_path: "<abs/output.mp4>",
     metadata: {
       visual_audit_report: <nội dung visual-audit-report.json>,
       evolution_memory_updated: true
     }
   })
3. Nếu lỗi multipart/upload → CLI fallback:
   node mcp/short-video-agent/scripts/upload-agent-video.mjs --short-video-id 21 --file "<abs/output.mp4>"
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
- cp .cursor/skills/biong-short-video-hyperframes/assets/spacedev-logo.png → storage/agent-renders/21/my-video/assets/images/
- **Sinh watermark bằng script** (cấm hand-author sai #root):
  node .cursor/skills/biong-short-video-preflight/scripts/gen-brand-watermark.mjs storage/agent-renders/21/my-video --duration {totalVideoSec}
- Cấu trúc: #root full canvas 1080×1920 + child `.brand-wrap { left:28px; top:28px }` — **CẤM** left/top trên `#root`
- Host clip z-index:9500, data-start=0, data-duration=totalVideoSec — CẤM gắn vào beat cuối

## Preflight bắt buộc TRƯỚC render final
Invoke /biong-short-video-preflight — đọc @blank-frame-audit.md
node .cursor/skills/biong-short-video-preflight/scripts/gen-brand-watermark.mjs storage/agent-renders/21/my-video --duration {totalVideoSec}
# CẤM gen-beats-from-shot-plan.mjs — agent viết beat HTML thủ công
node .cursor/skills/biong-short-video-preflight/scripts/patch-stock-full-bleed.mjs storage/agent-renders/21/my-video
node .cursor/skills/biong-short-video-preflight/scripts/check-continuous-motion.mjs storage/agent-renders/21/my-video
node .cursor/skills/biong-short-video-preflight/scripts/check-stock-full-bleed.mjs storage/agent-renders/21/my-video
node .cursor/skills/biong-short-video-preflight/scripts/check-visual-density.mjs storage/agent-renders/21/my-video
node .cursor/skills/biong-short-video-preflight/scripts/check-typography-spacing.mjs storage/agent-renders/21/my-video
node .cursor/skills/biong-short-video-preflight/scripts/check-beat-timing.mjs storage/agent-renders/21/my-video
node .cursor/skills/biong-short-video-preflight/scripts/check-media-stack.mjs storage/agent-renders/21/my-video --strict
node .cursor/skills/biong-short-video-preflight/scripts/check-overlay-stack.mjs storage/agent-renders/21/my-video
→ exit 0 + npx hyperframes lint 0 errors → invoke /biong-short-video-evolution (vision loop)
→ vision pass + evolution-memory.md updated → mới được render --quality high --strict

## MCP tools
1. short_video_get_context({ short_video_id: 21 })
   — gate: beat_map hợp lệ, đủ beat_html mọi section, whisper_status=completed, audio_file có URL
2. CẤM: short_video_generate_narration_tts, transcribe-audio.mjs (whisper đã có trên CMS)
3. Bootstrap: node .cursor/skills/biong-short-video-preflight/scripts/bootstrap-phase2-assets.mjs storage/agent-renders/21/my-video
   — ghi assets/caption-words.json từ whisper_words CMS + audio_script
4. short_video_search_bgm — BGM chain (limit=8, cấm min_duration_sec); wire-bgm-chain.mjs; cấm search_meme_sound, search_stock_media, search_giphy
5. Upload MP4 final

## CẤM
Sửa visual HTML user (layout/animation/nội dung); shot-plan; stock/giphy media MCP search; BGM loop attribute; evolution vision loop (v1); tl.play()
Cho phép: normalize-import-html-beat-for-render.mjs; short_video_search_bgm + wire-bgm-chain.mjs (BGM chain only)
