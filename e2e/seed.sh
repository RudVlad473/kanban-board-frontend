#!/usr/bin/env bash
# D-07: curl-based E2E seeding CLI, replacing e2e/fixtures.ts's TypeScript/Playwright helpers.
# See docs/adr/tech/0022 for the full reasoning.
set -euo pipefail

usage() {
    echo "usage: seed.sh account | seed.sh board --jsession <id> --user <id> --name <name> |" >&2
    echo "       seed.sh column --jsession <id> --user <id> --board <id> --name <name> |" >&2
    echo "       seed.sh board-full --jsession <id> --user <id> --board <id>" >&2
    exit 2
}

# Satisfies the backend's password rule: 8-64 chars, upper, lower, digit, special.
SEED_PASSWORD="E2eFixturePwd1!"
# Satisfies the backend's display-name rule: 3-32 letters and spaces only, no digits.
SEED_DISPLAY_NAME="End To End Fixture"

# Builds a compact JSON object from name/value argument pairs via Node, avoiding hand-rolled
# string-interpolation escaping bugs for both request bodies and this script's own JSON output.
build_json() {
    node -e '
        const obj = {};
        for (let i = 1; i < process.argv.length; i += 2) {
            obj[process.argv[i]] = process.argv[i + 1];
        }
        console.log(JSON.stringify(obj));
    ' "$@"
}

json_field() {
    if command -v jq >/dev/null 2>&1; then
        jq -r ".$2" <<<"$1"
    else
        node -e 'console.log(JSON.parse(process.argv[1])[process.argv[2]] ?? "")' "$1" "$2"
    fi
}

cmd_account() {
    local jar
    jar=$(mktemp)
    # Double-quoted so $jar expands now, into the trap's literal command — a single-quoted trap
    # would defer expansion to script EXIT, by which point this function's local $jar is gone.
    trap "rm -f '$jar'" EXIT

    local email
    email="e2e-$(node -e 'console.log(require("crypto").randomUUID())')@example.com"
    local body
    body=$(build_json email "$email" password "$SEED_PASSWORD" displayName "$SEED_DISPLAY_NAME")

    local raw status body_out
    raw=$(curl -sS -c "$jar" -w '\n%{http_code}' -X POST "$EXTERNAL_API_BASE_URL/signup" \
        -H "Content-Type: application/json" -d "$body")
    status="${raw##*$'\n'}"
    body_out="${raw%$'\n'*}"

    if [[ "$status" != 2* ]]; then
        echo "seed.sh account: signup returned $status: $body_out" >&2
        exit 1
    fi

    local id jsession_id
    id=$(json_field "$body_out" "id")
    # The jar stores each Set-Cookie as its own entry (Netscape format) — reading it here avoids
    # the multi-header-collapsing problem the old TypeScript fixture helpers existed to work around.
    jsession_id=$(grep -i "JSESSIONID" "$jar" | tail -1 | awk '{print $NF}')

    if [ -z "$jsession_id" ]; then
        echo "seed.sh account: no JSESSIONID cookie found in the jar after signup" >&2
        exit 1
    fi

    build_json id "$id" email "$email" password "$SEED_PASSWORD" displayName "$SEED_DISPLAY_NAME" jsessionId "$jsession_id"
}

cmd_board() {
    local jsession="" user="" name=""
    while [ $# -gt 0 ]; do
        case "$1" in
            --jsession) jsession="$2"; shift 2 ;;
            --user) user="$2"; shift 2 ;;
            --name) name="$2"; shift 2 ;;
            *) usage ;;
        esac
    done

    if [ -z "$jsession" ] || [ -z "$user" ] || [ -z "$name" ]; then
        usage
    fi

    # Reuses the sign-up session's own credential (passed in via --jsession) rather than signing
    # in again — the two-concurrent-session budget constraint this port must preserve.
    local board_body raw status body_out
    board_body=$(build_json name "$name")
    raw=$(curl -sS -w '\n%{http_code}' -X POST "$EXTERNAL_API_BASE_URL/boards?userId=$user" \
        -H "Cookie: JSESSIONID=$jsession" -H "Content-Type: application/json" -d "$board_body")
    status="${raw##*$'\n'}"
    body_out="${raw%$'\n'*}"

    if [[ "$status" != 2* ]]; then
        echo "seed.sh board: board creation returned $status: $body_out" >&2
        exit 1
    fi

    echo "$body_out"
}

cmd_column() {
    local jsession="" user="" board="" name=""
    while [ $# -gt 0 ]; do
        case "$1" in
            --jsession) jsession="$2"; shift 2 ;;
            --user) user="$2"; shift 2 ;;
            --board) board="$2"; shift 2 ;;
            --name) name="$2"; shift 2 ;;
            *) usage ;;
        esac
    done

    if [ -z "$jsession" ] || [ -z "$user" ] || [ -z "$board" ] || [ -z "$name" ]; then
        usage
    fi

    # Reuses the sign-up session's own credential exactly as cmd_board does — never a second
    # sign-in, which would spend the account's other slot against the two-session cap.
    local column_body raw status body_out
    column_body=$(build_json name "$name")
    raw=$(curl -sS -w '\n%{http_code}' -X POST "$EXTERNAL_API_BASE_URL/boards/$board/columns?userId=$user" \
        -H "Cookie: JSESSIONID=$jsession" -H "Content-Type: application/json" -d "$column_body")
    status="${raw##*$'\n'}"
    body_out="${raw%$'\n'*}"

    if [[ "$status" != 2* ]]; then
        echo "seed.sh column: column creation returned $status: $body_out" >&2
        exit 1
    fi

    echo "$body_out"
}

# Reads a board back through the real backend so a spec can assert what actually persisted —
# the board-detail UI is Phase 3 scope, so there is nothing to read it from on screen yet.
cmd_board_full() {
    local jsession="" user="" board=""
    while [ $# -gt 0 ]; do
        case "$1" in
            --jsession) jsession="$2"; shift 2 ;;
            --user) user="$2"; shift 2 ;;
            --board) board="$2"; shift 2 ;;
            *) usage ;;
        esac
    done

    if [ -z "$jsession" ] || [ -z "$user" ] || [ -z "$board" ]; then
        usage
    fi

    local raw status body_out
    raw=$(curl -sS -w '\n%{http_code}' "$EXTERNAL_API_BASE_URL/boards/$board/full?userId=$user" \
        -H "Cookie: JSESSIONID=$jsession")
    status="${raw##*$'\n'}"
    body_out="${raw%$'\n'*}"

    if [[ "$status" != 2* ]]; then
        echo "seed.sh board-full: read returned $status: $body_out" >&2
        exit 1
    fi

    echo "$body_out"
}

case "${1:-}" in
    account)
        : "${EXTERNAL_API_BASE_URL:?EXTERNAL_API_BASE_URL must be set}"
        shift
        cmd_account "$@"
        ;;
    board)
        : "${EXTERNAL_API_BASE_URL:?EXTERNAL_API_BASE_URL must be set}"
        shift
        cmd_board "$@"
        ;;
    column)
        : "${EXTERNAL_API_BASE_URL:?EXTERNAL_API_BASE_URL must be set}"
        shift
        cmd_column "$@"
        ;;
    board-full)
        : "${EXTERNAL_API_BASE_URL:?EXTERNAL_API_BASE_URL must be set}"
        shift
        cmd_board_full "$@"
        ;;
    *)
        usage
        ;;
esac
