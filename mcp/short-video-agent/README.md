# Biong Short Video Agent MCP

MCP server cho Cursor agent — workflow video + **media search** (Pexels stock + Pixabay BGM).

**Phiên bản:** 2.3.1

## Luồng workflow (3 bước)

| Bước | Ai | Kết quả |
|------|-----|---------|
| 1 | Agent Phase 1 | `save_audio_script` → **DỪNG** |
| Giữa | Admin CMS | **Duyệt script** → enqueue `agent_narration_tts` |
| Giữa | Queue worker | `audio_file` (OmniVoice chain) |
| 2 | Agent Phase 2 | `visual_shot_plan` → render → upload — **CẤM TTS MCP** |

Copy prompt CMS: **bước 1** (script) → chờ audio → **bước 2** (render-only).

Toggle `agent_tts_auto` + nền tảng TTS trên drawer chỉ cấu hình chain CMS queue.

**Phase 1 (4 bước):** extract → creative → viral (one-pass) → audit → save → **DỪNG**

**Phase 2:** gate `audio_file` bắt buộc → transcribe → `visual_shot_plan` (N beats content-driven) → `map-shot-plan-to-beat-map.mjs` → hand-craft beat HTML → render

**Cấm Phase 2:** `gen-beats-from-shot-plan.mjs` (đã gỡ), map 1:1 HASCAS → visual beat

**TTS chain (CMS queue):** OmniVoice local → VieNeu → Saydi → Vbee.

**Prereq OmniVoice** (`_biong_backend`):

```bash
./omnivoice-tts.sh install   # một lần
./omnivoice-tts.sh prepare-clone
./omnivoice-tts.sh start
```

Env backend: `OMNIVOICE_TTS_LOCAL_BASE_URL`, `OMNIVOICE_USE_AUDIO_DEMO_CLONE=1`, `OMNIVOICE_NUM_STEP=64`, `OMNIVOICE_SHORT_VIDEO_SPEED=1.15`. Response `tts_provider_used`: `omnivoice_local` | `vieneu_clone` | …

## Media search

Agent tìm media — **chỉ trả URL**, tự tải về `storage/agent-renders/{id}/assets/`.

| Tool | Provider | Mô tả |
|------|----------|--------|
| `short_video_search_stock_media` | Pexels | `bg_media` only — không full-bleed hero |
| `short_video_search_meme_sound` | Myinstants | SFX hook — giây 0 |
| `short_video_search_bgm` | Pixabay | Nhạc nền — BGM chain (limit=8) + wire-bgm-chain.mjs |
| `short_video_search_giphy` | Giphy | Sticker/gif accent — theo visual_shot_plan |

**Backend `.env`:** `PEXELS_API_KEY`, `PIXABAY_API_KEY`, `GIPHY_API_KEY`

## Cài HyperFrames skills (một lần)

```bash
cd _biong_backend_FE
npx skills add heygen-com/hyperframes --all
npx skills add https://github.com/greensock/gsap-skills
```

## Tools workflow

| Tool | Mô tả |
|------|--------|
| `short_video_get_context` | Creative brief + production_playbook (media_assets) |
| `short_video_save_audio_script` | Script viral — chờ admin duyệt CMS |
| `short_video_update_agent_status` | Lưu `visual_shot_plan` (Phase 2) |
| `short_video_generate_narration_tts` | CMS queue TTS nội bộ — **CẤM agent Phase 2**; reject nếu `audio_file` đã có |
| `short_video_search_stock_media` | Stock Pexels |
| `short_video_search_meme_sound` | Meme SFX Myinstants (hook) |
| `short_video_search_bgm` | Nhạc nền Pixabay — BGM chain (nhiều segment + crossfade) |
| `short_video_search_giphy` | GIF/sticker Giphy accent |
| `short_video_upload_agent_video` | Upload MP4 → S3 |

## Upload MP4

| Kích thước | Cơ chế |
|------------|--------|
| ≤ 20MB | Native `fetch` + `FormData` + `Blob` |
| > 20MB | `curl -F` subprocess (streaming — khớp PHP local) |

## Upload fallback (khi MCP tool lỗi)

Nếu `short_video_upload_agent_video` fail, chạy CLI (cùng env `BIONG_API_BASE_URL`, `BIONG_MCP_TOKEN`):

```bash
cd _biong_backend_FE
node mcp/short-video-agent/scripts/upload-agent-video.mjs \
  --short-video-id {id} \
  --file /abs/path/output.mp4
```

Cần `npm run build` trong `mcp/short-video-agent` trước lần đầu dùng CLI.

## Cài đặt MCP

```bash
cd mcp/short-video-agent && npm install && npm run build
```

Cấu hình Cursor/Codex MCP: `BIONG_API_BASE_URL`, `BIONG_MCP_TOKEN`.

Gợi ý giá trị:

- `http://192.168.0.106:9999` nếu backend chạy trên LAN IP này
- `http://192.168.0.106:9999/api` nếu bạn muốn set sẵn prefix `/api` ở base URL
- URL tunnel/public nếu Codex không nhìn thấy backend local của Cursor

Nếu Codex gọi tool được nhưng `fetch failed`, nguyên nhân thường là backend không reachable từ môi trường Codex, không phải do MCP token.

API keys media cấu hình trên **backend** `_biong_backend/.env`, không phải MCP `.env`.

Sau khi build: restart MCP server `biong-short-video-agent` trong Cursor Settings.
