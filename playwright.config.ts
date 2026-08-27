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
 * An unfiltered invocation (no `--project` at all) runs every project, `e2e` included — so the
 * reset-capability precondition below must apply then too, not only when `e2e` is named
 * explicitly.
 */
const includesProject = (name: string): boolean => requestedProjects.length === 0 || requestedProjects.includes(name);

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
     * `e2e` creates real accounts on the shared nonprod backend and refuses to run at all without
     * a working reset capability (`e2e/global-setup.ts`, `SETUP.md`) — a hard precondition, only
     * wired in when this run actually includes `e2e`.
     */
    globalSetup: includesProject("e2e") ? "./e2e/global-setup.ts" : undefined,
    webServer: runsOnlyProject("visual")
        ? visualWebServer
        : runsOnlyProject("e2e")
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
            use: {
                ...devices["Desktop Chrome"],
                baseURL: E2E_CONFIG.BASE_URL,
            },
        },
    ],
});
