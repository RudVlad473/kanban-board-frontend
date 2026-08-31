import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useEffect } from "react";

import { DashboardHeader } from "@/components/layout/dashboard-header/dashboard-header";
import { usePublishTaskCreationColumns, type TaskCreationColumn } from "@/features/tasks/hooks/use-task-creation";
import { buildBoardDetailPath, ROUTE } from "@/lib/core/routing/routes";
import { createBoards } from "@/test-utils/factories/board";

import { TaskCreationProvider } from "./task-creation-provider";

/*
 * Visual-only CSF3 (D-25). The provider has no appearance of its own — what these stories stage is
 * the pair it exists for: the header's create button and the modal it opens, wired exactly as
 * `board-view.tsx` wires them (publish on mount, clear on unmount).
 */
const SHELL_BOARDS = createBoards(3);
const OPEN_BOARD_ID = SHELL_BOARDS[0].id;
const FIXTURE_COLUMNS: TaskCreationColumn[] = [
    { id: "todo", name: "Todo" },
    { id: "doing", name: "Doing" },
    { id: "done", name: "Done" },
];

/** Mirrors `board-view.tsx`'s own publish effect — the seam a real `BoardView` fills in production. */
const ColumnsPublisher = ({ columns }: { columns: TaskCreationColumn[] }) => {
    const publish = usePublishTaskCreationColumns();

    useEffect(() => {
        publish({ boardId: OPEN_BOARD_ID, columns });

        return () => {
            publish(null);
        };
    }, [publish, columns]);

    return null;
};

const DashboardShell = ({ columns }: { columns: TaskCreationColumn[] | null }) => {
    return (
        <TaskCreationProvider>
            {columns === null ? null : <ColumnsPublisher columns={columns} />}

            <DashboardHeader displayName="Ada Lovelace" boards={SHELL_BOARDS} />
        </TaskCreationProvider>
    );
};

const meta: Meta<typeof TaskCreationProvider> = {
    component: TaskCreationProvider,
    parameters: {
        layout: "fullscreen",
        nextjs: { appDirectory: true, navigation: { pathname: buildBoardDetailPath(OPEN_BOARD_ID) } },
    },
};

export default meta;

type Story = StoryObj<typeof TaskCreationProvider>;

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
