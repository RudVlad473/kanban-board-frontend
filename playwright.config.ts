import { defineConfig, devices } from "@playwright/test";

const PORT = 6007;

// ADR tech/0008: visual regression is Playwright-native `toHaveScreenshot`, scoped to Storybook
// design-system stories only — the webServer below serves the pre-built `storybook-static`
// output, never a running application.
export default defineConfig({
    testDir: "./visual",
    testMatch: "**/*.visual.spec.ts",
    expect: {
        toHaveScreenshot: {
            maxDiffPixelRatio: 0.01,
        },
    },
    snapshotPathTemplate: "visual/__screenshots__/{testFilePath}/{arg}{ext}",
    // D-22 / ADR tech/0008: baselines are only ever asserted-against (and written) in the CI
    // environment. Off-CI, specs still navigate and render — they just don't assert or write
    // screenshots — so a developer can smoke-run this suite locally without corrupting baselines
    // with a Windows-rendered PNG.
    ignoreSnapshots: !process.env.CI,
    webServer: {
        command: `node scripts/serve-static.mjs storybook-static ${String(PORT)}`,
        url: `http://localhost:${String(PORT)}`,
        reuseExistingServer: !process.env.CI,
    },
    projects: [
        {
            name: "visual",
            use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${String(PORT)}` },
        },
    ],
});
