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

echo "Khởi động service..."
if command -v brew >/dev/null 2>&1; then
  brew services restart cloudflared || brew services start cloudflared
fi

echo "Xong. Kiểm tra trạng thái:"
echo "  cloudflared tunnel list"
echo "  cloudflared tunnel info YOUR_TUNNEL_NAME"
