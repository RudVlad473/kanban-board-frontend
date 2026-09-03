#!/usr/bin/env bash
#
# Install the secret-management toolchain (gitleaks, sops, age) into ~/.local/bin.
#
# Idempotent: re-running with everything already at the right version downloads nothing.
#
# Decisions ─────────────────────────────────────────────────────────────────────────────────
# gitleaks' version is read from .github/workflows/ci.yml, not held here. CI is the other
# consumer of that number and local/CI drift is the failure this script exists to prevent, so
# the workflow is its one home and this script is a reader. sops has no CI counterpart, so the
# constant below is its natural home.
#
# age comes from Ubuntu's signed archive rather than a release binary: a distro package carries
# real provenance, whereas the sha256 checks below prove only that the bytes arrived intact from
# the same origin that published the checksum. See docs/adr/tech/0032.
#
# False if: gitleaks or sops stops publishing a checksums file alongside its release assets, or
# `age` leaves the Ubuntu archive.
set -euo pipefail

readonly SOPS_VERSION="v3.13.3"
readonly INSTALL_DIR="${HOME}/.local/bin"
readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly CI_WORKFLOW="${REPO_ROOT}/.github/workflows/ci.yml"

fail() {
    echo "install-verified-tools: $*" >&2
    exit 1
}

# Abort on zero or many matches rather than defaulting: a silent fallback version would install
# a scanner CI never runs, which is exactly the drift being prevented.
read_pinned_gitleaks_version() {
    local matches
    matches="$(grep -oE 'GITLEAKS_VERSION:[[:space:]]*"?v?[0-9]+\.[0-9]+\.[0-9]+"?' "${CI_WORKFLOW}" || true)"

    local count
    count="$(printf '%s' "${matches}" | grep -c . || true)"

    [ "${count}" -eq 1 ] || fail "expected exactly 1 GITLEAKS_VERSION assignment in ${CI_WORKFLOW}, found ${count}"

    printf '%s' "${matches}" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+'
}

verify_sha256() {
    local file="$1" checksums="$2" asset="$3"
    local expected actual

    expected="$(awk -v a="${asset}" '$2 == a || $2 == "*" a { print $1 }' "${checksums}" | head -n 1)"
    [ -n "${expected}" ] || fail "${asset} is absent from the release checksums file"

    actual="$(sha256sum "${file}" | awk '{ print $1 }')"
    [ "${expected}" = "${actual}" ] || fail "sha256 mismatch for ${asset} — refusing to install"
}

install_gitleaks() {
    local version="$1" workdir="$2"
    local asset="gitleaks_${version}_linux_x64.tar.gz"
    local base="https://github.com/gitleaks/gitleaks/releases/download/v${version}"

    if [ -x "${INSTALL_DIR}/gitleaks" ] && [ "$("${INSTALL_DIR}/gitleaks" version 2>/dev/null | tr -d 'v \n')" = "${version}" ]; then
        return 0
    fi

    curl -fsSL "${base}/${asset}" -o "${workdir}/${asset}"
    curl -fsSL "${base}/gitleaks_${version}_checksums.txt" -o "${workdir}/gitleaks_checksums.txt"
    verify_sha256 "${workdir}/${asset}" "${workdir}/gitleaks_checksums.txt" "${asset}"

    tar -xzf "${workdir}/${asset}" -C "${workdir}" gitleaks
    install -m 0755 "${workdir}/gitleaks" "${INSTALL_DIR}/gitleaks"
}

install_sops() {
    local workdir="$1"
    local asset="sops-${SOPS_VERSION}.linux.amd64"
    local base="https://github.com/getsops/sops/releases/download/${SOPS_VERSION}"

    if [ -x "${INSTALL_DIR}/sops" ] && [ "$("${INSTALL_DIR}/sops" --version --disable-version-check 2>/dev/null | awk '{ print $2 }')" = "${SOPS_VERSION#v}" ]; then
        return 0
    fi

    curl -fsSL "${base}/${asset}" -o "${workdir}/${asset}"
    curl -fsSL "${base}/sops-${SOPS_VERSION}.checksums.txt" -o "${workdir}/sops_checksums.txt"
    verify_sha256 "${workdir}/${asset}" "${workdir}/sops_checksums.txt" "${asset}"

    install -m 0755 "${workdir}/${asset}" "${INSTALL_DIR}/sops"
}

install_age() {
    command -v age >/dev/null 2>&1 && command -v age-keygen >/dev/null 2>&1 && return 0
    DEBIAN_FRONTEND=noninteractive sudo -n apt-get install -y age >/dev/null 2>&1 </dev/null
}

# The mitigation for pinning: fires exactly when someone is already touching tooling, at zero CI
# cost. Never fatal — a machine without gh must still be able to install the toolchain.
report_upstream_drift() {
    local pinned="$1" latest
    command -v gh >/dev/null 2>&1 || return 0
    latest="$(gh api repos/gitleaks/gitleaks/releases/latest --jq '.tag_name' 2>/dev/null | tr -d 'v')" || return 0
    [ -n "${latest}" ] || return 0

    if [ "${latest}" != "${pinned}" ]; then
        echo "notice: gitleaks ${latest} is available; ci.yml pins ${pinned}. Bump both together (docs/adr/tech/0032)."
    fi
}

# A same-origin checksum proves transfer integrity, not provenance — this is the only step that
# speaks to who built the artifact, so its result is reported either way rather than swallowed.
report_attestation() {
    local label="$1" file="$2" repo="$3"
    command -v gh >/dev/null 2>&1 || { echo "attestation ${label}: skipped (gh absent)"; return 0; }

    if gh attestation verify "${file}" --repo "${repo}" >/dev/null 2>&1; then
        echo "attestation ${label}: verified against ${repo}"
    else
        echo "attestation ${label}: unavailable (checksum-verified only)"
    fi
}

main() {
    for tool in curl tar sha256sum awk; do
        command -v "${tool}" >/dev/null 2>&1 || fail "${tool} is required but absent"
    done

    mkdir -p "${INSTALL_DIR}"

    local pinned
    pinned="$(read_pinned_gitleaks_version)"

    # Global, not `local`: the EXIT trap runs after main has returned, where a local is already
    # out of scope and `set -u` aborts on it.
    workdir="$(mktemp -d)"
    trap 'rm -rf "${workdir}"' EXIT

    install_gitleaks "${pinned}" "${workdir}"
    install_sops "${workdir}"
    install_age

    echo "gitleaks $("${INSTALL_DIR}/gitleaks" version | tr -d 'v\n') (pinned in .github/workflows/ci.yml)"
    echo "sops $("${INSTALL_DIR}/sops" --version --disable-version-check | awk '{ print $2 }')"
    echo "age $(age --version)"

    report_attestation gitleaks "${INSTALL_DIR}/gitleaks" gitleaks/gitleaks
    report_attestation sops "${INSTALL_DIR}/sops" getsops/sops
    report_upstream_drift "${pinned}"

    case ":${PATH}:" in
        *":${INSTALL_DIR}:"*) ;;
        *) echo "notice: ${INSTALL_DIR} is not on PATH" ;;
    esac
}

main "$@"
