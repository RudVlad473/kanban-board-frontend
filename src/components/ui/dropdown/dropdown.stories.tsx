import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Dropdown } from "./dropdown";

/*
 * Visual-only CSF3 (D-25) — no play function anywhere in this file. Behavioural assertions
 * (keyboard nav, selection, focus return, error state, disabled item) live exclusively in
 * dropdown.test.tsx. Per D-25, the open state is driven by `defaultOpen`, not a play function.
 */
const meta: Meta<typeof Dropdown.Root> = {
    component: Dropdown.Root,
    render: (args) => {
        return (
            <Dropdown.Root {...args}>
                <Dropdown.Trigger placeholder="Select a status" />

                <Dropdown.Content>
                    <Dropdown.Item value="todo">Todo</Dropdown.Item>

                    <Dropdown.Item value="doing">Doing</Dropdown.Item>

                    <Dropdown.Item value="done">Done</Dropdown.Item>
                </Dropdown.Content>
            </Dropdown.Root>
        );
    },
};

export default meta;

type Story = StoryObj<typeof Dropdown.Root>;

export const Closed: Story = {};

export const Open: Story = {
    args: {
        defaultOpen: true,
    },
};

export const WithSelection: Story = {
    args: {
        defaultValue: "doing",
    },
};

// Open + a selected value together — the shape dropdown.test.tsx needs to assert aria-selected.
export const OpenWithSelection: Story = {
    args: {
        defaultOpen: true,
        defaultValue: "doing",
    },
};

export const Error: Story = {
    args: {
        hasError: true,
    },
};

export const DisabledItem: Story = {
    args: {
        defaultOpen: true,
    },
    render: (args) => {
        return (
            <Dropdown.Root {...args}>
                <Dropdown.Trigger placeholder="Select a status" />

                <Dropdown.Content>
                    <Dropdown.Item value="todo">Todo</Dropdown.Item>

                    <Dropdown.Item value="doing" isDisabled>
                        Doing
                    </Dropdown.Item>

                    <Dropdown.Item value="done">Done</Dropdown.Item>
                </Dropdown.Content>
            </Dropdown.Root>
        );
    },
};

export const Disabled: Story = {
    args: {
        isDisabled: true,
    },
};

export const Loading: Story = {
    args: {
        isLoading: true,
    },
};

/*
 * Mirrors TextField's LongValue story: a selected label long enough to overflow the trigger's
 * own width shows the trailing-edge overflow indicator (the trigger is narrowed via a wrapping
 * style to force the overflow, the same technique TextField's LongValue story uses).
 */
export const LongSelectedValue: Story = {
    args: {
        defaultValue: "A very long board name that will definitely overflow the trigger width",
    },
    render: (args) => {
        return (
            <div style={{ width: "220px" }}>
                <Dropdown.Root {...args}>
                    <Dropdown.Trigger placeholder="Select a board" />

                    <Dropdown.Content>
                        <Dropdown.Item value="A very long board name that will definitely overflow the trigger width">
                            A very long board name that will definitely overflow the trigger width
                        </Dropdown.Item>
                    </Dropdown.Content>
                </Dropdown.Root>
            </div>
        );
    },
};

export const LongItemList: Story = {
    args: {
        defaultOpen: true,
    },
    render: (args) => {
        return (
            <Dropdown.Root {...args}>
                <Dropdown.Trigger placeholder="Select a board" />

                <Dropdown.Content>
                    {Array.from({ length: 12 }, (_, index) => {
                        const position = String(index + 1);
                        return (
                            <Dropdown.Item key={position} value={`board-${position}`}>
                                {`Board ${position}`}
                            </Dropdown.Item>
                        );
                    })}
                </Dropdown.Content>
            </Dropdown.Root>
        );
    },
};
