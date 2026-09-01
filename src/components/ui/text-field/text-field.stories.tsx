import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Eye } from "lucide-react";

import { TextField } from "./text-field";

/*
 * Visual-only CSF3 (D-25) — no play function anywhere in this file. Behavioural assertions
 * (typing, error announcement, disabled, overflow) live exclusively in text-field.test.tsx.
 */
const meta: Meta<typeof TextField> = {
    component: TextField,
    args: {
        label: "Email",
    },
};

export default meta;

type Story = StoryObj<typeof TextField>;

export const Idle: Story = {};

/* A row inside an already-labelled group: the label stays announced but takes no layout space. */
export const HiddenLabel: Story = {
    args: { isLabelHidden: true },
};

/*
 * Focus is staged via class application on a wrapping decorator, never a real `.focus()` call or
 * a play function (D-25 keeps stories visual-only).
 */
export const Focused: Story = {
    decorators: [
        (Story) => {
            return (
                <div className="[&_input]:ring-2 [&_input]:ring-ring-focus [&_input]:ring-offset-2">
                    <Story />
                </div>
            );
        },
    ],
};

export const Filled: Story = {
    args: {
        defaultValue: "user@example.com",
    },
};

/*
 * The required-field error copy is UI-SPEC's own Copywriting Contract string, verbatim — this
 * story doubles as a copy reference, not sample text.
 */
export const Error: Story = {
    args: {
        label: "Password",
        hasError: true,
        errorMessage: "Can't be empty",
    },
};

export const Disabled: Story = {
    args: {
        isDisabled: true,
        defaultValue: "user@example.com",
    },
};

export const Loading: Story = {
    args: {
        isLoading: true,
        defaultValue: "user@example.com",
    },
};

export const WithDescription: Story = {
    args: {
        description: "We'll never share your email.",
    },
};

/*
 * Stages the trailing slot with a bare glyph, not the real IconButton primitive — ui-to-ui
 * story imports are reserved for feature/layout layers (ADR tech/0009).
 */
export const Password: Story = {
    args: {
        label: "Password",
        type: "password",
        defaultValue: "hunter2",
        trailing: (
            <span aria-hidden="true" className="text-text-muted">
                <Eye size={20} />
            </span>
        ),
    },
};

export const Sizes: Story = {
    render: (args) => {
        return (
            <div className="flex w-64 flex-col gap-4">
                <TextField {...args} size="sm" label="Small" />

                <TextField {...args} size="md" label="Medium" />

                <TextField {...args} size="lg" label="Large" />
            </div>
        );
    },
};

/*
 * UI-SPEC's overflow backstop: a 300-character value must truncate with a native ellipsis inside
 * the field rather than expanding or wrapping the surrounding layout — this story carries that
 * state's visual baseline.
 */
export const LongValue: Story = {
    render: (args) => {
        return (
            <div style={{ width: "320px" }}>
                <TextField {...args} defaultValue={"x".repeat(300)} />
            </div>
        );
    },
};
