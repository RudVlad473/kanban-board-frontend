import { afterEach, expect, it, vi } from "vitest";

import { AUTH_ACTION_IDLE, type AuthActionState } from "@/features/auth/action-state";
import { signOutAction } from "@/features/auth/actions/sign-out";
import { describeForEachDevice } from "@/test-utils/describe-for-each-device";
import { renderWithProviders } from "@/test-utils/render-with-providers";

import { SignOutButton } from "./sign-out-button";

/*
 * Stubbing the module boundary, not a network layer — the same pattern sign-in-form.test.tsx/
 * sign-up-form.test.tsx use for their own server functions (GC-22: no fake HTTP layer of any kind
 * remains in this repository). This is also the only way to prove the fourth behaviour (asks the
 * backend for nothing): `signOutAction` is the sole export this component ever calls, so asserting
 * it was called exactly once with no other module touched is the whole of that property from this
 * component's vantage point — the server function's own unit test (actions.unit.test.ts)
 * separately proves the stubbed HTTP client itself is never invoked.
 */
vi.mock("@/features/auth/actions/sign-out", () => ({
    signOutAction: vi.fn(),
}));

const mockedSignOutAction = vi.mocked(signOutAction);

const renderSignOutButton = () => renderWithProviders(<SignOutButton />);

/*
 * ADR tech/0014: every component's behavioral suite runs at both viewports by default. The
 * sign-out control has no viewport-conditional behavior of its own.
 */
describeForEachDevice({
    name: "SignOutButton",
    body: () => {
        afterEach(() => {
            mockedSignOutAction.mockReset();
        });

        it("renders a secondary button labelled Sign Out", async () => {
            // Arrange
            const screen = await renderSignOutButton();

            // Assert
            await expect.element(screen.getByRole("button", { name: "Sign Out" })).toBeVisible();
        });

        it("submits through the form element's own action, not a click handler, so it works before hydration", async () => {
            // Arrange
            const screen = await renderSignOutButton();

            /*
             * Assert — React renders a function-based `action` as a distinctive no-JS fallback
             * (`javascript:throw new Error("A React form was unexpectedly submitted...")`), never
             * as a real URL — the property that makes the form work before hydration, and it is
             * invisible to every other assertion in this file.
             */
            const form = screen.container.querySelector("form");
            expect(form?.getAttribute("action")).toContain("A React form was unexpectedly submitted");
        });

        it("calls signOutAction exactly once when clicked, asking the backend for nothing beyond that one call", async () => {
            // Arrange
            mockedSignOutAction.mockResolvedValueOnce(AUTH_ACTION_IDLE);
            const screen = await renderSignOutButton();

            // Act
            await screen.getByRole("button", { name: "Sign Out" }).click();

            // Assert
            await expect.poll(() => mockedSignOutAction.mock.calls.length).toBe(1);
        });

        it("disables the control and shows aria-busy while the request is in flight", async () => {
            // Arrange
            let resolveAction: (state: AuthActionState) => void = () => undefined;
            const actionGate = new Promise<AuthActionState>((resolve) => {
                resolveAction = resolve;
            });
            mockedSignOutAction.mockImplementationOnce(async () => actionGate);
            const screen = await renderSignOutButton();
            const submitButton = screen.getByRole("button", { name: "Sign Out" });

            // Act
            await submitButton.click();

            // Assert
            await expect.element(submitButton).toBeDisabled();
            await expect.element(submitButton).toHaveAttribute("aria-busy", "true");

            // Act
            resolveAction(AUTH_ACTION_IDLE);

            // Assert
            await expect.element(submitButton).not.toBeDisabled();
            await expect.element(submitButton).toHaveAttribute("aria-busy", "false");
        });
    },
});
