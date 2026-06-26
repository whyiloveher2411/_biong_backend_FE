# Biong Short Video Agent MCP

MCP server cho Cursor agent — workflow video + **media search** (Pexels stock + Pixabay BGM).

**Phiên bản:** 1.9.0

## Chế độ workflow

| `agent_tts_auto` | Workflow | Copy prompt CMS |
|------------------|----------|-----------------|
| `false` (mặc định) | Script → admin MP3 → render | Bước 1 + bước 2 |
| `true` | Script → TTS MCP → render → upload | Một prompt toàn pipeline |

## Media search

Agent tìm media — **chỉ trả URL**, tự tải về `storage/agent-renders/{id}/assets/`.

| Tool | Provider | Mô tả |
|------|----------|--------|
| `short_video_search_stock_media` | Pexels | `media_type`: image \| video — ≥1 mỗi beat |
| `short_video_search_bgm` | Pixabay | Nhạc nền nhẹ — 1 track/video, `min_duration_sec` sau transcribe |

**Backend `.env`:** `PEXELS_API_KEY`, `PIXABAY_API_KEY` (Audio API)

Pixabay BGM: ưu tiên Audio API (`/api/audio/`). Nếu key chưa có quyền audio (403) → fallback scrape/catalog.

Giphy/Myinstants vẫn có backend PHP nhưng **không còn MCP tools**.

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
| `short_video_generate_narration_tts` | TTS auto — VieNeu→Saydi→Vbee |
| `short_video_search_stock_media` | Stock Pexels |
| `short_video_search_bgm` | Nhạc nền Pixabay |
| `short_video_upload_agent_video` | Upload MP4 → S3 |

## Cài đặt MCP

```bash
cd mcp/short-video-agent && npm install && npm run build
```

Cấu hình Cursor MCP: `BIONG_API_BASE_URL`, `BIONG_MCP_TOKEN`.

API keys media cấu hình trên **backend** `_biong_backend/.env`, không phải MCP `.env`.

Sau khi build: restart MCP server `biong-short-video-agent` trong Cursor Settings.
