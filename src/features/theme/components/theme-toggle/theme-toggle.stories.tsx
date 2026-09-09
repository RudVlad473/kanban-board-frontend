import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { THEME } from "@/lib/core/theme/theme";

import { ThemeToggle } from "./theme-toggle";

/*
 * Visual-only CSF3; behavioral assertions live in theme-toggle.test.tsx.
 * `updateThemeAction` resolves through `serverActionStubPlugin`'s generic recorder (docs/adr/tech/0020),
 * never invoked for real. Per ADR tech/0011, this component gets no visual-regression baseline.
 */
const meta: Meta<typeof ThemeToggle> = {
    component: ThemeToggle,
    parameters: {
        nextjs: {
            appDirectory: true,
        },
    },
    args: {
        isAuthenticated: true,
    },
};

export default meta;

type Story = StoryObj<typeof ThemeToggle>;

export const Light: Story = {
    args: {
        initialTheme: THEME.LIGHT,
    },
};

export const Dark: Story = {
    args: {
        initialTheme: THEME.DARK,
    },
};

/*
 * Staged via a wrapping decorator, never a real keyboard focus event (D-25 keeps stories
 * visual-only) — mirrors switch.stories.tsx's identical `Focus` story.
 */
export const Focus: Story = {
    args: {
        initialTheme: THEME.LIGHT,
    },
    decorators: [
        (Story) => {
            return (
                <div className="[&_[role=switch]]:outline-2 [&_[role=switch]]:outline-offset-2 [&_[role=switch]]:outline-ring-focus">
                    <Story />
                </div>
            );
        },
    ],
};

export const SaveFailed: Story = {
    args: {
        initialTheme: THEME.LIGHT,
        forceErrorMessage: "Couldn't save your theme. Try again.",
    },
};

export const Unauthenticated: Story = {
    args: {
        initialTheme: THEME.LIGHT,
        isAuthenticated: false,
    },
};
