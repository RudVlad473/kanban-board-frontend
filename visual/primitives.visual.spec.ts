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
// for that real, now-pending load to finish.
//
// `document.fonts.ready` resolving is not the same instant as the browser having PAINTED the
// swapped-in font — there is a further layout/paint cycle between the promise settling and the
// pixels actually reflecting it. This was verified to be a genuine race (not just "add any
// delay and it goes away"): re-running the exact same command repeatedly reproduced both a
// fallback-font screenshot and a correct one, with no code difference between runs — the only
// reliable fix is to explicitly wait for a rendered frame after the promise resolves, not to
// rely on incidental delays elsewhere in the test (a console.log() before the earlier attempt
// happened to "fix" it by accident, which is what exposed this as a race rather than a stable
// win/lose split by test-file shape).
async function gotoStoryAndWaitForFonts(page: import("@playwright/test").Page, url: string) {
    await page.goto(url);
    // #storybook-root exists as an empty shell before the story mounts — wait for an actual
    // child, not just the container, or this resolves before any content (and thus any font
    // request) exists.
    await page.locator("#storybook-root > *").first().waitFor({ state: "visible" });
    await page.evaluate(() => document.fonts.ready);
    // Two animation frames: the first is guaranteed scheduled after the current style/layout
    // pass that the font swap triggered; the second guarantees that frame was actually
    // presented, not just queued. One rAF alone was insufficient in local repro testing.
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
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
