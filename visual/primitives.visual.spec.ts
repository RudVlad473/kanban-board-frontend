import { expect, test } from "@playwright/test";

// Visual-regression baselines for every design-system primitive's stories (D-22, ADR tech/0008)
// — once in light scope and once in dark scope. Every primitive plan appends its own stories to
// this same spec as they ship (continuous capture, not an end-of-phase batch).
//
// The temporary harness smoke-test component that originally seeded this file (D-24) was
// retired by plan 01-06 once Button and IconButton — the first two real primitives — carried
// their own baselines.
const storyIds = [
    // Button (plan 01-06, Task 2) — seven stories.
    "components-ui-button--primary",
    "components-ui-button--secondary",
    "components-ui-button--destructive",
    "components-ui-button--sizes",
    "components-ui-button--hover",
    "components-ui-button--focus",
    "components-ui-button--disabled",
    // IconButton (plan 01-06, Task 3) — six stories.
    "components-ui-icon-button--default",
    "components-ui-icon-button--ghost",
    "components-ui-icon-button--sizes",
    "components-ui-icon-button--hover",
    "components-ui-icon-button--focus",
    "components-ui-icon-button--disabled",
];

// Playwright's `toHaveScreenshot` waits for the page to settle (network idle, no in-flight
// animations) but NOT for `document.fonts.ready` — self-hosted @font-face uses `font-display:
// swap` (src/styles/fonts.css), which paints the fallback font immediately and swaps to the
// real one once the woff2 finishes downloading. On a fast local machine that swap usually
// completes before Playwright captures the screenshot, masking the race; a slower/differently
// scheduled CI runner reliably wins the race the other way, silently baselining every story
// against the wrong typeface. Waiting on the Font Loading API's own readiness promise removes
// the race entirely, regardless of environment speed.
async function gotoStoryAndWaitForFonts(page: import("@playwright/test").Page, url: string) {
    await page.goto(url);
    await page.evaluate(() => document.fonts.ready);
}

for (const storyId of storyIds) {
    test(`${storyId} — light`, async ({ page }) => {
        await gotoStoryAndWaitForFonts(page, `/iframe.html?id=${storyId}&viewMode=story&globals=theme:light`);
        await expect(page).toHaveScreenshot(`${storyId}-light.png`);
    });

    test(`${storyId} — dark`, async ({ page }) => {
        await gotoStoryAndWaitForFonts(page, `/iframe.html?id=${storyId}&viewMode=story&globals=theme:dark`);
        await expect(page).toHaveScreenshot(`${storyId}-dark.png`);
    });
}
