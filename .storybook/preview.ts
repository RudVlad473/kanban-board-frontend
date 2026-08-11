import "../src/styles/globals.css";

// Addon-composition API: the entire preview module namespace
// (decorators/parameters/initialGlobals/afterEach) is the addon's contract for `addons: [...]`.
import * as a11yAddonAnnotations from "@storybook/addon-a11y/preview";
import { definePreview } from "@storybook/nextjs-vite";
import { Plus_Jakarta_Sans } from "next/font/google";

// Mirrors app/layout.tsx's font loader exactly (same weights, same `variable` name). Stories
// never render RootLayout, so the `--font-plus-jakarta-sans` custom property the generated
// typography tokens reference (style-dictionary.config.mjs) would otherwise be undefined here,
// silently falling back to the browser default font in every story and visual-regression
// baseline.
const plusJakartaSans = Plus_Jakarta_Sans({
    variable: "--font-plus-jakarta-sans",
    subsets: ["latin"],
    weight: ["500", "700"],
});

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
    },
    decorators: [
        (Story, context) => {
            document.documentElement.classList.add(plusJakartaSans.variable);
            document.documentElement.classList.toggle("dark", context.globals.theme === "dark");

            return Story();
        },
    ],
});
