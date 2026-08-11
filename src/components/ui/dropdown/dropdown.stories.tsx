import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Dropdown } from "./dropdown";

// Visual-only CSF3 (D-25) — no play function anywhere in this file. Behavioural assertions
// (keyboard nav, selection, focus return, error state, disabled item) live exclusively in
// dropdown.test.tsx. Per D-25, the open state is driven by `defaultOpen`, not a play function.
const meta: Meta<typeof Dropdown.Root> = {
    component: Dropdown.Root,
    render: (args) => (
        <Dropdown.Root {...args}>
            <Dropdown.Trigger placeholder="Select a status" />
            <Dropdown.Content>
                <Dropdown.Item value="todo">Todo</Dropdown.Item>
                <Dropdown.Item value="doing">Doing</Dropdown.Item>
                <Dropdown.Item value="done">Done</Dropdown.Item>
            </Dropdown.Content>
        </Dropdown.Root>
    ),
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

export const Error: Story = {
    args: {
        hasError: true,
    },
};

export const DisabledItem: Story = {
    args: {
        defaultOpen: true,
    },
    render: (args) => (
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
    ),
};

export const Disabled: Story = {
    args: {
        isDisabled: true,
    },
};

export const LongItemList: Story = {
    args: {
        defaultOpen: true,
    },
    render: (args) => (
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
    ),
};
