#!/usr/bin/env bash
set -euo pipefail

ACTION="${1:-status}"
CMS_PORT="${CMS_PORT:-3030}"
TUNNEL_NAME="${TUNNEL_NAME:-cms-local}"
CMS_PM2_NAME="${CMS_PM2_NAME:-cms-frontend}"
PM2_CMD="${PM2_CMD:-}"

ensure_pm2() {
  if [ -n "${PM2_CMD}" ]; then
    return
  fi

  if command -v pm2 >/dev/null 2>&1; then
    PM2_CMD="pm2"
    return
  fi

  if command -v npx >/dev/null 2>&1; then
    PM2_CMD="npx pm2"
    return
  fi

  echo "Thiếu pm2. Cài bằng: npm i -g pm2"
  exit 1
}

start_cms() {
  ensure_pm2
  ${PM2_CMD} describe "${CMS_PM2_NAME}" >/dev/null 2>&1 \
    && ${PM2_CMD} restart "${CMS_PM2_NAME}" \
    || ${PM2_CMD} start "npx serve -s build -l ${CMS_PORT}" --name "${CMS_PM2_NAME}"
  ${PM2_CMD} save
}

stop_cms() {
  ensure_pm2
  ${PM2_CMD} stop "${CMS_PM2_NAME}" || true
}

start_tunnel() {
  if command -v brew >/dev/null 2>&1; then
    brew services restart cloudflared || brew services start cloudflared
  else
    echo "Không tìm thấy Homebrew. Chạy manual:"
    echo "  cloudflared tunnel run ${TUNNEL_NAME}"
  fi
}

stop_tunnel() {
  if command -v brew >/dev/null 2>&1; then
    brew services stop cloudflared || true
  fi
}

show_status() {
  echo "== PM2 =="
  ensure_pm2 || true
  if [ -n "${PM2_CMD}" ]; then
    ${PM2_CMD} status
  else    
    echo "pm2 chưa cài"
  fi

  echo ""
  echo "== Cloudflared =="
  if command -v cloudflared >/dev/null 2>&1; then
    cloudflared tunnel list || true
    cloudflared tunnel info "${TUNNEL_NAME}" || true
  else
    echo "cloudflared chưa cài"
  fi
}

case "${ACTION}" in
  start)
    start_cms
    start_tunnel
    show_status
    ;;
  stop)
    stop_cms
    stop_tunnel
    show_status
    ;;
  restart)
    stop_cms
    start_cms
    start_tunnel
    show_status
    ;;
  status)
    show_status
    ;;
  *)
    echo "Dùng: $0 {start|stop|restart|status}"
    exit 1
    ;;
esac
