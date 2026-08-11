import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Eye, EyeOff } from "lucide-react";

import { IconButton } from "./icon-button";

// Visual-only CSF3 (D-25) — no play function anywhere in this file. Behavioural assertions
// (click/keyboard/disabled/merge/hit-area) live exclusively in icon-button.test.tsx.
const meta: Meta<typeof IconButton> = {
    component: IconButton,
    args: {
        label: "Show password",
        icon: <Eye />,
        onClick: () => undefined,
    },
};

export default meta;

type Story = StoryObj<typeof IconButton>;

export const Default: Story = {
    args: {
        variant: "primary",
    },
};

// The password-visibility toggle (plan 01-12's first real consumer) uses the `ghost` variant
// with the eye/eye-off pair and the state-reflecting accessible-label pattern from UI-SPEC's
// Copywriting Contract ("Show password" / "Hide password").
export const Ghost: Story = {
    render: () => (
        <div className="flex items-center gap-4">
            <IconButton label="Show password" icon={<Eye />} variant="ghost" />
            <IconButton label="Hide password" icon={<EyeOff />} variant="ghost" />
        </div>
    ),
};

export const Sizes: Story = {
    render: (args) => (
        <div className="flex items-center gap-4">
            <IconButton {...args} size="sm" />
            <IconButton {...args} size="md" />
            <IconButton {...args} size="lg" />
        </div>
    ),
};

// Hover is staged via class application on a wrapping decorator, never a real pointer
// interaction (D-25 keeps stories visual-only).
export const Hover: Story = {
    decorators: [
        (Story) => (
            <div className="[&>button]:bg-bg-app">
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

// ADR tech/0010: mobile-viewport coverage. IconButton has no `md:`/`lg:` responsive classes — a
// fixed-size control (44/44/48px hit areas, UI-SPEC's accessibility floor) that doesn't change
// shape across breakpoints, so no CSS changes were warranted; confirmed rather than assumed by
// adding MobileDefault and MobileSizes (the multi-button row most likely to reveal a
// narrow-viewport wrapping/overflow issue if one existed).
export const MobileDefault: Story = {
    args: {
        variant: "primary",
    },
    globals: { viewport: "mobile" },
};

export const MobileSizes: Story = {
    render: Sizes.render,
    globals: { viewport: "mobile" },
};
