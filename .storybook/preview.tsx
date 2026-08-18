import "../src/styles/globals.css";

/*
 * Addon-composition API: the entire preview module namespace
 * (decorators/parameters/initialGlobals/afterEach) is the addon's contract for `addons: [...]`.
 */
import * as a11yAddonAnnotations from "@storybook/addon-a11y/preview";
import { definePreview } from "@storybook/nextjs-vite";

import { previewAnnotations } from "./preview-annotations";

/*
 * ADR tech/0010: two named viewports matching this project's own breakpoint tokens
 * (src/styles/tokens.css `--breakpoint-sm`/`--breakpoint-lg`, DTCG `breakpoint.mobile`/
 * `breakpoint.desktop`) rather than Storybook's built-in device presets (iPhone X, iPad, ...),
 * which don't line up with the tokens mobile-first CSS is actually written against. The
 * `viewport` parameter/global is Storybook core in this version (10.5.7) — no separate addon
 * package needed, only this configuration. Sizes come from the shared
 * `src/lib/viewport-breakpoints.ts` module (also read by the Playwright visual spec and the
 * Vitest dual-viewport test util) so all three stay numerically identical by construction.
 *
 * The actual parameters/globalTypes/initialGlobals/decorators values live in
 * `preview-annotations.tsx` (plan 01-21, GC-08) — extracted so `vitest.setup.ts` can register the
 * exact same project annotations for the "browser" Vitest project without importing this file
 * (which pulls in `@storybook/nextjs-vite`'s `definePreview`, unusable outside the "storybook"
 * project — see that file's own doc comment for the full rationale).
 */

export default definePreview({
    addons: [a11yAddonAnnotations],
    ...previewAnnotations,
});
