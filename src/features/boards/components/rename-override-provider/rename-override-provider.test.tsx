/*
 * Composed from the plain React renderer package, not the Next.js-aware Storybook framework
 * package — the latter eagerly imports real Next.js internals this "browser" project doesn't
 * load the Vite plugin for (see docs/adr/tech/0025).
 */
import { composeStories } from "@storybook/react";
import { screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { buildBoardDetailPath } from "@/lib/core/routing/routes";
import { describeForEachDevice } from "@/test-utils/describe-for-each-device";
import { createBoards } from "@/test-utils/factories/board";
import { createNextLinkShim, createNextNavigationShim } from "@/test-utils/next-router-shims";
import {
    holdNextRenameBoard,
    queueRenameBoardFailure,
    renameBoardActionCalls,
    resetRenameBoardStub,
    settleRenameBoard,
} from "@/test-utils/rename-board-action-storybook-stub";

import * as stories from "./rename-override-provider.stories";

// eslint-disable-next-line no-restricted-properties -- next/navigation's router has no real implementation outside a Next.js request/render cycle in Vitest (D-19)
vi.mock("next/navigation", () =>
    createNextNavigationShim({ pathname: buildBoardDetailPath(createBoards(3)[0].id), refresh: () => undefined }),
);

// eslint-disable-next-line no-restricted-properties -- next/link reads process.env, undefined in Vitest Browser Mode (D-19, see comment above)
vi.mock("next/link", () => createNextLinkShim());

const { SidebarAndHeader } = composeStories(stories);

/*
 * Both read off the DOM rather than by role: Base UI marks the tree outside an open dialog
 * `aria-hidden`, and the whole point here is what the header and sidebar show while the rename
 * modal is still open — a role query would find neither at exactly the moment under test.
 */
const getHeaderTitle = (): string | null => document.querySelector("header h1")?.textContent ?? null;

const getSidebarRowNames = (): (string | null)[] =>
    Array.from(document.querySelectorAll("ul > li > a")).map((link) => link.textContent);

const renameOpenBoard = async (nextName: string): Promise<void> => {
    await userEvent.click(screen.getByRole("button", { name: "Board actions for Fixture Board 1" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Edit Board" }));
    await userEvent.fill(await screen.findByLabelText("Board Name"), nextName);
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));
};

describeForEachDevice({
    name: "RenameOverrideProvider",
    body: () => {
        beforeEach(() => {
            resetRenameBoardStub();
        });

        it("names the open board in the header before any rename", async () => {
            // Act
            await render(<SidebarAndHeader />);

            // Assert
            expect(getHeaderTitle()).toBe("Fixture Board 1");
            expect(getSidebarRowNames()[0]).toBe("Fixture Board 1");
        });

        /*
         * The reason this provider exists: without it the header would trail the sidebar by a
         * server round trip, which the plan's Task 4 checkpoint rejected as a visible lag.
         */
        it("moves the header title and the sidebar row in the same instant, before the write resolves", async () => {
            // Arrange
            await render(<SidebarAndHeader />);
            holdNextRenameBoard();

            // Act — submit, then observe while the action is demonstrably still unresolved.
            await renameOpenBoard("Platform Relaunch");

            // Assert — both, not just the sidebar.
            await vi.waitFor(() => {
                expect(getHeaderTitle()).toBe("Platform Relaunch");
            });
            expect(getSidebarRowNames()[0]).toBe("Platform Relaunch");
            // D-02: the modal is dismissed on submit, so it is already gone with the write still open.
            expect(screen.queryByRole("heading", { name: "Edit Board" })).not.toBeInTheDocument();

            // Act — let the write land.
            settleRenameBoard();

            // Assert — both still carry it once the write settles.
            await vi.waitFor(() => {
                expect(renameBoardActionCalls).toHaveLength(1);
            });
            expect(getHeaderTitle()).toBe("Platform Relaunch");
            expect(getSidebarRowNames()[0]).toBe("Platform Relaunch");
        });

        it("reverts the header title as well as the sidebar row when the rename fails", async () => {
            // Arrange
            await render(<SidebarAndHeader />);
            queueRenameBoardFailure(RESULT_STATUS.ERROR);

            // Act
            await renameOpenBoard("Platform Relaunch");

            // Assert — neither is left asserting a name that never persisted.
            await vi.waitFor(() => {
                expect(getHeaderTitle()).toBe("Fixture Board 1");
            });
            expect(getSidebarRowNames()[0]).toBe("Fixture Board 1");
        });

        it("leaves the other rows' names untouched while one row is overridden", async () => {
            // Arrange
            await render(<SidebarAndHeader />);
            holdNextRenameBoard();

            // Act
            await renameOpenBoard("Platform Relaunch");

            // Assert
            await vi.waitFor(() => {
                expect(getSidebarRowNames()).toEqual(["Platform Relaunch", "Fixture Board 2", "Fixture Board 3"]);
            });
            settleRenameBoard();
        });
    },
});
