import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { DEVICE_TYPE, VIEWPORT_SIZES } from "../src/lib/core/viewport/viewport-breakpoints";

/*
 * Visual-regression baselines for every design-system primitive's stories (ADR tech/0008/0011),
 * once in light scope and once in dark scope — every primitive plan appends its own stories here
 * as they ship, continuous capture rather than an end-of-phase batch.
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
    "components-ui-button--loading", // plan 01-16, Task 1
    // IconButton (plan 01-06, Task 3) — six stories.
    "components-ui-icon-button--default",
    "components-ui-icon-button--ghost",
    "components-ui-icon-button--sizes",
    "components-ui-icon-button--hover",
    "components-ui-icon-button--focus",
    "components-ui-icon-button--disabled",
    "components-ui-icon-button--loading", // plan 01-16, Task 2
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
    "components-ui-text-field--loading", // plan 01-16, Task 1
    // Textarea (plan 04-05, Task 2) — nine stories.
    "components-ui-textarea--idle",
    "components-ui-textarea--focused",
    "components-ui-textarea--filled",
    "components-ui-textarea--error",
    "components-ui-textarea--error-message-without-error",
    "components-ui-textarea--disabled",
    "components-ui-textarea--loading",
    "components-ui-textarea--with-description",
    "components-ui-textarea--long-value",
    // Checkbox (plan 01-07, Task 2) — nine stories.
    "components-ui-checkbox--unchecked",
    "components-ui-checkbox--checked",
    "components-ui-checkbox--hover",
    "components-ui-checkbox--focus",
    "components-ui-checkbox--error",
    "components-ui-checkbox--disabled",
    "components-ui-checkbox--sizes",
    "components-ui-checkbox--checked-with-strikethrough",
    "components-ui-checkbox--unchecked-with-strikethrough-opt-in", // plan 04-05, Task 3
    "components-ui-checkbox--loading", // plan 01-23
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
    "components-ui-dropdown--loading", // plan 01-16, Task 2
    // Modal (plan 01-09, Task 1) — six stories, the seventh and final primitive (D-13/D-28).
    "components-ui-modal--open",
    "components-ui-modal--with-description",
    "components-ui-modal--with-footer-actions",
    "components-ui-modal--long-content",
    "components-ui-modal--closed",
    "components-ui-modal--submitting", // plan 01-25
    // Toast (plan 02-07) — five stories.
    "components-ui-toast--default",
    "components-ui-toast--danger",
    "components-ui-toast--with-action",
    "components-ui-toast--stacked",
    "components-ui-toast--long-content",
    // Menu (plan 02-07) — five stories.
    "components-ui-menu--closed",
    "components-ui-menu--open",
    "components-ui-menu--with-destructive-item",
    "components-ui-menu--with-disabled-item",
    "components-ui-menu--long-item-list",
];

/*
 * Every story is captured at both viewports by having Playwright itself resize the page before
 * navigating, rather than a separate `Mobile*` story export per primitive — Storybook's own
 * `viewport` toolbar can't drive this spec's direct `/iframe.html` navigation (see docs/adr/tech/0011).
 */
const deviceTypes = Object.values(DEVICE_TYPE);

// comment-length-exempt: records the two measured failure modes this mapping exists to rule out, so a future reader does not revert to probing every selector on every story
/*
 * Which Base UI portal a story's subject renders into, keyed by story-id prefix. Driven by the
 * story's identity rather than by probing the DOM, because both probing strategies have measurably
 * failed here (2026-08-27): asking whether a portal EXISTS routed every story into the empty,
 * permanently hidden toast viewport that the global `ToastProvider` decorator mounts, and asking
 * whether one is visible RIGHT NOW raced Base UI's open transition, capturing the trigger instead
 * of the popup on a slower machine. The story id is the one signal available before the render.
 */
const PORTAL_SELECTOR_BY_PREFIX = [
    ["components-ui-toast--", '[role="region"][aria-live="polite"]'],
    ["components-ui-menu--", '[role="menu"]'],
    ["components-ui-modal--", '[role="dialog"]'],
] as const;

/* Bounded so a deliberately-closed story (`menu--closed`) falls back to its trigger, not a failure. */
const PORTAL_WAIT_MS = 5_000;

const gotoStory = async ({ page, url, storyId }: { page: Page; url: string; storyId: string }) => {
    await page.goto(url);
    /*
     * Anchor on the story's own root first — a portalled story still mounts its trigger here, so
     * this wait is always satisfiable, and it doubles as the fallback target (ADR tech/0011).
     */
    const root = page.locator("#storybook-root > *").first();
    await root.waitFor({ state: "visible" });

    const portal = PORTAL_SELECTOR_BY_PREFIX.find(([prefix]) => storyId.startsWith(prefix));
    if (portal) {
        /*
         * `visible=true` picks the first VISIBLE match, never merely the first — the hidden global
         * toast viewport is always element zero and would otherwise win every toast story.
         */
        const candidate = page.locator(`${portal[1]} >> visible=true`).first();
        try {
            await candidate.waitFor({ state: "visible", timeout: PORTAL_WAIT_MS });
            return candidate;
        } catch {
            return root;
        }
    }
    return root;
};

/*
 * Screenshotting the story's root element, not the full page, crops to its actual rendered bounds
 * instead of mostly wasted whitespace, and scales for larger primitives without a hand-picked
 * viewport size per story (see docs/adr/tech/0011).
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
            const root = await gotoStory({
                page,
                storyId,
                url: `/iframe.html?id=${storyId}&viewMode=story&globals=theme:light`,
            });
            await expect(root).toHaveScreenshot(`${storyId}-${deviceLabel}-light.png`);
        });

        test(`${storyId} — ${deviceLabel} — dark`, async ({ page }) => {
            await page.setViewportSize(viewportSize);
            const root = await gotoStory({
                page,
                storyId,
                url: `/iframe.html?id=${storyId}&viewMode=story&globals=theme:dark`,
            });
            await expect(root).toHaveScreenshot(`${storyId}-${deviceLabel}-dark.png`);
        });
    }
}
