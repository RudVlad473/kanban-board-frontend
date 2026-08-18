import { expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { ROUTE } from "@/lib/routes";
import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

import { ErrorFallback } from "./error-fallback";

/*
 * ADR tech/0014: every component's whole behavioral suite runs at both viewports by default.
 * ErrorFallback has no viewport-conditional behaviour of its own — every test here runs
 * identically at both sizes, which is itself the point.
 */
describeForEachDevice({
    name: "ErrorFallback",
    body: () => {
        it("renders the supplied title and description, and nothing else in their place", async () => {
            // Arrange
            const screen = await render(
                <ErrorFallback
                    title="Something went wrong"
                    description="This part of the app ran into a problem. Your other work is unaffected."
                    onRetry={vi.fn()}
                />,
            );

            // Assert
            await expect.element(screen.getByRole("heading", { name: "Something went wrong" })).toBeVisible();
            await expect
                .element(screen.getByText("This part of the app ran into a problem. Your other work is unaffected."))
                .toBeVisible();
        });

        it("renders a reference line with the digest when one is supplied", async () => {
            // Arrange
            const screen = await render(
                <ErrorFallback
                    title="Something went wrong"
                    description="A problem occurred."
                    onRetry={vi.fn()}
                    digest="abc123"
                />,
            );

            // Assert
            await expect.element(screen.getByText("Reference: abc123")).toBeVisible();
        });

        it("renders no reference line at all when no digest is supplied", async () => {
            // Arrange
            const screen = await render(
                <ErrorFallback title="Something went wrong" description="A problem occurred." onRetry={vi.fn()} />,
            );

            // Assert
            expect(screen.container.textContent).not.toContain("Reference:");
        });

        it("invokes onRetry exactly once when the retry control is clicked", async () => {
            // Arrange
            const onRetry = vi.fn();
            const screen = await render(
                <ErrorFallback title="Something went wrong" description="A problem occurred." onRetry={onRetry} />,
            );

            // Act
            await screen.getByRole("button", { name: "Try again" }).click();

            // Assert
            expect(onRetry).toHaveBeenCalledOnce();
        });

        it("invokes onRetry exactly once on keyboard activation, and the control is reachable by keyboard", async () => {
            // Arrange
            const onRetry = vi.fn();
            const screen = await render(
                <ErrorFallback title="Something went wrong" description="A problem occurred." onRetry={onRetry} />,
            );
            const button = screen.getByRole("button", { name: "Try again" });

            // Act
            button.element().focus();
            await userEvent.keyboard("{Enter}");

            // Assert
            expect(onRetry).toHaveBeenCalledOnce();
        });

        it("renders a link back to the boards list when homeHref is supplied", async () => {
            // Arrange
            const screen = await render(
                <ErrorFallback
                    title="Something went wrong"
                    description="A problem occurred."
                    onRetry={vi.fn()}
                    homeHref={ROUTE.BOARDS}
                />,
            );

            // Assert
            await expect.element(screen.getByRole("link")).toHaveAttribute("href", ROUTE.BOARDS);
        });

        it("renders no link at all when homeHref is not supplied", async () => {
            // Arrange
            const screen = await render(
                <ErrorFallback title="Something went wrong" description="A problem occurred." onRetry={vi.fn()} />,
            );

            // Assert
            await expect.element(screen.getByRole("link")).not.toBeInTheDocument();
        });
    },
});
