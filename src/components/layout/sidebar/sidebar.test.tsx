/*
 * Composed from the plain React renderer package, not the Next.js-aware Storybook framework
 * package — the latter eagerly imports real Next.js internals this "browser" project doesn't
 * load the Vite plugin for (see docs/adr/tech/0021).
 */
import { composeStories } from "@storybook/react";
import { screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";

import { ROUTE } from "@/lib/core/routing/routes";
import { describeForEachDevice } from "@/test-utils/describe-for-each-device";
import { createNextLinkShim, createNextNavigationShim } from "@/test-utils/next-router-shims";

import * as stories from "./sidebar.stories";

/*
 * `next/link`/`next/navigation` are the D-19 environment-shim exception — needed here because the
 * `Expanded`/`Overflowing` stories' children compose a real `BoardList` (identical justification
 * to board-list.test.tsx).
 */
const mockRefresh = vi.hoisted(() => vi.fn());

// eslint-disable-next-line no-restricted-properties -- next/navigation's router has no real implementation outside a Next.js request/render cycle in Vitest (D-19)
vi.mock("next/navigation", () => createNextNavigationShim({ pathname: ROUTE.BOARDS, refresh: mockRefresh }));

// eslint-disable-next-line no-restricted-properties -- next/link reads process.env, undefined in Vitest Browser Mode (D-19, see board-list.test.tsx)
vi.mock("next/link", () => createNextLinkShim());

const {
    Expanded,
    Collapsed,
    Overflowing,
    ExpandedWithPlainChildren,
    CollapsedWithPlainChildren,
    ExpandedWithPendingBoardList,
} = composeStories(stories);

describeForEachDevice({
    name: "Sidebar",
    body: () => {
        // Shallow: composed structural states (D-08).
        it("renders the brand mark, the Boards landmark and Hide Sidebar when expanded", async () => {
            // Act
            await render(<Expanded />);

            // Assert
            expect(screen.getByText("kanban")).toBeInTheDocument();
            expect(screen.getByRole("navigation", { name: "Boards" })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Hide Sidebar" })).toBeInTheDocument();
        });

        it("renders only Show Sidebar, with no Boards landmark, when collapsed", async () => {
            // Act
            await render(<Collapsed />);

            // Assert
            expect(screen.queryByRole("navigation", { name: "Boards" })).not.toBeInTheDocument();
            expect(screen.queryByRole("button", { name: "Hide Sidebar" })).not.toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Show Sidebar" })).toBeInTheDocument();
        });

        it("keeps the brand mark and Hide Sidebar reachable once the board list overflows its region", async () => {
            // Act
            await render(<Overflowing />);

            // Assert
            expect(screen.getByText("kanban")).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Hide Sidebar" })).toBeInTheDocument();
            expect(screen.getAllByRole("link")).toHaveLength(15);
        });

        // Deep: real toggling, keyboard reachability, remount and the C-009 no-persistence guarantee.
        it("collapses on activating Hide Sidebar, hiding the Boards landmark and showing Show Sidebar instead", async () => {
            // Arrange
            const rendered = await render(<ExpandedWithPlainChildren />);

            // Act
            await rendered.getByRole("button", { name: "Hide Sidebar" }).click();

            // Assert
            await expect.element(rendered.getByRole("button", { name: "Show Sidebar" })).toBeInTheDocument();
            expect(rendered.getByRole("button", { name: "Hide Sidebar" }).elements().length).toBe(0);
            expect(rendered.getByRole("navigation", { name: "Boards" }).elements().length).toBe(0);
        });

        it("restores the panel on activating Show Sidebar", async () => {
            // Arrange
            const rendered = await render(<ExpandedWithPlainChildren />);
            await rendered.getByRole("button", { name: "Hide Sidebar" }).click();

            // Act
            await rendered.getByRole("button", { name: "Show Sidebar" }).click();

            // Assert
            await expect.element(rendered.getByRole("button", { name: "Hide Sidebar" })).toBeInTheDocument();
            expect(rendered.getByRole("button", { name: "Show Sidebar" }).elements().length).toBe(0);
        });

        it("activates Hide Sidebar and Show Sidebar on both Enter and Space", async () => {
            // Arrange
            const rendered = await render(<ExpandedWithPlainChildren />);

            // Act
            rendered.getByRole("button", { name: "Hide Sidebar" }).element().focus();
            await userEvent.keyboard("{Enter}");

            // Assert
            await expect.element(rendered.getByRole("button", { name: "Show Sidebar" })).toBeInTheDocument();

            // Act
            rendered.getByRole("button", { name: "Show Sidebar" }).element().focus();
            await userEvent.keyboard(" ");

            // Assert
            await expect.element(rendered.getByRole("button", { name: "Hide Sidebar" })).toBeInTheDocument();
        });

        it("renders expanded on a fresh mount, even after a prior instance was collapsed", async () => {
            // Arrange
            const first = await render(<ExpandedWithPlainChildren />);
            await first.getByRole("button", { name: "Hide Sidebar" }).click();
            await expect.element(first.getByRole("button", { name: "Show Sidebar" })).toBeInTheDocument();
            /*
             * The render mechanism's own `cleanup()`, never a raw `innerHTML` wipe — the wipe
             * orphans portalled nodes (the ToastProvider decorator's viewport) and the next unmount
             * throws `NotFoundError: removeChild` (docs/adr/tech/0025).
             */
            await cleanup();

            // Act
            const second = await render(<ExpandedWithPlainChildren />);

            // Assert
            await expect.element(second.getByRole("button", { name: "Hide Sidebar" })).toBeInTheDocument();
        });

        it("leaves document.cookie byte-identical and writes nothing to storage when toggled", async () => {
            // Arrange
            const rendered = await render(<ExpandedWithPlainChildren />);
            const cookieBefore = document.cookie;

            // Act
            await rendered.getByRole("button", { name: "Hide Sidebar" }).click();

            // Assert
            expect(document.cookie).toBe(cookieBefore);
            expect(window.localStorage.length).toBe(0);
            expect(window.sessionStorage.length).toBe(0);
        });

        it("renders the brand mark and Hide Sidebar alongside a not-yet-resolved board list", async () => {
            // Act
            const rendered = await render(<ExpandedWithPendingBoardList />);

            // Assert
            await expect.element(rendered.getByText("kanban")).toBeInTheDocument();
            await expect.element(rendered.getByRole("button", { name: "Hide Sidebar" })).toBeInTheDocument();
        });

        /*
         * Task 1 decided Option B (overlay-later, see 02-09-SUMMARY.md) — below 768px the panel
         * stays the same fixed column as desktop, never an overlay. Both bullets below hold
         * identically at every viewport, which is itself the recorded difference from Option C.
         */
        it("keeps the expanded panel in normal document flow, never positioned over the content", async () => {
            // Arrange
            const rendered = await render(<ExpandedWithPlainChildren />);

            // Assert
            expect(getComputedStyle(rendered.getByRole("navigation", { name: "Boards" }).element()).position).not.toBe(
                "fixed",
            );
        });

        it("returns the full viewport width to the board view with no horizontal overflow once collapsed", async () => {
            // Arrange
            await render(<CollapsedWithPlainChildren />);

            // Assert
            expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
        });
    },
});
