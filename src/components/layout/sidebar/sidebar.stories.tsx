import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { createBoards } from "@/test-utils/factories/board";

import { Sidebar } from "./sidebar";

/*
 * Visual-only CSF3 (D-25) — `Sidebar` is `components/layout/`, not a `components/ui/` primitive,
 * so per ADR tech/0011 it gets stories/axe coverage here but no visual-regression entry.
 * `appDirectory: true` is required — `Sidebar` calls `useRouter()` for its retry control.
 */
const meta: Meta<typeof Sidebar> = {
    component: Sidebar,
    parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
    decorators: [
        (Story) => (
            <div className="h-150">
                <Story />
            </div>
        ),
    ],
};

export default meta;

type Story = StoryObj<typeof Sidebar>;

export const Populated: Story = { args: { boards: createBoards(3) } };

export const Empty: Story = { args: { boards: [] } };

export const LoadFailed: Story = { args: { boards: [], loadFailed: true } };
