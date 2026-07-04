Render video agent cho short video ID 15 (phase 2 — video từ audio có sẵn).

Tiêu đề: Cách giúp CV của bạn lọt vào mắt xanh của AI — Short video #1
## Ngôn ngữ nội dung — Tiếng Việt (bắt buộc)
Toàn bộ script voiceover, caption on-screen, CTA và văn nói phải **100% tiếng Việt**.
Bài nguồn có thể tiếng Anh — bắt buộc viết lại hoàn toàn bằng tiếng Việt, không trộn tiếng Anh.
Audio đã sẵn sàng: https://file-spacedev-app.spacedev.vn/uploads/short-video/agent-audio/15_vi_full.mp3?v=1782898044
Gate: audio_script_approved=true — nếu false DỪNG
Trạng thái workflow: phase=audio_ready, ready_for_video=true


## Bước 0 — visual shot plan (sau transcribe)
Đọc @visual-shot-plan.md + @visual-layout-archetypes.md
Sau transcribe + caption-words: sinh visual_shot_plan **N beats** bám phrase_anchor — **không** map 1:1 HASCAS
→ short_video_update_agent_status + assets/visual-shot-plan.json
→ map-shot-plan-to-beat-map.mjs → agent viết compositions/beat_N.html thủ công (registry/GSAP/Lottie/Three.js)

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
- /hyperframes-registry
- /gsap-core
- /gsap-timeline
- /continuous-motion
- /motion-graphics
- /biong-short-video-preflight
- /biong-short-video-evolution

## Reference Biong — @ attach
- @.cursor/skills/biong-short-video-hyperframes/references/media-mcp-activation.md
- @.cursor/skills/biong-short-video-hyperframes/references/motion-complexity-activation.md
- @.cursor/skills/biong-short-video-hyperframes/references/hyperframes-skill-routing.md
- @.cursor/skills/biong-short-video-hyperframes/references/layout-9x16-zones.md
- @.cursor/skills/biong-short-video-hyperframes/references/gsap-beat-checklist.md
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
- @.cursor/skills/biong-short-video-hyperframes/references/visual-layout-archetypes.md
- @.cursor/skills/biong-short-video-hyperframes/references/anti-scaffold-guardrails.md
- @.cursor/skills/biong-short-video-hyperframes/references/hyperframes-theme-init.md
- @.cursor/skills/biong-short-video-hyperframes/references/canvas-contract-3-layer.md
- @.cursor/skills/biong-short-video-hyperframes/references/lottie-activation.md
- @.cursor/skills/biong-short-video-hyperframes/references/continuous-motion-patterns.md
- @.cursor/skills/biong-short-video-hyperframes/references/art-direction-base.md
- @.cursor/skills/biong-short-video-hyperframes/references/art-director-profile-map.md

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
   node .cursor/skills/biong-short-video-preflight/scripts/bootstrap-phase2-assets.mjs storage/agent-renders/15/my-video
   (tạo assets/audio-script.txt + assets/agent-metadata.json từ audio_script + audio_script_metadata)
2. **Transcribe (bắt buộc):** node .cursor/skills/biong-short-video-preflight/scripts/transcribe-audio.mjs storage/agent-renders/15/my-video
   — đọc language từ agent-metadata.json; CẤM npx hyperframes transcribe không flag (default small.en)
3. **Pipeline sync (bắt buộc — cấm ghi tay Whisper vào caption):**
   Map script↔Whisper: exact→fuzzy→positional→interpolate (caption-script-align.mjs) — text hiển thị LUÔN từ audio-script.txt
   node .cursor/skills/biong-short-video-preflight/scripts/sync-caption-from-script.mjs storage/agent-renders/15/my-video
   node .cursor/skills/biong-short-video-preflight/scripts/verify-caption-sync.mjs storage/agent-renders/15/my-video --strict
   → FAIL: đọc assets/caption-sync-report.json → transcribe-audio lại → sync (tối đa 2 vòng) — KHÔNG render
   node .cursor/skills/biong-short-video-preflight/scripts/map-shot-plan-to-beat-map.mjs storage/agent-renders/15/my-video
   node .cursor/skills/biong-short-video-preflight/scripts/sync-index-beats-from-map.mjs storage/agent-renders/15/my-video
   # Agent viết compositions/beat_N.html thủ công — CẤM gen-beats-from-shot-plan.mjs
   node .cursor/skills/biong-short-video-preflight/scripts/gen-captions-html.mjs storage/agent-renders/15/my-video
4. Wire host clip compositions/captions.html — z-index:9000, data-duration=totalVideoSec

## Upload MP4 (sau render final)
1. Đọc assets/visual-audit-report.json (bắt buộc sau vision pass)
2. short_video_upload_agent_video({
     short_video_id: 15,
     file_path: "<abs/output.mp4>",
     metadata: {
       visual_audit_report: <nội dung visual-audit-report.json>,
       evolution_memory_updated: true
     }
   })
3. Nếu lỗi multipart/upload → CLI fallback:
   node mcp/short-video-agent/scripts/upload-agent-video.mjs --short-video-id 15 --file "<abs/output.mp4>"
3. Cấm bỏ qua upload khi render xong

## Typography & motion (bắt buộc)
Đọc @typography-be-vietnam-pro.md + @kinetic-typography-brief.md + @viral-retention-structure.md
- cp BeVietnamPro-*.ttf → assets/fonts/; @font-face mọi HTML — cấm Google Fonts CDN
- Beat map theo assets/beat-map.json (map-shot-plan-to-beat-map.mjs); **cấm beat overlap** — sync-index-beats-from-map.mjs; check-beat-timing FAIL nếu chồng
- Invoke /hyperframes-creative + /hyperframes-core TRƯỚC beat HTML
- **CẤM scaffold:** text "Beat 1/2/3…", text-only kinetic, gen-beats-from-shot-plan.mjs — FAIL check-visual-density
- Viết thủ công compositions/beat_N.html theo visual_shot_plan + visual-layout-archetypes.md
- Hero: 3–5 từ/cụm + GSAP stagger; list → UI Card + icon
- Hook: search_meme_sound + caption-kinetic-slam

## Watermark Spacedev (bắt buộc — suốt video)
Đọc @spacedev-brand-watermark.md
- cp .cursor/skills/biong-short-video-hyperframes/assets/spacedev-logo.png → storage/agent-renders/15/my-video/assets/images/
- **Sinh watermark bằng script** (cấm hand-author sai #root):
  node .cursor/skills/biong-short-video-preflight/scripts/gen-brand-watermark.mjs storage/agent-renders/15/my-video --duration {totalVideoSec}
- Cấu trúc: #root full canvas 1080×1920 + child `.brand-wrap { left:28px; top:28px }` — **CẤM** left/top trên `#root`
- Host clip z-index:9500, data-start=0, data-duration=totalVideoSec — CẤM gắn vào beat cuối

## Preflight bắt buộc TRƯỚC render final
Invoke /biong-short-video-preflight — đọc @blank-frame-audit.md
node .cursor/skills/biong-short-video-preflight/scripts/gen-brand-watermark.mjs storage/agent-renders/15/my-video --duration {totalVideoSec}
# CẤM gen-beats-from-shot-plan.mjs — agent viết beat HTML thủ công
node .cursor/skills/biong-short-video-preflight/scripts/patch-stock-full-bleed.mjs storage/agent-renders/15/my-video
node .cursor/skills/biong-short-video-preflight/scripts/check-continuous-motion.mjs storage/agent-renders/15/my-video
node .cursor/skills/biong-short-video-preflight/scripts/check-stock-full-bleed.mjs storage/agent-renders/15/my-video
node .cursor/skills/biong-short-video-preflight/scripts/check-visual-density.mjs storage/agent-renders/15/my-video
node .cursor/skills/biong-short-video-preflight/scripts/check-typography-spacing.mjs storage/agent-renders/15/my-video
node .cursor/skills/biong-short-video-preflight/scripts/check-beat-timing.mjs storage/agent-renders/15/my-video
node .cursor/skills/biong-short-video-preflight/scripts/check-media-stack.mjs storage/agent-renders/15/my-video --strict
node .cursor/skills/biong-short-video-preflight/scripts/check-overlay-stack.mjs storage/agent-renders/15/my-video
→ exit 0 + npx hyperframes lint 0 errors → invoke /biong-short-video-evolution (vision loop)
→ vision pass + evolution-memory.md updated → mới được render --quality high --strict

## Auto-Evolution — vision loop (bắt buộc, tự động, không hỏi user)
Đọc @evolution-memory.md TRƯỚC khi viết compositions/beat_N.html — reuse premium blocks, tuân constraints.
Invoke /biong-short-video-evolution sau preflight pass, TRƯỚC render --quality high.

1. node .cursor/skills/biong-short-video-preflight/scripts/capture-visual-audit.mjs storage/agent-renders/15/my-video
2. Đọc snapshots/ + contact-sheet.jpg — layout 0 fail + aesthetic ≥7/10
3. FAIL → sửa beat HTML/CSS/GSAP → chạy lại /biong-short-video-preflight → capture lại (max 2 vòng)
4. PASS → append evolution-memory.md + ghi assets/visual-audit-report.json
5. Cấm sửa SKILL.md trong session render
6. Chỉ sau vision pass: npx hyperframes render --quality high --strict

Upload kèm metadata:
short_video_upload_agent_video({
  short_video_id: 15,
  file_path: "<abs/output.mp4>",
  metadata: {
    visual_audit_report: <đọc từ assets/visual-audit-report.json>,
    evolution_memory_updated: true
  }
})

## Art Director — HyperFrames playground adapt (bắt buộc Phase 2)
Đọc @art-direction-base.md + @art-director-profile-map.md TRƯỚC khi viết beat HTML.
Primary profile: **cinematic_title** (source: hf_theme:vignelli, hf_theme=vignelli)

## Beat profiles
- Khi sinh visual_shot_plan: ghi `art_director_profile` mỗi beat theo @art-director-profile-map.md (map layout_archetype → profile)

- Mọi video inherit **social_reel** safe-area 9:16 từ art-direction-base
- Ghi `primary_art_director_profile` + `art_director_profile` per beat vào visual_shot_plan / visual-shot-plan.json
- **Cấm** copy playground output contract (hf-seek, pure t(), system-font-only) — xem Agent overrides trong art-direction-base.md

## MCP tools — gọi đúng tên theo thứ tự
1. short_video_get_context({ short_video_id: 15 })
   — gate: audio_file phải có URL, nếu không DỪNG
2. CẤM: short_video_generate_narration_tts
3. Lưu assets/agent-metadata.json (language + markers + timeline) từ get_context
   node .cursor/skills/biong-short-video-preflight/scripts/transcribe-audio.mjs storage/agent-renders/15/my-video
   → sync-caption → verify --strict → map-shot-plan-to-beat-map → sync-index-beats → gen-captions-html
MCP media — gọi đúng tool theo visual_shot_plan (cấm bịa assets/):
- short_video_search_meme_sound({ query: "<từ [SFX: ...] hoặc vine boom>" }) — 1 lần/video hook giây 0
- short_video_search_bgm({ query: "<mood từ [BGM: ...]>", min_duration_sec: totalVideoSec }) — 1 lần/video
- short_video_search_stock_media — CHỈ cho bg_media trong shot-plan (opacity 0.3–0.6, không full-bleed hero)
- short_video_search_giphy({ query: "...", media_type: "sticker" }) — accent_media giphy_sticker/gif
- Lottie: cp từ .cursor/skills/biong-short-video-hyperframes/assets/lotties/ theo lottie_id trong manifest
- npx hyperframes add <registry_block> theo visual_shot_plan — customize in-place
- Tải download_url → assets/audio/, assets/images/, assets/lotties/
- media-plan.md: sfx_hook + bgm_global + mỗi beat (hero_type, registry_block, z_role, accent)
- SFX track 12: data-start=0, data-duration=2, data-volume=0.45
- BGM index.html track 11: data-start=0, data-duration=totalVideoSec, data-volume=0.3
- Narration track 10: data-volume=1.0
- compositions/ambient-layer.html — window.__timelines["ambient"], z-index 6–10
4. Render final → upload (xem block Upload MP4 trong quality blocks)

## Motion Director — thẩm mỹ cao cấp (bắt buộc)
Đọc @art-direction-base.md + @art-director-profile-map.md + @hyperframes-theme-init.md + @canvas-contract-3-layer.md + @layout-9x16-zones.md
1. **3 lớp** mỗi beat: dark gradient/grain nền → UI card glass → dynamic typography Be Vietnam Pro
2. Áp dụng **art_director_profile** per beat — primary từ hf_theme `vignelli`
3. Số liệu → npx hyperframes add stat-motion / apple-money-count — **cấm** plain div số
4. Support card title ≥36px; body ≥28px; gap giữa cards ≥24px; max 3 item/hàng ngang
5. **Layout:** `content-cluster` căn giữa dọc — chọn `layout_variant` (stack_center, vs_row, bento_2x2…); **cấm** screen split trái/phải trên 9:16
6. visual_enrichment[] từ creative_brief/core_signals — facts ngắn ngoài VO (không bịa số)
7. Beat ≥6s: ≥2 internal_acts hoặc ≥2 GSAP addLabel; meme/logo rotation:3 ease back.out(1.7)
8. Sau init theme `vignelli`: đọc CSS token project — không viết layout phẳng từ đầu

## HyperFrames CLI
- npx hyperframes init storage/agent-renders/15/my-video --non-interactive --skip-skills --example=vignelli --resolution portrait
- **Cấm** --example=blank production
- Copy Be Vietnam Pro → assets/fonts/; strip Google Fonts CDN
- Đọc visual_shot_plan → ghi hf_theme nếu CMS=auto → npx hyperframes add registry blocks theo shot-plan + grain-overlay
- /continuous-motion — ambient-layer.html + window.__timelines["ambient"]
- npx hyperframes add caption-pill-karaoke (+ caption-kinetic-slam cho hook)
- /hyperframes-animation + /gsap-timeline — stagger 0.1, scale 0.8→1, no linear ease
- node .cursor/skills/biong-short-video-preflight/scripts/check-typography-spacing.mjs storage/agent-renders/15/my-video
- npx hyperframes render --output output.mp4 --quality high --fps 30
- animation-map.mjs + hyperframes lint

## CẤM
bịa assets; --example=blank; beat hero full-bleed Pexels khi shot-plan registry; thiếu ambient layer; content z≤50 only; thiếu BGM track 11; thiếu SFX track 12 khi script có [SFX]; tl.play(); render draft; faceless TTS; caption đè diagram
Video không caption karaoke; dùng text Whisper làm subtitle; karaoke inline trong beat HTML; bỏ qua verify-caption-sync.mjs
Đoạn văn dài / font <28px; 4 chip ngang chật; bullet list thuần thay UI Card; thiếu watermark Spacedev
Tin data-track-index = layer trên; caption/watermark thiếu z-index 9000/9500; watermark chỉ beat cuối
Đặt left/top watermark trên #root thay vì .brand-wrap — logo lệch vị trí
Render final khi check-continuous-motion.mjs, check-visual-density.mjs, check-typography-spacing.mjs, check-media-stack.mjs hoặc check-overlay-stack.mjs fail hoặc lint còn lỗi
Render final TRƯỚC /biong-short-video-evolution vision pass; upload thiếu metadata.visual_audit_report
Theme resolved: vignelli (source: default)
Art director: primary=cinematic_title (hf_theme=vignelli)
