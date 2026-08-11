import { expect, test } from "@playwright/test";

// Visual-regression baselines for the harness-probe smoke component's four stories (D-22,
// ADR tech/0008) — once in light scope and once in dark scope, so both mode scopes carry a
// baseline from the very first component onward. Every later primitive plan appends its own
// stories to this same spec as they ship (continuous capture, not an end-of-phase batch).
//
// This file, and the harness-probe stories it screenshots, are deleted by plan 01-06 once
// Button — the first real primitive — carries its own visual baseline.
const storyIds = [
    "components-ui-harness-probe--default",
    "components-ui-harness-probe--hovered",
    "components-ui-harness-probe--focused",
    "components-ui-harness-probe--disabled",
];

for (const storyId of storyIds) {
    test(`${storyId} — light`, async ({ page }) => {
        await page.goto(`/iframe.html?id=${storyId}&viewMode=story&globals=theme:light`);
        await expect(page).toHaveScreenshot(`${storyId}-light.png`);
    });

    test(`${storyId} — dark`, async ({ page }) => {
        await page.goto(`/iframe.html?id=${storyId}&viewMode=story&globals=theme:dark`);
        await expect(page).toHaveScreenshot(`${storyId}-dark.png`);
    });
}
