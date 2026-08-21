import { composeStories } from "@storybook/react";
import { screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";

import { describeForEachDevice } from "@/test-utils/describe-for-each-device";
import { renderWithProviders } from "@/test-utils/render-with-providers";
import { resetSignOutActionCallCount, signOutActionCallCount } from "@/test-utils/sign-out-action-storybook-stub";

import { SignOutButton } from "./sign-out-button";
import * as stories from "./sign-out-button.stories";

const { Default } = composeStories(stories);

const renderSignOutButton = () => renderWithProviders(<SignOutButton />);

/*
 * ADR tech/0014: every component's behavioral suite runs at both viewports by default. The
 * sign-out control has no viewport-conditional behavior of its own.
 */
describeForEachDevice({
    name: "SignOutButton",
    body: () => {
        /*
         * composeStories' `.run()` and vitest-browser-react's `render()` (via renderWithProviders)
         * don't clean up after each other — wipe the page body between tests so the two mechanisms
         * never collide (the same DOM-leak fix plan 02.1-07 applied to the UI primitives).
         */
        afterEach(() => {
            document.body.innerHTML = "";
            resetSignOutActionCallCount();
        });

        // Shallow: accessible name — asserted through the composed story (D-08).
        it("renders a secondary button labelled Sign Out", async () => {
            // Act
            await Default.run();

            // Assert
            expect(screen.getByRole("button", { name: "Sign Out" })).toBeInTheDocument();
        });

        // Deep: real click interaction and the real (aliased-stub) action's recorded invocation.
        it("submits through the form element's own action, not a click handler, so it works before hydration", async () => {
            // Arrange
            const rendered = await renderSignOutButton();

            /*
             * Assert — React renders a function-based `action` as a distinctive no-JS fallback,
             * never a real URL — the property that makes the form work before hydration.
             */
            const form = rendered.container.querySelector("form");
            expect(form?.getAttribute("action")).toContain("A React form was unexpectedly submitted");
        });

        it("calls signOutAction exactly once when clicked, asking the backend for nothing beyond that one call", async () => {
            // Arrange
            const rendered = await renderSignOutButton();

            // Act
            await rendered.getByRole("button", { name: "Sign Out" }).click();

            // Assert — the real (aliased-stub) module's own recorded invocation, not a mock.
            await expect.poll(() => signOutActionCallCount()).toBe(1);
        });
    },
});
