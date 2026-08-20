import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { setUseBoardsStoryState } from "@/test-utils/use-boards-storybook-stub";

import { Sidebar } from "./sidebar";

/*
 * Visual-only CSF3 (D-25) — no play function anywhere in this file. `Sidebar` is a
 * `components/layout/` component, not a `components/ui/` primitive (CONVENTIONS.md), so per
 * ADR tech/0011's current narrowed scope it gets stories + axe coverage here but no
 * `visual/primitives.visual.spec.ts` entry.
 *
 * Each story stages `useBoards()`'s state via `setUseBoardsStoryState` (aliased for the
 * "storybook" Vitest project in `vitest.config.ts`) before rendering — a story renders one fixed
 * visual state, not a real fetch lifecycle.
 */
const meta: Meta<typeof Sidebar> = {
    component: Sidebar,
    parameters: { layout: "fullscreen" },
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

const boards = [
    { id: "board-1", name: "Platform Launch", version: 0 },
    { id: "board-2", name: "Marketing Plan", version: 0 },
    { id: "board-3", name: "Roadmap", version: 0 },
];

export const Populated: Story = {
    render: () => {
        setUseBoardsStoryState({ data: boards, isPending: false, isError: false });
        return <Sidebar />;
    },
};

export const Loading: Story = {
    render: () => {
        setUseBoardsStoryState({ data: undefined, isPending: true, isError: false });
        return <Sidebar />;
    },
};

export const LoadFailed: Story = {
    render: () => {
        setUseBoardsStoryState({ data: undefined, isPending: false, isError: true });
        return <Sidebar />;
    },
};

export const Empty: Story = {
    render: () => {
        setUseBoardsStoryState({ data: [], isPending: false, isError: false });
        return <Sidebar />;
    },
};

export const ManyBoards: Story = {
    render: () => {
        setUseBoardsStoryState({
            data: Array.from({ length: 20 }, (_, index) => ({
                id: `board-${String(index + 1)}`,
                name: `Board ${String(index + 1)}`,
                version: 0,
            })),
            isPending: false,
            isError: false,
        });
        return <Sidebar />;
    },
};

export const LongBoardName: Story = {
    render: () => {
        setUseBoardsStoryState({
            data: [{ id: "board-1", name: "A".repeat(200), version: 0 }],
            isPending: false,
            isError: false,
        });
        return <Sidebar />;
    },
};
