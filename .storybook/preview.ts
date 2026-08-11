import "../src/styles/globals.css";

// Addon-composition API: the entire preview module namespace
// (decorators/parameters/initialGlobals/afterEach) is the addon's contract for `addons: [...]`.
import * as a11yAddonAnnotations from "@storybook/addon-a11y/preview";
import { definePreview } from "@storybook/nextjs-vite";

// ADR tech/0010: two named viewports matching this project's own breakpoint tokens
// (src/styles/tokens.css `--breakpoint-sm`/`--breakpoint-lg`, DTCG `breakpoint.mobile`/
// `breakpoint.desktop`) rather than Storybook's built-in device presets (iPhone X, iPad, ...),
// which don't line up with the tokens mobile-first CSS is actually written against. The
// `viewport` parameter/global is Storybook core in this version (10.5.7) — no separate addon
// package needed, only this configuration.
const MOBILE_VIEWPORT = "mobile";
const DESKTOP_VIEWPORT = "desktop";

export default definePreview({
    addons: [a11yAddonAnnotations],
    parameters: {
        a11y: {
            // D-21: an axe violation fails the story rather than merely annotating it — nothing ships
            // unverified.
            test: "error",
            options: {
                rules: {
                    // Storybook's own documented default for isolated component rendering: a story has no
                    // page landmarks (<main>/<nav>/etc.) to violate, so "region" is a guaranteed
                    // false-positive here, not a real accessibility gap.
                    region: { enabled: false },
                },
            },
        },
        viewport: {
            options: {
                [MOBILE_VIEWPORT]: {
                    name: "Mobile (375px, breakpoint.mobile)",
                    styles: { width: "375px", height: "667px" },
                    type: "mobile",
                },
                [DESKTOP_VIEWPORT]: {
                    name: "Desktop (1440px, breakpoint.desktop)",
                    styles: { width: "1440px", height: "900px" },
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
        // Desktop by default, matching every existing story's implicit pre-ADR-0010 rendering —
        // a story opts into `MOBILE_VIEWPORT` explicitly via its own `globals.viewport` override
        // (see e.g. button.stories.tsx's `Mobile` story) rather than every story needing one.
        viewport: DESKTOP_VIEWPORT,
    },
    decorators: [
        (Story, context) => {
            document.documentElement.classList.toggle("dark", context.globals.theme === "dark");
            // Mirror app/layout.tsx's <body> so stories render against the same themed
            // page background real usage does — otherwise dark-mode text tokens (e.g.
            // text-text-primary, white) sit on the browser's default white canvas
            // wherever a component doesn't paint its own background.
            document.body.classList.add("bg-bg-app", "text-text-primary");

            return Story();
        },
    ],
});
