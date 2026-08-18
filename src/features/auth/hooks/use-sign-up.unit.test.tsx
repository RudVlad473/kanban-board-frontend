import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { postSignUp } from "@/features/auth/api/auth-api";
import { QueryProvider } from "@/lib/query-client";
import { ROUTE } from "@/lib/routes";

import { useSignUp } from "./use-sign-up";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push, refresh }),
}));

vi.mock("@/features/auth/api/auth-api", () => ({
    postSignUp: vi.fn(),
}));

const mockedPostSignUp = vi.mocked(postSignUp);

const wrapper = ({ children }: PropsWithChildren) => <QueryProvider>{children}</QueryProvider>;

const SIGN_UP_INPUT = { email: "fresh@kanban-board.dev", password: "FreshPassword123!", displayName: "Fresh User" };

afterEach(() => {
    vi.clearAllMocks();
});

describe("useSignUp", () => {
    it("invokes the sign-up API function exactly once with the supplied credentials unchanged", async () => {
        // Arrange
        mockedPostSignUp.mockResolvedValueOnce({ ok: true });
        const { result } = renderHook(() => useSignUp(), { wrapper });

        // Act
        result.current.mutate(SIGN_UP_INPUT);

        // Assert
        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });
        expect(mockedPostSignUp).toHaveBeenCalledOnce();
        expect(mockedPostSignUp.mock.calls[0]?.[0]).toEqual(SIGN_UP_INPUT);
    });

    it("navigates to the board list path and then refreshes the router, in that order, on success", async () => {
        // Arrange
        mockedPostSignUp.mockResolvedValueOnce({ ok: true });
        const { result } = renderHook(() => useSignUp(), { wrapper });

        // Act
        result.current.mutate(SIGN_UP_INPUT);

        // Assert
        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });
        expect(push).toHaveBeenCalledExactlyOnceWith(ROUTE.BOARDS);
        expect(refresh).toHaveBeenCalledOnce();
        expect(push.mock.invocationCallOrder[0]).toBeLessThan(refresh.mock.invocationCallOrder[0]);
    });

    it("exposes the thrown message unmodified to the caller on a failed sign-up", async () => {
        // Arrange
        const FAILURE_MESSAGE = "An account with this email already exists.";
        mockedPostSignUp.mockRejectedValueOnce(new Error(FAILURE_MESSAGE));
        const { result } = renderHook(() => useSignUp(), { wrapper });

        // Act
        result.current.mutate(SIGN_UP_INPUT);

        // Assert
        await waitFor(() => {
            expect(result.current.isError).toBe(true);
        });
        expect(result.current.error?.message).toBe(FAILURE_MESSAGE);
    });

    it("does not navigate on a failed sign-up", async () => {
        // Arrange
        mockedPostSignUp.mockRejectedValueOnce(new Error("An account with this email already exists."));
        const { result } = renderHook(() => useSignUp(), { wrapper });

        // Act
        result.current.mutate(SIGN_UP_INPUT);

        // Assert
        await waitFor(() => {
            expect(result.current.isError).toBe(true);
        });
        expect(push).not.toHaveBeenCalled();
        expect(refresh).not.toHaveBeenCalled();
    });

    it("invokes the API function exactly once on failure — retry is disabled", async () => {
        // Arrange
        mockedPostSignUp.mockRejectedValueOnce(new Error("An account with this email already exists."));
        const { result } = renderHook(() => useSignUp(), { wrapper });

        // Act
        result.current.mutate(SIGN_UP_INPUT);

        // Assert
        await waitFor(() => {
            expect(result.current.isError).toBe(true);
        });
        expect(mockedPostSignUp).toHaveBeenCalledOnce();
    });
});
