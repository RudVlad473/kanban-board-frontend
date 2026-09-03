import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { buildBoardDetailPath, ROUTE } from "@/lib/core/routing/routes";
import { createBoards } from "@/test-utils/factories/board";

import { DashboardHeader } from "./dashboard-header";

/*
 * Visual-only CSF3. Each story declares the path it renders at through Storybook's own
 * Next.js navigation parameter, which `dashboard-header.test.tsx` reads back so the two can never
 * disagree about which path a story is staging.
 */
const meta: Meta<typeof DashboardHeader> = {
    component: DashboardHeader,
    parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
    args: { displayName: "Ada Lovelace", boards: createBoards(3) },
};

export default meta;

type Story = StoryObj<typeof DashboardHeader>;

/** The second board of the fixture list is open, so the title is not trivially the first entry. */
export const OpenBoard: Story = {
    parameters: {
        nextjs: { appDirectory: true, navigation: { pathname: buildBoardDetailPath(createBoards(3)[1].id) } },
    },
};

export const NoBoardSelected: Story = {
    parameters: { nextjs: { appDirectory: true, navigation: { pathname: ROUTE.BOARDS } } },
};

/** A board id that is not in the supplied list — the header must show no title, never a stale one. */
export const BoardAbsentFromList: Story = {
    parameters: {
        nextjs: { appDirectory: true, navigation: { pathname: buildBoardDetailPath("not-in-this-users-list") } },
    },
};
