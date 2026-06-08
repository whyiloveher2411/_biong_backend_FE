#!/usr/bin/env bash
set -euo pipefail

# Cloudflared kết nối tới edge IP 198.41.x.x qua QUIC/HTTP2.
# Khi WARP bật, traffic tới các IP này có thể bị route qua WARP và gây timeout -> lỗi 530.
# Script thêm các dải edge vào WARP split-tunnel exclude.

if ! command -v warp-cli >/dev/null 2>&1; then
  echo "Thiếu warp-cli. Cài Cloudflare WARP client trước."
  exit 1
fi

EDGE_RANGES=(
  "198.41.192.0/24"
  "198.41.200.0/24"
)

echo "B1) Thêm Cloudflare tunnel edge vào WARP exclude..."
for range in "${EDGE_RANGES[@]}"; do
  if warp-cli tunnel ip list 2>/dev/null | grep -Fq "${range}"; then
    echo "  Đã có: ${range}"
  else
    warp-cli tunnel ip add-range "${range}"
    echo "  Đã thêm: ${range}"
  fi
done

echo ""
echo "B2) Khởi động lại cloudflared..."
if launchctl print "gui/$(id -u)/com.cloudflare.cloudflared" >/dev/null 2>&1; then
  launchctl kickstart -k "gui/$(id -u)/com.cloudflare.cloudflared" || true
elif command -v brew >/dev/null 2>&1; then
  brew services stop cloudflared 2>/dev/null || true
  cloudflared service install 2>/dev/null || true
  launchctl kickstart -k "gui/$(id -u)/com.cloudflare.cloudflared" || true
else
  echo "Chạy thủ công: cloudflared --config ~/.cloudflared/config.yml tunnel run"
fi

sleep 4

echo ""
echo "B3) Kiểm tra tunnel..."
if command -v cloudflared >/dev/null 2>&1; then
  cloudflared tunnel info cms-local || true
fi

echo ""
echo "Hoàn tất. Kiểm tra:"
echo "  curl -I https://local-cms.spacedev.vn"
echo "  curl -I https://local-api.spacedev.vn"
