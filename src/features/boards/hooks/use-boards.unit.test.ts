import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { boardsApi } from "@/features/boards/api/boards-api";
import type * as BoardsApiModule from "@/features/boards/api/boards-api";

import { useBoards } from "./use-boards";

/*
 * `@/features/boards/api/boards-api` (this hook's own `queryFn` module) is the seam to stub — the
 * same "mock their own API module rather than real layout/paint" pattern CONVENTIONS.md's test
 * table names for a TanStack Query hook. `importActual` keeps the real `boardQueryKeys` export
 * intact, since nothing about it needs faking.
 */
vi.mock("@/features/boards/api/boards-api", async (importOriginal) => {
    const actual = await importOriginal<typeof BoardsApiModule>();
    return { ...actual, boardsApi: { list: vi.fn() } };
});

const mockedList = vi.mocked(boardsApi.list);

const createWrapper = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const Wrapper = ({ children }: PropsWithChildren) =>
        createElement(QueryClientProvider, { client: queryClient }, children);
    Wrapper.displayName = "QueryClientProviderWrapper";
    return Wrapper;
};

beforeEach(() => {
    mockedList.mockReset();
});

describe("useBoards", () => {
    it("exposes the fetched array, reversed to newest-first, on success", async () => {
        // Arrange
        mockedList.mockResolvedValueOnce([
            { id: "board-1", name: "Oldest", version: 0 },
            { id: "board-2", name: "Newest", version: 0 },
        ]);

        // Act
        const { result } = renderHook(() => useBoards(), { wrapper: createWrapper() });
        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        // Assert
        expect(result.current.data).toEqual([
            { id: "board-2", name: "Newest", version: 0 },
            { id: "board-1", name: "Oldest", version: 0 },
        ]);
    });

    it("exposes an error state when boardsApi.list rejects", async () => {
        // Arrange
        mockedList.mockRejectedValueOnce(new Error("Failed to load boards"));

        // Act
        const { result } = renderHook(() => useBoards(), { wrapper: createWrapper() });
        await waitFor(() => {
            expect(result.current.isError).toBe(true);
        });

        // Assert
        expect(result.current.data).toBeUndefined();
    });
});
