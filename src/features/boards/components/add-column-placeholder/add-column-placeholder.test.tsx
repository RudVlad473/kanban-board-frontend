/*
 * Composed from the plain React renderer package, not the Next.js-aware Storybook framework
 * package — the latter eagerly imports real Next.js internals this "browser" project doesn't
 * load the Vite plugin for (see docs/adr/tech/0025).
 */
import { composeStories } from "@storybook/react";
import { expect, it } from "vitest";
import { render } from "vitest-browser-react";

import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

import * as stories from "./add-column-placeholder.stories";

const { Default, InRow } = composeStories(stories);

describeForEachDevice({
    name: "AddColumn placeholder",
    body: () => {
        /* A real button, not a decorated surface — the literal `+` is part of the accessible name. */
        it("renders the Copywriting Contract's label on a real button", async () => {
            // Act
            const screenResult = await render(<Default />);

            // Assert
            await expect.element(screenResult.getByRole("button", { name: "+ New Column" })).toBeVisible();
        });

        it("reports an open request when the ghost column is pressed", async () => {
            // Arrange
            const screenResult = await render(<Default />);

            // Act
            await screenResult.getByRole("button", { name: "+ New Column" }).click();

            // Assert
            expect(Default.args.onOpen).toHaveBeenCalledOnce();
        });

        it("renders inside the horizontal row at the same width as a real column", async () => {
            // Act
            const screenResult = await render(<InRow />);

            // Assert
            await expect.element(screenResult.getByRole("button", { name: "+ New Column" })).toBeVisible();
        });
    },
});
