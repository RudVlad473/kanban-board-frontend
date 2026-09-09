/*
 * Composed from the plain React renderer package, not the Next.js-aware Storybook framework
 * package — the latter eagerly imports real Next.js internals this "browser" project doesn't load
 * the Vite plugin for (see docs/adr/tech/0021).
 */
import { composeStories } from "@storybook/react";
import { screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { createBoardAction } from "@/features/boards/actions/create-board-action";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { ROUTE } from "@/lib/core/routing/routes";
import { actionStub } from "@/test-utils/action-stub-registry";
import { describeForEachDevice } from "@/test-utils/describe-for-each-device";
import { createNextLinkShim, createNextNavigationShim } from "@/test-utils/next-router-shims";
import { getRaisedToastTexts } from "@/test-utils/raised-toasts";

import * as stories from "./boards-empty-state.stories";

/* `next/link`/`next/navigation` are the D-19 environment-shim exception — nothing else is stubbed. */
const mockRefresh = vi.hoisted(() => vi.fn());
const mockPush = vi.hoisted(() => vi.fn());

// eslint-disable-next-line no-restricted-properties -- next/navigation's router has no real implementation outside a Next.js request/render cycle in Vitest
vi.mock("next/navigation", () =>
    createNextNavigationShim({ pathname: ROUTE.BOARDS, refresh: mockRefresh, push: mockPush }),
);

// eslint-disable-next-line no-restricted-properties -- next/link reads process.env, undefined in Vitest Browser Mode (see comment above)
vi.mock("next/link", () => createNextLinkShim());

const { Default, ModalOpen } = composeStories(stories);

const createBoardStub = actionStub(createBoardAction);

/*
 * Opens the call to action's modal, fills the name, then adds and fills one row per column name.
 * The form seeds no rows, so each requested column is appended before it is filled.
 */
const submitNewBoard = async ({ name, columns }: { name: string; columns: string[] }): Promise<void> => {
    await userEvent.click(screen.getByRole("button", { name: "Create your first board" }));
    await userEvent.fill(await screen.findByLabelText("Board Name"), name);

    for (const [index, columnName] of columns.entries()) {
        await userEvent.click(screen.getByRole("button", { name: "+ Add New Column" }));
        await userEvent.fill(screen.getByLabelText(`Column ${String(index + 1)}`), columnName);
    }

    await userEvent.click(screen.getByRole("button", { name: "Create New Board" }));
};

/*
 * ADR tech/0014: the whole body runs at both viewports. The empty state has no
 * viewport-conditional behaviour of its own.
 */
describeForEachDevice({
    name: "BoardsEmptyState",
    body: () => {
        it("renders the Copywriting Contract's zero-boards body and its call to action", async () => {
            // Act
            await render(<Default />);

            // Assert
            expect(screen.getByText("Create a new board to get started.")).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Create your first board" })).toBeInTheDocument();
        });

        /* D-10 states plainly that the modal does not auto-open, so nothing may open it on mount. */
        it("keeps the create-board modal closed on first render", async () => {
            // Act
            await render(<Default />);

            // Assert
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });

        it("opens the same create-board modal the sidebar opens when the call to action is activated", async () => {
            // Arrange
            await render(<Default />);

            // Act
            await userEvent.click(screen.getByRole("button", { name: "Create your first board" }));

            // Assert
            expect(await screen.findByRole("dialog")).toBeInTheDocument();
            expect(screen.getByRole("heading", { name: "Add New Board" })).toBeInTheDocument();
        });

        /*
         * Base UI upserts on a repeated id, so an id that drops the column rows silently replaces
         * the earlier attempt's Retry — and with it the only route back to those rows.
         */
        it("raises a second toast for a second attempt sharing the board name but not the column rows", async () => {
            // Arrange
            await render(<Default />);
            createBoardStub.queue({ status: RESULT_STATUS.ERROR });
            await submitNewBoard({ name: "Platform Launch", columns: ["Todo"] });
            await vi.waitFor(() => {
                expect(getRaisedToastTexts()).toHaveLength(1);
            });

            // Act
            createBoardStub.queue({ status: RESULT_STATUS.ERROR });
            await submitNewBoard({ name: "Platform Launch", columns: ["Todo", "Doing"] });

            // Assert — two lost attempts, so two toasts, not one that swallowed the first.
            await vi.waitFor(() => {
                expect(getRaisedToastTexts()).toHaveLength(2);
            });
        });

        it("renders the create-board modal when staged open", async () => {
            // Act
            await render(<ModalOpen />);

            // Assert
            expect(await screen.findByRole("dialog")).toBeInTheDocument();
        });
    },
});
