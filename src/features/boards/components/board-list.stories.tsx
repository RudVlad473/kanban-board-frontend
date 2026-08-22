import type { Meta, StoryObj } from "@storybook/nextjs-vite";

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
        (Story) => (
            <div className="flex h-150 w-75 flex-col">
                <Story />
            </div>
        ),
    ],
};

export default meta;

type Story = StoryObj<typeof BoardList>;

export const Populated: Story = { args: { boards: createBoards(3) } };

export const Empty: Story = { args: { boards: [] } };

export const LoadFailed: Story = { args: { boards: [], loadFailed: true } };
