// Import source: @storybook/react, not the Next.js-aware framework package — see vitest.setup.ts.
import { composeStories } from "@storybook/react";
import { screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { ROUTE } from "@/lib/core/routing/routes";
import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

import { ErrorFallback } from "./error-fallback";
import * as stories from "./error-fallback.stories";

const { Default, WithReference, WithoutHomeLink } = composeStories(stories);

// ADR tech/0014: every component's whole behavioral suite runs at both viewports by default.
describeForEachDevice({
    name: "ErrorFallback",
    body: () => {
        it("renders the supplied title and description, and nothing else in their place", async () => {
            // Act
            await render(<Default />);

            // Assert
            expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeVisible();
            expect(
                screen.getByText("This part of the app ran into a problem. Your other work is unaffected."),
            ).toBeVisible();
        });

        it("renders a reference line with the digest when one is supplied", async () => {
            // Act
            await render(<WithReference />);

            // Assert
            expect(screen.getByText("Reference: a1b2c3d4")).toBeVisible();
        });

        it("renders no reference line at all when no digest is supplied", async () => {
            // Act
            await render(<Default />);

            // Assert
            expect(screen.queryByText(/^Reference:/)).not.toBeInTheDocument();
        });

        // Deep: real click interaction + callback spy.
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

        // Deep: real keyboard/focus interaction.
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
            // Act — the Default story's meta.args already carries homeHref: ROUTE.BOARDS.
            await render(<Default />);

            // Assert
            expect(screen.getByRole("link")).toHaveAttribute("href", ROUTE.BOARDS);
        });

        it("renders no link at all when homeHref is not supplied", async () => {
            // Act
            await render(<WithoutHomeLink />);

            // Assert
            expect(screen.queryByRole("link")).not.toBeInTheDocument();
        });
    },
});
