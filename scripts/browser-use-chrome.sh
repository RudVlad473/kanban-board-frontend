#!/usr/bin/env bash
#
# Start the headless Chromium that browser-use attaches to, and report the endpoint.
#
# Idempotent: a browser already answering on the port is reused, never duplicated.
#
# Decisions ─────────────────────────────────────────────────────────────────────────────────
# Reuses Playwright's Chromium under ~/.cache/ms-playwright rather than installing a second
# browser. It is already pinned by this repo's Playwright version, already downloaded for the
# e2e and visual suites, and a separately-installed Chrome would drift from what those suites
# actually run against.
#
# Chromium runs INSIDE WSL rather than the real Windows Chrome the tool prefers. Windows Chrome
# binds CDP to its own loopback, and this box has no `networkingMode=mirrored` in .wslconfig, so
# reaching it would need a `netsh interface portproxy` rule on the Windows side plus Chrome
# launched with remote debugging by hand. The cost of the local browser is no logged-in profile,
# which this project does not want anyway — `pnpm e2e:seed account` is how it gets a login.
#
# Headless is not a preference here: CLAUDE.md forbids a visible window during automated
# verification.
#
# False if: WSL gains mirrored networking, or Playwright stops shipping a full Chromium (the
# headless_shell build beside it cannot serve CDP screenshots the same way).
set -euo pipefail

readonly PORT="${BROWSER_USE_CDP_PORT:-9222}"
readonly PROFILE="${HOME}/.cache/browser-use-profile"

fail() {
    echo "browser-use-chrome: $*" >&2
    exit 1
}

# browser-use's own discovery scans for a Chromium in a standard install location and does not
# recognise Playwright's cache path, so a bare `browser-use` call reports `chrome-not-running`
# even while CDP answers on the port. One seeded call pins the endpoint into the daemon, which
# then survives for every later bare call — so the export belongs here and not in a shell profile.
seed_daemon() {
    command -v browser-use >/dev/null 2>&1 || {
        echo "browser-use-chrome: browser-use is not installed (uv tool install --python 3.12 browser-use)" >&2
        return 0
    }
    # BH_TAB_MARKER=0, and it must be set before the daemon starts: the marker is a 🐴 prepended to
    # the attached tab's document title, and this repo asserts on titles. A passing spec that turns
    # red only while a browser-use session happens to be attached is the worst kind of flake.
    BH_TAB_MARKER=0 BU_CDP_URL="http://127.0.0.1:${PORT}" browser-use >/dev/null 2>&1 <<'PY' || echo "browser-use-chrome: daemon seed failed — run with BU_CDP_URL set to see why" >&2
page_info()
PY
}

if curl -fsS --max-time 2 "http://127.0.0.1:${PORT}/json/version" >/dev/null 2>&1; then
    seed_daemon
    echo "browser-use-chrome: already listening on ${PORT}"
    exit 0
fi

CHROME="$(find "${HOME}/.cache/ms-playwright" -maxdepth 3 -path '*chrome-linux*/chrome' -type f 2>/dev/null | sort | tail -n 1)"
[ -n "${CHROME}" ] || fail "no Playwright Chromium found — run 'pnpm exec playwright install chromium'"

mkdir -p "${PROFILE}"

# Detached with its own log: this outlives the shell that started it, and a browser whose stderr
# went to the terminal would be lost the moment that shell exits.
nohup "${CHROME}" \
    --headless=new \
    --remote-debugging-port="${PORT}" \
    --remote-debugging-address=127.0.0.1 \
    --no-first-run \
    --no-default-browser-check \
    --user-data-dir="${PROFILE}" \
    about:blank \
    >"${PROFILE}/chrome.log" 2>&1 &

for _ in $(seq 1 20); do
    if curl -fsS --max-time 1 "http://127.0.0.1:${PORT}/json/version" >/dev/null 2>&1; then
        seed_daemon
        echo "browser-use-chrome: CDP ready at http://127.0.0.1:${PORT}"
        exit 0
    fi
    sleep 0.5
done

fail "Chromium did not answer on ${PORT} within 10s — see ${PROFILE}/chrome.log"
