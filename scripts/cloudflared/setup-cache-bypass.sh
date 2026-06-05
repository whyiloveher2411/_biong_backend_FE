#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env.cloudflare"

CMS_HOST="${CMS_HOST:-local-cms.spacedev.vn}"
API_HOST="${API_HOST:-local-api.spacedev.vn}"
ZONE_NAME="${CLOUDFLARE_ZONE_NAME:-spacedev.vn}"
RULE_NAME="${CACHE_RULE_NAME:-Bypass local tunnel dev hosts}"

if [ -f "${ENV_FILE}" ]; then
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
fi

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  cat <<EOF
Thiếu CLOUDFLARE_API_TOKEN.

Tạo file ${ENV_FILE} với nội dung:

CLOUDFLARE_API_TOKEN=your_token_here
CLOUDFLARE_ZONE_NAME=spacedev.vn

Token cần quyền:
- Zone > Cache Purge > Purge
- Zone > Cache Rules > Edit

Sau đó chạy lại:
  bash scripts/cloudflared/setup-cache-bypass.sh
EOF
  exit 1
fi

CF_API="https://api.cloudflare.com/client/v4"
AUTH_HEADER="Authorization: Bearer ${CLOUDFLARE_API_TOKEN}"

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

request() {
  local method="$1"
  local url="$2"
  local data_file="${3:-}"

  if [ -n "${data_file}" ] && [ -f "${data_file}" ]; then
    curl -sS -X "${method}" "${url}" \
      -H "${AUTH_HEADER}" \
      -H "Content-Type: application/json" \
      --data @"${data_file}"
  else
    curl -sS -X "${method}" "${url}" \
      -H "${AUTH_HEADER}" \
      -H "Content-Type: application/json"
  fi
}

assert_success() {
  local response_file="$1"
  local action="$2"

  if ! python3 -c 'import json,sys; data=json.load(open(sys.argv[1])); sys.exit(0 if data.get("success") else 1)' "${response_file}" 2>/dev/null; then
    echo "Lỗi khi ${action}:"
    cat "${response_file}"
    exit 1
  fi
}

echo "B1) Lấy Zone ID cho ${ZONE_NAME}..."
ZONE_RESPONSE_FILE="${TMP_DIR}/zone.json"
request GET "${CF_API}/zones?name=${ZONE_NAME}" > "${ZONE_RESPONSE_FILE}"
assert_success "${ZONE_RESPONSE_FILE}" "lấy zone id"

ZONE_ID="$(python3 -c 'import json,sys; data=json.load(open(sys.argv[1])); print(data["result"][0]["id"])' "${ZONE_RESPONSE_FILE}")"
echo "Zone ID: ${ZONE_ID}"

EXPRESSION="(http.host eq \"${CMS_HOST}\" or http.host eq \"${API_HOST}\")"

echo "B2) Tạo/cập nhật Cache Rule bypass..."
ENTRYPOINT_URL="${CF_API}/zones/${ZONE_ID}/rulesets/phases/http_request_cache_settings/entrypoint"
ENTRYPOINT_RESPONSE_FILE="${TMP_DIR}/entrypoint.json"
request GET "${ENTRYPOINT_URL}" > "${ENTRYPOINT_RESPONSE_FILE}"

UPDATE_PAYLOAD_FILE="${TMP_DIR}/update-payload.json"
CF_EXPRESSION="${EXPRESSION}" CF_RULE_NAME="${RULE_NAME}" \
  CF_ENTRYPOINT_FILE="${ENTRYPOINT_RESPONSE_FILE}" CF_OUTPUT_FILE="${UPDATE_PAYLOAD_FILE}" \
  python3 <<'PY'
import json
import os

entrypoint_file = os.environ["CF_ENTRYPOINT_FILE"]
output_file = os.environ["CF_OUTPUT_FILE"]
expression = os.environ["CF_EXPRESSION"]
rule_name = os.environ["CF_RULE_NAME"]

new_rule = {
    "expression": expression,
    "description": rule_name,
    "action": "set_cache_settings",
    "action_parameters": {
        "cache": False,
    },
    "enabled": True,
}

with open(entrypoint_file, encoding="utf-8") as handle:
    entrypoint_data = json.load(handle)

if entrypoint_data.get("success") and entrypoint_data.get("result"):
    ruleset = entrypoint_data["result"]
    ruleset_id = ruleset["id"]
    existing_rules = ruleset.get("rules", [])
    filtered_rules = [
        rule for rule in existing_rules
        if rule.get("description") != rule_name
    ]
    filtered_rules.insert(0, new_rule)
    payload = {"rules": filtered_rules}
    mode = "update"
else:
    ruleset_id = ""
    payload = {"rules": [new_rule]}
    mode = "create"

with open(output_file, "w", encoding="utf-8") as handle:
    json.dump({"mode": mode, "ruleset_id": ruleset_id, "payload": payload}, handle)
PY

RULE_MODE="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["mode"])' "${UPDATE_PAYLOAD_FILE}")"
RULESET_ID="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["ruleset_id"])' "${UPDATE_PAYLOAD_FILE}")"
PAYLOAD_ONLY_FILE="${TMP_DIR}/payload-only.json"
python3 -c 'import json,sys; json.dump(json.load(open(sys.argv[1]))["payload"], open(sys.argv[2], "w"), ensure_ascii=False)' "${UPDATE_PAYLOAD_FILE}" "${PAYLOAD_ONLY_FILE}"

if [ "${RULE_MODE}" = "update" ]; then
  UPDATE_RESPONSE_FILE="${TMP_DIR}/update-response.json"
  request PUT "${CF_API}/zones/${ZONE_ID}/rulesets/${RULESET_ID}" "${PAYLOAD_ONLY_FILE}" > "${UPDATE_RESPONSE_FILE}"
  assert_success "${UPDATE_RESPONSE_FILE}" "cập nhật cache rule"
  echo "Đã cập nhật cache rule trong ruleset ${RULESET_ID}."
else
  CREATE_RESPONSE_FILE="${TMP_DIR}/create-response.json"
  request PUT "${ENTRYPOINT_URL}" "${PAYLOAD_ONLY_FILE}" > "${CREATE_RESPONSE_FILE}"
  assert_success "${CREATE_RESPONSE_FILE}" "tạo cache rule"
  echo "Đã tạo cache rule mới."
fi

echo "B3) Purge toàn bộ cache zone..."
PURGE_PAYLOAD_FILE="${TMP_DIR}/purge.json"
echo '{"purge_everything":true}' > "${PURGE_PAYLOAD_FILE}"
PURGE_RESPONSE_FILE="${TMP_DIR}/purge-response.json"
request POST "${CF_API}/zones/${ZONE_ID}/purge_cache" "${PURGE_PAYLOAD_FILE}" > "${PURGE_RESPONSE_FILE}"
assert_success "${PURGE_RESPONSE_FILE}" "purge cache"
echo "Purge cache thành công."

echo ""
echo "B4) Kiểm tra lại trạng thái cache..."
bash "${ROOT_DIR}/scripts/cloudflared/check-cache-status.sh"
