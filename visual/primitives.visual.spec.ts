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

// `@font-face` only triggers a font fetch once something on the page actually needs to paint
// with that family — `document.fonts.ready` resolves trivially (nothing pending) if checked
// before Storybook has mounted the story into #storybook-root, so the wait order matters: the
// story's root content must exist FIRST (so the browser has actually started the woff2 request
// self-hosted via font-display: swap, src/styles/fonts.css), then `document.fonts.ready` waits
// for that real, now-pending load to finish. `toHaveScreenshot`'s own stability polling accepts
// the FIRST visually-stable frame it sees — on a slower/differently-scheduled CI runner that can
// land after the fallback font paints but before the real font finishes downloading and swaps
// in, silently baselining every story against the wrong typeface even though the page mounted
// correctly. Confirmed via a CI-side diagnostic run (see git history around this commit).
async function gotoStoryAndWaitForFonts(page: import("@playwright/test").Page, url: string) {
    await page.goto(url);
    // #storybook-root exists as an empty shell before the story mounts — wait for an actual
    // child, not just the container, or this resolves before any content (and thus any font
    // request) exists.
    await page.locator("#storybook-root > *").first().waitFor({ state: "visible" });
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
