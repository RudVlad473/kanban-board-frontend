/*
 * Composed from the plain React renderer package, not the Next.js-aware Storybook framework
 * package — the latter eagerly imports real Next.js internals this "browser" project doesn't
 * load the Vite plugin for (see docs/adr/tech/0025).
 */
import { composeStories } from "@storybook/react";
import { expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { describeForEachDevice } from "@/test-utils/describe-for-each-device";

import * as stories from "./column-header.stories";

const {
    Default,
    SecondAccent,
    ThirdAccent,
    AccentFollowsIdNotPosition,
    NoTasks,
    LongColumnName,
    MenuOpen,
    MenuOpenWithDelete,
    LoneColumnMenuOpen,
    DragHandleFocused,
    MutationsDisabled,
    StoredColor,
} = composeStories(stories);

/** The dot is `aria-hidden`, so it is reached through the DOM rather than by role. */
const getDotElement = (): HTMLElement => {
    const dot = document.querySelector<HTMLElement>('h2 [aria-hidden="true"]');
    if (!dot) {
        throw new Error("Column header dot not found — is the header rendered?");
    }
    return dot;
};

describeForEachDevice({
    name: "ColumnHeader",
    body: () => {
        it("carries the first column accent on the dot of a column whose id hashes there", async () => {
            // Act
            await render(<Default />);

            // Assert
            expect(getDotElement()).toHaveClass("bg-accent-column-1");
        });

        it("carries the second column accent for an id hashing to the second bucket", async () => {
            // Act
            await render(<SecondAccent />);

            // Assert
            expect(getDotElement()).toHaveClass("bg-accent-column-2");
        });

        it("carries the third column accent for an id hashing to the third bucket", async () => {
            // Act
            await render(<ThirdAccent />);

            // Assert
            expect(getDotElement()).toHaveClass("bg-accent-column-3");
        });

        /*
         * The regression the id keying exists for: a delete renumbers positions, and a
         * position-keyed hue repainted every surviving column (see `toColumnDotToken`).
         */
        it("keeps a column's accent when its position changes", async () => {
            // Act
            await render(<AccentFollowsIdNotPosition />);

            // Assert
            expect(getDotElement()).toHaveClass("bg-accent-column-1");
        });

        /*
         * The dot carries no meaning a caption-reading user would miss, so it must contribute
         * nothing to the accessible name — U-03 puts the column's identity in the text beside it.
         */
        it("reads as the composed caption alone, with the dot contributing no accessible text", async () => {
            // Act
            const screen = await render(<Default />);

            // Assert
            await expect.element(screen.getByRole("heading", { name: "Todo (4)" })).toBeVisible();
            expect(getDotElement()).toHaveTextContent("");
        });

        /*
         * A stored colour is a runtime hex, never a Tailwind class — this proves the dot renders it
         * as an inline style and drops every `bg-accent-column-N` utility rather than layering both.
         */
        it("renders a stored colour as the dot's computed background, carrying no accent class", async () => {
            // Act
            await render(<StoredColor />);

            // Assert
            const dot = getDotElement();
            expect(getComputedStyle(dot).backgroundColor).toBe("rgb(234, 96, 0)");
            expect(dot.className).not.toMatch(/bg-accent-column-\d/);
        });

        /* Still `aria-hidden` and contributing nothing to the accessible name — the stored-colour path is decoration too. */
        it("keeps a stored-colour dot aria-hidden and out of the accessible name", async () => {
            // Act
            const screen = await render(<StoredColor />);

            // Assert
            await expect.element(screen.getByRole("heading", { name: "Design (2)" })).toBeVisible();
            const dot = getDotElement();
            expect(dot).toHaveAttribute("aria-hidden", "true");
            expect(dot).toHaveTextContent("");
        });

        /*
         * The kebab is now the header's one and only control — task creation is Phase 4, and a
         * dead "add a task" affordance is worse than none (UI-SPEC empty/column-with-0-tasks).
         */
        it("renders a zero count and no add-a-task control for a column holding no tasks", async () => {
            // Act
            const screen = await render(<NoTasks />);

            // Assert
            const heading = screen.getByRole("heading", { name: "Backlog (0)" }).element();
            expect(heading.textContent).toBe("Backlog (0)");
            const controls = Array.from(document.querySelectorAll("button"));
            expect(controls.map((control) => control.getAttribute("aria-label"))).toEqual([
                "Column actions for Backlog",
            ]);
        });

        /* UI-SPEC overflow/long-column-name: the count is what must stay readable at any width. */
        it("truncates a 32-character name while rendering the count in full beside it", async () => {
            // Arrange
            const screen = await render(<LongColumnName />);

            // Act
            const name = screen.getByText("Mmmmmmmm Mmmmmmmm Mmmmmmmm Mmmmm").element();
            const count = name.nextElementSibling;

            // Assert
            expect(getComputedStyle(name).textOverflow).toBe("ellipsis");
            expect(name.scrollWidth).toBeGreaterThan(name.clientWidth);
            expect(count).toHaveTextContent("(2)");
            expect(count?.scrollWidth).toBeLessThanOrEqual((count?.clientWidth ?? 0) + 1);
        });

        it("keeps the id the column section's aria-labelledby points at", async () => {
            /*
             * Arrange — read the id off the story rather than restating it, so changing the
             * fixture cannot silently turn this into an assertion about nothing.
             */
            const column = Default.args.column;
            if (!column) {
                throw new Error("The Default story must supply a column for this assertion to mean anything.");
            }

            // Act
            const screen = await render(<Default />);

            // Assert
            expect(screen.getByRole("heading", { name: "Todo (4)" }).element()).toHaveAttribute(
                "id",
                `board-column-${column.id}`,
            );
        });

        /*
         * The direct consequence: the kebab is a SIBLING of the heading, never inside it, so it
         * can never be confused with the drag handle plan 03-10 puts on the heading itself.
         */
        it("names the kebab after its own column and keeps it outside the heading", async () => {
            // Act
            const screen = await render(<Default />);

            // Assert
            const kebab = screen.getByRole("button", { name: "Column actions for Todo" }).element();
            const heading = screen.getByRole("heading", { name: "Todo (4)" }).element();
            expect(kebab).toBeVisible();
            expect(heading.contains(kebab)).toBe(false);
        });

        /* UI-SPEC's 44px floor — an icon-only control the whole header row is sized around. */
        it("gives the kebab a 44px touch target", async () => {
            // Act
            const screen = await render(<Default />);

            // Assert
            const kebab = screen.getByRole("button", { name: "Column actions for Todo" }).element();
            const { width, height } = kebab.getBoundingClientRect();
            expect(width).toBeGreaterThanOrEqual(44);
            expect(height).toBeGreaterThanOrEqual(44);
        });

        /* The kebab is complete at two entries — both live, so neither is a dead control. */
        it("offers Rename Column then Delete Column, in that order, when staged open", async () => {
            // Act
            const screen = await render(<MenuOpen />);

            // Assert
            await expect.element(screen.getByRole("menuitem", { name: "Rename Column" })).toBeVisible();
            const items = Array.from(document.querySelectorAll('[role="menuitem"]'));
            expect(items.map((item) => item.textContent)).toEqual(["Rename Column", "Delete Column"]);
        });

        /*
         * UI-SPEC "Destructive reserved for" item 4: the danger colour comes from `Menu.Item`'s own
         * `isDestructive` prop, and only the delete entry carries it.
         */
        it("marks only the delete entry with the shared destructive treatment", async () => {
            // Act
            const screen = await render(<MenuOpenWithDelete />);

            // Assert
            const remove = screen.getByRole("menuitem", { name: "Delete Column" }).element();
            const rename = screen.getByRole("menuitem", { name: "Rename Column" }).element();
            expect(remove).toHaveClass("text-text-danger");
            expect(rename).toHaveClass("text-text-primary");
        });

        it("reports this column back to its caller when Delete Column is chosen", async () => {
            // Arrange
            const screen = await render(<MenuOpenWithDelete />);

            // Act
            await userEvent.click(screen.getByRole("menuitem", { name: "Delete Column" }));

            // Assert — reported, never destroyed here: the confirmation is the container's job.
            await expect
                .poll(() => MenuOpenWithDelete.args.onDelete)
                .toHaveBeenCalledWith(MenuOpenWithDelete.args.column);
            expect(MenuOpenWithDelete.args.onDelete).toHaveBeenCalledTimes(1);
            expect(MenuOpenWithDelete.args.onRename).not.toHaveBeenCalled();
        });

        /*
         * UI-SPEC zero-one-many/exactly-1-column: both entries stay meaningful on a lone column,
         * unlike dragging, which plan 03-10 withholds from it.
         */
        it("still offers both entries on a board's only column", async () => {
            // Act
            const screen = await render(<LoneColumnMenuOpen />);

            // Assert
            await expect.element(screen.getByRole("menuitem", { name: "Rename Column" })).toBeVisible();
            await expect.element(screen.getByRole("menuitem", { name: "Delete Column" })).toBeVisible();
        });

        it("reports this column back to its caller when Rename Column is chosen", async () => {
            // Arrange
            const screen = await render(<MenuOpen />);

            // Act
            await userEvent.click(screen.getByRole("menuitem", { name: "Rename Column" }));

            // Assert
            await expect.poll(() => MenuOpen.args.onRename).toHaveBeenCalledWith(MenuOpen.args.column);
            expect(MenuOpen.args.onRename).toHaveBeenCalledTimes(1);
        });

        /*
         * The direct consequence: the enter key LIFTS the column, so a handle that also
         * activated on enter would be ambiguous — this one carries no click action at all.
         */
        it("spreads the library's own handle attributes and adds no click action of its own", async () => {
            // Arrange
            const screen = await render(<DragHandleFocused />);
            const handle = screen.getByRole("button", { name: "Todo (4)" }).element();

            // Act
            await userEvent.click(handle);

            // Assert
            expect(handle).toHaveAttribute("aria-roledescription", "draggable column");
            expect(handle).toHaveAttribute("aria-describedby", "column-header-story-drag-instructions");
            expect(DragHandleFocused.args.onRename).not.toHaveBeenCalled();
            expect(DragHandleFocused.args.onDelete).not.toHaveBeenCalled();
        });

        /* The handle is the whole caption row, so the dot and the count travel inside it. */
        it("puts the dot and the caption inside the handle rather than beside it", async () => {
            // Act
            const screen = await render(<DragHandleFocused />);

            // Assert
            const handle = screen.getByRole("button", { name: "Todo (4)" }).element();
            expect(handle.querySelector('[aria-hidden="true"]')).not.toBeNull();
            expect(handle.textContent).toBe("Todo (4)");
        });

        /* T-03-31: a second mutation against the version a reorder just invalidated cannot be fired. */
        it("disables both menu entries while this column's own reorder is unsettled", async () => {
            // Act
            const screen = await render(<MutationsDisabled />);

            // Assert
            await expect.element(screen.getByRole("menuitem", { name: "Rename Column" })).toBeVisible();
            const items = Array.from(document.querySelectorAll('[role="menuitem"]'));
            expect(items.map((item) => item.getAttribute("data-disabled"))).toEqual(["", ""]);
        });

        /*
         * The regression UI-SPEC calls the most likely one here: a plain click must open the menu
         * rather than reaching the heading, which plan 03-10 turns into a drag handle.
         */
        it("opens the menu on a plain click without activating the heading", async () => {
            // Arrange
            const screen = await render(<Default />);

            // Act
            await userEvent.click(screen.getByRole("button", { name: "Column actions for Todo" }));

            // Assert
            await expect.element(screen.getByRole("menuitem", { name: "Rename Column" })).toBeVisible();
            expect(Default.args.onRename).not.toHaveBeenCalled();
        });
    },
});
