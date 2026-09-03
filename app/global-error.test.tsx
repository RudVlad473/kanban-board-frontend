import { expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { describeForEachDevice } from "@/test-utils/describe-for-each-device";
import { createNextLinkShim } from "@/test-utils/next-router-shims";

import GlobalError from "./global-error";

// eslint-disable-next-line no-restricted-properties -- next/link reads process.env, undefined in Vitest Browser Mode
vi.mock("next/link", () => createNextLinkShim());

/*
 * Route error boundary — exempt from the stories requirement per docs/adr/tech/0021's carve-out.
 * Rendering a component that returns its own html/body into a test container is legitimate and
 * the only way to assert the structure — this boundary replaces the root layout entirely.
 */
describeForEachDevice({
    name: "app/global-error",
    body: () => {
        it("renders its own html element containing the recovery surface with app-wide copy", async () => {
            /*
             * Arrange — a document allows exactly one <html> element, so the browser reconciles the
             * returned html element onto the real document.documentElement instead of nesting one
             * inside the test container; asserting lang/class there proves it actually rendered.
             */
            const error = new Error("root layout blew up") as Error & { digest?: string };

            // Act
            const screen = await render(<GlobalError error={error} reset={vi.fn()} />);

            // Assert
            expect(document.documentElement.getAttribute("lang")).toBe("en");
            expect(document.documentElement.classList.contains("h-full")).toBe(true);
            expect(document.documentElement.classList.contains("antialiased")).toBe(true);
            await expect.element(screen.getByRole("heading", { name: "Something went wrong" })).toBeVisible();
            await expect
                .element(screen.getByText("The app ran into a problem and couldn't finish loading."))
                .toBeVisible();
        });

        it("invokes reset exactly once when the retry control is pressed", async () => {
            // Arrange
            const reset = vi.fn();
            const error = new Error("root layout blew up") as Error & { digest?: string };
            const screen = await render(<GlobalError error={error} reset={reset} />);

            // Act
            await screen.getByRole("button", { name: "Try again" }).click();

            // Assert
            expect(reset).toHaveBeenCalledOnce();
        });
    },
});
