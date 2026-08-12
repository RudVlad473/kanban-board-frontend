import { defineConfig, devices, type PlaywrightTestConfig } from "@playwright/test";

import { E2E_BASE_URL, E2E_EXTERNAL_API_BASE_URL, E2E_PORT, E2E_SESSION_SECRET } from "./e2e/test-env";

const PORT = 6007;

/*
 * Playwright starts every `webServer` array entry regardless of which `--project` was requested
 * (there is no first-party per-project scoping) — so without this, running `--project e2e` would
 * also try to boot the `visual` project's storybook-static server (which doesn't exist unless
 * `build-storybook` already ran), and running `--project visual` would trigger a full `next
 * build`. Reading the requested project(s) straight out of `process.argv` keeps each project's
 * webServer scoped to only the tests that actually need it, without coupling the two servers —
 * the `visual` project itself (below) is otherwise completely unchanged.
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

const visualWebServer: NonNullable<PlaywrightTestConfig["webServer"]> = {
    command: `node scripts/serve-static.mjs storybook-static ${String(PORT)}`,
    url: `http://localhost:${String(PORT)}`,
    reuseExistingServer: !process.env.CI,
};

/*
 * Builds and starts the real application (not a mock/static server) on a fixed port —
 * SESSION_SECRET/EXTERNAL_API_BASE_URL come from `e2e/test-env.ts`, which resolves them from the
 * environment the same way `.github/workflows/ci.yml`'s `e2e` job supplies them, with a
 * test-only fallback matching `vitest.config.ts`'s for local runs.
 */
const e2eWebServer: NonNullable<PlaywrightTestConfig["webServer"]> = {
    command: `pnpm build && pnpm exec next start -p ${String(E2E_PORT)}`,
    url: E2E_BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
        SESSION_SECRET: E2E_SESSION_SECRET,
        EXTERNAL_API_BASE_URL: E2E_EXTERNAL_API_BASE_URL,
    },
};

/*
 * ADR tech/0008: visual regression is Playwright-native `toHaveScreenshot`, scoped to Storybook
 * design-system stories only — the `visual` project's webServer serves the pre-built
 * `storybook-static` output, never a running application. The `e2e` project (plan 01-13) proves
 * AUTH-01/02/03 against the real, built application instead — a different server for a
 * different purpose, deliberately not merged into one.
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
     * D-22 / ADR tech/0008: baselines are only ever asserted-against (and written) in the CI
     * environment. Off-CI, specs still navigate and render — they just don't assert or write
     * screenshots — so a developer can smoke-run this suite locally without corrupting baselines
     * with a Windows-rendered PNG.
     */
    ignoreSnapshots: !process.env.CI,
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
                 * Desktop Chrome's default 1280x720 viewport is far larger than any current
                 * primitive needs — a block/flex story wrapper without an explicit width
                 * stretches to fill it (standard CSS, not a Storybook quirk), so most baselines
                 * were mostly whitespace. 640x480 leaves headroom for a multi-button "Sizes"
                 * story and future, larger primitives (Modal, Dropdown) without the previous
                 * 1280px-wide waste on today's single-control stories.
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
                baseURL: E2E_BASE_URL,
            },
        },
    ],
});
