import { expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

import DashboardError from "./error";

/*
 * Renders the real boundary component with a real Error — not merely asserted to exist by file
 * listing. Proves the segment boundary both renders the shared recovery surface and never puts
 * the thrown error's own text on screen.
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
