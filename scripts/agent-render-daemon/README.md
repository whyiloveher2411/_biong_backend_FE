# Agent Render Daemon (local)

Daemon local nhận request từ Chrome extension → fetch prompt bước 1 hoặc 2 → ghi file → mở Cursor workspace.

## Yêu cầu

- Node.js 18+
- Cursor IDE cài trên Mac
- Backend API chạy (`http://127.0.0.1:9999`)
- `BIONG_RENDER_DAEMON_TOKEN` trùng secret trên backend PHP

## Cài đặt

```bash
cd scripts/agent-render-daemon
cp .env.example .env.local
# Sửa BIONG_RENDER_DAEMON_TOKEN — PHẢI trùng giá trị trong backend .env
# Định dạng bắt buộc: BIONG_RENDER_DAEMON_TOKEN=your-secret (không chỉ paste value một mình)
```

## Chạy

```bash
npm run daemon
```

`npm run daemon` tự **kill** process đang listen port daemon (mặc định `9477`) rồi start lại — tránh `EADDRINUSE` khi restart. Chỉ chạy server thuần (không kill): `npm run daemon:raw`.

Health check:

```bash
curl http://127.0.0.1:9477/health
```

## Luồng

### Bước 1 — audio script
1. CMS bấm **Chạy agent bước 1**
2. Backend `prepare-agent-render` với `phase: 1` → validate + `launch_token`
3. Extension POST daemon với `phase: 1`
4. Daemon ghi `storage/agent-renders/{id}/assets/agent-script-prompt.md`
5. Daemon focus Cursor + deeplink bootstrap ngắn (viral audio script)

### Bước 2 — render video
1. CMS bấm **Chạy render agent** (status CMS **không** đổi ngay — user có thể cancel trong Cursor)
2. Backend `prepare-agent-render` với `phase: 2` → chỉ validate + `launch_token` (không set `processing`)
3. Extension POST `http://127.0.0.1:9477/v1/render` với `Authorization: Bearer {launch_token}`
4. Daemon ghi `storage/agent-renders/{id}/assets/agent-render-prompt.md`
5. Daemon focus Cursor + deeplink bootstrap ngắn
6. Khi agent thật sự chạy → MCP `short_video_update_agent_status(processing)` → CMS poll `processing`

## Focus Cursor đang mở (không mở IDE mới)

Daemon dùng `cursor -r` (reuse window) thay vì `open -a Cursor <path>` — tránh spawn cửa sổ Cursor thứ hai khi IDE đã chạy.

## Lưu ý deeplink

`cursor://anysphere.cursor-deeplink/prompt` mở Composer/chat. Nếu cần Agent mode, chuyển sang Agent panel trong Cursor sau khi prompt xuất hiện.

## Upgrade v2

Khi có `CURSOR_API_KEY`, có thể thay `open-cursor.mjs` bằng `@cursor/sdk` `Agent.prompt()` để chạy headless hơn.
