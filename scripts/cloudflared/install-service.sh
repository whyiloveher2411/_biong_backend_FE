#!/usr/bin/env bash
set -euo pipefail

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared chưa được cài. Cài bằng Homebrew:"
  echo "  brew install cloudflared"
  exit 1
fi

if [ ! -f "/Users/${USER}/.cloudflared/config.yml" ]; then
  echo "Thiếu file ~/.cloudflared/config.yml"
  echo "Hãy copy scripts/cloudflared/config.example.yml -> ~/.cloudflared/config.yml và chỉnh lại."
  exit 1
fi

echo "Cài service cloudflared cho user hiện tại..."
cloudflared service install

echo "Tắt brew service cloudflared (nếu có) để tránh xung đột launch agent..."
if command -v brew >/dev/null 2>&1; then
  brew services stop cloudflared 2>/dev/null || true
fi

echo "Khởi động service com.cloudflare.cloudflared..."
launchctl kickstart -k "gui/$(id -u)/com.cloudflare.cloudflared" 2>/dev/null \
  || launchctl bootstrap "gui/$(id -u)" "${HOME}/Library/LaunchAgents/com.cloudflare.cloudflared.plist"

echo ""
echo "Nếu dùng WARP, chạy thêm:"
echo "  bash scripts/cloudflared/setup-warp-split-tunnel.sh"

echo ""
echo "Xong. Kiểm tra trạng thái:"
echo "  cloudflared tunnel list"
echo "  cloudflared tunnel info cms-local"
