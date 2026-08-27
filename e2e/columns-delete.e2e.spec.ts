import { randomUUID } from "node:crypto";

import { expect, test, type Locator, type Page } from "@playwright/test";

import { seedAccount, seedBoard, seedColumn, type SeededAccount, type SeededBoard } from "./seed";
import { E2E_CONFIG } from "./test-env";
import { EXTERNAL_PATH } from "../src/lib/core/api-contract/external-paths";
import { buildBoardDetailPath, ROUTE } from "../src/lib/core/routing/routes";

// comment-length-exempt: records which of this spec's writes has no seeding helper and why one was not added for it, so a future reader does not read the direct call as an oversight
/*
 * COLUMN-04 against the real deployed nonprod backend: a column deleted from its own header kebab,
 * the cascade to its tasks observed from the board view rather than from the API, the declined
 * confirmation proved safe, and the delete-to-zero case landing on the shared empty state — happy
 * paths only, structural assertions only, no confirmation wording or toast copy (docs/adr/tech/0022;
 * that coverage is delete-column-confirm.test.tsx's). The one task these specs need is written
 * straight at the backend below: task seeding is Phase 4's to own, and a helper this phase would
 * call once is a helper that outlives its only reason to exist.
 */

/* The real backend's sign-in round trip outruns the 5s default often enough to flake on its own. */
const SIGN_IN_TIMEOUT_MS = 20_000;

const toCaption = ({ name, taskCount }: { name: string; taskCount: number }): string =>
    `${name} (${String(taskCount)})`;

/** Every column's own `h2` in document order — read as TEXT, since CSS upper-cases the caption. */
const columnHeadings = (page: Page): Locator => page.getByRole("region").getByRole("heading", { level: 2 });

const seedTask = async ({
    account,
    boardId,
    columnId,
    title,
}: {
    account: SeededAccount;
    boardId: string;
    columnId: string;
    title: string;
}): Promise<void> => {
    /* Built from the declared template rather than a fresh literal, exactly as app code must (GC-04). */
    const path = EXTERNAL_PATH.COLUMN_DETAIL.replace("{boardId}", boardId).replace("{columnId}", columnId);
    /* The sign-up session's own credential, never a second sign-in — the 2-session cap is the budget. */
    const response = await fetch(`${E2E_CONFIG.EXTERNAL_API_BASE_URL}${path}?userId=${account.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `JSESSIONID=${account.jsessionId}` },
        body: JSON.stringify({ title }),
    });

    if (!response.ok) {
        throw new Error(`seeding a task returned ${String(response.status)}`);
    }
};

const seedAccountWithBoard = ({ label }: { label: string }): { account: SeededAccount; board: SeededBoard } => {
    const account = seedAccount();
    const board = seedBoard({ account, name: `E2E ${label} ${randomUUID().slice(0, 8)}` });

    return { account, board };
};

const signIn = async ({ page, account, board }: { page: Page; account: SeededAccount; board: SeededBoard }) => {
    await page.goto(ROUTE.SIGN_IN);
    await page.getByLabel("Email", { exact: true }).fill(account.email);
    await page.getByLabel("Password", { exact: true }).fill(account.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    /* The account's only board, so D-11 auto-selects it — waited on rather than navigated to. */
    await expect(page).toHaveURL(new RegExp(`${buildBoardDetailPath(board.id)}$`), { timeout: SIGN_IN_TIMEOUT_MS });
};

/** Opens one column's overflow menu and chooses its destructive entry, stopping at the confirmation. */
const openDeleteConfirmation = async ({ page, name }: { page: Page; name: string }) => {
    await page.getByRole("button", { name: `Column actions for ${name}` }).click();
    await page.getByRole("menuitem", { name: "Delete Column" }).click();
};

test.describe("COLUMN-04: delete a column", () => {
    test("deletes a column from its header kebab and keeps it gone across a reload", async ({ page }) => {
        // Arrange — a two-column board; columns are seeded one call at a time (P5).
        const { account, board } = seedAccountWithBoard({ label: "Delete Column" });
        seedColumn({ account, boardId: board.id, name: "Backlog" });
        seedColumn({ account, boardId: board.id, name: "Doing" });
        await signIn({ page, account, board });
        await expect(columnHeadings(page)).toHaveText(["Backlog (0)", "Doing (0)"]);

        // Act — delete the first column through the real controls, confirming in the modal that opens.
        await openDeleteConfirmation({ page, name: "Backlog" });
        await page.getByRole("dialog").getByRole("button", { name: "Delete Column" }).click();

        // Assert — that swimlane is gone from the board view and the other one is untouched.
        await expect(columnHeadings(page)).toHaveText(["Doing (0)"]);

        // Act — reload, so nothing on screen can be standing in for the server's own state.
        await page.reload();

        // Assert — the delete persisted.
        await expect(columnHeadings(page)).toHaveText(["Doing (0)"]);
    });

    test("removes the tasks the deleted column held from the board view too", async ({ page }) => {
        // Arrange — a two-column board whose first column holds a task, so the cascade has scope.
        const { account, board } = seedAccountWithBoard({ label: "Delete Cascade" });
        const doomed = seedColumn({ account, boardId: board.id, name: "Backlog" });
        seedColumn({ account, boardId: board.id, name: "Doing" });
        const taskTitle = `E2E Task ${randomUUID().slice(0, 8)}`;
        await seedTask({ account, boardId: board.id, columnId: doomed.id, title: taskTitle });
        await signIn({ page, account, board });

        // Assert — the task is on the board view before anything is deleted, and it is counted.
        await expect(columnHeadings(page)).toHaveText([toCaption({ name: "Backlog", taskCount: 1 }), "Doing (0)"]);
        await expect(page.getByText(taskTitle)).toBeVisible();

        // Act — delete the column the task lives in.
        await openDeleteConfirmation({ page, name: "Backlog" });
        await page.getByRole("dialog").getByRole("button", { name: "Delete Column" }).click();

        // Assert — the cascade is visible to the user, not only to the API.
        await expect(columnHeadings(page)).toHaveText(["Doing (0)"]);
        await expect(page.getByText(taskTitle)).toBeHidden();

        // Act — reload, so nothing on screen can be standing in for the server's own state.
        await page.reload();

        // Assert — the task did not come back with the page.
        await expect(page.getByText(taskTitle)).toBeHidden();
    });

    test("leaves the column in place when the confirmation is declined", async ({ page }) => {
        // Arrange — a two-column board; columns are seeded one call at a time (P5).
        const { account, board } = seedAccountWithBoard({ label: "Keep Column" });
        seedColumn({ account, boardId: board.id, name: "Backlog" });
        seedColumn({ account, boardId: board.id, name: "Doing" });
        await signIn({ page, account, board });
        await expect(columnHeadings(page)).toHaveText(["Backlog (0)", "Doing (0)"]);

        // Act — reach the confirmation, then take its non-destructive way out.
        await openDeleteConfirmation({ page, name: "Backlog" });
        await page.getByRole("dialog").getByRole("button", { name: "Keep Column" }).click();

        // Assert — the confirmation is gone and the board is exactly as it was.
        await expect(page.getByRole("dialog")).toBeHidden();
        await expect(columnHeadings(page)).toHaveText(["Backlog (0)", "Doing (0)"]);

        // Act — reload, the only way to tell a declined delete from one that was issued anyway.
        await page.reload();

        // Assert — nothing was written.
        await expect(columnHeadings(page)).toHaveText(["Backlog (0)", "Doing (0)"]);
    });

    test("falls through to the shared empty state once the last column is deleted", async ({ page }) => {
        // Arrange — a board with exactly one column, which the delete takes to zero.
        const { account, board } = seedAccountWithBoard({ label: "Delete Last" });
        seedColumn({ account, boardId: board.id, name: "Backlog" });
        await signIn({ page, account, board });
        await expect(columnHeadings(page)).toHaveText(["Backlog (0)"]);

        // Act — delete the only column there is.
        await openDeleteConfirmation({ page, name: "Backlog" });
        await page.getByRole("dialog").getByRole("button", { name: "Delete Column" }).click();

        // Assert — the same empty state a brand-new board shows, call to action included.
        await expect(page.getByText("This board is empty. Create a new column to get started.")).toBeVisible();
        await expect(page.getByRole("button", { name: "+ Add New Column" })).toBeVisible();
        await expect(columnHeadings(page)).toHaveCount(0);
    });
});
