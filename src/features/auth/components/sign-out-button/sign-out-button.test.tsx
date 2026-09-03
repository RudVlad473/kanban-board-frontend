import { composeStories } from "@storybook/react";
import { screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { AUTH_ACTION_IDLE } from "@/features/auth/action-state";
import { signOutAction } from "@/features/auth/actions/sign-out-action";
import { actionStub } from "@/test-utils/action-stub-registry";
import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

import * as stories from "./sign-out-button.stories";

const { Default } = composeStories(stories);

/*
 * Renders the composed `Default` story, not a bare `<SignOutButton />` — mounts through the
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
        /*
         * No file-local reset hook: the recorder's call log is cleared centrally by
         * `resetAllActionStubs()` in vitest.setup.ts's afterEach, which replaced this file's
         * own counter reset when the hand-written double went away.
         */

        // Shallow: accessible name — asserted through the composed story.
        it("renders a secondary button labelled Sign Out", async () => {
            // Act
            await render(<Default />);

            // Assert
            expect(screen.getByRole("button", { name: "Sign Out" })).toBeInTheDocument();
        });

        // Deep: real click interaction and the recorder's own logged invocation.
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
         * A component-wiring claim ("formAction invoked the action once"), not a real-effect
         * claim — the session cookie clearing and redirect are proven in e2e/auth.e2e.spec.ts
         * instead (docs/adr/tech/0025).
         */
        it("calls signOutAction exactly once when clicked, asking the backend for nothing beyond that one call", async () => {
            // Arrange
            const rendered = await renderSignOutButton();
            // No implicit success default — this one click's outcome is queued at the call site.
            actionStub(signOutAction).queue(AUTH_ACTION_IDLE);

            // Act
            await rendered.getByRole("button", { name: "Sign Out" }).click();

            // Assert — the recorder's own call log, not a mock.
            await expect.poll(() => actionStub(signOutAction).calls.length).toBe(1);
        });
    },
});
