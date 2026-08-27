import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { BoardsEmptyState } from "./boards-empty-state";

/*
 * Visual-only CSF3 (D-25) — `BoardsEmptyState` is `features/boards/`, not a `components/ui/`
 * primitive, so per ADR tech/0011 it gets stories/axe coverage but no visual-spec entry. The
 * decorator supplies the bounded content column the dashboard layout gives it.
 */
const meta: Meta<typeof BoardsEmptyState> = {
    component: BoardsEmptyState,
    parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
    decorators: [
        (Story) => (
            <div className="flex h-150 flex-col">
                <Story />
            </div>
        ),
    ],
};

export default meta;

type Story = StoryObj<typeof BoardsEmptyState>;

export const Default: Story = { args: {} };

/*
 * Stages the create modal's open state through a prop, the same non-interactive pattern
 * `BoardList`'s own `defaultIsAddBoardOpen` uses (D-25 — no play function).
 */
export const ModalOpen: Story = { args: { defaultIsAddBoardOpen: true } };
