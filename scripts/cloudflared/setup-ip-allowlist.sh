#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env.cloudflare"

CMS_HOST="${CMS_HOST:-local-cms.spacedev.vn}"
API_HOST="${API_HOST:-local-api.spacedev.vn}"
ZONE_NAME="${CLOUDFLARE_ZONE_NAME:-spacedev.vn}"
RULE_NAME="${IP_ALLOW_RULE_NAME:-Allow WARP IP for local tunnel hosts}"

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
- Zone > WAF > Edit
- (hoặc) Account > Access: Apps and Policies > Edit

Sau đó chạy lại:
  bash scripts/cloudflared/setup-ip-allowlist.sh
EOF
  exit 1
fi

CURRENT_IP="${ALLOW_IP:-}"
if [ -z "${CURRENT_IP}" ]; then
  CURRENT_IP="$(curl -4 -fsS https://cloudflare.com/cdn-cgi/trace | awk -F= '/^ip=/{print $2; exit}')"
fi

if [ -z "${CURRENT_IP}" ]; then
  echo "Không lấy được IP hiện tại. Truyền thủ công: ALLOW_IP=1.2.3.4 bash $0"
  exit 1
fi

echo "IP hiện tại (WARP egress): ${CURRENT_IP}"

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

HOST_EXPRESSION="(http.host eq \"${CMS_HOST}\" or http.host eq \"${API_HOST}\")"
BLOCK_EXPRESSION="${HOST_EXPRESSION} and not ip.src eq ${CURRENT_IP}"

echo "B2) Tạo/cập nhật WAF custom rule chặn IP không được phép..."
ENTRYPOINT_URL="${CF_API}/zones/${ZONE_ID}/rulesets/phases/http_request_firewall_custom/entrypoint"
ENTRYPOINT_RESPONSE_FILE="${TMP_DIR}/entrypoint.json"
request GET "${ENTRYPOINT_URL}" > "${ENTRYPOINT_RESPONSE_FILE}"

if ! python3 -c 'import json,sys; data=json.load(open(sys.argv[1])); sys.exit(0 if data.get("success") else 1)' "${ENTRYPOINT_RESPONSE_FILE}" 2>/dev/null; then
  cat <<EOF
Token không có quyền WAF custom rules.

Cập nhật token tại Cloudflare Dashboard -> My Profile -> API Tokens
với quyền Zone > WAF > Edit, rồi chạy lại script.

Hoặc thêm IP thủ công trên Dashboard:
1. Security -> WAF -> Custom rules
2. Rule "${RULE_NAME}"
3. Expression: ${BLOCK_EXPRESSION}
4. Action: Block

IP cần allow hiện tại: ${CURRENT_IP}
EOF
  cat "${ENTRYPOINT_RESPONSE_FILE}"
  exit 1
fi

UPDATE_PAYLOAD_FILE="${TMP_DIR}/update-payload.json"
CF_BLOCK_EXPRESSION="${BLOCK_EXPRESSION}" CF_RULE_NAME="${RULE_NAME}" \
  CF_ENTRYPOINT_FILE="${ENTRYPOINT_RESPONSE_FILE}" CF_OUTPUT_FILE="${UPDATE_PAYLOAD_FILE}" \
  python3 <<'PY'
import json
import os

entrypoint_file = os.environ["CF_ENTRYPOINT_FILE"]
output_file = os.environ["CF_OUTPUT_FILE"]
expression = os.environ["CF_BLOCK_EXPRESSION"]
rule_name = os.environ["CF_RULE_NAME"]

new_rule = {
    "expression": expression,
    "description": rule_name,
    "action": "block",
    "enabled": True,
}

with open(entrypoint_file, encoding="utf-8") as handle:
    entrypoint_data = json.load(handle)

ruleset = entrypoint_data["result"]
ruleset_id = ruleset["id"]
existing_rules = ruleset.get("rules", [])
filtered_rules = [
    rule for rule in existing_rules
    if rule.get("description") != rule_name
]
filtered_rules.insert(0, new_rule)
payload = {"rules": filtered_rules}

with open(output_file, "w", encoding="utf-8") as handle:
    json.dump({"ruleset_id": ruleset_id, "payload": payload}, handle)
PY

RULESET_ID="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["ruleset_id"])' "${UPDATE_PAYLOAD_FILE}")"
PAYLOAD_ONLY_FILE="${TMP_DIR}/payload-only.json"
python3 -c 'import json,sys; json.dump(json.load(open(sys.argv[1]))["payload"], open(sys.argv[2], "w"), ensure_ascii=False)' "${UPDATE_PAYLOAD_FILE}" "${PAYLOAD_ONLY_FILE}"

UPDATE_RESPONSE_FILE="${TMP_DIR}/update-response.json"
request PUT "${CF_API}/zones/${ZONE_ID}/rulesets/${RULESET_ID}" "${PAYLOAD_ONLY_FILE}" > "${UPDATE_RESPONSE_FILE}"
assert_success "${UPDATE_RESPONSE_FILE}" "cập nhật WAF IP allowlist"

echo ""
echo "Đã cập nhật rule \"${RULE_NAME}\" với IP: ${CURRENT_IP}"
echo "Hosts: ${CMS_HOST}, ${API_HOST}"
