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

import { createBoardAction } from "@/features/boards/actions/create-board-action";
import { createBoardColumnsAction } from "@/features/boards/actions/create-board-columns-action";
import { deleteBoardAction } from "@/features/boards/actions/delete-board-action";
import { renameBoardAction } from "@/features/boards/actions/rename-board-action";
import { RESULT_STATUS } from "@/lib/core/api-contract/result-status";
import { buildBoardDetailPath, ROUTE } from "@/lib/core/routing/routes";
import { actionStub } from "@/test-utils/action-stub-registry";
import { describeForEachDevice } from "@/test-utils/describe-for-each-device";
import { createBoard } from "@/test-utils/factories/board";
import { createNextLinkShim, createNextNavigationShim } from "@/test-utils/next-router-shims";

import * as stories from "./board-list.stories";

/*
 * `next/link`/`next/navigation` are the D-19 environment-shim exception (see the vi.mock below) —
 * every other seam this file used to stub (`useBoards`) is gone: `BoardList` is RSC-fed via props
 * now (D-02/D-03), so there is no business-logic hook left to mock.
 */
const mockRefresh = vi.hoisted(() => vi.fn());
const mockPush = vi.hoisted(() => vi.fn());
const mockReplace = vi.hoisted(() => vi.fn());
/* A getter-backed holder, so one suite can drive the board-detail paths D-08's branches turn on. */
const currentPathname = vi.hoisted(() => ({ value: "" }));

// eslint-disable-next-line no-restricted-properties -- next/navigation's router has no real implementation outside a Next.js request/render cycle in Vitest (D-19)
vi.mock("next/navigation", () =>
    createNextNavigationShim({
        pathname: () => currentPathname.value,
        refresh: mockRefresh,
        push: mockPush,
        replace: mockReplace,
    }),
);

// eslint-disable-next-line no-restricted-properties -- next/link reads process.env, undefined in Vitest Browser Mode (D-19, see comment above)
vi.mock("next/link", () => createNextLinkShim());

const { Populated, Empty, LoadFailed, AddBoardOpen, RenameOpen, DeleteOpen, SingleBoard } = composeStories(stories);

/** The id every create-board success below queues, and so the id a landed create navigates to. */
const STUB_BOARD_ID = "stub-board-id";

/*
 * One recorder per action, looked up off the imported binding — `queue` accepts only that action's
 * own awaited result and `calls` is typed as its first parameter (04-CONTEXT.md D-01).
 */
const createBoardStub = actionStub(createBoardAction);
const createBoardColumnsStub = actionStub(createBoardColumnsAction);
const renameBoardStub = actionStub(renameBoardAction);
const deleteBoardStub = actionStub(deleteBoardAction);

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

/** Opens a row's overflow menu, activates its delete entry, and confirms in the modal that opens. */
const deleteBoardFromRow = async (rowName: string): Promise<void> => {
    await userEvent.click(screen.getByRole("button", { name: `Board actions for ${rowName}` }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete Board" }));
    await userEvent.click(await screen.findByRole("button", { name: "Delete Board" }));
};

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
            // No stub reset here: D-04's global `afterEach` resets every registered stub centrally.
            mockPush.mockClear();
            mockReplace.mockClear();
            currentPathname.value = ROUTE.BOARDS;
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
            createBoardStub.queue({ status: RESULT_STATUS.SUCCESS, board: createBoard({ id: STUB_BOARD_ID }) });
            createBoardColumnsStub.queue({ status: RESULT_STATUS.SUCCESS, failedNames: [] });

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
            createBoardStub.queue({ status: RESULT_STATUS.SUCCESS, board: createBoard({ id: STUB_BOARD_ID }) });
            createBoardColumnsStub.queue({ status: RESULT_STATUS.SUCCESS, failedNames: ["Doing", "Done"] });

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
            expect(createBoardColumnsStub.calls).toHaveLength(0);
            expect(mockPush).not.toHaveBeenCalled();
        });

        /* The other half of D-02a: removing every row is still a valid, column-less create. */
        it("creates a board with no columns when every row is removed", async () => {
            // Arrange
            await render(<Empty />);
            createBoardStub.queue({ status: RESULT_STATUS.SUCCESS, board: createBoard({ id: STUB_BOARD_ID }) });

            // Act
            await submitNewBoard({ name: "Launch", columns: [] });

            // Assert
            await vi.waitFor(() => {
                expect(mockPush).toHaveBeenCalledWith(buildBoardDetailPath(STUB_BOARD_ID));
            });
            expect(createBoardColumnsStub.calls).toHaveLength(0);
            expect(getRaisedToastTexts()).toHaveLength(0);
        });

        /*
         * The backend refuses a duplicate board name with 409 DUPLICATE_RESOURCE (probed 2026-08-25)
         * — the same refusal rename already explains, now recognised on create too (D-01).
         */
        it("names the clash inline and keeps the modal open when the board name is already taken", async () => {
            // Arrange
            await render(<Empty />);
            createBoardStub.queue({ status: RESULT_STATUS.DUPLICATE });

            // Act
            await submitNewBoard({ name: "Platform Launch", columns: ["Todo"] });

            // Assert — told why, in the still-open modal, with nothing created to navigate to (D-05).
            expect(await screen.findByRole("alert")).toHaveTextContent(
                "A board with that name already exists. Choose a different name.",
            );
            expect(screen.getByRole("heading", { name: "Add New Board" })).toBeInTheDocument();
            expect(createBoardColumnsStub.calls).toHaveLength(0);
            expect(mockPush).not.toHaveBeenCalled();
        });

        /* Every other refusal keeps the generic copy — only the name clash has more to say. */
        it("keeps the generic create-failure copy for a refusal with nothing distinct to say", async () => {
            // Arrange
            await render(<Empty />);
            createBoardStub.queue({ status: RESULT_STATUS.ERROR });

            // Act
            await submitNewBoard({ name: "Platform Launch", columns: ["Todo"] });

            // Assert
            expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't create board. Try again.");
            expect(screen.getByRole("heading", { name: "Add New Board" })).toBeInTheDocument();
            expect(mockPush).not.toHaveBeenCalled();
        });

        it("auto-dismisses the column-failure toast rather than leaving it on screen indefinitely", async () => {
            // Arrange
            await render(<Empty />);
            createBoardStub.queue({ status: RESULT_STATUS.SUCCESS, board: createBoard({ id: STUB_BOARD_ID }) });
            createBoardColumnsStub.queue({ status: RESULT_STATUS.SUCCESS, failedNames: ["Doing"] });
            await submitNewBoard({ name: "Launch", columns: ["Todo", "Doing"] });
            await vi.waitFor(() => {
                expect(getRaisedToastTexts()[0]).toContain("Couldn't create 1 column(s).");
            });

            /*
             * Base UI pauses every toast timer while the stack is hovered or the window is unfocused
             * (`expandedOrOutOfFocus`), and the driver leaves the pointer over the viewport after the
             * click. Resume explicitly so this asserts the timeout rather than the driver's focus state.
             */
            window.dispatchEvent(new FocusEvent("focus"));

            // Assert — past Base UI's 5000ms default, which this toast must now inherit.
            await vi.waitFor(
                () => {
                    expect(getRaisedToastTexts()).toHaveLength(0);
                },
                { timeout: 9000, interval: 250 },
            );
        });

        /*
         * The load-bearing case: asserting only that "a toast was raised" would pass whether the
         * second replaced the first or piled on top of it, which is the ambiguity this removes.
         */
        it("narrows one failure toast across successive retries and closes it when the last column lands", async () => {
            // Arrange
            await render(<Empty />);
            createBoardStub.queue({ status: RESULT_STATUS.SUCCESS, board: createBoard({ id: STUB_BOARD_ID }) });
            createBoardColumnsStub.queue({ status: RESULT_STATUS.SUCCESS, failedNames: ["Doing", "Done"] });

            // Act — create with three named columns, two of which fail.
            await submitNewBoard({ name: "Launch", columns: ["Todo", "Doing", "Done"] });

            // Assert — exactly one toast, naming the two that failed.
            await vi.waitFor(() => {
                expect(getRaisedToastTexts()).toHaveLength(1);
            });
            expect(getRaisedToastTexts()[0]).toContain("Couldn't create 2 column(s).");

            // Act — retry those two; one fails again.
            createBoardColumnsStub.queue({ status: RESULT_STATUS.SUCCESS, failedNames: ["Done"] });
            await userEvent.click(screen.getByRole("button", { name: "Retry" }));

            // Assert — still ONE toast (same id, upserted), with a strictly smaller failed set.
            await vi.waitFor(() => {
                expect(getRaisedToastTexts()[0]).toContain("Couldn't create 1 column(s).");
            });
            expect(getRaisedToastTexts()).toHaveLength(1);

            // Act — retry the last one; it succeeds.
            createBoardColumnsStub.queue({ status: RESULT_STATUS.SUCCESS, failedNames: [] });
            await userEvent.click(screen.getByRole("button", { name: "Retry" }));

            // Assert — the toast closes rather than naming a column that now exists.
            await vi.waitFor(() => {
                expect(getRaisedToastTexts()).toHaveLength(0);
            });

            /*
             * Every attempt was scoped to exactly what was still failing, each set a strict subset
             * of the one before it.
             */
            expect(createBoardColumnsStub.calls.map((call) => call.names)).toEqual([
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
         * D-15's whole point, plus D-02's timing: the row asserts the new name and the modal is
         * already gone while the write is still in flight, and no other row is touched by it.
         */
        it("closes the modal and shows the new name in that row before the rename resolves", async () => {
            // Arrange
            await render(<Populated />);
            const namesBefore = getRenderedBoardNames();
            renameBoardStub.queue({
                status: RESULT_STATUS.SUCCESS,
                board: createBoard({ name: "Platform Relaunch", version: 1 }),
            });
            renameBoardStub.hold();

            // Act — submit, then observe while the action is still unresolved.
            await renameBoardFromRow({ rowName: "Fixture Board 1", nextName: "Platform Relaunch" });

            // Assert — applied optimistically and already dismissed, with the write demonstrably still open.
            await vi.waitFor(() => {
                expect(getRenderedBoardNames()).toEqual(["Platform Relaunch", ...namesBefore.slice(1)]);
            });
            expect(screen.queryByRole("heading", { name: "Edit Board" })).not.toBeInTheDocument();

            // Act — let the write land.
            renameBoardStub.settle();

            // Assert — the name stays and nothing was announced, the modal having closed long before.
            await vi.waitFor(() => {
                expect(renameBoardStub.calls).toHaveLength(1);
            });
            expect(getRenderedBoardNames()).toEqual(["Platform Relaunch", ...namesBefore.slice(1)]);
            expect(getRaisedToastTexts()).toHaveLength(0);
        });

        /*
         * WR-01 (02-REVIEW.md): the rename hook's shared `isPending` flag must be scoped to the
         * board actually being renamed, or opening board 2 while board 1's rename is in flight
         * would incorrectly show board 2's own modal as pending — full rationale in 02-REVIEW.md.
         */
        it("does not show an unrelated board's edit modal as pending while another row's rename is in flight", async () => {
            // Arrange
            await render(<Populated />);
            renameBoardStub.queue({
                status: RESULT_STATUS.SUCCESS,
                board: createBoard({ name: "Platform Relaunch", version: 1 }),
            });
            renameBoardStub.hold();

            // Act — start a rename on row 1; the modal closes instantly (D-02) while its write is held.
            await renameBoardFromRow({ rowName: "Fixture Board 1", nextName: "Platform Relaunch" });

            // Act — open Edit Board on an unrelated row while row 1's rename is still unresolved.
            await userEvent.click(screen.getByRole("button", { name: "Board actions for Fixture Board 2" }));
            await userEvent.click(await screen.findByRole("menuitem", { name: "Edit Board" }));

            // Assert — board 2's own modal is not pending, even though board 1's rename hasn't settled.
            expect(await screen.findByRole("heading", { name: "Edit Board" })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Save Changes" })).toBeEnabled();

            renameBoardStub.settle();
        });

        /*
         * WR-02 (02-REVIEW.md): a second submit on the same row before the first settled could
         * roll back to a stale name/version. Disabling that row's Edit Board entry while its
         * rename is in flight closes that window — full rationale in 02-REVIEW.md.
         */
        it("keeps the same row's Edit Board entry inert while its own rename is in flight", async () => {
            // Arrange
            await render(<Populated />);
            renameBoardStub.queue({
                status: RESULT_STATUS.SUCCESS,
                board: createBoard({ name: "Platform Relaunch", version: 1 }),
            });
            renameBoardStub.hold();

            // Act — submit a rename on row 1; the modal closes instantly while the write is held.
            await renameBoardFromRow({ rowName: "Fixture Board 1", nextName: "Platform Relaunch" });

            // Act — reopen the row's overflow menu before its rename has settled.
            await userEvent.click(screen.getByRole("button", { name: "Board actions for Platform Relaunch" }));

            // Assert — the entry is disabled outright, so it can never be activated while pending.
            expect(await screen.findByRole("menuitem", { name: "Edit Board" })).toHaveAttribute(
                "aria-disabled",
                "true",
            );
            expect(screen.queryByRole("heading", { name: "Edit Board" })).not.toBeInTheDocument();

            renameBoardStub.settle();
        });

        it("sends the row's own id and current version with the rename", async () => {
            // Arrange
            await render(<Populated />);
            renameBoardStub.queue({
                status: RESULT_STATUS.SUCCESS,
                board: createBoard({ name: "Platform Relaunch", version: 1 }),
            });

            // Act
            await renameBoardFromRow({ rowName: "Fixture Board 1", nextName: "Platform Relaunch" });

            // Assert
            await vi.waitFor(() => {
                expect(renameBoardStub.calls).toHaveLength(1);
            });
            expect(renameBoardStub.calls[0]).toEqual({
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
            renameBoardStub.queue({ status: RESULT_STATUS.ERROR });

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
            renameBoardStub.queue({ status: RESULT_STATUS.ERROR });

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
            renameBoardStub.queue({ status: RESULT_STATUS.CONFLICT });

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
            renameBoardStub.queue({ status: RESULT_STATUS.DUPLICATE });

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
            renameBoardStub.queue({ status: RESULT_STATUS.UNAUTHENTICATED });

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
            renameBoardStub.queue({ status: RESULT_STATUS.NOT_FOUND });

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
            expect(deleteBoardStub.calls).toHaveLength(0);
        });

        it("renders the delete confirmation when staged open", async () => {
            // Act
            await render(<DeleteOpen />);

            // Assert
            expect(await screen.findByRole("heading", { name: "Delete this board?" })).toBeInTheDocument();
            expect(screen.getByText(/'Fixture Board 1' board\?/)).toBeInTheDocument();
        });

        it("sends the row's own id with the delete and moves nobody when it was not the open board", async () => {
            // Arrange — the board list route, so no board is open at all.
            await render(<Populated />);
            deleteBoardStub.queue({ status: RESULT_STATUS.SUCCESS });

            // Act
            await deleteBoardFromRow("Fixture Board 2");

            // Assert
            await vi.waitFor(() => {
                expect(deleteBoardStub.calls).toEqual([{ boardId: Populated.args.boards?.[1]?.id }]);
            });
            expect(mockReplace).not.toHaveBeenCalled();
            expect(mockPush).not.toHaveBeenCalled();
        });

        /*
         * D-08: `replace`, not `push` — the deleted board's address must not sit in the back history
         * for a user to walk into (T-02-70), and the URL has to show where they actually landed.
         */
        it("moves to the first remaining board, replacing the history entry, when the open board is deleted", async () => {
            // Arrange — the first board is the one being viewed.
            const boards = Populated.args.boards ?? [];
            currentPathname.value = buildBoardDetailPath(boards[0]?.id ?? "");
            await render(<Populated />);
            deleteBoardStub.queue({ status: RESULT_STATUS.SUCCESS });

            // Act
            await deleteBoardFromRow("Fixture Board 1");

            // Assert — the top of the sidebar's own newest-first order, via replace.
            await vi.waitFor(() => {
                expect(mockReplace).toHaveBeenCalledWith(buildBoardDetailPath(boards[1]?.id ?? ""));
            });
            expect(mockReplace).toHaveBeenCalledTimes(1);
            expect(mockPush).not.toHaveBeenCalled();
        });

        it("lands on the board-list route when the open board was the last one", async () => {
            // Arrange
            const boards = SingleBoard.args.boards ?? [];
            currentPathname.value = buildBoardDetailPath(boards[0]?.id ?? "");
            await render(<SingleBoard />);
            deleteBoardStub.queue({ status: RESULT_STATUS.SUCCESS });

            // Act
            await deleteBoardFromRow("Fixture Board 1");

            // Assert
            await vi.waitFor(() => {
                expect(mockReplace).toHaveBeenCalledWith(ROUTE.BOARDS);
            });
        });

        /*
         * D-09's whole point: nothing was removed, so there is nowhere to move the user to — and a
         * navigation here would be the app acting as though the delete had landed.
         */
        it("navigates nowhere and announces the failure when the delete fails", async () => {
            // Arrange
            const boards = Populated.args.boards ?? [];
            currentPathname.value = buildBoardDetailPath(boards[0]?.id ?? "");
            deleteBoardStub.queue({ status: RESULT_STATUS.ERROR });
            await render(<Populated />);
            const namesBefore = getRenderedBoardNames();

            // Act
            await deleteBoardFromRow("Fixture Board 1");

            // Assert — the row is exactly where it was, the toast says so, and nobody moved.
            await vi.waitFor(() => {
                expect(getRaisedToastTexts()).toHaveLength(1);
            });
            expect(getRaisedToastTexts()[0]).toBe("Couldn't delete board.Try again.");
            expect(getRenderedBoardNames()).toEqual(namesBefore);
            expect(mockReplace).not.toHaveBeenCalled();
            expect(mockPush).not.toHaveBeenCalled();
        });

        it("closes the confirmation once the delete settles, whichever way it went", async () => {
            // Arrange
            deleteBoardStub.queue({ status: RESULT_STATUS.ERROR });
            await render(<Populated />);

            // Act
            await deleteBoardFromRow("Fixture Board 1");

            // Assert
            await vi.waitFor(() => {
                expect(screen.queryByRole("heading", { name: "Delete this board?" })).not.toBeInTheDocument();
            });
        });
    },
});
