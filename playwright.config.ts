import { defineConfig, devices, type PlaywrightTestConfig } from "@playwright/test";

import { E2E_CONFIG } from "./e2e/test-env";

/* `.env.local` is loaded by `e2e/test-env.ts`, not here — doing it here ran too late (see its note). */

const PORT = 6007;

/*
 * Playwright starts every `webServer` array entry regardless of `--project` — reading the
 * requested project(s) out of `process.argv` scopes each webServer to only what it needs (e.g.
 * `--project e2e` shouldn't need a storybook build first).
 */
const requestedProjects = process.argv.flatMap((arg, index, argv) => {
    if (arg === "--project") {
        const next = argv[index + 1];
        return next ? [next] : [];
    }
    if (arg.startsWith("--project=")) {
        return [arg.slice("--project=".length)];
    }
    return [];
});

const runsOnlyProject = (name: string): boolean =>
    requestedProjects.length > 0 && requestedProjects.every((project) => project === name);

/*
 * `smoke` needs exactly what `e2e` needs — the built application and the reset-backed
 * setup/teardown — so every gate below asks about the pair rather than about `e2e` alone.
 */
const APP_BACKED_PROJECTS = ["e2e", "smoke"];

const runsOnlyAppBackedProjects = (): boolean =>
    requestedProjects.length > 0 && requestedProjects.every((project) => APP_BACKED_PROJECTS.includes(project));

/*
 * An unfiltered invocation (no `--project` at all) runs every project, `e2e` included — so the
 * reset-capability precondition below must apply then too, not only when `e2e` is named
 * explicitly.
 */
const includesAppBackedProject = (): boolean =>
    requestedProjects.length === 0 || requestedProjects.some((project) => APP_BACKED_PROJECTS.includes(project));

const visualWebServer: NonNullable<PlaywrightTestConfig["webServer"]> = {
    command: `node scripts/serve-static.mjs storybook-static ${String(PORT)}`,
    url: `http://localhost:${String(PORT)}`,
    reuseExistingServer: !process.env.CI,
};

/*
 * Builds and starts the real application (not a mock/static server) — `SESSION_SECRET`/
 * `EXTERNAL_API_BASE_URL` come from `e2e/test-env.ts`, matching `.github/workflows/ci.yml`'s `e2e`
 * job with a local test-only fallback.
 */
const e2eWebServer: NonNullable<PlaywrightTestConfig["webServer"]> = {
    command: `pnpm build && pnpm exec next start -p ${String(E2E_CONFIG.PORT)}`,
    url: E2E_CONFIG.BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
        SESSION_SECRET: E2E_CONFIG.SESSION_SECRET,
        EXTERNAL_API_BASE_URL: E2E_CONFIG.EXTERNAL_API_BASE_URL,
    },
};

/*
 * ADR tech/0008: visual regression is Playwright-native `toHaveScreenshot`, scoped to Storybook
 * stories only — its webServer serves pre-built `storybook-static`, never a running application.
 * `e2e` proves AUTH-01/02/03 against the real built app instead — deliberately separate servers.
 */
export default defineConfig({
    testDir: "./visual",
    testMatch: "**/*.visual.spec.ts",
    // comment-length-exempt: records that both CI upload steps were silently uploading nothing, which is why a CI-only failure had no evidence to debug from
    /*
     * Both CI jobs already carry an `if: failure()` "Upload Playwright report" step pointing at
     * `playwright-report/`, but nothing ever wrote that directory: no reporter was configured, so CI
     * got the default `dot` and the upload silently produced no artifact. A CI-only failure was
     * therefore undebuggable by construction — found 2026-08-27 chasing exactly one. The trace is
     * what makes the next such failure answerable instead of a guess.
     */
    reporter: process.env.CI ? [["html", { open: "never" }], ["dot"]] : "list",
    use: { trace: "retain-on-failure" },
    expect: {
        toHaveScreenshot: {
            maxDiffPixelRatio: 0.01,
        },
    },
    snapshotPathTemplate: "visual/__screenshots__/{testFilePath}/{arg}{ext}",
    /*
     * ADR tech/0008: baselines are only asserted-against/written in CI. Off-CI, specs still
     * navigate/render but don't assert/write, so a developer can smoke-run locally without
     * corrupting baselines with a Windows-rendered PNG.
     */
    ignoreSnapshots: !process.env.CI,
    /*
     * `e2e` creates real accounts on the shared nonprod backend: `globalSetup` refuses to run
     * without a working reset capability, and `globalTeardown` deletes only what this run
     * registered (`SETUP.md`) — both wired in only when this run actually includes `e2e`.
     */
    globalSetup: includesAppBackedProject() ? "./e2e/global-setup.ts" : undefined,
    globalTeardown: includesAppBackedProject() ? "./e2e/global-teardown.ts" : undefined,
    webServer: runsOnlyProject("visual")
        ? visualWebServer
        : runsOnlyAppBackedProjects()
          ? e2eWebServer
          : [visualWebServer, e2eWebServer],
    projects: [
        {
            name: "visual",
            use: {
                ...devices["Desktop Chrome"],
                baseURL: `http://localhost:${String(PORT)}`,
                /*
                 * Desktop Chrome's default 1280x720 is far larger than any primitive needs — an
                 * unstretched story wrapper made most baselines mostly whitespace. 640x480 leaves
                 * headroom for larger primitives without that waste.
                 */
                viewport: { width: 640, height: 480 },
            },
        },
        {
            name: "e2e",
            testDir: "./e2e",
            testMatch: "**/*.e2e.spec.ts",
            /*
             * The full-app smoke is deliberately out of CI (see its own header), but it matched this
             * glob and ran there anyway for its first four days — the exclusion was decided and
             * never implemented. `smoke` below is how to run it.
             */
            testIgnore: "**/full-app.e2e.spec.ts",
            // comment-length-exempt: records the measurement that justifies retries here and the one failure mode they must NOT hide, which is what stops the next reader from raising or deleting them
            /*
             * CI-only, because this project is the one bound to the shared nonprod backend over the
             * public internet, and that host intermittently refuses TCP outright — measured
             * 2026-09-05: `curl: (28) Failed to connect ... after 134812 ms`, reproduced from both a
             * GitHub runner and a local box. One such drop among 73 tests failed the whole job three
             * runs running, each time on DIFFERENT tests, against frontend code byte-identical to a
             * passing run.
             *
             * Two retries buy tolerance for a transient host, not for a flaky assertion: a real
             * regression fails all three attempts, so the job still goes red. Read the retry counts
             * rather than only the pass/fail — a test that is consistently `flaky` is a defect this
             * setting is hiding, and the right response is to fix it, never to raise this number.
             */
            retries: process.env.CI ? 2 : 0,
            use: {
                ...devices["Desktop Chrome"],
                baseURL: E2E_CONFIG.BASE_URL,
            },
        },
        {
            name: "smoke",
            testDir: "./e2e",
            testMatch: "**/full-app.e2e.spec.ts",
            use: {
                ...devices["Desktop Chrome"],
                baseURL: E2E_CONFIG.BASE_URL,
            },
        },
    ],
});
