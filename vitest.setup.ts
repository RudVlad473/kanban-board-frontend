import * as a11yAddonAnnotations from "@storybook/addon-a11y/preview";
/*
 * Sourced from `@storybook/react`, not `@storybook/nextjs-vite` — the latter's main entry eagerly
 * loads real Next.js internals that only resolve under the Vite plugin the "storybook" project
 * loads and this "browser" project does not (see docs/adr/tech/0021).
 */
import { setProjectAnnotations } from "@storybook/react";
/*
 * Passed to `setProjectAnnotations` below as `testingLibraryRender`, so `composeStories`' `.run()`
 * uses RTL's own tracked `render()` instead of an untracked fallback whose DOM leaks into later
 * tests (D-08 retrofit finding).
 */
import { render } from "@testing-library/react";

/*
 * Registers @testing-library/jest-dom's matchers (toBeDisabled, toHaveAccessibleName, etc.)
 * once for every Vitest Browser Mode test file (D-26).
 */
import "@testing-library/jest-dom/vitest";

import { previewAnnotations } from "./.storybook/preview-annotations";

/*
 * Loads the generated Tailwind v4 @theme stylesheet into every Browser Mode test page (D-24's
 * harness pattern), mirroring `.storybook/preview.ts` — without it, style-driven assertions see
 * unstyled browser defaults instead of real rendered values.
 */
import "./src/styles/globals.css";

/*
 * Applies the Storybook preview's decorators/parameters to every composed story here. Must live in
 * this "browser" setup file, not `.storybook/vitest.setup.ts` — `@storybook/addon-vitest` detects
 * the call there by name and disables its own per-story provisioning (see docs/adr/tech/0021).
 */
setProjectAnnotations([a11yAddonAnnotations, previewAnnotations, { testingLibraryRender: render }]);
