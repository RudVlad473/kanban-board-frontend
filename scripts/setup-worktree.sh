#!/usr/bin/env bash
#
# Make a fresh clone or `git worktree add` runnable in one command. Idempotent, safe to re-run.
#
# Decisions ─────────────────────────────────────────────────────────────────────────────────
# This is a script rather than a `post-checkout` hook, which git 2.53.0 does fire on
# `git worktree add`. Measured 2026-09-03: `core.hooksPath` is `.husky/_`, husky self-ignores
# that directory, and only `.husky/pre-commit` is tracked — so a brand-new worktree has no hook
# directory at checkout time and nothing can run. `.husky/_` is recreated by husky during
# `pnpm install`, which is step 1 of what the hook would have been automating.
#
# It is one command rather than four documented steps because the four-step version already
# failed twice here: CLAUDE.md documented `next typegen` and two separate executors still skipped
# it, then reported the resulting phantom `no-unsafe-assignment` errors as a real regression.
#
# False if: `.husky/_` becomes tracked, or husky stops setting core.hooksPath.
set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly PLAINTEXT="${REPO_ROOT}/.env.local"
readonly AGE_KEY_FILE="${SOPS_AGE_KEY_FILE:-${HOME}/.config/sops/age/keys.txt}"

did=()
skipped=()

fail() {
    echo "setup:worktree — $*" >&2
    exit 1
}

# Checked before the long install so a fresh machine learns what it is missing in seconds, and
# only when a decrypt is actually going to happen.
check_decrypt_preconditions() {
    command -v sops >/dev/null 2>&1 || fail "sops is not installed. Run \`pnpm tools:install\` first."
    [ -f "${AGE_KEY_FILE}" ] || fail "the age private key is missing at ${AGE_KEY_FILE}.
Restore it from your backup, or set SOPS_AGE_KEY_FILE to where it lives. Without it
secrets.enc.env cannot be decrypted (docs/adr/tech/0032)."
}

install_dependencies() {
    pnpm --dir "${REPO_ROOT}" install --frozen-lockfile
    did+=("installed dependencies")
}

# typegen rewrites the tracked next-env.d.ts to point at ./.next/dev/types/, which is generated
# churn Next itself marks "should not be edited". Restoring it here is why nobody has to remember.
generate_route_types() {
    pnpm --dir "${REPO_ROOT}" exec next typegen
    git -C "${REPO_ROOT}" checkout -- next-env.d.ts
    did+=("generated Next.js route types and restored next-env.d.ts")
}

# Never overwrite a plaintext file the user may have hand-edited; `pnpm secrets:decrypt` is
# unconditional by design, so the skip belongs here rather than inside it.
decrypt_secrets() {
    if [ -f "${PLAINTEXT}" ]; then
        skipped+=("decrypt — a local env file already exists; run \`pnpm secrets:verify\` to check it against secrets.enc.env")
        return 0
    fi

    bash "${REPO_ROOT}/scripts/secrets.sh" decrypt >/dev/null
    did+=("decrypted the local env file from secrets.enc.env")
}

main() {
    [ -f "${PLAINTEXT}" ] || check_decrypt_preconditions

    install_dependencies
    generate_route_types
    decrypt_secrets

    echo
    echo "setup:worktree done."
    for entry in "${did[@]}"; do echo "  did:     ${entry}"; done
    for entry in "${skipped[@]+"${skipped[@]}"}"; do echo "  skipped: ${entry}"; done

    if ! command -v gitleaks >/dev/null 2>&1; then
        echo "  next:    run \`pnpm tools:install\` — the pre-commit hook needs gitleaks"
    fi
}

main "$@"
