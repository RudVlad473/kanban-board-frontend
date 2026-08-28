import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Textarea } from "./textarea";

/*
 * Visual-only CSF3 (D-25) — no play function anywhere in this file. Behavioural assertions
 * (typing, error announcement, disabled, minimum box) live exclusively in textarea.test.tsx.
 */
const meta: Meta<typeof Textarea> = {
    component: Textarea,
    args: {
        label: "Description",
        placeholder:
            "e.g. It's always good to take a break. This 15 minute break will recharge the batteries a little.",
    },
};

export default meta;

type Story = StoryObj<typeof Textarea>;

export const Idle: Story = {};

/*
 * Focus is staged via class application on a wrapping decorator, never a real `.focus()` call or
 * a play function (D-25 keeps stories visual-only).
 */
export const Focused: Story = {
    decorators: [
        (Story) => {
            return (
                <div className="[&_textarea]:ring-2 [&_textarea]:ring-ring-focus [&_textarea]:ring-offset-2">
                    <Story />
                </div>
            );
        },
    ],
};

export const Filled: Story = {
    args: {
        defaultValue: "It's always good to take a break.",
    },
};

/*
 * The required-field error copy is UI-SPEC's own Copywriting Contract string, verbatim — this
 * story doubles as a copy reference, not sample text.
 */
export const Error: Story = {
    args: {
        hasError: true,
        errorMessage: "Can't be empty",
    },
};

/*
 * The prop-combination invariant no other story stages: an errorMessage supplied WITHOUT hasError
 * must render no error node at all. It exists so textarea.test.tsx can assert that through a
 * composed story rather than a re-configured one (ADR tech/0025).
 */
export const ErrorMessageWithoutError: Story = {
    args: {
        errorMessage: "Can't be empty",
    },
};

export const Disabled: Story = {
    args: {
        isDisabled: true,
        defaultValue: "It's always good to take a break.",
    },
};

export const Loading: Story = {
    args: {
        isLoading: true,
        defaultValue: "It's always good to take a break.",
    },
};

export const WithDescription: Story = {
    args: {
        description: "Optional — subtasks carry the detail.",
    },
};

/*
 * UI-SPEC's overflow case: content taller than the 112px minimum box scrolls inside it rather
 * than growing and pushing the surrounding modal — this story carries that state's baseline.
 */
export const LongValue: Story = {
    render: (args) => {
        return (
            <div style={{ width: "320px" }}>
                <Textarea {...args} defaultValue={"It's always good to take a break.\n".repeat(12)} />
            </div>
        );
    },
};
