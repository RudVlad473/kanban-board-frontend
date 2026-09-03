import { expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { describeForEachDevice } from "@/test-utils/describe-for-each-device";
import { createNextLinkShim } from "@/test-utils/next-router-shims";

import DashboardError from "./error";

// eslint-disable-next-line no-restricted-properties -- next/link reads process.env, undefined in Vitest Browser Mode
vi.mock("next/link", () => createNextLinkShim());

/*
 * Route error boundary — exempt from the stories requirement per docs/adr/tech/0021's carve-out.
 * Renders the real boundary with a real Error, proving the recovery surface renders and the
 * thrown error's own text never leaks onto the page.
 */
describeForEachDevice({
    name: "app/(dashboard)/error",
    body: () => {
        it("renders the shared recovery surface and reference line for a real thrown error, without leaking the error's own text", async () => {
            // Arrange
            const error = new Error("a very specific internal database connection string leaked here") as Error & {
                digest?: string;
            };
            error.digest = "digest-abc-123";

            // Act
            const screen = await render(<DashboardError error={error} reset={() => undefined} />);

            // Assert
            await expect.element(screen.getByRole("heading", { name: "Something went wrong" })).toBeVisible();
            await expect.element(screen.getByText("Reference: digest-abc-123")).toBeVisible();
            expect(screen.container.textContent).not.toContain(error.message);
        });
    },
});
