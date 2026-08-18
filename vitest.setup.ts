import * as a11yAddonAnnotations from "@storybook/addon-a11y/preview";
import { setProjectAnnotations } from "@storybook/react";

/*
 * Registers @testing-library/jest-dom's matchers (toBeDisabled, toHaveAccessibleName, etc.)
 * once for every Vitest Browser Mode test file (D-26).
 */
import "@testing-library/jest-dom/vitest";

import { previewAnnotations } from "./.storybook/preview-annotations";

/*
 * Loads the generated Tailwind v4 @theme stylesheet into every Browser Mode test page, mirroring
 * .storybook/preview.ts's own `import "../src/styles/globals.css"` (D-24's harness pattern).
 * Without this, `getComputedStyle()` assertions against semantic-token-driven classes (variant/
 * size backgrounds, className-merge behaviour — plan 01-06 Task 2) see unstyled browser defaults
 * instead of the real rendered values, since no CSS is otherwise loaded into the browser test page.
 */
import "./src/styles/globals.css";

/*
 * The portable-stories wiring GC-08 calls for — applies the Storybook preview's decorators/
 * parameters/globalTypes (the provider tree, the theme class toggle, the viewport globals, the
 * a11y parameters) to every `composeStories`/`composeStory` call in this "browser" project, so a
 * composed story renders the same way Storybook itself renders it.
 *
 * Sourced from `@storybook/react` (the plain React renderer package `@storybook/nextjs-vite`
 * itself depends on and re-exports from), not from `@storybook/nextjs-vite` directly, and composed
 * from `preview-annotations.tsx` (the raw config `.storybook/preview.tsx` also uses) rather than
 * from `.storybook/preview.tsx` itself. Importing anything from `@storybook/nextjs-vite`'s main
 * entry — or `.storybook/preview.tsx`, which imports `definePreview` from it — unconditionally
 * pulls in that package's browser preview bundle, which eagerly imports real Next.js internals
 * (an unresolvable `sb-original/image-context` virtual module, then `next/dist/client/components/
 * navigation.js`, which reads `process.env` at module-evaluation time) that only resolve under
 * `vite-plugin-storybook-nextjs` — the Vite plugin the "storybook" Vitest project loads via
 * `storybookTest()` and this "browser" project does not, by this project's own design (no Next.js
 * runtime in Vitest Browser Mode; every component under test that needs `next/navigation` already
 * gets its own `vi.mock`). `setProjectAnnotations` accepts an array of annotation objects and
 * composes them (the same mechanism `definePreview`'s own `addons: [...]` composition uses under
 * the hood), so passing the a11y addon's annotations alongside the raw preview config here
 * reproduces `.storybook/preview.tsx`'s own composition without touching the Next.js framework
 * package.
 *
 * This call belongs here — the "browser" project's own setup file — and specifically NOT in
 * `.storybook/vitest.setup.ts` (the "storybook" project's setup file): `@storybook/addon-vitest`
 * detects a `setProjectAnnotations` call there by name and, on finding one, disables its own
 * automatic per-story annotation provisioning, leaving every story without a render function.
 */
setProjectAnnotations([a11yAddonAnnotations, previewAnnotations]);
