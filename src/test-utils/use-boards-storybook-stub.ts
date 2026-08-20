import type { Board } from "@/features/boards/types";

/**
 * A lightweight stand-in for `@/features/boards/hooks/use-boards`'s runtime module, aliased for
 * the "storybook" Vitest project only (`vitest.config.ts`) — a story renders one fixed visual
 * state (Populated/Loading/LoadFailed/Empty/...), not a real fetch lifecycle, so `sidebar.stories.
 * tsx` calls `setUseBoardsStoryState` before returning `<Sidebar />` and this stub's `useBoards`
 * returns whatever was last staged instead of composing a live `QueryClientProvider` + network
 * call. Mirrors `update-theme-action-storybook-stub.ts`'s aliasing pattern.
 */
export type UseBoardsStoryState = { data: Board[] | undefined; isPending: boolean; isError: boolean };

let currentState: UseBoardsStoryState = { data: [], isPending: false, isError: false };

export const setUseBoardsStoryState = (state: UseBoardsStoryState): void => {
    currentState = state;
};

export const useBoards = () => ({ ...currentState, refetch: () => undefined });
