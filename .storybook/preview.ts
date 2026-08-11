import "../src/styles/globals.css";

// Addon-composition API: the entire preview module namespace
// (decorators/parameters/initialGlobals/afterEach) is the addon's contract for `addons: [...]`.
import * as a11yAddonAnnotations from "@storybook/addon-a11y/preview";
import { definePreview } from "@storybook/nextjs-vite";

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
            document.documentElement.classList.toggle("dark", context.globals.theme === "dark");

            return Story();
        },
    ],
});
