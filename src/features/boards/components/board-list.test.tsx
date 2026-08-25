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

import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
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
import { deleteBoardActionCalls, resetDeleteBoardStub } from "@/test-utils/delete-board-action-storybook-stub";
import { describeForEachDevice } from "@/test-utils/describe-for-each-device";
import { createNextLinkShim, createNextNavigationShim } from "@/test-utils/next-router-shims";
import {
    holdNextRenameBoard,
    queueRenameBoardFailure,
    renameBoardActionCalls,
    resetRenameBoardStub,
    settleRenameBoard,
} from "@/test-utils/rename-board-action-storybook-stub";

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

const { Populated, Empty, LoadFailed, AddBoardOpen, RenameOpen, DeleteOpen, ServerPropsAdvance } =
    composeStories(stories);

/* Duplicated verbatim from `board-list.stories.tsx`'s own host — see the comment beside them there. */
const SERVER_RENAMED_NAME = "Renamed On The Server";
const SERVER_CHANGED_NAME = "Changed Somewhere Else";

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

/*
 * Opens the create modal, fills the board name, then adds and fills a row per requested column.
 * The form opens with one row (D-01a), so row 1 is filled in place and the rest are appended.
 */
const submitNewBoard = async ({ name, columns }: { name: string; columns: string[] }): Promise<void> => {
    await userEvent.click(screen.getByRole("button", { name: "+ Create New Board" }));
    /*
     * `fill` rather than `type`: this suite drives up to four fields, and per-keystroke typing is
     * what pushes it past the 15s budget when all five Vitest projects run concurrently.
     */
    await userEvent.fill(await screen.findByLabelText("Board Name"), name);

    for (const [index, columnName] of columns.entries()) {
        if (index > 0) {
            await userEvent.click(screen.getByRole("button", { name: "+ Add New Column" }));
        }
        // A row left as "" is the blank-row case — filling nothing into it is the point.
        if (columnName !== "") {
            await userEvent.fill(screen.getByLabelText(`Column ${String(index + 1)}`), columnName);
        }
    }

    // Zero requested columns means the default row has to go — a blank row would block (D-02a).
    if (columns.length === 0) {
        await userEvent.click(screen.getByRole("button", { name: "Remove Column 1" }));
    }

    await userEvent.click(screen.getByRole("button", { name: "Create New Board" }));
};

/*
 * Read off the DOM rather than by role: Base UI marks the tree outside an open dialog `aria-hidden`,
 * so a role query would report zero rows exactly when a failed rename's rollback needs reading.
 */
const getRenderedBoardNames = (): (string | null)[] =>
    Array.from(document.querySelectorAll("ul > li > a")).map((link) => link.textContent);

/** Opens a row's overflow menu, activates its edit entry, retypes the name and submits. */
const renameBoardFromRow = async ({ rowName, nextName }: { rowName: string; nextName: string }): Promise<void> => {
    await userEvent.click(screen.getByRole("button", { name: `Board actions for ${rowName}` }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Edit Board" }));
    await userEvent.fill(await screen.findByLabelText("Board Name"), nextName);
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));
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
            resetRenameBoardStub();
            resetDeleteBoardStub();
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

        /*
         * D-02a reversed D-02: a blank row is no longer dropped on the way to the create sequence,
         * it stops the submit outright, so the create never starts at all.
         */
        it("starts no create at all when a blank column row is left on screen", async () => {
            // Arrange
            await render(<Empty />);

            // Act
            await submitNewBoard({ name: "Launch", columns: ["Todo", "", "Done"] });

            // Assert — the modal is still open, reporting the row, and nothing was sent.
            expect(await screen.findByText("Can't be empty")).toBeInTheDocument();
            expect(screen.getByRole("heading", { name: "Add New Board" })).toBeInTheDocument();
            expect(createBoardColumnsActionCalls).toHaveLength(0);
            expect(mockPush).not.toHaveBeenCalled();
        });

        /* The other half of D-02a: removing every row is still a valid, column-less create. */
        it("creates a board with no columns when every row is removed", async () => {
            // Arrange
            await render(<Empty />);

            // Act
            await submitNewBoard({ name: "Launch", columns: [] });

            // Assert
            await vi.waitFor(() => {
                expect(mockPush).toHaveBeenCalledWith(buildBoardDetailPath(STUB_BOARD_ID));
            });
            expect(createBoardColumnsActionCalls).toHaveLength(0);
            expect(getRaisedToastTexts()).toHaveLength(0);
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

        it("opens the rename modal seeded with that row's current name", async () => {
            // Arrange
            await render(<Populated />);

            // Act
            await userEvent.click(screen.getByRole("button", { name: "Board actions for Fixture Board 2" }));
            await userEvent.click(await screen.findByRole("menuitem", { name: "Edit Board" }));

            // Assert
            expect(await screen.findByRole("heading", { name: "Edit Board" })).toBeInTheDocument();
            expect(await screen.findByLabelText("Board Name")).toHaveValue("Fixture Board 2");
        });

        it("renders the rename modal when staged open", async () => {
            // Act
            await render(<RenameOpen />);

            // Assert
            expect(await screen.findByLabelText("Board Name")).toHaveValue("Fixture Board 1");
        });

        /*
         * D-15's whole point: the row asserts the new name while the write is still in flight, and
         * no other row is touched by the override that does it.
         */
        it("shows the new name in that row before the rename resolves, leaving every other row alone", async () => {
            // Arrange
            await render(<Populated />);
            const namesBefore = getRenderedBoardNames();
            holdNextRenameBoard();

            // Act — submit, then observe while the action is still unresolved.
            await renameBoardFromRow({ rowName: "Fixture Board 1", nextName: "Platform Relaunch" });

            // Assert — applied optimistically, with the write demonstrably still open.
            await vi.waitFor(() => {
                expect(getRenderedBoardNames()).toEqual(["Platform Relaunch", ...namesBefore.slice(1)]);
            });
            expect(screen.getByRole("button", { name: "Save Changes" })).toHaveAttribute("aria-busy", "true");

            // Act — let the write land.
            settleRenameBoard();

            // Assert — the modal closes and the name stays.
            await vi.waitFor(() => {
                expect(screen.queryByRole("heading", { name: "Edit Board" })).not.toBeInTheDocument();
            });
            expect(getRenderedBoardNames()).toEqual(["Platform Relaunch", ...namesBefore.slice(1)]);
        });

        it("sends the row's own id and current version with the rename", async () => {
            // Arrange
            await render(<Populated />);

            // Act
            await renameBoardFromRow({ rowName: "Fixture Board 1", nextName: "Platform Relaunch" });

            // Assert
            await vi.waitFor(() => {
                expect(renameBoardActionCalls).toHaveLength(1);
            });
            expect(renameBoardActionCalls[0]).toEqual({
                boardId: Populated.args.boards?.[0]?.id,
                name: "Platform Relaunch",
                version: Populated.args.boards?.[0]?.version,
            });
        });

        /*
         * The load-bearing rollback case: asserting only that the renamed row reverted would pass
         * whether or not the override had leaked into a neighbouring row on the way back out.
         */
        it("restores the whole rendered name set and announces the reason when a rename fails", async () => {
            // Arrange
            await render(<Populated />);
            const namesBefore = getRenderedBoardNames();
            queueRenameBoardFailure(RESULT_STATUS.ERROR);

            // Act
            await renameBoardFromRow({ rowName: "Fixture Board 1", nextName: "Platform Relaunch" });

            // Assert — identical to the pre-submit set, not merely "the renamed row reverted".
            await vi.waitFor(() => {
                expect(getRaisedToastTexts()).toHaveLength(1);
            });
            expect(getRenderedBoardNames()).toEqual(namesBefore);
        });

        /* T-02-61: the toast carries this project's own copy and nothing taken from the response. */
        it("raises the authored rename-failure copy, with no text from the rejection", async () => {
            // Arrange
            await render(<Populated />);
            queueRenameBoardFailure(RESULT_STATUS.ERROR);

            // Act
            await renameBoardFromRow({ rowName: "Fixture Board 1", nextName: "Platform Relaunch" });

            // Assert
            await vi.waitFor(() => {
                expect(getRaisedToastTexts()).toHaveLength(1);
            });
            expect(getRaisedToastTexts()[0]).toBe("Couldn't rename board.Try again.");
        });

        /*
         * SYNC-01's reconciliation experience is Phase 4 scope, so a stale version deliberately
         * keeps the GENERIC copy — explaining it properly is that phase's job, not a half-built one.
         */
        it("keeps the generic copy for a stale-version conflict", async () => {
            // Arrange
            await render(<Populated />);
            const namesBefore = getRenderedBoardNames();
            queueRenameBoardFailure(RESULT_STATUS.CONFLICT);

            // Act
            await renameBoardFromRow({ rowName: "Fixture Board 1", nextName: "Platform Relaunch" });

            // Assert
            await vi.waitFor(() => {
                expect(getRaisedToastTexts()).toHaveLength(1);
            });
            expect(getRaisedToastTexts()[0]).toBe("Couldn't rename board.Try again.");
            expect(getRenderedBoardNames()).toEqual(namesBefore);
        });

        /*
         * The backend refuses a duplicate board name with 409 DUPLICATE_RESOURCE (probed
         * 2026-08-25) — a distinct outcome from a stale version, so it earns its own copy.
         */
        it("names the clash when a rename is refused for a duplicate board name", async () => {
            // Arrange
            await render(<Populated />);
            const namesBefore = getRenderedBoardNames();
            queueRenameBoardFailure(RESULT_STATUS.DUPLICATE);

            // Act
            await renameBoardFromRow({ rowName: "Fixture Board 1", nextName: "Fixture Board 2" });

            // Assert — rolled back, and told why, rather than a bare "try again".
            await vi.waitFor(() => {
                expect(getRaisedToastTexts()).toHaveLength(1);
            });
            expect(getRaisedToastTexts()[0]).toBe("A board with that name already exists.Choose a different name.");
            expect(getRenderedBoardNames()).toEqual(namesBefore);
        });

        it("tells the user to sign in again when the rename is refused as unauthenticated", async () => {
            // Arrange
            await render(<Populated />);
            queueRenameBoardFailure(RESULT_STATUS.UNAUTHENTICATED);

            // Act
            await renameBoardFromRow({ rowName: "Fixture Board 1", nextName: "Platform Relaunch" });

            // Assert
            await vi.waitFor(() => {
                expect(getRaisedToastTexts()).toHaveLength(1);
            });
            expect(getRaisedToastTexts()[0]).toBe("Your session has expired.Sign in again to rename this board.");
        });

        it("says the board is gone when the rename is refused as not visible to this account", async () => {
            // Arrange
            await render(<Populated />);
            queueRenameBoardFailure(RESULT_STATUS.NOT_FOUND);

            // Act
            await renameBoardFromRow({ rowName: "Fixture Board 1", nextName: "Platform Relaunch" });

            // Assert
            await vi.waitFor(() => {
                expect(getRaisedToastTexts()).toHaveLength(1);
            });
            expect(getRaisedToastTexts()[0]).toBe(
                "That board is no longer available.Refresh to see your current boards.",
            );
        });

        it("opens the confirm modal naming that row's own board when its delete entry is activated", async () => {
            // Arrange
            await render(<Populated />);

            // Act
            await userEvent.click(screen.getByRole("button", { name: "Board actions for Fixture Board 2" }));
            await userEvent.click(await screen.findByRole("menuitem", { name: "Delete Board" }));

            // Assert — that board is named, and nothing has been deleted yet.
            expect(await screen.findByRole("heading", { name: "Delete this board?" })).toBeInTheDocument();
            expect(screen.getByText(/'Fixture Board 2' board\?/)).toBeInTheDocument();
            expect(deleteBoardActionCalls).toHaveLength(0);
        });

        it("renders the delete confirmation when staged open", async () => {
            // Act
            await render(<DeleteOpen />);

            // Assert
            expect(await screen.findByRole("heading", { name: "Delete this board?" })).toBeInTheDocument();
            expect(screen.getByText(/'Fixture Board 1' board\?/)).toBeInTheDocument();
        });

        /*
         * T-02-63: the override must not outlive the value it stands in for, or a change made in
         * another tab would sit behind a stale local name indefinitely.
         */
        it("clears the override once the refreshed props carry it, so a later server change is rendered", async () => {
            // Arrange
            await render(<ServerPropsAdvance />);

            // Act — rename optimistically, then land the refreshed server render carrying that name.
            await renameBoardFromRow({ rowName: "Fixture Board 1", nextName: SERVER_RENAMED_NAME });
            await vi.waitFor(() => {
                expect(getRenderedBoardNames()[0]).toBe(SERVER_RENAMED_NAME);
            });
            await userEvent.click(screen.getByRole("button", { name: "Land the refreshed server render" }));

            // Act — a later server-side change to that same row.
            await userEvent.click(screen.getByRole("button", { name: "Land a later server change" }));

            // Assert — rendered, not masked by the override that stood in for the earlier value.
            await vi.waitFor(() => {
                expect(getRenderedBoardNames()[0]).toBe(SERVER_CHANGED_NAME);
            });
        });
    },
});
