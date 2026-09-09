import type { Board } from "@/features/boards/schemas";

/**
 * The fixture-entity mechanism for `Board` — a factory function with `Partial<T>` overrides,
 * not a class needing `new` (matches this project's established convention against
 * class-needing-`new` abstractions).
 */
export const createBoard = (overrides: Partial<Board> = {}): Board => ({
    id: "00000000-0000-4000-8000-000000000001",
    name: "Fixture Board",
    version: 0,
    ...overrides,
});

/** `count` boards, each with a distinct id/name derived from its position. */
export const createBoards = (count: number): Board[] =>
    Array.from({ length: count }, (_, index) =>
        createBoard({
            id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
            name: `Fixture Board ${String(index + 1)}`,
        }),
    );
