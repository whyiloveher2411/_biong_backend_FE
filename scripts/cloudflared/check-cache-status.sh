#!/usr/bin/env bash
set -euo pipefail

CMS_URL="${CMS_URL:-https://local-cms.spacedev.vn}"
API_URL="${API_URL:-https://local-api.spacedev.vn}"

print_headers() {
  local url="$1"
  echo "==== ${url} ===="
  curl -sSI "${url}" | awk 'BEGIN{IGNORECASE=1} /^HTTP\// || /^cf-cache-status:/ || /^cache-control:/ || /^age:/'
  echo ""
}

print_headers "${CMS_URL}"
print_headers "${API_URL}"
