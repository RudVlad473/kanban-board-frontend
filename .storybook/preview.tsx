import "../src/styles/globals.css";

/*
 * Addon-composition API: the entire preview module namespace
 * (decorators/parameters/initialGlobals/afterEach) is the addon's contract for `addons: [...]`.
 */
import * as a11yAddonAnnotations from "@storybook/addon-a11y/preview";
import { definePreview } from "@storybook/nextjs-vite";

/*
 * Named viewports match this project's own breakpoint tokens rather than Storybook's built-in
 * device presets, sized from the shared `viewport-breakpoints.ts` module so Storybook, Playwright,
 * and Vitest stay numerically identical (see docs/adr/tech/0010).
 */
import { previewAnnotations } from "./preview-annotations";

/*
 * `parameters`/`globalTypes`/`initialGlobals`/`decorators` live in `preview-annotations.tsx`
 * instead, so `vitest.setup.ts` can register them without this file's `@storybook/nextjs-vite`
 * import (see docs/adr/tech/0021).
 */

export default definePreview({
    addons: [a11yAddonAnnotations],
    ...previewAnnotations,
});
