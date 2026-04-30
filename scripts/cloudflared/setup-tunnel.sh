#!/usr/bin/env bash
set -euo pipefail

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "Thiếu cloudflared. Cài bằng:"
  echo "  brew install cloudflared"
  exit 1
fi

read -rp "Nhập root domain (ví dụ example.com): " ROOT_DOMAIN
read -rp "Nhập tunnel name [cms-local]: " TUNNEL_NAME
TUNNEL_NAME="${TUNNEL_NAME:-cms-local}"
read -rp "Nhập subdomain CMS [local-cms]: " CMS_SUBDOMAIN
CMS_SUBDOMAIN="${CMS_SUBDOMAIN:-local-cms}"
read -rp "Nhập subdomain API [local-api]: " API_SUBDOMAIN
API_SUBDOMAIN="${API_SUBDOMAIN:-local-api}"
read -rp "Nhập CMS local port [3030]: " CMS_PORT
CMS_PORT="${CMS_PORT:-3030}"
read -rp "Nhập API local port [9999]: " API_PORT
API_PORT="${API_PORT:-9999}"

CMS_HOST="${CMS_SUBDOMAIN}.${ROOT_DOMAIN}"
API_HOST="${API_SUBDOMAIN}.${ROOT_DOMAIN}"

echo ""
echo "B1) Login Cloudflare (mở browser xác thực)..."
cloudflared tunnel login

echo ""
echo "B2) Tạo tunnel: ${TUNNEL_NAME}"
if cloudflared tunnel create "${TUNNEL_NAME}"; then
  echo "Tạo tunnel mới thành công."
else
  echo "Có thể tunnel đã tồn tại, tiếp tục bước lấy TUNNEL_ID..."
fi

TUNNEL_ID="$(cloudflared tunnel list | awk -v name="${TUNNEL_NAME}" '$0 ~ name {print $1; exit}')"

if [ -z "${TUNNEL_ID}" ]; then
  echo "Không tìm thấy TUNNEL_ID của ${TUNNEL_NAME}. Hãy kiểm tra:"
  echo "  cloudflared tunnel list"
  exit 1
fi

mkdir -p "${HOME}/.cloudflared"
CONFIG_PATH="${HOME}/.cloudflared/config.yml"
CREDENTIALS_PATH="${HOME}/.cloudflared/${TUNNEL_ID}.json"

cat > "${CONFIG_PATH}" <<EOF
tunnel: ${TUNNEL_ID}
credentials-file: ${CREDENTIALS_PATH}

ingress:
  - hostname: ${CMS_HOST}
    service: http://127.0.0.1:${CMS_PORT}
  - hostname: ${API_HOST}
    service: http://127.0.0.1:${API_PORT}
  - service: http_status:404
EOF

echo ""
echo "B3) Tạo DNS route cho tunnel"
cloudflared tunnel route dns "${TUNNEL_NAME}" "${CMS_HOST}"
cloudflared tunnel route dns "${TUNNEL_NAME}" "${API_HOST}"

echo ""
echo "B4) Cài service cloudflared"
cloudflared service install
if command -v brew >/dev/null 2>&1; then
  brew services restart cloudflared || brew services start cloudflared
fi

echo ""
echo "Hoàn tất."
echo "- TUNNEL_NAME: ${TUNNEL_NAME}"
echo "- TUNNEL_ID:   ${TUNNEL_ID}"
echo "- CMS host:    https://${CMS_HOST}"
echo "- API host:    https://${API_HOST}"
echo "- Config file: ${CONFIG_PATH}"
echo ""
echo "Lệnh kiểm tra:"
echo "  cloudflared tunnel info ${TUNNEL_NAME}"
echo "  curl -I https://${CMS_HOST}"
echo "  curl -I https://${API_HOST}"
