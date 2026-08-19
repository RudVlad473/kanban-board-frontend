import type { Decorator } from "@storybook/react";

import { DEVICE_TYPE, VIEWPORT_SIZES } from "@/lib/core/viewport/viewport-breakpoints";
import { QueryProvider } from "@/lib/query-client";

/*
 * The raw project-annotations object `.storybook/preview.tsx` passes into `definePreview` —
 * extracted to its own module (no `@storybook/nextjs-vite` import here, deliberately) so
 * `vitest.setup.ts` can register the exact same decorators/parameters/globalTypes/initialGlobals
 * for the "browser" Vitest project via `@storybook/react`'s framework-agnostic
 * `setProjectAnnotations`, without pulling in `@storybook/nextjs-vite`'s browser preview bundle.
 * That bundle unconditionally imports real Next.js internals (an unresolvable `sb-original/
 * image-context` virtual module, then `next/dist/client/components/navigation.js`, which reads
 * `process.env` at module-evaluation time) that only resolve under `vite-plugin-storybook-nextjs`
 * — the Vite plugin the "storybook" Vitest project loads via `storybookTest()` and the "browser"
 * project does not, by this project's own design (no Next.js runtime in Vitest Browser Mode).
 *
 * `.storybook/preview.tsx` still owns the actual `definePreview(...)` call for real Storybook and
 * the "storybook" Vitest project — this file only holds the config values, so nothing is restated
 * (GC-08's own goal), and `.storybook/preview.tsx`'s behaviour is unchanged.
 *
 * `previewAnnotations` itself is deliberately left without a type annotation — an explicit
 * `: Preview` (or `satisfies Preview`) pins/widens it against `@storybook/react`'s
 * `ReactRenderer`-specific shape, which then fails to structurally satisfy
 * `.storybook/preview.tsx`'s Next.js-augmented `definePreview` parameter type when spread in
 * (`ProjectAnnotations<TRenderer>` isn't assignable across two different `TRenderer`
 * instantiations). Left untyped, its natural object-literal inference (every string a literal,
 * not widened to `string`) satisfies both `definePreview` and `setProjectAnnotations`.
 *
 * The two decorators below are written inline inside the `decorators` array (not extracted to
 * named consts) so ADR tech/0016's one-destructured-parameter rule doesn't apply to them — that
 * rule's own carve-out excludes "a function/arrow expression sitting directly in a call/new
 * argument list, whose arity is dictated by the API it's passed to," which covers an array-literal
 * element but not a named `const`. Storybook's decorator signature is always `(Story, context)`,
 * an API-dictated two-parameter shape this project cannot reshape. `DecoratorParams` gives each
 * decorator's `Story`/`context` parameters real types instead of implicit `any` (there is no
 * contextual type for an inline arrow function inside an untyped object literal), satisfying
 * strict-mode's `no-unsafe-*` lint rules without pinning anything else in this object.
 */
type DecoratorParams = Parameters<Decorator>;

export const previewAnnotations = {
    parameters: {
        a11y: {
            /*
             * D-21: an axe violation fails the story rather than merely annotating it — nothing ships
             * unverified.
             */
            test: "error",
            options: {
                rules: {
                    /*
                     * Storybook's own documented default for isolated component rendering: a story has no
                     * page landmarks (<main>/<nav>/etc.) to violate, so "region" is a guaranteed
                     * false-positive here, not a real accessibility gap.
                     */
                    region: { enabled: false },
                },
            },
        },
        viewport: {
            options: {
                [DEVICE_TYPE.MOBILE]: {
                    name: `Mobile (${String(VIEWPORT_SIZES[DEVICE_TYPE.MOBILE].width)}px, breakpoint.mobile)`,
                    styles: {
                        width: `${String(VIEWPORT_SIZES[DEVICE_TYPE.MOBILE].width)}px`,
                        height: `${String(VIEWPORT_SIZES[DEVICE_TYPE.MOBILE].height)}px`,
                    },
                    type: "mobile" as const,
                },
                [DEVICE_TYPE.DESKTOP]: {
                    name: `Desktop (${String(VIEWPORT_SIZES[DEVICE_TYPE.DESKTOP].width)}px, breakpoint.desktop)`,
                    styles: {
                        width: `${String(VIEWPORT_SIZES[DEVICE_TYPE.DESKTOP].width)}px`,
                        height: `${String(VIEWPORT_SIZES[DEVICE_TYPE.DESKTOP].height)}px`,
                    },
                    type: "desktop" as const,
                },
            },
        },
    },
    globalTypes: {
        theme: {
            description: "Toggle the .dark class on the story canvas root",
            toolbar: {
                title: "Theme",
                icon: "circlehollow" as const,
                items: [
                    { value: "light", icon: "sun" as const, title: "Light" },
                    { value: "dark", icon: "moon" as const, title: "Dark" },
                ],
                dynamicTitle: true,
            },
        },
    },
    initialGlobals: {
        theme: "light",
        /*
         * Desktop by default, matching every existing story's implicit pre-ADR-0010 rendering. A
         * human viewing any story flips the toolbar's viewport dropdown between Mobile/Desktop to
         * see both instantly — there is no separate `Mobile*` story export per component; the
         * toolbar control isn't tied to story identity, so one story covers both viewports.
         */
        viewport: DEVICE_TYPE.DESKTOP,
    },
    decorators: [
        /*
         * Every dependency a story needs to exercise real hooks/mutations rather than a fully
         * isolated presentational render — TanStack Query's provider today, the future global
         * store once one exists — belongs here, not copy-pasted into each stories file's own
         * `decorators` array (a per-file wrapper broke Storybook's static CSF indexing, which
         * requires each *.stories.tsx default export to be a literal object).
         */
        (Story: DecoratorParams[0]) => <QueryProvider>{Story()}</QueryProvider>,
        (Story: DecoratorParams[0], context: DecoratorParams[1]) => {
            document.documentElement.classList.toggle("dark", context.globals.theme === "dark");
            /*
             * Mirror app/layout.tsx's <body> so stories render against the same themed
             * page background real usage does — otherwise dark-mode text tokens (e.g.
             * text-text-primary, white) sit on the browser's default white canvas
             * wherever a component doesn't paint its own background.
             */
            document.body.classList.add("bg-bg-app", "text-text-primary");

            return Story();
        },
    ],
};
