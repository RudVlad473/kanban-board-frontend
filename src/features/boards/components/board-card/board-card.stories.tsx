import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { createBoard } from "@/test-utils/factories/board";

import { BoardCard } from "./board-card";

/*
 * Visual-only CSF3 (D-25) — the menu's open state comes from `defaultIsMenuOpen`, never a play
 * function. The decorator supplies the `ul` and panel width the sidebar's own list gives this row.
 */
const meta: Meta<typeof BoardCard> = {
    component: BoardCard,
    parameters: { nextjs: { appDirectory: true } },
    decorators: [
        (Story) => (
            <ul className="w-75 py-4">
                <Story />
            </ul>
        ),
    ],
    args: {
        board: createBoard({ id: "8okxhwo6oq2o", name: "Platform Launch" }),
        isSelected: false,
        onEdit: fn(),
        onDelete: fn(),
    },
};

export default meta;

type Story = StoryObj<typeof BoardCard>;

export const Default: Story = {};

export const Selected: Story = { args: { isSelected: true } };

export const MenuOpen: Story = { args: { defaultIsMenuOpen: true } };

/** UI-SPEC's long-text row: the name truncates rather than pushing the overflow trigger out. */
export const LongName: Story = {
    args: { board: createBoard({ id: "8okxhwo6oq2o", name: `Platform ${"Launch ".repeat(12)}` }) },
};
