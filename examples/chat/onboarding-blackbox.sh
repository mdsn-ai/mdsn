#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
PORT="${CHAT_BLACKBOX_PORT:-4137}"
BASE_URL="http://127.0.0.1:${PORT}"
COOKIE_JAR="$(mktemp /tmp/mdsn-chat-onboarding-cookie-XXXXXX)"
SERVER_LOG="$(mktemp /tmp/mdsn-chat-onboarding-server-XXXXXX)"

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]]; then
    kill "${SERVER_PID}" >/dev/null 2>&1 || true
    wait "${SERVER_PID}" >/dev/null 2>&1 || true
  fi
  rm -f "${COOKIE_JAR}" "${SERVER_LOG}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

fail() {
  echo ""
  echo "FAIL: $1"
  echo ""
  echo "--- server log tail ---"
  tail -n 80 "${SERVER_LOG}" || true
  exit 1
}

assert_status() {
  local got="$1"
  local want="$2"
  local label="$3"
  if [[ "${got}" != "${want}" ]]; then
    fail "${label} expected status ${want}, got ${got}"
  fi
}

assert_contains() {
  local file="$1"
  local needle="$2"
  local label="$3"
  if ! grep -Fq "${needle}" "${file}"; then
    fail "${label} expected body to contain: ${needle}"
  fi
}

assert_content_type_contains() {
  local got="$1"
  local want="$2"
  local label="$3"
  if [[ "${got}" != *"${want}"* ]]; then
    fail "${label} expected content-type containing '${want}', got '${got}'"
  fi
}

escape_markdown_inline() {
  printf "%s" "$1" | sed -e 's/\\/\\\\/g' -e 's/-/\\-/g'
}

read_content_type() {
  local headers_file="$1"
  awk '
    BEGIN { IGNORECASE = 1 }
    /^Content-Type:/ {
      sub(/\r$/, "", $0)
      sub(/^Content-Type:[[:space:]]*/, "", $0)
      print tolower($0)
      exit
    }
  ' "${headers_file}"
}

echo "Starting chat demo on ${BASE_URL} ..."
(
  cd "${ROOT_DIR}" &&
  npm run -w @mdsnai/sdk build &&
  PORT="${PORT}" node --import tsx examples/chat/server.ts
) >"${SERVER_LOG}" 2>&1 &
SERVER_PID=$!

for _ in $(seq 1 90); do
  if curl -fsS -o /dev/null -H "Accept: text/markdown" "${BASE_URL}/" >/dev/null 2>&1; then
    break
  fi
  if ! kill -0 "${SERVER_PID}" >/dev/null 2>&1; then
    fail "chat demo process exited before becoming ready on ${BASE_URL}"
  fi
  sleep 1
done

if ! curl -fsS -o /dev/null -H "Accept: text/markdown" "${BASE_URL}/" >/dev/null 2>&1; then
  fail "chat demo did not become ready on ${BASE_URL}"
fi

NOW="$(date -u +%Y%m%dT%H%M%SZ)"
USERNAME="onboard-${NOW}"
EMAIL="${USERNAME}@example.com"
PASSWORD="P@ss-${NOW}"
MESSAGE="hello-onboarding-${NOW}"
ESCAPED_USERNAME="$(escape_markdown_inline "${USERNAME}")"
ESCAPED_MESSAGE="$(escape_markdown_inline "${MESSAGE}")"

echo "Using identity: ${USERNAME} / ${EMAIL}"

H1="$(mktemp /tmp/mdsn-chat-h1-XXXXXX)"; B1="$(mktemp /tmp/mdsn-chat-b1-XXXXXX)"
S1="$(curl -sS -D "${H1}" -o "${B1}" -w "%{http_code}" -H "Accept: text/markdown" "${BASE_URL}/")"
assert_status "${S1}" "200" "GET /"
assert_content_type_contains "$(read_content_type "${H1}")" "text/markdown" "GET /"
assert_contains "${B1}" "POST \"/login\" (email, password) -> login" "GET /"
echo "PASS step 1: GET /"

H2="$(mktemp /tmp/mdsn-chat-h2-XXXXXX)"; B2="$(mktemp /tmp/mdsn-chat-b2-XXXXXX)"
S2="$(curl -sS -D "${H2}" -o "${B2}" -w "%{http_code}" -c "${COOKIE_JAR}" \
  -H "Accept: text/markdown" \
  -H "Content-Type: text/markdown" \
  -X POST "${BASE_URL}/register" \
  --data-binary $'username: '"${USERNAME}"$'\nemail: '"${EMAIL}"$'\npassword: '"${PASSWORD}")"
assert_status "${S2}" "200" "POST /register"
assert_content_type_contains "$(read_content_type "${H2}")" "text/markdown" "POST /register"
assert_contains "${B2}" "GET \"/chat\" -> enter_chat" "POST /register"
echo "PASS step 2: POST /register"

OLD_SID="$(awk '$6=="mdsn-chat-session"{print $7}' "${COOKIE_JAR}" | tail -n 1)"
if [[ -z "${OLD_SID}" ]]; then
  fail "POST /register did not set mdsn-chat-session cookie"
fi

H3="$(mktemp /tmp/mdsn-chat-h3-XXXXXX)"; B3="$(mktemp /tmp/mdsn-chat-b3-XXXXXX)"
S3="$(curl -sS -D "${H3}" -o "${B3}" -w "%{http_code}" -b "${COOKIE_JAR}" \
  -H "Accept: text/markdown" \
  "${BASE_URL}/chat")"
assert_status "${S3}" "200" "GET /chat"
assert_content_type_contains "$(read_content_type "${H3}")" "text/markdown" "GET /chat"
assert_contains "${B3}" "POST \"/send\" (message) -> send" "GET /chat"
echo "PASS step 3: GET /chat"

H4="$(mktemp /tmp/mdsn-chat-h4-XXXXXX)"; B4="$(mktemp /tmp/mdsn-chat-b4-XXXXXX)"
S4="$(curl -sS -D "${H4}" -o "${B4}" -w "%{http_code}" -b "${COOKIE_JAR}" \
  -H "Accept: text/markdown" \
  -H "Content-Type: text/markdown" \
  -X POST "${BASE_URL}/send" \
  --data-binary "message: ${MESSAGE}")"
assert_status "${S4}" "200" "POST /send (logged in)"
assert_content_type_contains "$(read_content_type "${H4}")" "text/markdown" "POST /send (logged in)"
assert_contains "${B4}" "${ESCAPED_USERNAME}" "POST /send (logged in)"
assert_contains "${B4}" "${ESCAPED_MESSAGE}" "POST /send (logged in)"
echo "PASS step 4: POST /send (logged in)"

H5="$(mktemp /tmp/mdsn-chat-h5-XXXXXX)"; B5="$(mktemp /tmp/mdsn-chat-b5-XXXXXX)"
S5="$(curl -sS -D "${H5}" -o "${B5}" -w "%{http_code}" -b "${COOKIE_JAR}" \
  -H "Accept: text/markdown" \
  "${BASE_URL}/list")"
assert_status "${S5}" "200" "GET /list"
assert_content_type_contains "$(read_content_type "${H5}")" "text/markdown" "GET /list"
assert_contains "${B5}" "${ESCAPED_MESSAGE}" "GET /list"
echo "PASS step 5: GET /list"

H6="$(mktemp /tmp/mdsn-chat-h6-XXXXXX)"; B6="$(mktemp /tmp/mdsn-chat-b6-XXXXXX)"
S6="$(curl -sS -D "${H6}" -o "${B6}" -w "%{http_code}" -b "${COOKIE_JAR}" -c "${COOKIE_JAR}" \
  -H "Accept: text/markdown" \
  -H "Content-Type: text/markdown" \
  -X POST "${BASE_URL}/logout" \
  --data-binary "")"
assert_status "${S6}" "200" "POST /logout"
assert_content_type_contains "$(read_content_type "${H6}")" "text/markdown" "POST /logout"
assert_contains "${B6}" "GET \"/\" -> go_login" "POST /logout"
echo "PASS step 6: POST /logout"

H7="$(mktemp /tmp/mdsn-chat-h7-XXXXXX)"; B7="$(mktemp /tmp/mdsn-chat-b7-XXXXXX)"
S7="$(curl -sS -D "${H7}" -o "${B7}" -w "%{http_code}" -b "${COOKIE_JAR}" \
  -H "Accept: text/markdown" \
  -H "Content-Type: text/markdown" \
  -X POST "${BASE_URL}/send" \
  --data-binary "message: should-fail-after-logout")"
assert_status "${S7}" "401" "POST /send after logout (cookie jar)"
assert_content_type_contains "$(read_content_type "${H7}")" "text/markdown" "POST /send after logout (cookie jar)"
assert_contains "${B7}" "POST \"/login\" (email, password) -> login" "POST /send after logout (cookie jar)"
echo "PASS step 7: POST /send after logout (cookie jar)"

H8="$(mktemp /tmp/mdsn-chat-h8-XXXXXX)"; B8="$(mktemp /tmp/mdsn-chat-b8-XXXXXX)"
S8="$(curl -sS -D "${H8}" -o "${B8}" -w "%{http_code}" \
  -H "Accept: text/markdown" \
  -H "Content-Type: text/markdown" \
  -H "Cookie: mdsn-chat-session=${OLD_SID}" \
  -X POST "${BASE_URL}/send" \
  --data-binary "message: should-fail-replayed-cookie")"
assert_status "${S8}" "401" "POST /send with replayed old session cookie"
assert_content_type_contains "$(read_content_type "${H8}")" "text/markdown" "POST /send with replayed old session cookie"
assert_contains "${B8}" "Please log in before sending messages." "POST /send with replayed old session cookie"
echo "PASS step 8: POST /send with replayed old session cookie"

echo ""
echo "PASS onboarding black-box flow"
echo "Server: ${BASE_URL}"
echo "Identity: ${USERNAME}"
