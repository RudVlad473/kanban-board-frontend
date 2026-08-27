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

/** More columns than U-03's three accents, so the dot cycle is visible wrapping at position 3. */
export const EvenlyCycledColumns: Story = {
    args: { board: createBoardFull({ columns: createColumnsFull({ count: 4 }) }) },
};

/** Stages the per-column vertical-overflow behaviour — one column taller than the board area. */
export const ManyTasksInOneColumn: Story = {
    args: { board: createBoardFull({ columns: createColumnsFull({ count: 2, taskCount: 12 }) }) },
};

/*
 * Seeds the Add Column modal open over a populated board, which is the state a play function would
 * otherwise have had to drive (`pnpm stories:check` bans those).
 */
export const AddColumnOpen: Story = {
    args: { board: createBoardFull({ columns: createColumnsFull({ count: 3 }) }), defaultIsAddColumnOpen: true },
};

/*
 * The board already holds "Fixture Column 1", so retyping that name is what its test submits — the
 * duplicate branch is legible from the story rather than only from the failure queued on the stub.
 */
export const DuplicateColumnName: Story = {
    args: { board: createBoardFull({ columns: createColumnsFull({ count: 3 }) }), defaultIsAddColumnOpen: true },
};

/*
 * D-05's three neighbouring counts, each staged with the modal already open so the next submit is
 * the create under test — and so no ghost-column click can scroll the row before the create does.
 */
export const SevenColumns: Story = {
    args: { board: createBoardFull({ columns: createColumnsFull({ count: 7 }) }), defaultIsAddColumnOpen: true },
};

/** The nudge's one firing count: the next create takes this board to nine. */
export const EightColumns: Story = {
    args: { board: createBoardFull({ columns: createColumnsFull({ count: 8 }) }), defaultIsAddColumnOpen: true },
};

export const NineColumns: Story = {
    args: { board: createBoardFull({ columns: createColumnsFull({ count: 9 }) }), defaultIsAddColumnOpen: true },
};
