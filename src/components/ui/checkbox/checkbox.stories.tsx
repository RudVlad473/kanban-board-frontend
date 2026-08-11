import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Checkbox } from "./checkbox";

// Visual-only CSF3 (D-25) — no play function anywhere in this file. Behavioural assertions
// (click/keyboard/controlled/error/disabled) live exclusively in checkbox.test.tsx.
const meta: Meta<typeof Checkbox> = {
    component: Checkbox,
    args: {
        label: "Remember me",
    },
};

export default meta;

type Story = StoryObj<typeof Checkbox>;

export const Unchecked: Story = {};

export const Checked: Story = {
    args: {
        defaultChecked: true,
    },
};

// Hover is staged via class application on a wrapping decorator, never a real pointer
// interaction (D-25 keeps stories visual-only).
export const Hover: Story = {
    decorators: [
        (Story) => (
            <div className="[&_[role=checkbox]]:bg-bg-app">
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
            <div className="[&_[role=checkbox]]:outline-2 [&_[role=checkbox]]:outline-offset-2 [&_[role=checkbox]]:outline-ring-focus">
                <Story />
            </div>
        ),
    ],
};

export const Error: Story = {
    args: {
        hasError: true,
    },
};

export const Disabled: Story = {
    args: {
        isDisabled: true,
    },
};

export const Sizes: Story = {
    render: (args) => (
        <div className="flex items-center gap-4">
            <Checkbox {...args} size="sm" label="Small" defaultChecked />
            <Checkbox {...args} size="md" label="Medium" defaultChecked />
            <Checkbox {...args} size="lg" label="Large" defaultChecked />
        </div>
    ),
};

// The Phase 4 subtask row's opt-in strikethrough treatment — not the default appearance the
// auth forms' "Remember me" checkbox uses.
export const CheckedWithStrikethrough: Story = {
    args: {
        label: "Design the login flow",
        defaultChecked: true,
        hasStrikethroughWhenChecked: true,
    },
};

// ADR tech/0010: mobile-viewport coverage. Checkbox has no `md:`/`lg:` responsive classes — a
// fixed-size control (16/20/24px boxes, D-18) whose label text simply wraps like any inline text
// if a consumer's own layout is narrow — so no CSS changes were warranted; confirmed rather than
// assumed by adding MobileUnchecked and MobileSizes (the multi-checkbox row most likely to reveal
// a narrow-viewport wrapping/overflow issue if one existed).
export const MobileUnchecked: Story = {
    globals: { viewport: "mobile" },
};

export const MobileSizes: Story = {
    render: Sizes.render,
    globals: { viewport: "mobile" },
};
