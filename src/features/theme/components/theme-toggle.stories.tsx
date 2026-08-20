import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { THEME } from "@/lib/core/theme/theme";

import { ThemeToggle } from "./theme-toggle";

/*
 * Visual-only CSF3 (D-25) — no play function anywhere in this file. Behavioural assertions
 * (optimistic ordering, revert-on-failure, keyboard operability) live exclusively in
 * theme-toggle.test.tsx. `appDirectory: true` mirrors sign-in-form.stories.tsx/
 * sign-up-form.stories.tsx's identical setup — this component imports `updateThemeAction`, a
 * `"use server"` Server Action, aliased to a no-op stub for this project only
 * (vitest.config.ts) since no story here ever invokes it for real. Per ADR tech/0011, this
 * component gets no `visual/theme.visual.spec.ts` entry or baseline — visual-regression coverage
 * stays scoped to `components/ui/` primitives for now.
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
        (Story) => (
            <div className="[&_[role=switch]]:outline-2 [&_[role=switch]]:outline-offset-2 [&_[role=switch]]:outline-ring-focus">
                <Story />
            </div>
        ),
    ],
};

export const SaveFailed: Story = {
    args: {
        initialTheme: THEME.LIGHT,
        forceErrorMessage: "Couldn't save your theme. Try again.",
    },
};
