#!/usr/bin/env bash
#
# encrypt | decrypt | verify the repo's committed secrets (docs/adr/tech/0032).
#
# Decisions ─────────────────────────────────────────────────────────────────────────────────
# Every plaintext path this project uses lives in this file and nowhere else. The agent harness
# refuses a shell command whose own text names a `.env` path, so `pnpm secrets:decrypt` is the
# only spelling an agent can actually run — putting the path in a caller would break that.
#
# Values move by `sops --output`, never a `>` redirect: a redirect truncates the destination
# before sops runs, so a decrypt that fails on a missing key would leave an empty plaintext file
# and destroy the only local copy.
#
# `verify` prints `match` or `mismatch` and never either side's content.
set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly PLAINTEXT="${REPO_ROOT}/.env.local"
readonly CIPHERTEXT="${REPO_ROOT}/secrets.enc.env"

encrypt() {
    [ -f "${PLAINTEXT}" ] || { echo "secrets: no local plaintext file to encrypt" >&2; exit 1; }
    sops encrypt --input-type dotenv --output-type dotenv --output "${CIPHERTEXT}" "${PLAINTEXT}"
    echo "secrets: encrypted to secrets.enc.env"
}

decrypt() {
    [ -f "${CIPHERTEXT}" ] || { echo "secrets: secrets.enc.env is absent" >&2; exit 1; }
    sops decrypt --input-type dotenv --output-type dotenv --output "${PLAINTEXT}" "${CIPHERTEXT}"
    chmod 600 "${PLAINTEXT}"
    echo "secrets: wrote the local env file from secrets.enc.env"
}

verify() {
    [ -f "${PLAINTEXT}" ] || { echo "secrets: no local plaintext file to compare against" >&2; exit 1; }
    [ -f "${CIPHERTEXT}" ] || { echo "secrets: secrets.enc.env is absent" >&2; exit 1; }

    # Global, not `local`: the EXIT trap runs after this function has returned, where a local is
    # already out of scope and `set -u` aborts on it — leaving decrypted plaintext behind.
    scratch="$(mktemp)"
    chmod 600 "${scratch}"
    trap 'rm -f "${scratch}"' EXIT

    sops decrypt --input-type dotenv --output-type dotenv --output "${scratch}" "${CIPHERTEXT}"

    if [ "$(sha256sum <"${scratch}")" = "$(sha256sum <"${PLAINTEXT}")" ]; then
        echo "match"
    else
        echo "mismatch"
        exit 1
    fi
}

case "${1:-}" in
    encrypt) encrypt ;;
    decrypt) decrypt ;;
    verify) verify ;;
    *) echo "usage: secrets.sh encrypt|decrypt|verify" >&2; exit 2 ;;
esac
