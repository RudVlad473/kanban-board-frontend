#!/usr/bin/env node
/*
 * Fails when the locally installed gitleaks is not the release CI pins. Two scanners at different
 * versions enforce different rule sets, so a local "clean" would say nothing about CI's verdict.
 * .github/workflows/ci.yml owns the version; this script only reads it (docs/adr/tech/0032).
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const CI_WORKFLOW_PATH = ".github/workflows/ci.yml";

const REMEDY = "pnpm tools:install";

const PIN_PATTERN = /GITLEAKS_VERSION:\s*"?v?(\d+\.\d+\.\d+)"?/g;

/** gitleaks 8.30.1 prints a bare `8.30.1`; older builds prefixed a `v`, so both normalise here. */
export const normalizeVersion = (raw) => raw.trim().replace(/^v/, "");

export const findPinnedVersions = ({ workflow }) => [...workflow.matchAll(PIN_PATTERN)].map((match) => match[1]);

/*
 * Fails closed in every unresolved case. A parser that found no pin must not report agreement, and
 * a hook that silently passes when the scanner is absent is worse than no hook at all.
 */
export const checkGitleaksVersion = ({ workflow, installedVersion }) => {
    const pins = findPinnedVersions({ workflow });

    if (pins.length === 0) {
        return [
            { kind: "no-pin", detail: `${CI_WORKFLOW_PATH} carries no GITLEAKS_VERSION pin to hold this machine to` },
        ];
    }

    if (pins.length > 1) {
        return [
            {
                kind: "ambiguous-pin",
                detail: `${CI_WORKFLOW_PATH} carries ${String(pins.length)} GITLEAKS_VERSION assignments; exactly one is the single source of truth`,
            },
        ];
    }

    const pinned = normalizeVersion(pins[0]);

    if (installedVersion === null) {
        return [{ kind: "absent", detail: `gitleaks is not installed (CI pins ${pinned}). Run \`${REMEDY}\`` }];
    }

    const installed = normalizeVersion(installedVersion);

    if (installed !== pinned) {
        return [
            {
                kind: "drift",
                detail: `local gitleaks is ${installed}, CI pins ${pinned}. Run \`${REMEDY}\``,
            },
        ];
    }

    return [];
};

const readInstalledVersion = () => {
    try {
        return execFileSync("gitleaks", ["version"], { encoding: "utf8" });
    } catch {
        return null;
    }
};

const runCli = () => {
    const violations = checkGitleaksVersion({
        workflow: readFileSync(path.resolve(repoRoot, CI_WORKFLOW_PATH), "utf8"),
        installedVersion: readInstalledVersion(),
    });

    if (violations.length > 0) {
        console.error("gitleaks:check failed — the local scanner must be the same release CI runs.\n");
        for (const violation of violations) {
            console.error(`  ${violation.detail}`);
        }
        process.exit(1);
    }

    console.log(`gitleaks:check passed — local gitleaks matches the version pinned in ${CI_WORKFLOW_PATH}.`);
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    runCli();
}
