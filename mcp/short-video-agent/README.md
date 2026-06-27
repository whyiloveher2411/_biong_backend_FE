# Biong Short Video Agent MCP

MCP server cho Cursor agent — workflow video + **media search** (Pexels stock + Pixabay BGM).

**Phiên bản:** 2.2.0

## Chế độ workflow

| `agent_tts_auto` | Workflow | Copy prompt CMS |
|------------------|----------|-----------------|
| `false` (mặc định) | Script → admin MP3 → render | Bước 1 + bước 2 |
| `true` | Script → TTS MCP → render → upload | Một prompt toàn pipeline |

**TTS chain (auto):** OmniVoice Kaggle (GPU) → OmniVoice local (CPU) → VieNeu → Saydi → Vbee. Clone `audio_demo`, `num_step=64`, speed `1.15`.

**Prereq OmniVoice** (`_biong_backend`):

```bash
# Tuỳ chọn — GPU nhanh (sau Run Cell 1 Kaggle):
cd kaggle/omnivoice-tts && ./save-endpoint.sh HOST PORT && ./resume-kaggle.sh

# Fallback — local CPU:
./omnivoice-tts.sh install   # một lần
./omnivoice-tts.sh prepare-clone
./omnivoice-tts.sh start
```

Env backend: `OMNIVOICE_TTS_KAGGLE_BASE_URL`, `OMNIVOICE_TTS_LOCAL_BASE_URL`, `OMNIVOICE_USE_AUDIO_DEMO_CLONE=1`, `OMNIVOICE_NUM_STEP=64`, `OMNIVOICE_SHORT_VIDEO_SPEED=1.15`. Response `tts_provider_used`: `omnivoice_kaggle` | `omnivoice_local` | …

## Media search

Agent tìm media — **chỉ trả URL**, tự tải về `storage/agent-renders/{id}/assets/`.

| Tool | Provider | Mô tả |
|------|----------|--------|
| `short_video_search_stock_media` | Pexels | `media_type`: image \| video — ≥1 mỗi beat |
| `short_video_search_meme_sound` | Myinstants | SFX hook — vine boom, sấm sét — giây 0 |
| `short_video_search_bgm` | Pixabay | Nhạc nền nhẹ — 1 track/video, `min_duration_sec` sau transcribe |

**Backend `.env`:** `PEXELS_API_KEY`, `PIXABAY_API_KEY` (Audio API)

Pixabay BGM: ưu tiên Audio API (`/api/audio/`). Nếu key chưa có quyền audio (403) → fallback scrape/catalog.

Giphy vẫn có backend PHP nhưng **không còn MCP**. Myinstants meme sound **đã khôi phục** MCP.

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
| `short_video_save_audio_script` | Script viral + metadata markers |
| `short_video_generate_narration_tts` | TTS auto — OmniVoice Kaggle→local→VieNeu→Saydi→Vbee |
| `short_video_search_stock_media` | Stock Pexels |
| `short_video_search_meme_sound` | Meme SFX Myinstants (hook) |
| `short_video_search_bgm` | Nhạc nền Pixabay |
| `short_video_upload_agent_video` | Upload MP4 → S3 (native FormData ≤20MB; curl -F >20MB) |

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

Cấu hình Cursor MCP: `BIONG_API_BASE_URL`, `BIONG_MCP_TOKEN`.

API keys media cấu hình trên **backend** `_biong_backend/.env`, không phải MCP `.env`.

Sau khi build: restart MCP server `biong-short-video-agent` trong Cursor Settings.
