import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState, type ComponentProps } from "react";

import type { BoardFull } from "@/features/boards/schemas";
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

/** Seeds the rename modal open on the first column, the same prop-driven way as the create modal. */
export const RenameColumnOpen: Story = {
    args: { board: createBoardFull({ columns: createColumnsFull({ count: 3 }) }), defaultRenameColumnTargetIndex: 0 },
};

/** Seeds the delete confirmation open on the first column, the same prop-driven way as the rename. */
export const DeleteColumnOpen: Story = {
    args: { board: createBoardFull({ columns: createColumnsFull({ count: 3 }) }), defaultDeleteColumnTargetIndex: 0 },
};

/*
 * UI-SPEC zero-one-many/exactly-1-column: both kebab entries stay meaningful on a board's only
 * column, unlike the drag affordance plan 03-10 withholds from it.
 */
export const LoneColumn: Story = { args: { board: createBoardFull({ columns: createColumnsFull({ count: 1 }) }) } };

/* Duplicated verbatim in `board-view.test.tsx` — a non-story export here would break `composeStories`. */
const SERVER_RENAMED_NAME = "Renamed On The Server";
const SERVER_CHANGED_NAME = "Changed Somewhere Else";

/*
 * Owns the board the RSC would otherwise supply, so a test can land a refreshed server render and
 * then a later server-side change — the two steps the self-retiring override is proved by.
 */
const ServerPropsHost = (props: ComponentProps<typeof BoardView>) => {
    const [board, setBoard] = useState<BoardFull>(props.board);

    const replaceFirstColumnName = (name: string): void => {
        setBoard((current) => ({
            ...current,
            columns: current.columns.map((column, index) => (index === 0 ? { ...column, name } : column)),
        }));
    };

    return (
        <>
            <button
                type="button"
                onClick={() => {
                    replaceFirstColumnName(SERVER_RENAMED_NAME);
                }}
            >
                Land the refreshed server render
            </button>

            <button
                type="button"
                onClick={() => {
                    replaceFirstColumnName(SERVER_CHANGED_NAME);
                }}
            >
                Land a later server change
            </button>

            <BoardView {...props} board={board} />
        </>
    );
};

export const ServerColumnsAdvance: Story = {
    args: { board: createBoardFull({ columns: createColumnsFull({ count: 3 }) }) },
    render: (args) => <ServerPropsHost {...args} />,
};

/*
 * Lands the refreshed render a completed delete produces — the middle column simply absent. The
 * container never removes one itself, so this is the only way its post-delete order can be read.
 */
const ServerDeleteHost = (props: ComponentProps<typeof BoardView>) => {
    const [board, setBoard] = useState<BoardFull>(props.board);

    return (
        <>
            <button
                type="button"
                onClick={() => {
                    setBoard((current) => ({
                        ...current,
                        columns: current.columns.filter((_, index) => index !== 1),
                    }));
                }}
            >
                Land the refreshed render without the middle column
            </button>

            <BoardView {...props} board={board} />
        </>
    );
};

export const ServerColumnRemoved: Story = {
    args: { board: createBoardFull({ columns: createColumnsFull({ count: 4 }) }) },
    render: (args) => <ServerDeleteHost {...args} />,
};
