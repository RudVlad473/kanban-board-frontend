#!/usr/bin/env bash
# D-07: curl-based E2E seeding CLI, replacing e2e/fixtures.ts's TypeScript/Playwright helpers.
# See docs/adr/tech/0022 for the full reasoning.
set -euo pipefail

# Split from `usage()` so `--help`/`-h` can print the identical text to STDOUT and exit 0 (04-21
# Task 1's own acceptance check runs `seed.sh --help`, which must succeed) without also duplicating
# every subcommand line a second time.
print_usage() {
    echo "usage: seed.sh account | seed.sh board --jsession <id> --user <id> --name <name> |"
    echo "       seed.sh column --jsession <id> --user <id> --board <id> --name <name> |"
    echo "       seed.sh task --jsession <id> --user <id> --board <id> --column <id> --title <title> [--description <description>] |"
    echo "       seed.sh task-update --jsession <id> --user <id> --board <id> --column <id> --task <id> --title <title> --version <version> |"
    echo "       seed.sh subtask --jsession <id> --user <id> --board <id> --column <id> --task <id> --title <title> |"
    echo "       seed.sh board-full --jsession <id> --user <id> --board <id> |"
    echo "       seed.sh cleanup [--users <id,id,...>] | seed.sh reset-all"
}

usage() {
    print_usage >&2
    exit 2
}

# Same literal spelling the TS registry (src/test-utils/seeded-user-registry.ts) resolves via
# process.cwd() -- two different spellings would make `cleanup` silently clean nothing (D-A).
REGISTRY_DIR=".e2e-seeded-users"

# comment-length-exempt: records why this CLI loads its own env rather than inheriting it, which is what makes the ad-hoc seed/cleanup pair usable outside a Playwright run at all
# Loaded here because this CLI is meant to run on its own: `pnpm e2e:cleanup` after an ad-hoc
# `pnpm e2e:seed account` is the ONLY cleanup path for an account a Playwright run did not create,
# and it is useless if the caller has to export the API base URL by hand first. Only Playwright
# loaded these before (e2e/test-env.ts), so every standalone invocation died on
# "EXTERNAL_API_BASE_URL must be set". An already-exported value wins, exactly as it does there, so
# CI's own secrets are never overwritten.
load_local_env() {
    local file=".env.local"
    [ -f "$file" ] || return 0

    local key line value
    for key in EXTERNAL_API_BASE_URL NONPROD_RESET_TOKEN; do
        [ -n "${!key:-}" ] && continue
        line=$(grep -m 1 "^${key}=" "$file" || true)
        [ -n "$line" ] || continue
        value="${line#*=}"
        value="${value%\"}"
        value="${value#\"}"
        value="${value%\'}"
        value="${value#\'}"
        export "${key}=${value}"
    done
}

load_local_env

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

# Same escaping rationale as build_json above, extended to build a { userIds: [...] } body from
# a list of bare id arguments for cmd_cleanup/cmd_reset_all.
build_json_array() {
    node -e '
        console.log(JSON.stringify({ userIds: process.argv.slice(1) }));
    ' "$@"
}

# build_json's own numeric field is a shell string, so JSON.stringify would quote it as
# `"version":"1"` and fail UpdateTaskRequestDTO's number check — this coerces it explicitly.
build_task_update_json() {
    node -e '
        const [title, version] = process.argv.slice(1);
        console.log(JSON.stringify({ title, version: Number(version) }));
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

    # comment-length-exempt: records the leak this closes and why the TS wrapper opts out, which is the duplicate-id failure a reader would otherwise reintroduce
    # An account created by THIS CLI registers itself, so `cleanup` can find it. It did not before,
    # which meant every ad-hoc `pnpm e2e:seed account` -- the way an agent gets a login without
    # signing up through the UI -- left a permanent account on the shared nonprod backend that no
    # cleanup path could ever name. Its own scope file, never `playwright.txt`: `globalSetup`
    # truncates that one, and `cleanup` reads every file in the directory anyway. The TS wrapper
    # (e2e/seed.ts) records its own ids and sets the skip flag, or the same account would be listed
    # twice and the delete batch 404s on the second, already-deleted id.
    if [ -z "${E2E_SEED_SKIP_REGISTRY:-}" ]; then
        mkdir -p "$REGISTRY_DIR"
        echo "$id" >>"$REGISTRY_DIR/manual.txt"
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

# TASK-04's own fixture: task creation POSTs to the COLUMN's own resource URL, with no trailing
# `/tasks` segment — the sibling path that does name one is GET-only (external-paths.ts's own
# comment on COLUMN_DETAIL records the same trap for the app's own client).
cmd_task() {
    local jsession="" user="" board="" column="" title="" description=""
    while [ $# -gt 0 ]; do
        case "$1" in
            --jsession) jsession="$2"; shift 2 ;;
            --user) user="$2"; shift 2 ;;
            --board) board="$2"; shift 2 ;;
            --column) column="$2"; shift 2 ;;
            --title) title="$2"; shift 2 ;;
            --description) description="$2"; shift 2 ;;
            *) usage ;;
        esac
    done

    if [ -z "$jsession" ] || [ -z "$user" ] || [ -z "$board" ] || [ -z "$column" ] || [ -z "$title" ]; then
        usage
    fi

    local task_body raw status body_out
    # An omitted (not blank) `description` field is the create path's own "no description" shape
    # (T9: an explicit `""` is refused with 400), so it is left out of the body entirely when unset.
    if [ -n "$description" ]; then
        task_body=$(build_json title "$title" description "$description")
    else
        task_body=$(build_json title "$title")
    fi
    raw=$(curl -sS -w '\n%{http_code}' -X POST "$EXTERNAL_API_BASE_URL/boards/$board/columns/$column?userId=$user" \
        -H "Cookie: JSESSIONID=$jsession" -H "Content-Type: application/json" -d "$task_body")
    status="${raw##*$'\n'}"
    body_out="${raw%$'\n'*}"

    if [[ "$status" != 2* ]]; then
        echo "seed.sh task: task creation returned $status: $body_out" >&2
        exit 1
    fi

    echo "$body_out"
}

# 04-21's own fixture: an out-of-band task write, issued through the SAME seeded session that
# created the board (never a second sign-in), so a spec can make its own held `version` stale
# without spending the account's other session slot (SYNC-01's conflict specs).
cmd_task_update() {
    local jsession="" user="" board="" column="" task="" title="" version=""
    while [ $# -gt 0 ]; do
        case "$1" in
            --jsession) jsession="$2"; shift 2 ;;
            --user) user="$2"; shift 2 ;;
            --board) board="$2"; shift 2 ;;
            --column) column="$2"; shift 2 ;;
            --task) task="$2"; shift 2 ;;
            --title) title="$2"; shift 2 ;;
            --version) version="$2"; shift 2 ;;
            *) usage ;;
        esac
    done

    if [ -z "$jsession" ] || [ -z "$user" ] || [ -z "$board" ] || [ -z "$column" ] || [ -z "$task" ] || \
        [ -z "$title" ] || [ -z "$version" ]; then
        usage
    fi

    local task_body raw status body_out
    task_body=$(build_task_update_json "$title" "$version")
    raw=$(curl -sS -w '\n%{http_code}' -X PUT "$EXTERNAL_API_BASE_URL/boards/$board/columns/$column/tasks/$task?userId=$user" \
        -H "Cookie: JSESSIONID=$jsession" -H "Content-Type: application/json" -d "$task_body")
    status="${raw##*$'\n'}"
    body_out="${raw%$'\n'*}"

    if [[ "$status" != 2* ]]; then
        echo "seed.sh task-update: task update returned $status: $body_out" >&2
        exit 1
    fi

    echo "$body_out"
}

# TASK-05's own fixture: a subtask on an already-seeded task, following the same one-function-
# per-entity shape as cmd_task, for 04-20/04-21's delete/cascade specs.
cmd_subtask() {
    local jsession="" user="" board="" column="" task="" title=""
    while [ $# -gt 0 ]; do
        case "$1" in
            --jsession) jsession="$2"; shift 2 ;;
            --user) user="$2"; shift 2 ;;
            --board) board="$2"; shift 2 ;;
            --column) column="$2"; shift 2 ;;
            --task) task="$2"; shift 2 ;;
            --title) title="$2"; shift 2 ;;
            *) usage ;;
        esac
    done

    if [ -z "$jsession" ] || [ -z "$user" ] || [ -z "$board" ] || [ -z "$column" ] || [ -z "$task" ] || [ -z "$title" ]; then
        usage
    fi

    local subtask_body raw status body_out
    subtask_body=$(build_json title "$title")
    raw=$(curl -sS -w '\n%{http_code}' \
        -X POST "$EXTERNAL_API_BASE_URL/boards/$board/columns/$column/tasks/$task/subtasks?userId=$user" \
        -H "Cookie: JSESSIONID=$jsession" -H "Content-Type: application/json" -d "$subtask_body")
    status="${raw##*$'\n'}"
    body_out="${raw%$'\n'*}"

    if [[ "$status" != 2* ]]; then
        echo "seed.sh subtask: subtask creation returned $status: $body_out" >&2
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

# Recovery path for a killed run (D-A): with --users, deletes exactly those ids; without, reads
# every file in the registry directory, since the registry outlives a crashed process. Exits 0 on
# nothing-to-clean so CI's always-run step cannot fail an otherwise-green job.
cmd_cleanup() {
    local users_arg=""
    while [ $# -gt 0 ]; do
        case "$1" in
            --users) users_arg="$2"; shift 2 ;;
            *) usage ;;
        esac
    done

    local ids=()
    if [ -n "$users_arg" ]; then
        IFS=',' read -ra ids <<<"$users_arg"
    elif [ -d "$REGISTRY_DIR" ]; then
        for registry_file in "$REGISTRY_DIR"/*; do
            [ -f "$registry_file" ] || continue
            while IFS= read -r line; do
                [ -n "$line" ] && ids+=("$line")
            done <"$registry_file"
        done
    fi

    if [ ${#ids[@]} -eq 0 ]; then
        echo "seed.sh cleanup: nothing to clean up"
        exit 0
    fi

    local body raw status body_out
    body=$(build_json_array "${ids[@]}")
    raw=$(curl -sS -w '\n%{http_code}' -X POST "$EXTERNAL_API_BASE_URL/admin/reset" \
        -H "X-Reset-Token: $NONPROD_RESET_TOKEN" -H "Content-Type: application/json" -d "$body")
    status="${raw##*$'\n'}"
    body_out="${raw%$'\n'*}"

    if [[ "$status" != 2* ]]; then
        echo "seed.sh cleanup: delete returned $status: $body_out" >&2
        exit 1
    fi

    # comment-length-exempt: records both failures this replaces -- the stranding an unconditional wipe caused and the 404 that leaving the ids behind would cause -- which together are why it is a targeted removal
    # The registry is pruned to exactly what was deleted, never emptied wholesale. `--users` names
    # its own ids: clearing the whole file there erased every OTHER registered id while those
    # accounts were still alive on nonprod, unreachable by any cleanup path -- the failure the
    # registry exists to prevent. Leaving them listed is wrong too: an already-deleted id 404s the
    # entire next batch, stranding every id beside it.
    if [ -n "$users_arg" ]; then
        local remaining
        for registry_file in "$REGISTRY_DIR"/*; do
            [ -f "$registry_file" ] || continue
            remaining=$(grep -vxF -f <(printf '%s\n' "${ids[@]}") "$registry_file" || true)
            if [ -n "$remaining" ]; then
                printf '%s\n' "$remaining" >"$registry_file"
            else
                rm -f "$registry_file"
            fi
        done
    else
        rm -f "$REGISTRY_DIR"/*
    fi

    echo "seed.sh cleanup: deleted ${#ids[@]} user(s)"
}

# The manual, token-gated nuclear option (T-KYV-03) -- nothing automated may call this.
cmd_reset_all() {
    local status
    status=$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$EXTERNAL_API_BASE_URL/admin/reset?fullReset=true" \
        -H "X-Reset-Token: $NONPROD_RESET_TOKEN")

    if [ "$status" != "204" ]; then
        echo "seed.sh reset-all: reset endpoint returned $status, expected 204" >&2
        exit 1
    fi

    echo "seed.sh reset-all: full reset complete"
}

case "${1:-}" in
    --help|-h)
        print_usage
        exit 0
        ;;
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
    task)
        : "${EXTERNAL_API_BASE_URL:?EXTERNAL_API_BASE_URL must be set}"
        shift
        cmd_task "$@"
        ;;
    task-update)
        : "${EXTERNAL_API_BASE_URL:?EXTERNAL_API_BASE_URL must be set}"
        shift
        cmd_task_update "$@"
        ;;
    subtask)
        : "${EXTERNAL_API_BASE_URL:?EXTERNAL_API_BASE_URL must be set}"
        shift
        cmd_subtask "$@"
        ;;
    board-full)
        : "${EXTERNAL_API_BASE_URL:?EXTERNAL_API_BASE_URL must be set}"
        shift
        cmd_board_full "$@"
        ;;
    cleanup)
        : "${EXTERNAL_API_BASE_URL:?EXTERNAL_API_BASE_URL must be set}"
        : "${NONPROD_RESET_TOKEN:?NONPROD_RESET_TOKEN must be set}"
        shift
        cmd_cleanup "$@"
        ;;
    reset-all)
        : "${EXTERNAL_API_BASE_URL:?EXTERNAL_API_BASE_URL must be set}"
        : "${NONPROD_RESET_TOKEN:?NONPROD_RESET_TOKEN must be set}"
        shift
        cmd_reset_all "$@"
        ;;
    *)
        usage
        ;;
esac
