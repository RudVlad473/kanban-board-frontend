import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { createBoards } from "@/test-utils/factories/board";

import { BoardList } from "./board-list";

/*
 * Visual-only CSF3 — `BoardList` is `features/boards/`, not a `components/ui/` primitive,
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

/** Stages the delete confirmation open on the first row, the same prop-driven way. */
export const DeleteOpen: Story = { args: { boards: createBoards(3), defaultDeleteTargetIndex: 0 } };

/** The last-board case: deleting this one leaves none, which is the empty-state branch. */
export const SingleBoard: Story = { args: { boards: createBoards(1) } };
