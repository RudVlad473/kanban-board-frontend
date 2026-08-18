import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { postSignIn } from "@/features/auth/api/auth-api";
import { QueryProvider } from "@/lib/query-client";
import { ROUTE } from "@/lib/routes";

import { useSignIn } from "./use-sign-in";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push, refresh }),
}));

vi.mock("@/features/auth/api/auth-api", () => ({
    postSignIn: vi.fn(),
}));

const mockedPostSignIn = vi.mocked(postSignIn);

const wrapper = ({ children }: PropsWithChildren) => <QueryProvider>{children}</QueryProvider>;

const CREDENTIALS = { email: "demo@kanban-board.dev", password: "DemoPassword123!" };

afterEach(() => {
    vi.clearAllMocks();
});

describe("useSignIn", () => {
    it("invokes the sign-in API function exactly once with the supplied credentials unchanged", async () => {
        // Arrange
        mockedPostSignIn.mockResolvedValueOnce({ ok: true });
        const { result } = renderHook(() => useSignIn(), { wrapper });

        // Act
        result.current.mutate(CREDENTIALS);

        // Assert
        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });
        expect(mockedPostSignIn).toHaveBeenCalledOnce();
        expect(mockedPostSignIn.mock.calls[0]?.[0]).toEqual(CREDENTIALS);
    });

    it("navigates to the board list path and then refreshes the router, in that order, on success", async () => {
        // Arrange
        mockedPostSignIn.mockResolvedValueOnce({ ok: true });
        const { result } = renderHook(() => useSignIn(), { wrapper });

        // Act
        result.current.mutate(CREDENTIALS);

        // Assert
        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });
        expect(push).toHaveBeenCalledExactlyOnceWith(ROUTE.BOARDS);
        expect(refresh).toHaveBeenCalledOnce();
        expect(push.mock.invocationCallOrder[0]).toBeLessThan(refresh.mock.invocationCallOrder[0]);
    });

    it("exposes the thrown message unmodified to the caller on a failed sign-in", async () => {
        // Arrange
        const FAILURE_MESSAGE = "Invalid email or password.";
        mockedPostSignIn.mockRejectedValueOnce(new Error(FAILURE_MESSAGE));
        const { result } = renderHook(() => useSignIn(), { wrapper });

        // Act
        result.current.mutate(CREDENTIALS);

        // Assert
        await waitFor(() => {
            expect(result.current.isError).toBe(true);
        });
        expect(result.current.error?.message).toBe(FAILURE_MESSAGE);
    });

    it("does not navigate on a failed sign-in", async () => {
        // Arrange
        mockedPostSignIn.mockRejectedValueOnce(new Error("Invalid email or password."));
        const { result } = renderHook(() => useSignIn(), { wrapper });

        // Act
        result.current.mutate(CREDENTIALS);

        // Assert
        await waitFor(() => {
            expect(result.current.isError).toBe(true);
        });
        expect(push).not.toHaveBeenCalled();
        expect(refresh).not.toHaveBeenCalled();
    });

    it("invokes the API function exactly once on failure — retry is disabled", async () => {
        // Arrange
        mockedPostSignIn.mockRejectedValueOnce(new Error("Invalid email or password."));
        const { result } = renderHook(() => useSignIn(), { wrapper });

        // Act
        result.current.mutate(CREDENTIALS);

        // Assert
        await waitFor(() => {
            expect(result.current.isError).toBe(true);
        });
        expect(mockedPostSignIn).toHaveBeenCalledOnce();
    });
});
