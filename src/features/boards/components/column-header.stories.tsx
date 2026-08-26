import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { createColumnFull, createTasksFull } from "@/test-utils/factories/board-full";

import { ColumnHeader } from "./column-header";

/*
 * Visual-only CSF3 (D-25), mirroring `board-view.stories.tsx`. The decorator supplies the 280px
 * column width the real board gives this header, which is what makes an overlong name truncate.
 */
const meta: Meta<typeof ColumnHeader> = {
    component: ColumnHeader,
    decorators: [
        (Story) => (
            <div className="w-70 bg-bg-app">
                <Story />
            </div>
        ),
    ],
    args: { column: createColumnFull({ name: "Todo", position: 0, tasks: createTasksFull(4) }) },
};

export default meta;

type Story = StoryObj<typeof ColumnHeader>;

export const Default: Story = {};

export const SecondPosition: Story = {
    args: { column: createColumnFull({ name: "Doing", position: 1, tasks: createTasksFull(3) }) },
};

export const ThirdPosition: Story = {
    args: { column: createColumnFull({ name: "Done", position: 2, tasks: createTasksFull(1) }) },
};

/** U-03's cycle wraps at three, so a fourth column carries the first accent again. */
export const FourthPositionCyclesBack: Story = {
    args: { column: createColumnFull({ name: "Shipped", position: 3, tasks: createTasksFull(2) }) },
};

/*
 * UI-SPEC empty/column-with-0-tasks: the zero count in the caption is the whole signal — no per-column
 * empty copy and no add-a-task control, since task creation is Phase 4.
 */
export const NoTasks: Story = {
    args: { column: createColumnFull({ name: "Backlog", position: 0, tasks: [] }) },
};

/** The backend's own 32-character ceiling, in wide glyphs so it overflows the 280px header. */
export const LongColumnName: Story = {
    args: {
        column: createColumnFull({ name: "Mmmmmmmm Mmmmmmmm Mmmmmmmm Mmmmm", position: 0, tasks: createTasksFull(2) }),
    },
};
