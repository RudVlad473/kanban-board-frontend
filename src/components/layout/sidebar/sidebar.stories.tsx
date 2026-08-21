import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { createBoards } from "@/test-utils/factories/board";

import { Sidebar } from "./sidebar";

/*
 * Visual-only CSF3 (D-25) — no play function anywhere in this file. `Sidebar` is a
 * `components/layout/` component, not a `components/ui/` primitive (CONVENTIONS.md), so per
 * ADR tech/0011's current narrowed scope it gets stories + axe coverage here but no
 * `visual/primitives.visual.spec.ts` entry.
 *
 * `Sidebar` is RSC-fed (D-02) — each story stages `boards`/`loadFailed` directly as args, not
 * through a mocked hook. `parameters.nextjs.appDirectory` is required — `Sidebar` calls
 * `useRouter()` (for the load-failure retry control), which `@storybook/nextjs-vite` only mounts a
 * working App Router context for once that flag is set (mirrors theme-toggle.stories.tsx/
 * sign-in-form.stories.tsx's identical setup).
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
