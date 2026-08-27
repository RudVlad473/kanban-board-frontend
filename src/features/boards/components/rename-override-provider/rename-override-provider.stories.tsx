import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { DashboardHeader } from "@/components/layout/dashboard-header/dashboard-header";
import { BoardList } from "@/features/boards/components/board-list/board-list";
import { buildBoardDetailPath } from "@/lib/core/routing/routes";
import { createBoards } from "@/test-utils/factories/board";

import { RenameOverrideProvider } from "./rename-override-provider";

/*
 * Visual-only CSF3 (D-25). The provider has no appearance of its own — what these stories stage is
 * the pair it exists for: the header title and the sidebar row that must change in the same instant.
 */
const SHELL_BOARDS = createBoards(3);

const DashboardShell = () => (
    <RenameOverrideProvider>
        <DashboardHeader displayName="Ada Lovelace" boards={SHELL_BOARDS} />

        <div className="flex h-100 w-75 flex-col">
            <BoardList boards={SHELL_BOARDS} />
        </div>
    </RenameOverrideProvider>
);

const meta: Meta<typeof RenameOverrideProvider> = {
    component: RenameOverrideProvider,
    parameters: {
        layout: "fullscreen",
        /* The first fixture board is open, so its title is the one a rename has to move. */
        nextjs: { appDirectory: true, navigation: { pathname: buildBoardDetailPath(SHELL_BOARDS[0].id) } },
    },
    render: () => <DashboardShell />,
};

export default meta;

type Story = StoryObj<typeof RenameOverrideProvider>;

export const SidebarAndHeader: Story = {};
