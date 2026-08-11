import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { DEVICE_TYPE, VIEWPORT_SIZES } from "../src/lib/viewport-breakpoints";

/*
 * Visual-regression baselines for every design-system primitive's stories (D-22, ADR tech/0008)
 * — once in light scope and once in dark scope. Every primitive plan appends its own stories to
 * this same spec as they ship (continuous capture, not an end-of-phase batch).
 *
 * The temporary harness smoke-test component that originally seeded this file (D-24) was
 * retired by plan 01-06 once Button and IconButton — the first two real primitives — carried
 * their own baselines.
 */
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
    // TextField (plan 01-07, Task 1) — nine stories.
    "components-ui-text-field--idle",
    "components-ui-text-field--focused",
    "components-ui-text-field--filled",
    "components-ui-text-field--error",
    "components-ui-text-field--disabled",
    "components-ui-text-field--with-description",
    "components-ui-text-field--password",
    "components-ui-text-field--sizes",
    "components-ui-text-field--long-value",
    // Checkbox (plan 01-07, Task 2) — eight stories.
    "components-ui-checkbox--unchecked",
    "components-ui-checkbox--checked",
    "components-ui-checkbox--hover",
    "components-ui-checkbox--focus",
    "components-ui-checkbox--error",
    "components-ui-checkbox--disabled",
    "components-ui-checkbox--sizes",
    "components-ui-checkbox--checked-with-strikethrough",
    // Switch (plan 01-08, Task 1) — seven stories.
    "components-ui-switch--off",
    "components-ui-switch--on",
    "components-ui-switch--hover",
    "components-ui-switch--focus",
    "components-ui-switch--disabled",
    "components-ui-switch--sizes",
    "components-ui-switch--with-icons",
    // Dropdown (plan 01-08, Task 2) — seven stories.
    "components-ui-dropdown--closed",
    "components-ui-dropdown--open",
    "components-ui-dropdown--with-selection",
    "components-ui-dropdown--error",
    "components-ui-dropdown--disabled-item",
    "components-ui-dropdown--disabled",
    "components-ui-dropdown--long-item-list",
    // Modal (plan 01-09, Task 1) — five stories, the seventh and final primitive (D-13/D-28).
    "components-ui-modal--open",
    "components-ui-modal--with-description",
    "components-ui-modal--with-footer-actions",
    "components-ui-modal--long-content",
    "components-ui-modal--closed",
];

/*
 * ADR tech/0010: every story above is captured at both viewports — Playwright itself resizes the
 * page before navigating (`page.setViewportSize`, driven by the same shared
 * `src/lib/viewport-breakpoints.ts` sizes `.storybook/preview.ts`'s toolbar control and the
 * Vitest dual-viewport test util both read) — rather than a separate `Mobile*` story export per
 * primitive. Storybook's own `viewport` global/toolbar only resizes a nested manager iframe that
 * doesn't exist when a test navigates directly to `/iframe.html` the way this spec does, so it
 * can't drive the real viewport here; the page's own size is what actually needs to change for
 * `md:`/`lg:` Tailwind classes to evaluate correctly.
 */
const deviceTypes = Object.values(DEVICE_TYPE);

const gotoStory = async (page: Page, url: string) => {
    await page.goto(url);
    /*
     * Modal is the one primitive whose actual visible surface does not live inside
     * #storybook-root at all: Base UI's Dialog.Portal (D-15) renders the Backdrop/Popup into
     * document.body by design, so an open Modal story's #storybook-root child is just its
     * (visually empty) Trigger button — screenshotting that would produce a meaningless baseline.
     * Prefer the portalled `[role="dialog"]` element when present; every other primitive (none of
     * which render role="dialog") falls through to the pre-existing #storybook-root behavior
     * unchanged.
     */
    const dialog = page.locator('[role="dialog"]');
    if ((await dialog.count()) > 0) {
        const dialogRoot = dialog.first();
        await dialogRoot.waitFor({ state: "visible" });
        return dialogRoot;
    }
    /*
     * #storybook-root itself is a full-width block (its own bounding box stretches to the
     * viewport regardless of content), so the screenshot target is its first real child — the
     * story's own single root element (every story here renders one root: a bare primitive, or
     * a wrapping <div> for multi-element stories like "Sizes") — not the shell around it.
     */
    const root = page.locator("#storybook-root > *").first();
    await root.waitFor({ state: "visible" });
    return root;
};

/*
 * Screenshotting the story's root element (not the page, not even #storybook-root) crops to its
 * actual rendered bounds instead of the full page viewport — most primitives take up under 10% of
 * that, so a full-page capture was mostly wasted whitespace in every baseline and every
 * comparison. This also scales correctly for future, larger primitives (Modal, Dropdown) without
 * needing a hand-picked viewport size per story.
 */
for (const storyId of storyIds) {
    for (const deviceType of deviceTypes) {
        const viewportSize = VIEWPORT_SIZES[deviceType];
        /*
         * Baseline filenames read `{storyId}-{desktop|mobile}-{light|dark}.png` — device before
         * theme, matching the order the two axes are chosen in (viewport first, then color scheme).
         */
        const deviceLabel = deviceType.toLowerCase();

        test(`${storyId} — ${deviceLabel} — light`, async ({ page }) => {
            await page.setViewportSize(viewportSize);
            const root = await gotoStory(page, `/iframe.html?id=${storyId}&viewMode=story&globals=theme:light`);
            await expect(root).toHaveScreenshot(`${storyId}-${deviceLabel}-light.png`);
        });

        test(`${storyId} — ${deviceLabel} — dark`, async ({ page }) => {
            await page.setViewportSize(viewportSize);
            const root = await gotoStory(page, `/iframe.html?id=${storyId}&viewMode=story&globals=theme:dark`);
            await expect(root).toHaveScreenshot(`${storyId}-${deviceLabel}-dark.png`);
        });
    }
}
