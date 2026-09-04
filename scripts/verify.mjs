#!/usr/bin/env node
/*
 * Fast checks spawn as direct `node scripts/check-*.mjs`, never `pnpm run <alias>` — the spike at
 * .planning/quick/spike-pnpm-startup-and-pre-push-gates.md measured ~700ms/script saved. Heavy
 * steps keep CI's literal `pnpm <cmd>` because check-ci-gate-coverage.mjs compares it to ci.yml.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseEnv } from "node:util";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const checkStep = ({ id, checkFileName, ciAlias }) => ({
    id,
    argv: [process.execPath, path.join("scripts", `check-${checkFileName}.mjs`)],
    ciCommand: `pnpm ${ciAlias}`,
});

const heavyStep = ({ id, ciCommand }) => ({
    id,
    argv: ciCommand.split(" "),
    ciCommand,
});

/*
 * Presence-only (e2e/global-setup.ts already throws its own named error for an absent/invalid
 * token) — mirrors e2e/test-env.ts's own `.env.local` read, but never assigns process.env, so
 * the token value is never forwarded from here.
 */
const hasResetToken = () => {
    if (process.env.NONPROD_RESET_TOKEN) return true;

    const envPath = path.join(repoRoot, ".env.local");
    if (!existsSync(envPath)) return false;

    return Object.hasOwn(parseEnv(readFileSync(envPath, "utf8")), "NONPROD_RESET_TOKEN");
};

const e2ePreflight = {
    id: "e2e-preflight",
    argv: [],
    ciCommand: undefined,
    check: () => {
        if (hasResetToken()) return { ok: true };

        return {
            ok: false,
            message:
                "NONPROD_RESET_TOKEN is not set in the environment or .env.local. The e2e step below " +
                "creates real accounts on the shared nonprod backend and refuses to run without it. " +
                "Run `pnpm secrets:decrypt`.",
        };
    },
};

export const VERIFY_STEPS = [
    e2ePreflight,
    checkStep({ id: "secrets", checkFileName: "secrets-encrypted", ciAlias: "secrets:check" }),
    checkStep({ id: "folders", checkFileName: "component-folders", ciAlias: "folders:check" }),
    checkStep({ id: "actions", checkFileName: "action-verbs", ciAlias: "actions:check" }),
    checkStep({ id: "handlers", checkFileName: "no-route-handlers", ciAlias: "handlers:check" }),
    checkStep({ id: "gates", checkFileName: "ci-gate-coverage", ciAlias: "gates:check" }),
    checkStep({ id: "stories", checkFileName: "no-play-functions", ciAlias: "stories:check" }),
    checkStep({ id: "coverage", checkFileName: "coverage-pointers", ciAlias: "coverage:check" }),
    checkStep({ id: "routes", checkFileName: "routes", ciAlias: "routes:check" }),
    checkStep({ id: "comments", checkFileName: "comment-length", ciAlias: "comments:check" }),
    checkStep({ id: "tsx", checkFileName: "tsx-declarations", ciAlias: "tsx:check" }),
    checkStep({ id: "renders", checkFileName: "story-only-renders", ciAlias: "renders:check" }),
    heavyStep({ id: "api-generate", ciCommand: "pnpm api:generate" }),
    heavyStep({
        id: "api-drift",
        ciCommand: "git diff --exit-code src/lib/core/api-contract/generated-types.ts",
    }),
    heavyStep({ id: "typegen", ciCommand: "pnpm exec next typegen" }),
    heavyStep({ id: "format", ciCommand: "pnpm format:check" }),
    heavyStep({ id: "build", ciCommand: "pnpm build" }),
    heavyStep({ id: "lint", ciCommand: "pnpm lint" }),
    heavyStep({ id: "test", ciCommand: "pnpm test" }),
    heavyStep({ id: "e2e", ciCommand: "pnpm exec playwright test --project e2e" }),
];

const formatMs = (ms) => `${String(Math.round(ms))}ms`;

const printList = () => {
    console.log(`pnpm verify — ${String(VERIFY_STEPS.length)} ordered gates\n`);
    for (const step of VERIFY_STEPS) {
        const spawned = step.argv.length > 0 ? step.argv.join(" ") : "(in-process check)";
        console.log(`  ${step.id}`);
        console.log(`    spawns: ${spawned}`);
        console.log(`    ci:     ${step.ciCommand ?? "(local-only, no CI equivalent)"}`);
    }
};

const runStep = (step) => {
    if (typeof step.check === "function") return step.check();

    const result = spawnSync(step.argv[0], step.argv.slice(1), { stdio: "inherit", cwd: repoRoot });
    return { ok: result.status === 0 };
};

const printFailure = ({ step, elapsed, total, message }) => {
    console.error(`\n[${step.id}] FAILED after ${formatMs(elapsed)} (total ${formatMs(total)})`);
    if (message) console.error(message);

    const reRun = step.argv.length > 0 ? step.argv.join(" ") : "pnpm secrets:decrypt";
    console.error(`Re-run alone: ${reRun}`);

    if (step.id === "e2e") {
        console.error(
            "\nThe e2e step dials the shared nonprod backend: a 401 from a seed helper may mean an " +
                "account was evicted mid-session rather than a code defect. e2e/global-setup.ts refuses " +
                "with its own named message when the reset probe fails.",
        );
    }
};

const runCli = () => {
    if (process.argv.includes("--list")) {
        printList();
        return;
    }

    let total = 0;

    for (const step of VERIFY_STEPS) {
        const start = performance.now();
        const { ok, message } = runStep(step);
        const elapsed = performance.now() - start;
        total += elapsed;

        if (!ok) {
            printFailure({ step, elapsed, total, message });
            process.exit(1);
        }

        console.log(`[${step.id}] ok (${formatMs(elapsed)}, total ${formatMs(total)})`);
    }

    console.log(`\npnpm verify passed — ${String(VERIFY_STEPS.length)} steps, total ${formatMs(total)}`);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    runCli();
}
