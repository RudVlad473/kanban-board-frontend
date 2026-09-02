import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { BoardView } from "@/components/layout/board-view/board-view";
import { DashboardHeader } from "@/components/layout/dashboard-header/dashboard-header";
import { buildBoardQueryKey } from "@/lib/core/query-keys/board-query-key";
import { buildBoardDetailPath, ROUTE } from "@/lib/core/routing/routes";
import { createBoards } from "@/test-utils/factories/board";
import { createBoardFull, createColumnsFull } from "@/test-utils/factories/board-full";

import { AddTaskButton } from "./add-task-button";

/*
 * Visual-only CSF3 (D-25). The button has no interesting appearance of its own — what these stories
 * stage is the pair it exists for: the header's create button and the modal it opens, fed the way
 * production feeds it (the open board's cache entry, written by the page's `HydrationBoundary`).
 */
const SHELL_BOARDS = createBoards(3);
const OPEN_BOARD_ID = SHELL_BOARDS[0].id;
/* `tasks: []` is not decoration — an optimistic task insert reads that array on the column it lands in. */
const FIXTURE_COLUMNS = [
    { id: "todo", name: "Todo", tasks: [] },
    { id: "doing", name: "Doing", tasks: [] },
    { id: "done", name: "Done", tasks: [] },
];

/** Seeds the entry the page's `HydrationBoundary` writes in production — the seam a real board fills. */
const BoardCacheSeed = ({ board, children }: { board: object; children: React.ReactNode }) => {
    const queryClient = useQueryClient();

    // Written before the first paint, so the button never renders a frame with no columns.
    useState(() => {
        queryClient.setQueryData(buildBoardQueryKey(OPEN_BOARD_ID), board);
    });

    return children;
};

const DashboardShell = ({ columns }: { columns: { id: string; name: string; tasks: never[] }[] | null }) => {
    const header = <DashboardHeader displayName="Ada Lovelace" boards={SHELL_BOARDS} />;

    return columns === null ? header : <BoardCacheSeed board={{ id: OPEN_BOARD_ID, columns }}>{header}</BoardCacheSeed>;
};

const meta: Meta<typeof AddTaskButton> = {
    component: AddTaskButton,
    parameters: {
        layout: "fullscreen",
        nextjs: { appDirectory: true, navigation: { pathname: buildBoardDetailPath(OPEN_BOARD_ID) } },
    },
};

export default meta;

type Story = StoryObj<typeof AddTaskButton>;

export const WithColumns: Story = {
    render: () => {
        return <DashboardShell columns={FIXTURE_COLUMNS} />;
    },
};

export const NoColumns: Story = {
    render: () => {
        return <DashboardShell columns={[]} />;
    },
};

/*
 * The one story that also renders the board the header writes into — the pair a create has to keep
 * in step, and the only surface on which TASK-01's optimistic card is visible at all.
 */
const OPEN_BOARD = createBoardFull({ id: OPEN_BOARD_ID, columns: createColumnsFull({ count: 3 }) });

export const WithBoardBelow: Story = {
    render: () => {
        return (
            <BoardCacheSeed board={OPEN_BOARD}>
                <div className="flex h-150 flex-col">
                    <DashboardHeader displayName="Ada Lovelace" boards={SHELL_BOARDS} />

                    <BoardView board={OPEN_BOARD} />
                </div>
            </BoardCacheSeed>
        );
    },
};

export const NoBoardOpen: Story = {
    parameters: { nextjs: { appDirectory: true, navigation: { pathname: ROUTE.BOARDS } } },
    render: () => {
        return <DashboardShell columns={null} />;
    },
};
