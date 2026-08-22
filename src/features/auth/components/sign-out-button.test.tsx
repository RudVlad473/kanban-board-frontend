import { composeStories } from "@storybook/react";
import { screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { describeForEachDevice } from "@/test-utils/describe-for-each-device";
import { resetSignOutActionCallCount, signOutActionCallCount } from "@/test-utils/sign-out-action-storybook-stub";

import * as stories from "./sign-out-button.stories";

const { Default } = composeStories(stories);

/*
 * D-03: renders the composed `Default` story, not a bare `<SignOutButton />` — mounts through the
 * story's own decorators plus the global QueryProvider/theme decorators (docs/adr/tech/0025).
 */
const renderSignOutButton = () => render(<Default />);

/*
 * ADR tech/0014: every component's behavioral suite runs at both viewports by default. The
 * sign-out control has no viewport-conditional behavior of its own.
 */
describeForEachDevice({
    name: "SignOutButton",
    body: () => {
        // File-local: the invocation counter lives on the real aliased stub module, not vitest state.
        afterEach(() => {
            resetSignOutActionCallCount();
        });

        // Shallow: accessible name — asserted through the composed story (D-08).
        it("renders a secondary button labelled Sign Out", async () => {
            // Act
            await render(<Default />);

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

        /*
         * D-09: this is a component-wiring claim ("the button's formAction invoked the aliased
         * stub exactly once"), not a claim about the real sign-out's effect — the session cookie
         * being cleared and the redirect to sign-in are proven in e2e/auth.e2e.spec.ts instead
         * (docs/adr/tech/0025).
         */
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
