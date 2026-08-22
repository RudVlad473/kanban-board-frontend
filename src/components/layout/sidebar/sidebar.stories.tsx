import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { BoardList } from "@/features/boards/components/board-list";
import { THEME } from "@/lib/core/theme/theme";
import { createBoards } from "@/test-utils/factories/board";

import { Sidebar } from "./sidebar";

/*
 * Visual-only CSF3 (D-25), no play function — `appDirectory: true` covers the composed
 * `BoardList` children's Next.js hooks (see 02.1-01-SUMMARY.md). `Collapsed` stages its visual via
 * the Storybook-only `defaultIsExpanded` prop, mirroring `ThemeToggle`'s `forceErrorMessage`.
 */
const meta: Meta<typeof Sidebar> = {
    component: Sidebar,
    parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
    decorators: [
        (Story) => (
            <div className="flex h-150">
                <Story />
            </div>
        ),
    ],
};

export default meta;

type Story = StoryObj<typeof Sidebar>;

export const Expanded: Story = {
    args: { initialTheme: THEME.LIGHT, children: <BoardList boards={createBoards(3)} /> },
};

export const Collapsed: Story = {
    args: { ...Expanded.args, defaultIsExpanded: false },
};

export const Overflowing: Story = {
    args: { initialTheme: THEME.LIGHT, children: <BoardList boards={createBoards(15)} /> },
};
