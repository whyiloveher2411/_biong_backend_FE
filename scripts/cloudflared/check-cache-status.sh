#!/usr/bin/env bash
set -euo pipefail

CMS_URL="${CMS_URL:-https://local-cms.spacedev.vn}"
API_URL="${API_URL:-https://local-api.spacedev.vn}"
BUNDLE_PATH="${BUNDLE_PATH:-/static/js/bundle.js}"

print_headers() {
  local label="$1"
  local url="$2"
  echo "==== ${label} ===="
  echo "URL: ${url}"
  curl -sSI "${url}" | awk 'BEGIN{IGNORECASE=1} /^HTTP\// || /^cf-cache-status:/ || /^cache-control:/ || /^age:/ || /^etag:/'
  echo ""
}

extract_cf_cache_status() {
  local url="$1"
  curl -sSI "${url}" | tr -d '\r' | awk 'BEGIN{IGNORECASE=1} /^cf-cache-status:/ {print $2; exit}'
}

print_headers "CMS root" "${CMS_URL}/"
print_headers "CMS admin" "${CMS_URL}/admin"
print_headers "CMS bundle.js" "${CMS_URL}${BUNDLE_PATH}"
print_headers "API root" "${API_URL}/"

CMS_BUNDLE_STATUS="$(extract_cf_cache_status "${CMS_URL}${BUNDLE_PATH}")"
CMS_ROOT_STATUS="$(extract_cf_cache_status "${CMS_URL}/")"

echo "==== Kết luận ===="
if [ "${CMS_BUNDLE_STATUS}" = "HIT" ]; then
  echo "CẢNH BÁO: bundle.js vẫn đang HIT (${CMS_BUNDLE_STATUS})."
  echo "Cần purge cache Cloudflare:"
  echo "  bash scripts/cloudflared/setup-cache-bypass.sh"
  exit 1
fi

if [ "${CMS_ROOT_STATUS}" = "HIT" ]; then
  echo "CẢNH BÁO: CMS root vẫn đang HIT (${CMS_ROOT_STATUS})."
  echo "Cần purge cache Cloudflare:"
  echo "  bash scripts/cloudflared/setup-cache-bypass.sh"
  exit 1
fi

echo "OK: CMS root=${CMS_ROOT_STATUS:-N/A}, bundle=${CMS_BUNDLE_STATUS:-N/A}."
echo "Kỳ vọng: DYNAMIC hoặc BYPASS."
