import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { createBoardFull, createColumnsFull } from "@/test-utils/factories/board-full";

import { BoardView } from "./board-view";

/*
 * Visual-only CSF3 (D-25) — `BoardView` is `features/boards/`, not a `components/ui/` primitive, so
 * per ADR tech/0011 it gets stories/axe coverage but no visual-spec entry. The decorator supplies
 * the bounded height the real dashboard column gives it, which is what makes a column scroll.
 */
const meta: Meta<typeof BoardView> = {
    component: BoardView,
    parameters: { layout: "fullscreen" },
    decorators: [
        (Story) => (
            <div className="flex h-150 flex-col">
                <Story />
            </div>
        ),
    ],
};

export default meta;

type Story = StoryObj<typeof BoardView>;

export const Populated: Story = { args: { board: createBoardFull({ columns: createColumnsFull({ count: 3 }) }) } };

export const EmptyBoard: Story = { args: { board: createBoardFull({ columns: [] }) } };

export const ColumnsWithNoTasks: Story = {
    args: { board: createBoardFull({ columns: createColumnsFull({ count: 2, taskCount: 0 }) }) },
};

/** Stages the horizontal-overflow behaviour — more columns than any viewport fits. */
export const ManyColumns: Story = { args: { board: createBoardFull({ columns: createColumnsFull({ count: 8 }) }) } };

/** Stages the per-column vertical-overflow behaviour — one column taller than the board area. */
export const ManyTasksInOneColumn: Story = {
    args: { board: createBoardFull({ columns: createColumnsFull({ count: 2, taskCount: 12 }) }) },
};
