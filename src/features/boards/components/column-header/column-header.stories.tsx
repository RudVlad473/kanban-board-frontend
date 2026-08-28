import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { createColumnFull, createTasksFull } from "@/test-utils/factories/board-full";

import { ColumnHeader } from "./column-header";

/*
 * U-03 keys the dot off the column id, so an accent is staged by picking an id — these three hash
 * into the three buckets. Chosen by running `toColumnDotToken`, not by arithmetic anyone can do by
 * eye; if the hash ever changes, re-pick them rather than assuming these still hold.
 */
const FIRST_ACCENT_ID = "00000000-0000-4000-8000-000000000001";
const SECOND_ACCENT_ID = "00000000-0000-4000-8000-000000000002";
const THIRD_ACCENT_ID = "00000000-0000-4000-8000-000000000000";

/*
 * Visual-only CSF3 (D-25), mirroring `src/components/layout/board-view/board-view.stories.tsx`. The
 * decorator supplies the 280px column width the real board gives this header, which is what makes
 * an overlong name truncate.
 */
const meta: Meta<typeof ColumnHeader> = {
    component: ColumnHeader,
    decorators: [
        (Story) => {
            return (
                <div className="w-70 bg-bg-app">
                    <Story />
                </div>
            );
        },
    ],
    args: {
        column: createColumnFull({
            id: FIRST_ACCENT_ID,
            name: "Todo",
            position: 0,
            tasks: createTasksFull(4),
        }),
        onRename: fn(),
        onDelete: fn(),
    },
};

export default meta;

type Story = StoryObj<typeof ColumnHeader>;

export const Default: Story = {};

export const SecondAccent: Story = {
    args: {
        column: createColumnFull({ id: SECOND_ACCENT_ID, name: "Doing", position: 1, tasks: createTasksFull(3) }),
    },
};

export const ThirdAccent: Story = {
    args: {
        column: createColumnFull({ id: THIRD_ACCENT_ID, name: "Done", position: 2, tasks: createTasksFull(1) }),
    },
};

/*
 * The dot follows the column, not its place in the row: same id as `Default`, four positions later,
 * same accent. This is the case a position-keyed hue got wrong — see `toColumnDotToken`.
 */
export const AccentFollowsIdNotPosition: Story = {
    args: {
        column: createColumnFull({ id: FIRST_ACCENT_ID, name: "Shipped", position: 4, tasks: createTasksFull(2) }),
    },
};

/*
 * UI-SPEC empty/column-with-0-tasks: the zero count in the caption is the whole signal — no per-column
 * empty copy and no add-a-task control, since task creation is Phase 4.
 */
export const NoTasks: Story = {
    args: { column: createColumnFull({ id: FIRST_ACCENT_ID, name: "Backlog", position: 0, tasks: [] }) },
};

/** The backend's own 32-character ceiling, in wide glyphs so it overflows the 280px header. */
export const LongColumnName: Story = {
    args: {
        column: createColumnFull({
            id: FIRST_ACCENT_ID,
            name: "Mmmmmmmm Mmmmmmmm Mmmmmmmm Mmmmm",
            position: 0,
            tasks: createTasksFull(2),
        }),
    },
};

/*
 * Stages the kebab's open state, which is what a play function would otherwise have had to drive
 * (`pnpm stories:check` bans those) — the same `defaultOpen` route `board-card.tsx` already takes.
 */
export const MenuOpen: Story = { args: { defaultIsMenuOpen: true } };

/*
 * The completed kebab — both entries live at once, which is what the destructive one's own
 * treatment and its `onDelete` reporting are read from.
 */
export const MenuOpenWithDelete: Story = { args: { defaultIsMenuOpen: true } };

/*
 * UI-SPEC zero-one-many/exactly-1-column: a lone column still offers both entries. Staged as its
 * own column rather than a board, since this header knows nothing of how many siblings it has.
 */
export const LoneColumnMenuOpen: Story = {
    args: {
        column: createColumnFull({ id: FIRST_ACCENT_ID, name: "Only Column", position: 0, tasks: createTasksFull(1) }),
        defaultIsMenuOpen: true,
    },
};

/** Where the library's own `aria-describedby` points in the real board — its hidden lift instructions. */
const DRAG_INSTRUCTIONS_ID = "column-header-story-drag-instructions";

/*
 * The handle props exactly as `useSortable` hands them over, staged rather than driven — this
 * component is presentational, so what matters here is that it spreads them and adds nothing.
 */
export const DragHandleFocused: Story = {
    decorators: [
        (Story) => {
            return (
                <>
                    <span id={DRAG_INSTRUCTIONS_ID} hidden>
                        To pick up a column, press space or enter.
                    </span>

                    <Story />
                </>
            );
        },
    ],
    args: {
        handleProps: {
            setNode: () => undefined,
            attributes: {
                role: "button",
                tabIndex: 0,
                "aria-disabled": false,
                "aria-pressed": undefined,
                "aria-roledescription": "draggable column",
                "aria-describedby": DRAG_INSTRUCTIONS_ID,
            },
            listeners: undefined,
        },
    },
};

/*
 * UI-SPEC loading/reorder-in-flight: while this column's own reorder is unsettled, its version is
 * stale, so neither entry may fire a second mutation against it (T-03-31).
 */
export const MutationsDisabled: Story = { args: { areMutationsDisabled: true, defaultIsMenuOpen: true } };
