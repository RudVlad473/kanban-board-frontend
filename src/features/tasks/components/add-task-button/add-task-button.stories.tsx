import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { DashboardHeader } from "@/components/layout/dashboard-header/dashboard-header";
import { buildBoardQueryKey } from "@/lib/core/query-keys/board-query-key";
import { buildBoardDetailPath, ROUTE } from "@/lib/core/routing/routes";
import { createBoards } from "@/test-utils/factories/board";

import { AddTaskButton } from "./add-task-button";

/*
 * Visual-only CSF3 (D-25). The button has no interesting appearance of its own — what these stories
 * stage is the pair it exists for: the header's create button and the modal it opens, fed the way
 * production feeds it (the open board's cache entry, written by the page's `HydrationBoundary`).
 */
const SHELL_BOARDS = createBoards(3);
const OPEN_BOARD_ID = SHELL_BOARDS[0].id;
const FIXTURE_COLUMNS = [
    { id: "todo", name: "Todo" },
    { id: "doing", name: "Doing" },
    { id: "done", name: "Done" },
];

/** Seeds the entry the page's `HydrationBoundary` writes in production — the seam a real board fills. */
const BoardCacheSeed = ({
    columns,
    children,
}: {
    columns: { id: string; name: string }[];
    children: React.ReactNode;
}) => {
    const queryClient = useQueryClient();

    // Written before the first paint, so the button never renders a frame with no columns.
    useState(() => {
        queryClient.setQueryData(buildBoardQueryKey(OPEN_BOARD_ID), { id: OPEN_BOARD_ID, columns });
    });

    return children;
};

const DashboardShell = ({ columns }: { columns: { id: string; name: string }[] | null }) => {
    const header = <DashboardHeader displayName="Ada Lovelace" boards={SHELL_BOARDS} />;

    return columns === null ? header : <BoardCacheSeed columns={columns}>{header}</BoardCacheSeed>;
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

export const NoBoardOpen: Story = {
    parameters: { nextjs: { appDirectory: true, navigation: { pathname: ROUTE.BOARDS } } },
    render: () => {
        return <DashboardShell columns={null} />;
    },
};
