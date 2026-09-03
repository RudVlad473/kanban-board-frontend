import { randomUUID } from "node:crypto";

import { expect, test, type Locator, type Page } from "@playwright/test";

import {
    seedAccount,
    seedBoard,
    seedColumn,
    seedTask,
    updateTaskOutOfBand,
    type SeededAccount,
    type SeededBoard,
} from "./seed";
import { createServerActionSettled } from "./server-action";
import { buildBoardDetailPath, ROUTE } from "../src/lib/core/routing/routes";

// comment-length-exempt: records the whole proof mechanism this file depends on — why an out-of-band write is what makes this a REAL conflict rather than a queued discriminant, a fact a future reader would otherwise re-derive from the two-session-cap comments alone
/*
 * SYNC-01 against the real deployed nonprod backend — the one criterion whose entire subject is
 * what the SERVER does, so this proves it against a REAL `409 OPTIMISTIC_LOCK_CONFLICT`, not a
 * queued outcome. The shape: load the board so the UI holds a task's version, bump that version
 * OUT OF BAND through the seeding CLI (the same session that created it, never a second sign-in),
 * then perform the UI action that sends the now-stale version. Each case asserts three things: the
 * optimistic change reverts, the distinct conflict toast fires with its pinned copy, and the board
 * ends up showing what the OUT-OF-BAND write actually did — proving the re-read, not the
 * client's own pre-conflict state or its failed optimistic guess.
 */

const SIGN_IN_TIMEOUT_MS = 20_000;
const CONFLICT_TOAST_TITLE = "This board changed somewhere else.";
const CONFLICT_TOAST_DESCRIPTION = "Refreshing to show the latest.";

const signIn = async ({ page, account, board }: { page: Page; account: SeededAccount; board: SeededBoard }) => {
    await page.goto(ROUTE.SIGN_IN);
    await page.getByLabel("Email", { exact: true }).fill(account.email);
    await page.getByLabel("Password", { exact: true }).fill(account.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(new RegExp(`${buildBoardDetailPath(board.id)}$`), { timeout: SIGN_IN_TIMEOUT_MS });
};

/** Scoped to the notifications region, mirroring `board-view.test.tsx`'s own toast query shape. */
const conflictToast = (page: Page): Locator => page.getByRole("region", { name: "Notifications" }).getByRole("dialog");

/** One column's own `<section>`, matched by its heading — mirrors `tasks-move.e2e.spec.ts`. */
const columnSection = ({ page, name }: { page: Page; name: string }): Locator =>
    page.locator("section").filter({ has: page.getByRole("heading", { name: new RegExp(`^${name}`) }) });

test.describe("SYNC-01: a real stale-version rejection", () => {
    test("task edit conflict: reverts, raises the distinct toast, and the board re-read shows the server's actual state", async ({
        page,
    }) => {
        // Arrange — a task the UI will hold at version 0.
        const account = seedAccount();
        const board = seedBoard({ account, name: `E2E Task Conflict ${randomUUID().slice(0, 8)}` });
        const column = seedColumn({ account, boardId: board.id, name: "Backlog" });
        const fixtureId = randomUUID().slice(0, 8);
        const originalTitle = `Conflict ${fixtureId}`;
        const task = seedTask({ account, boardId: board.id, columnId: column.id, title: originalTitle });
        await signIn({ page, account, board });

        // Act — open the still-stale card, then the kebab's Edit Task entry.
        await page.getByRole("button", { name: new RegExp(`^${originalTitle}`) }).click();
        await page.getByRole("button", { name: `Task actions for ${originalTitle}` }).click();
        await page.getByRole("menuitem", { name: "Edit Task" }).click();

        /*
         * Act — the OUT-OF-BAND write: the same seeded session bumps the server's own version to 1,
         * while the open Edit Task modal still holds the UI's now-stale version 0.
         */
        const serverChangedTitle = `Server ${fixtureId}`;
        updateTaskOutOfBand({
            account,
            boardId: board.id,
            columnId: column.id,
            taskId: task.id,
            title: serverChangedTitle,
            version: task.version,
        });

        // Act — the UI's own edit, sent against the now-stale version.
        const attemptedTitle = `Attempt ${fixtureId}`;
        const dialog = page.getByRole("dialog");
        await dialog.getByLabel("Title", { exact: true }).fill(attemptedTitle);
        /* Created before the click that issues the write, per createServerActionSettled's contract. */
        const settled = createServerActionSettled(page);
        await dialog.getByRole("button", { name: "Save Changes" }).click();
        await settled;

        // Assert — the distinct conflict toast, matching the phase-wide pinned title and description.
        await expect(conflictToast(page).getByText(CONFLICT_TOAST_TITLE)).toBeVisible();
        await expect(conflictToast(page).getByText(CONFLICT_TOAST_DESCRIPTION)).toBeVisible();

        /*
         * Assert — the board re-read: the detail view settles on the SERVER's own title, not
         * the pre-conflict cached one and not the failed optimistic guess.
         */
        await expect(page.getByRole("dialog").getByRole("heading", { name: serverChangedTitle })).toBeVisible();
    });

    test("task move conflict: reverts the column, raises the distinct toast, and the board re-read shows the server's actual state", async ({
        page,
    }) => {
        // Arrange — two columns; the task starts in Alpha, held by the UI at version 0.
        const account = seedAccount();
        const board = seedBoard({ account, name: `E2E Task Move Conflict ${randomUUID().slice(0, 8)}` });
        const alpha = seedColumn({ account, boardId: board.id, name: "Alpha" });
        seedColumn({ account, boardId: board.id, name: "Bravo" });
        const fixtureId = randomUUID().slice(0, 8);
        const originalTitle = `Move conflict ${fixtureId}`;
        const task = seedTask({ account, boardId: board.id, columnId: alpha.id, title: originalTitle });
        await signIn({ page, account, board });

        // Act — open the still-stale card's detail view (the Current Status is the move path here).
        await page.getByRole("button", { name: new RegExp(`^${originalTitle}`) }).click();

        // Act — the OUT-OF-BAND write: bumps the server's version to 1 without moving the task.
        const serverChangedTitle = `Moved server ${fixtureId}`;
        updateTaskOutOfBand({
            account,
            boardId: board.id,
            columnId: alpha.id,
            taskId: task.id,
            title: serverChangedTitle,
            version: task.version,
        });

        // Act — the UI's own move, sent against the now-stale version.
        const dialog = page.getByRole("dialog");
        await dialog.getByRole("combobox").click();
        /* Created before the click that issues the write, per createServerActionSettled's contract. */
        const settled = createServerActionSettled(page);
        await page.getByRole("option", { name: "Bravo" }).click();
        await settled;

        // Assert — the distinct conflict toast, matching the phase-wide pinned title and description.
        await expect(conflictToast(page).getByText(CONFLICT_TOAST_TITLE)).toBeVisible();
        await expect(conflictToast(page).getByText(CONFLICT_TOAST_DESCRIPTION)).toBeVisible();

        // Assert — the re-read: Current Status reverts to Alpha, the move never actually applied server-side.
        await expect(page.getByRole("dialog").getByRole("combobox", { name: "Alpha" })).toBeVisible();
        await page.keyboard.press("Escape");

        /*
         * Assert — the board shows the SERVER's real state: still in Alpha, but carrying the
         * out-of-band title — proof this is the re-read, not the pre-conflict cached title.
         */
        await expect(
            columnSection({ page, name: "Alpha" }).getByRole("button", { name: new RegExp(`^${serverChangedTitle}`) }),
        ).toBeVisible();
        await expect(
            columnSection({ page, name: "Bravo" }).getByRole("button", { name: new RegExp(`^${originalTitle}`) }),
        ).toHaveCount(0);
    });
});
