import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { EllipsisVertical } from "lucide-react";

import { Menu } from "./menu";
import { IconButton } from "../icon-button/icon-button";

/*
 * Visual-only CSF3 (D-25) — behavioural assertions live in menu.test.tsx; open state comes from
 * `defaultOpen`, never a play function. The kebab composition (IconButton via `render`) mirrors
 * the sidebar's real usage (D-07) — this file never renders a bare unstyled Menu.Trigger.
 */
const meta: Meta<typeof Menu.Root> = {
    component: Menu.Root,
    render: (args) => {
        return (
            <Menu.Root {...args}>
                <Menu.Trigger render={<IconButton label="Board actions" icon={<EllipsisVertical />} />} />

                <Menu.Content>
                    <Menu.Item>Edit Board</Menu.Item>

                    <Menu.Item isDestructive={true}>Delete Board</Menu.Item>
                </Menu.Content>
            </Menu.Root>
        );
    },
};

export default meta;

type Story = StoryObj<typeof Menu.Root>;

export const Closed: Story = {};

export const Open: Story = {
    args: {
        defaultOpen: true,
    },
};

export const WithDestructiveItem: Story = {
    args: {
        defaultOpen: true,
    },
};

export const WithDisabledItem: Story = {
    args: {
        defaultOpen: true,
    },
    render: (args) => {
        return (
            <Menu.Root {...args}>
                <Menu.Trigger render={<IconButton label="Board actions" icon={<EllipsisVertical />} />} />

                <Menu.Content>
                    <Menu.Item isDisabled={true}>Edit Board</Menu.Item>

                    <Menu.Item isDestructive={true}>Delete Board</Menu.Item>
                </Menu.Content>
            </Menu.Root>
        );
    },
};

export const LongItemList: Story = {
    args: {
        defaultOpen: true,
    },
    render: (args) => {
        return (
            <Menu.Root {...args}>
                <Menu.Trigger render={<IconButton label="Board actions" icon={<EllipsisVertical />} />} />

                <Menu.Content>
                    {Array.from({ length: 12 }, (_, index) => {
                        const position = String(index + 1);
                        return <Menu.Item key={position}>{`Action ${position}`}</Menu.Item>;
                    })}
                </Menu.Content>
            </Menu.Root>
        );
    },
};
