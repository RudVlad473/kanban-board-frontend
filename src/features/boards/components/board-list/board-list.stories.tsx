import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState, type ComponentProps } from "react";

import type { Board } from "@/features/boards/schemas";
import { createBoards } from "@/test-utils/factories/board";

import { BoardList } from "./board-list";

/*
 * Visual-only CSF3 (D-25) — `BoardList` is `features/boards/`, not a `components/ui/` primitive,
 * so per ADR tech/0011 it gets stories/axe coverage but no visual-spec entry. The decorator
 * recreates the flex-column, fixed-width context `Sidebar`'s `nav` now supplies (plan 02-09).
 */
const meta: Meta<typeof BoardList> = {
    component: BoardList,
    parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
    decorators: [
        (Story) => {
            return (
                <div className="flex h-150 w-75 flex-col">
                    <Story />
                </div>
            );
        },
    ],
};

export default meta;

type Story = StoryObj<typeof BoardList>;

export const Populated: Story = { args: { boards: createBoards(3) } };

export const Empty: Story = { args: { boards: [] } };

export const LoadFailed: Story = { args: { boards: [], loadFailed: true } };

/*
 * Stages the create modal's open state through a prop, the same non-interactive pattern Modal's
 * own `defaultOpen` and Sidebar's `defaultIsExpanded` already use (D-25 — no play function).
 */
export const AddBoardOpen: Story = { args: { boards: createBoards(3), defaultIsAddBoardOpen: true } };

/** Stages the rename modal open on the first row, the same prop-driven way as the create modal. */
export const RenameOpen: Story = { args: { boards: createBoards(3), defaultRenameTargetIndex: 0 } };

/** Stages D-06's delete confirmation open on the first row, the same prop-driven way. */
export const DeleteOpen: Story = { args: { boards: createBoards(3), defaultDeleteTargetIndex: 0 } };

/** The last-board case: deleting this one leaves none, which is D-08's empty-state branch. */
export const SingleBoard: Story = { args: { boards: createBoards(1) } };

/* Duplicated verbatim in `board-list.test.tsx` — a non-story export here would break `composeStories`. */
const SERVER_RENAMED_NAME = "Renamed On The Server";
const SERVER_CHANGED_NAME = "Changed Somewhere Else";

/*
 * Owns the board array the RSC would otherwise supply, so a test can land a refreshed server render
 * and then a later server-side change — the two steps the self-clearing override is proved by.
 */
const ServerPropsHost = (props: ComponentProps<typeof BoardList>) => {
    const [boards, setBoards] = useState<Board[]>(props.boards);

    /* A real rename bumps the row's version, and that bump is what retires the optimistic name. */
    const replaceFirstName = (name: string): void => {
        setBoards((current) =>
            current.map((board, index) => (index === 0 ? { ...board, name, version: board.version + 1 } : board)),
        );
    };

    return (
        <>
            <button
                type="button"
                onClick={() => {
                    replaceFirstName(SERVER_RENAMED_NAME);
                }}
            >
                Land the refreshed server render
            </button>

            <button
                type="button"
                onClick={() => {
                    replaceFirstName(SERVER_CHANGED_NAME);
                }}
            >
                Land a later server change
            </button>

            <BoardList {...props} boards={boards} />
        </>
    );
};

export const ServerPropsAdvance: Story = {
    args: { boards: createBoards(3) },
    render: (args) => {
        return <ServerPropsHost {...args} />;
    },
};
