import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "./button";

// Visual-only CSF3 (D-25) — no play function anywhere in this file. Behavioural assertions
// (click/keyboard/disabled/merge) live exclusively in button.test.tsx.
const meta: Meta<typeof Button> = {
    component: Button,
    args: {
        children: "Create Account",
        onClick: () => undefined,
    },
};

export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = {
    args: {
        variant: "primary",
    },
};

export const Secondary: Story = {
    args: {
        variant: "secondary",
    },
};

export const Destructive: Story = {
    args: {
        variant: "destructive",
        children: "Delete",
    },
};

export const Sizes: Story = {
    render: (args) => (
        <div className="flex items-center gap-4">
            <Button {...args} size="sm">
                Small
            </Button>
            <Button {...args} size="md">
                Medium
            </Button>
            <Button {...args} size="lg">
                Large
            </Button>
        </div>
    ),
};

// Hover is staged via class application on a wrapping decorator, never a real pointer
// interaction (D-25 keeps stories visual-only).
export const Hover: Story = {
    decorators: [
        (Story) => (
            <div className="[&>button]:bg-bg-primary-hover">
                <Story />
            </div>
        ),
    ],
};

// Focus is staged the same way — a visible outline applied via class application, not a real
// `.focus()` call or a play function.
export const Focus: Story = {
    decorators: [
        (Story) => (
            <div className="[&>button]:outline-2 [&>button]:outline-offset-2 [&>button]:outline-ring-focus">
                <Story />
            </div>
        ),
    ],
};

export const Disabled: Story = {
    args: {
        isDisabled: true,
    },
};

// ADR tech/0010: mobile-viewport coverage. Button has no `md:`/`lg:` responsive classes at all —
// it's a fixed-size control (h-8/h-10/h-12) that doesn't change shape across breakpoints, so
// there's no mobile-specific styling to add here. These two stories exist to *confirm* that
// (representative primary state + the multi-button `Sizes` row, the layout most likely to reveal
// a narrow-viewport wrapping/overflow issue if one existed), not because the primitive itself
// needed mobile-first changes.
export const MobilePrimary: Story = {
    args: {
        variant: "primary",
    },
    globals: { viewport: "mobile" },
};

export const MobileSizes: Story = {
    render: Sizes.render,
    globals: { viewport: "mobile" },
};
