Render video agent cho short video ID 16 (phase 2 — DEPRECATED alias continue; render-only).

Tiêu đề: Lập trình bằng AI chia rẽ cộng đồng kỹ sư phần mềm: Người hào hứng, kẻ hoài nghi và những người ở giữa — Short video #1
## Ngôn ngữ nội dung — Tiếng Việt (bắt buộc)
Toàn bộ script voiceover, caption on-screen, CTA và văn nói phải **100% tiếng Việt**.
Bài nguồn có thể tiếng Anh — bắt buộc viết lại hoàn toàn bằng tiếng Việt, không trộn tiếng Anh.
Audio đã sẵn sàng: https://file-spacedev-app.spacedev.vn/uploads/short-video/agent-audio/16_vi_full.mp3?v=1782983084
Gate: audio_script_approved=true — nếu false DỪNG
Trạng thái workflow: phase=video_completed, ready_for_video=true

## Render lại — CẤM dùng data cũ từ final video hiện tại (render lúc 2026-07-03T18:38:28+07:00)
CMS đã có agent video final — đây là pipeline **render mới**, không phải tiếp tục chỉnh sửa bản cũ.
- **CẤM** tái sử dụng compositions/, beat-map, visual-shot-plan, media-plan, timeline hoặc evolution-memory cũ từ `storage/agent-renders/16/my-video/` nếu không được sinh lại từ audio + script **hiện tại** qua MCP get_context
- **CẤM** copy beat HTML, beat-map.json, index.html cũ chỉ vì file đã tồn tại trên disk
- **CẤM** suy luận nội dung visual từ MP4 final cũ trên S3/CMS — chỉ dùng audio_file + audio_script + metadata từ MCP
- Bootstrap sạch: chạy lại bootstrap-phase2-assets / hyperframes init my-video; giữ audio/script từ MCP, regenerate shot-plan + beats từ đầu

TTS do CMS queue sau admin duyệt — **CẤM** short_video_generate_narration_tts.

## Bước 0 — visual shot plan (sau transcribe)
Đọc @visual-shot-plan.md + @hf-prompt-catalog.md
Sau transcribe + caption-words: sinh visual_shot_plan **N beats** bám phrase_anchor — **không** map 1:1 HASCAS
→ short_video_update_agent_status + assets/visual-shot-plan.json
→ assign-beat-prompt-types.mjs → map-shot-plan-to-beat-map.mjs → build-beat-element-timing.mjs
→ agent viết compositions/beat_N.html theo @hyperframes/prompts/{hf_prompt_type}.md (hf-seek)

## Skills — invoke theo thứ tự
- /biong-short-video-hyperframes
- /hyperframes
- /general-video
- /product-launch-video
- /hyperframes-core
- /hyperframes-animation
- /hyperframes-creative
- /embedded-captions
- /hyperframes-media
- /continuous-motion
- /biong-short-video-preflight
- /biong-short-video-evolution

## Reference Biong — @ attach
- @.cursor/skills/biong-short-video-hyperframes/references/media-mcp-activation.md
- @.cursor/skills/biong-short-video-hyperframes/references/hf-prompt-beat-contract.md
- @.cursor/skills/biong-short-video-hyperframes/references/hf-prompt-catalog.md
- @.cursor/skills/biong-short-video-hyperframes/references/hf-prompt-art-direction.md
- @hyperframes/prompts/cinematic-title.md
- @hyperframes/prompts/kinetic-type.md
- @hyperframes/prompts/social-reel.md
- @hyperframes/prompts/data-story.md
- @hyperframes/prompts/product-reveal.md
- @hyperframes/prompts/lower-third-overlay.md
- @hyperframes/prompts/sting-transition.md
- @hyperframes/prompts/premium-spot.md
- @hyperframes/prompts/universal-composer.md
- @.cursor/skills/biong-short-video-hyperframes/references/layout-9x16-zones.md
- @.cursor/skills/biong-short-video-hyperframes/references/motion-vocabulary-map.md
- @.cursor/skills/biong-short-video-hyperframes/references/caption-karaoke-script-sync.md
- @.cursor/skills/biong-short-video-hyperframes/references/transcribe-locale.md
- @.cursor/skills/biong-short-video-hyperframes/references/kinetic-typography-brief.md
- @.cursor/skills/biong-short-video-hyperframes/references/spacedev-brand-watermark.md
- @.cursor/skills/biong-short-video-hyperframes/references/overlay-layer-stack.md
- @.cursor/skills/biong-short-video-hyperframes/references/blank-frame-audit.md
- @.cursor/skills/biong-short-video-hyperframes/references/evolution-memory.md
- @.cursor/skills/biong-short-video-hyperframes/references/viral-retention-structure.md
- @.cursor/skills/biong-short-video-hyperframes/references/typography-be-vietnam-pro.md
- @.cursor/skills/biong-short-video-hyperframes/references/visual-shot-plan.md
- @.cursor/skills/biong-short-video-hyperframes/references/anti-scaffold-guardrails.md
- @.cursor/skills/biong-short-video-hyperframes/references/hyperframes-theme-init.md
- @.cursor/skills/biong-short-video-hyperframes/references/canvas-contract-3-layer.md
- @.cursor/skills/biong-short-video-hyperframes/references/lottie-activation.md
- @.cursor/skills/biong-short-video-hyperframes/references/continuous-motion-patterns.md

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

## Auto-Evolution — vision loop (bắt buộc, tự động, không hỏi user)
Đọc @evolution-memory.md TRƯỚC khi viết compositions/beat_N.html — reuse premium blocks, tuân constraints.
Invoke /biong-short-video-evolution sau preflight pass, TRƯỚC render --quality high.

1. node .cursor/skills/biong-short-video-preflight/scripts/capture-visual-audit.mjs storage/agent-renders/16/my-video
2. Đọc snapshots/ + contact-sheet.jpg — layout 0 fail + aesthetic ≥7/10
3. FAIL → sửa beat HTML/CSS/GSAP → chạy lại /biong-short-video-preflight → capture lại (max 2 vòng)
4. PASS → append evolution-memory.md + ghi assets/visual-audit-report.json
5. Cấm sửa SKILL.md trong session render
6. Chỉ sau vision pass: npx hyperframes render --quality high --strict

Upload kèm metadata:
short_video_upload_agent_video({
  short_video_id: 16,
  file_path: "<abs/output.mp4>",
  metadata: {
    visual_audit_report: <đọc từ assets/visual-audit-report.json>,
    evolution_memory_updated: true
  }
})

## MCP tools — gọi đúng tên theo thứ tự
1. short_video_get_context({ short_video_id: 16 })
   — gate: audio_file phải có URL, nếu không DỪNG
2. CẤM: short_video_generate_narration_tts
3. Lưu assets/agent-metadata.json (language + markers + timeline) từ get_context
   node .cursor/skills/biong-short-video-preflight/scripts/transcribe-audio.mjs storage/agent-renders/16/my-video
   → sync-caption → verify --strict → assign-beat-prompt-types → map-shot-plan-to-beat-map → build-beat-element-timing → sync-index-beats → gen-captions-html
MCP media — gọi đúng tool theo visual_shot_plan (cấm bịa assets/):
- short_video_search_meme_sound({ query: "<từ [SFX: ...] hoặc vine boom>" }) — 1 lần/video hook giây 0
- short_video_search_bgm({ query: "<mood từ [BGM: ...]>", min_duration_sec: totalVideoSec }) — 1 lần/video
- short_video_search_stock_media — CHỈ cho bg_media trong shot-plan (opacity 0.3–0.6, không full-bleed hero)
- short_video_search_giphy({ query: "...", media_type: "sticker" }) — accent_media giphy_sticker/gif
- Lottie: cp từ .cursor/skills/biong-short-video-hyperframes/assets/lotties/ theo lottie_id trong manifest (nếu có)
- Tải download_url → assets/audio/, assets/images/
- media-plan.md: sfx_hook + bgm_global + mỗi beat (hf_prompt_type, accent_media, bg_media)
- SFX track 12: data-start=0, data-duration=2, data-volume=0.45
- BGM index.html track 11: data-start=0, data-duration=totalVideoSec, data-volume=0.3
- Narration track 10: data-volume=1.0
- compositions/ambient-layer.html — window.__timelines["ambient"], z-index 6–10
4. Vision pass → render final → short_video_upload_agent_video (kèm metadata.visual_audit_report)

## CẤM
save_audio_script (script đã có); TTS MCP; bỏ qua shot-plan; render khi preflight fail; render trước vision pass
