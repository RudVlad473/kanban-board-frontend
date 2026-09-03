import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { AddColumnPlaceholder } from "./add-column-placeholder";

/*
 * Visual-only CSF3. `onOpen` is an `fn()` spy so a test asserts by reading this arg, never
 * by spreading props onto a composed story (docs/adr/tech/0025).
 */
const meta: Meta<typeof AddColumnPlaceholder> = {
    component: AddColumnPlaceholder,
    args: { onOpen: fn() },
};

export default meta;

type Story = StoryObj<typeof AddColumnPlaceholder>;

export const Default: Story = {};

/*
 * The bounded-height horizontal row `src/components/layout/board-view/board-view.stories.tsx` gives
 * it in real use — the only place the gradient and the cross-axis stretch are visible at review and
 * in the axe run.
 */
export const InRow: Story = {
    decorators: [
        (Story) => {
            return (
                <div className="flex h-150 gap-6 overflow-x-auto bg-bg-app p-6">
                    <div className="w-70 shrink-0 rounded-md bg-bg-surface" />

                    <Story />
                </div>
            );
        },
    ],
};
