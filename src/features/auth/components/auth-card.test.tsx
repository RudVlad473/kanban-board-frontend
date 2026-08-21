import { composeStories } from "@storybook/react";
import { screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";

import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

import * as stories from "./auth-card.stories";

const { Default, LongTitle } = composeStories(stories);

/*
 * ADR tech/0014: every component's behavioral suite runs at both viewports by default. AuthCard
 * has no viewport-conditional behavior of its own.
 */
describeForEachDevice({
    name: "AuthCard",
    body: () => {
        // composeStories' `.run()` leaves its last mount in place — wipe the body between tests.
        afterEach(() => {
            document.body.innerHTML = "";
        });

        it("renders the title as a level-1 heading", async () => {
            // Act
            await Default.run();

            // Assert
            expect(screen.getByRole("heading", { level: 1, name: "Sign In" })).toBeInTheDocument();
        });

        it("renders its children inside the card", async () => {
            // Act
            await Default.run();

            // Assert
            expect(screen.getByText("Card body content.")).toBeInTheDocument();
        });

        it("renders a long title in full, without dropping any of its text", async () => {
            // Act
            await LongTitle.run();

            // Assert
            expect(
                screen.getByRole("heading", {
                    level: 1,
                    name: "A Very Long Title That Should Wrap Instead Of Overflowing The Card",
                }),
            ).toBeInTheDocument();
        });
    },
});
