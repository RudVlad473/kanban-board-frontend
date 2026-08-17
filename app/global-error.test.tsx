import { expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

import GlobalError from "./global-error";

/*
 * Rendering a component that returns its own html and body into a test container is legitimate
 * here and the only way to assert the element structure — this boundary replaces the root layout
 * entirely, so it has to restate that structure itself.
 */
describeForEachDevice({
    name: "app/global-error",
    body: () => {
        it("renders its own html element containing the recovery surface with app-wide copy", async () => {
            /*
             * Arrange — a document allows exactly one <html> element, so a browser reconciles the
             * component's returned html element onto the real document.documentElement rather than
             * nesting a second one inside the test container. Asserting the lang/class attributes
             * landed there is how this boundary's own html element is proven to have rendered, as
             * opposed to the component being a no-op that left the page shell untouched.
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
