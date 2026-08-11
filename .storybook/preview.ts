import "../src/styles/globals.css";

/*
 * Addon-composition API: the entire preview module namespace
 * (decorators/parameters/initialGlobals/afterEach) is the addon's contract for `addons: [...]`.
 */
import * as a11yAddonAnnotations from "@storybook/addon-a11y/preview";
import { definePreview } from "@storybook/nextjs-vite";

import { DEVICE_TYPE, VIEWPORT_SIZES } from "@/lib/viewport-breakpoints";

/*
 * ADR tech/0010: two named viewports matching this project's own breakpoint tokens
 * (src/styles/tokens.css `--breakpoint-sm`/`--breakpoint-lg`, DTCG `breakpoint.mobile`/
 * `breakpoint.desktop`) rather than Storybook's built-in device presets (iPhone X, iPad, ...),
 * which don't line up with the tokens mobile-first CSS is actually written against. The
 * `viewport` parameter/global is Storybook core in this version (10.5.7) — no separate addon
 * package needed, only this configuration. Sizes come from the shared
 * `src/lib/viewport-breakpoints.ts` module (also read by the Playwright visual spec and the
 * Vitest dual-viewport test util) so all three stay numerically identical by construction.
 */

export default definePreview({
    addons: [a11yAddonAnnotations],
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
                    type: "mobile",
                },
                [DEVICE_TYPE.DESKTOP]: {
                    name: `Desktop (${String(VIEWPORT_SIZES[DEVICE_TYPE.DESKTOP].width)}px, breakpoint.desktop)`,
                    styles: {
                        width: `${String(VIEWPORT_SIZES[DEVICE_TYPE.DESKTOP].width)}px`,
                        height: `${String(VIEWPORT_SIZES[DEVICE_TYPE.DESKTOP].height)}px`,
                    },
                    type: "desktop",
                },
            },
        },
    },
    globalTypes: {
        theme: {
            description: "Toggle the .dark class on the story canvas root",
            toolbar: {
                title: "Theme",
                icon: "circlehollow",
                items: [
                    { value: "light", icon: "sun", title: "Light" },
                    { value: "dark", icon: "moon", title: "Dark" },
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
        (Story, context) => {
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
});
