import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState, type ComponentProps } from "react";

import type { BoardFull } from "@/features/boards/schemas";
import {
    createBoardFull,
    createColumnFull,
    createColumnsFull,
    createTaskFull,
} from "@/test-utils/factories/board-full";

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
        (Story) => {
            return (
                <div className="flex h-150 flex-col">
                    <Story />
                </div>
            );
        },
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
    render: (args) => {
        return <ServerPropsHost {...args} />;
    },
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
    render: (args) => {
        return <ServerDeleteHost {...args} />;
    },
};

/*
 * Four columns, which is what the keyboard path needs to prove a move is one position rather than
 * "to the end" — and enough that a three-arrow move still lands inside the board.
 */
export const ReorderableColumns: Story = {
    args: { board: createBoardFull({ columns: createColumnsFull({ count: 4 }) }) },
};

/*
 * UI-SPEC loading/reorder-in-flight, driven rather than staged: the test holds the stubbed action
 * open, so the moved column's own two entries are read while its version is genuinely stale.
 */
export const ReorderInFlight: Story = {
    args: { board: createBoardFull({ columns: createColumnsFull({ count: 4 }) }) },
};

/**
 * A board the user has already reordered, as the read boundary now hands it over — array in display
 * order, so the names are out of creation order while the positions still run 0,1,2 (03-14).
 */
const createReorderedColumns = () => {
    const [first, second, third, fourth] = createColumnsFull({ count: 4 });

    return [second, third, first, fourth].map((column, index) => ({ ...column, position: index }));
};

export const ReorderedServerOrder: Story = { args: { board: createBoardFull({ columns: createReorderedColumns() }) } };

/**
 * The exact board the 03-10 checkpoint found the keyboard-scroll defect on — five columns, which
 * overflow 1440px, so the row scrolls while the first arrow step's destination is already on screen.
 */
export const FiveReorderableColumns: Story = {
    args: { board: createBoardFull({ columns: createColumnsFull({ count: 5 }) }) },
};

/*
 * Array order and `position` deliberately disagree. Ordering is the read boundary's one job, so this
 * must still render in ARRAY order — a second sort here is what T-03-43 forbids.
 */
export const ColumnsOutOfPositionOrder: Story = {
    args: {
        board: createBoardFull({
            columns: createColumnsFull({ count: 3 }).map((column, index) => ({ ...column, position: 2 - index })),
        }),
    },
};

/*
 * TASK-04's own fixture: two columns, ONE distinctly-titled task each (never "Fixture Task 1" in
 * both, which `createColumnsFull` would give every column) — a cross-column drag test needs an
 * unambiguous card to grab and an unambiguous column to land it in.
 */
export const TasksAcrossColumns: Story = {
    args: {
        board: createBoardFull({
            columns: [
                createColumnFull({
                    id: "00000000-0000-4000-8000-c00000000001",
                    name: "Fixture Column 1",
                    position: 0,
                    tasks: [
                        createTaskFull({
                            id: "00000000-0000-4000-8000-d10000000001",
                            title: "Fixture Task Alpha",
                            position: 0,
                        }),
                    ],
                }),
                createColumnFull({
                    id: "00000000-0000-4000-8000-c00000000002",
                    name: "Fixture Column 2",
                    position: 1,
                    tasks: [
                        createTaskFull({
                            id: "00000000-0000-4000-8000-d20000000001",
                            title: "Fixture Task Beta",
                            position: 0,
                        }),
                    ],
                }),
            ],
        }),
    },
};
