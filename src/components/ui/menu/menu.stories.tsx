import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { EllipsisVertical } from "lucide-react";

import { Menu } from "./menu";
import { IconButton } from "../icon-button/icon-button";

/*
 * Visual-only CSF3 (D-25) — no play function anywhere in this file. Behavioural assertions
 * (keyboard nav, activation, Escape, disabled item, no persisted selection) live exclusively in
 * menu.test.tsx. Per D-25, the open state is driven by `defaultOpen`, not a play function. The
 * kebab trigger composition mirrors the sidebar's real usage exactly (D-07): `IconButton` composed
 * in via `render`, this file never renders a bare unstyled `Menu.Trigger`.
 */
const meta: Meta<typeof Menu.Root> = {
    component: Menu.Root,
    render: (args) => (
        <Menu.Root {...args}>
            <Menu.Trigger render={<IconButton label="Board actions" icon={<EllipsisVertical />} />} />

            <Menu.Content>
                <Menu.Item>Edit Board</Menu.Item>

                <Menu.Item isDestructive>Delete Board</Menu.Item>
            </Menu.Content>
        </Menu.Root>
    ),
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
    render: (args) => (
        <Menu.Root {...args}>
            <Menu.Trigger render={<IconButton label="Board actions" icon={<EllipsisVertical />} />} />

            <Menu.Content>
                <Menu.Item isDisabled>Edit Board</Menu.Item>

                <Menu.Item isDestructive>Delete Board</Menu.Item>
            </Menu.Content>
        </Menu.Root>
    ),
};

export const LongItemList: Story = {
    args: {
        defaultOpen: true,
    },
    render: (args) => (
        <Menu.Root {...args}>
            <Menu.Trigger render={<IconButton label="Board actions" icon={<EllipsisVertical />} />} />

            <Menu.Content>
                {Array.from({ length: 12 }, (_, index) => {
                    const position = String(index + 1);
                    return <Menu.Item key={position}>{`Action ${position}`}</Menu.Item>;
                })}
            </Menu.Content>
        </Menu.Root>
    ),
};
