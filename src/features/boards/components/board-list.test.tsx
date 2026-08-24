/*
 * Composed from the plain React renderer package, not the Next.js-aware Storybook framework
 * package — the latter eagerly imports real Next.js internals this "browser" project doesn't
 * load the Vite plugin for (see docs/adr/tech/0021).
 */
import { composeStories } from "@storybook/react";
import { screen, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { buildBoardDetailPath, ROUTE } from "@/lib/core/routing/routes";
/*
 * Imported from the stub module directly, not through the action specifier `vitest.config.ts`
 * aliases onto it — the alias only exists at runtime, so TypeScript would resolve the real module
 * and never see these programmable exports. Both paths are the same module instance here.
 */
import {
    createBoardColumnsActionCalls,
    queueCreateBoardColumnsFailure,
    resetCreateBoardColumnsStub,
} from "@/test-utils/create-board-columns-action-storybook-stub";
import { describeForEachDevice } from "@/test-utils/describe-for-each-device";
import { createNextLinkShim, createNextNavigationShim } from "@/test-utils/next-router-shims";

import * as stories from "./board-list.stories";

/*
 * `next/link`/`next/navigation` are the D-19 environment-shim exception (see the vi.mock below) —
 * every other seam this file used to stub (`useBoards`) is gone: `BoardList` is RSC-fed via props
 * now (D-02/D-03), so there is no business-logic hook left to mock.
 */
const mockRefresh = vi.hoisted(() => vi.fn());
const mockPush = vi.hoisted(() => vi.fn());

// eslint-disable-next-line no-restricted-properties -- next/navigation's router has no real implementation outside a Next.js request/render cycle in Vitest (D-19)
vi.mock("next/navigation", () =>
    createNextNavigationShim({ pathname: ROUTE.BOARDS, refresh: mockRefresh, push: mockPush }),
);

// eslint-disable-next-line no-restricted-properties -- next/link reads process.env, undefined in Vitest Browser Mode (D-19, see comment above)
vi.mock("next/link", () => createNextLinkShim());

const { Populated, Empty, LoadFailed, AddBoardOpen } = composeStories(stories);

/** The id `create-board-action-storybook-stub.ts` always resolves with. */
const STUB_BOARD_ID = "stub-board-id";

/*
 * Scoped to the notifications region, since the create modal is a `dialog` too. Reading the
 * rendered text is what proves the count the user actually sees, not the manager's own bookkeeping.
 */
const getRaisedToastTexts = (): string[] => {
    const region = screen.queryByRole("region", { name: "Notifications" });
    if (!region) {
        return [];
    }

    return within(region)
        .queryAllByRole("dialog")
        .map((toast) => toast.textContent);
};

/** Opens the create modal, fills the board name and every column row, then submits. */
const submitNewBoard = async ({ name, columns }: { name: string; columns: string[] }): Promise<void> => {
    await userEvent.click(screen.getByRole("button", { name: "+ Create New Board" }));
    await userEvent.type(await screen.findByLabelText("Board Name"), name);

    for (const [index, columnName] of columns.entries()) {
        // A row left as "" is the blank-row case — typing nothing into it is the point.
        if (columnName !== "") {
            await userEvent.type(screen.getByLabelText(`Column ${String(index + 1)}`), columnName);
        }
    }

    await userEvent.click(screen.getByRole("button", { name: "Create New Board" }));
};

/*
 * ADR tech/0014: every component's behavioral suite runs at both viewports by default. BoardList
 * has no viewport-conditional behavior of its own (carried over from `sidebar.test.tsx`, plan 02-09).
 */
describeForEachDevice({
    name: "BoardList",
    body: () => {
        beforeEach(() => {
            resetCreateBoardColumnsStub();
            mockPush.mockClear();
        });

        it("renders one row per board and the matching ALL BOARDS caption when populated", async () => {
            // Act
            await render(<Populated />);

            // Assert
            expect(screen.getByText("ALL BOARDS (3)")).toBeInTheDocument();
            expect(screen.getByRole("link", { name: "Fixture Board 1" })).toBeInTheDocument();
            expect(screen.getByRole("link", { name: "Fixture Board 2" })).toBeInTheDocument();
            expect(screen.getByRole("link", { name: "Fixture Board 3" })).toBeInTheDocument();
        });

        it("renders a zero count and no rows when there are no boards", async () => {
            // Act
            await render(<Empty />);

            // Assert
            expect(screen.getByText("ALL BOARDS (0)")).toBeInTheDocument();
            expect(screen.queryAllByRole("link")).toHaveLength(0);
        });

        it("renders the authored load-failure copy and a retry control", async () => {
            // Act
            await render(<LoadFailed />);

            // Assert
            expect(screen.getByText("Couldn't load your boards.")).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Try again." })).toBeInTheDocument();
        });

        /*
         * First automated assertion that a `router.refresh()` call site fires (CONVENTIONS.md's
         * refresh rule was code-review-only) — via the D-19 shim's spy from an ordinary test, not
         * a story `play()`, so docs/adr/tech/0025's D-25 ban needs no exception.
         */
        it("refreshes the route when retry is pressed after a load failure", async () => {
            // Arrange
            mockRefresh.mockClear();
            await render(<LoadFailed />);

            // Act
            await userEvent.click(screen.getByRole("button", { name: "Try again." }));

            // Assert
            expect(mockRefresh).toHaveBeenCalledOnce();
        });

        it("renders the sidebar create control with the Copywriting Contract's copy", async () => {
            // Act
            await render(<Populated />);

            // Assert
            expect(screen.getByRole("button", { name: "+ Create New Board" })).toBeInTheDocument();
        });

        it("renders the create control even when the board list failed to load", async () => {
            // Act
            await render(<LoadFailed />);

            // Assert
            expect(screen.getByRole("button", { name: "+ Create New Board" })).toBeInTheDocument();
        });

        it("keeps the add-board modal closed on first render", async () => {
            // Act
            await render(<Empty />);

            // Assert
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });

        it("opens the add-board modal when the create control is activated", async () => {
            // Arrange
            await render(<Empty />);

            // Act
            await userEvent.click(screen.getByRole("button", { name: "+ Create New Board" }));

            // Assert
            expect(await screen.findByRole("dialog")).toBeInTheDocument();
            expect(screen.getByRole("heading", { name: "Add New Board" })).toBeInTheDocument();
        });

        it("renders the add-board modal when staged open", async () => {
            // Act
            await render(<AddBoardOpen />);

            // Assert
            expect(await screen.findByRole("dialog")).toBeInTheDocument();
        });

        it("closes the modal, navigates to the new board and raises no toast when every column lands", async () => {
            // Arrange
            await render(<Empty />);

            // Act
            await submitNewBoard({ name: "Launch", columns: ["Todo", "Doing", "Done"] });

            // Assert
            await vi.waitFor(() => {
                expect(mockPush).toHaveBeenCalledWith(buildBoardDetailPath(STUB_BOARD_ID));
            });
            expect(getRaisedToastTexts()).toHaveLength(0);
            expect(screen.queryByRole("heading", { name: "Add New Board" })).not.toBeInTheDocument();
        });

        it("still closes the modal and navigates when some columns failed — whatever landed is kept", async () => {
            // Arrange
            await render(<Empty />);
            queueCreateBoardColumnsFailure(["Doing", "Done"]);

            // Act
            await submitNewBoard({ name: "Launch", columns: ["Todo", "Doing", "Done"] });

            // Assert
            await vi.waitFor(() => {
                expect(mockPush).toHaveBeenCalledWith(buildBoardDetailPath(STUB_BOARD_ID));
            });
            expect(screen.queryByRole("heading", { name: "Add New Board" })).not.toBeInTheDocument();
        });

        it("omits blank column rows from the create sequence rather than sending them", async () => {
            // Arrange
            await render(<Empty />);

            // Act
            await submitNewBoard({ name: "Launch", columns: ["Todo", "", "Done"] });

            // Assert
            await vi.waitFor(() => {
                expect(createBoardColumnsActionCalls).toHaveLength(1);
            });
            expect(createBoardColumnsActionCalls[0]?.names).toEqual(["Todo", "Done"]);
        });

        /*
         * The load-bearing case: asserting only that "a toast was raised" would pass whether the
         * second replaced the first or piled on top of it, which is the ambiguity this removes.
         */
        it("narrows one failure toast across successive retries and closes it when the last column lands", async () => {
            // Arrange
            await render(<Empty />);
            queueCreateBoardColumnsFailure(["Doing", "Done"]);

            // Act — create with three named columns, two of which fail.
            await submitNewBoard({ name: "Launch", columns: ["Todo", "Doing", "Done"] });

            // Assert — exactly one toast, naming the two that failed.
            await vi.waitFor(() => {
                expect(getRaisedToastTexts()).toHaveLength(1);
            });
            expect(getRaisedToastTexts()[0]).toContain("Couldn't create 2 column(s).");

            // Act — retry those two; one fails again.
            queueCreateBoardColumnsFailure(["Done"]);
            await userEvent.click(screen.getByRole("button", { name: "Retry" }));

            // Assert — still ONE toast (same id, upserted), with a strictly smaller failed set.
            await vi.waitFor(() => {
                expect(getRaisedToastTexts()[0]).toContain("Couldn't create 1 column(s).");
            });
            expect(getRaisedToastTexts()).toHaveLength(1);

            // Act — retry the last one; it succeeds.
            await userEvent.click(screen.getByRole("button", { name: "Retry" }));

            // Assert — the toast closes rather than naming a column that now exists.
            await vi.waitFor(() => {
                expect(getRaisedToastTexts()).toHaveLength(0);
            });

            /*
             * Every attempt was scoped to exactly what was still failing, each set a strict subset
             * of the one before it.
             */
            expect(createBoardColumnsActionCalls.map((call) => call.names)).toEqual([
                ["Todo", "Doing", "Done"],
                ["Doing", "Done"],
                ["Done"],
            ]);
        });
    },
});
