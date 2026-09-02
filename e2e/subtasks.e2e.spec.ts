import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

import {
    seedAccount,
    seedBoard,
    seedColumn,
    seedSubtask,
    seedTask,
    type SeededAccount,
    type SeededBoard,
} from "./seed";
import { createServerActionSettled } from "./server-action";
import { buildBoardDetailPath, ROUTE } from "../src/lib/core/routing/routes";

/*
 * SUBTASK-01/02/03/04 against the real deployed nonprod backend — structural, business-level
 * assertions only, no validation copy (docs/adr/tech/0022). This file's second describe's reload
 * is D-06's per-item-save proof: a row persists without the modal's own Save Changes ever pressed.
 */

const SIGN_IN_TIMEOUT_MS = 20_000;

const signIn = async ({ page, account, board }: { page: Page; account: SeededAccount; board: SeededBoard }) => {
    await page.goto(ROUTE.SIGN_IN);
    await page.getByLabel("Email", { exact: true }).fill(account.email);
    await page.getByLabel("Password", { exact: true }).fill(account.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(new RegExp(`${buildBoardDetailPath(board.id)}$`), { timeout: SIGN_IN_TIMEOUT_MS });
};

test.describe("SUBTASK-02: toggle a subtask", () => {
    test("subtask toggle: flips a subtask's completion and it persists across a reload", async ({ page }) => {
        // Arrange
        const account = seedAccount();
        const board = seedBoard({ account, name: `E2E Subtask Toggle ${randomUUID().slice(0, 8)}` });
        const column = seedColumn({ account, boardId: board.id, name: "Backlog" });
        const title = `Fixture Toggle Task ${randomUUID().slice(0, 8)}`;
        const task = seedTask({ account, boardId: board.id, columnId: column.id, title });
        seedSubtask({ account, boardId: board.id, columnId: column.id, taskId: task.id, title: "Subtask Alpha" });
        seedSubtask({ account, boardId: board.id, columnId: column.id, taskId: task.id, title: "Subtask Beta" });
        await signIn({ page, account, board });

        // Act — open the detail view and toggle one subtask.
        await page.getByRole("button", { name: new RegExp(`^${title}`) }).click();
        const checkbox = page.getByRole("dialog").getByRole("checkbox", { name: "Subtask Alpha" });
        /* Created before the click that issues the write, per createServerActionSettled's contract. */
        const settled = createServerActionSettled(page);
        await checkbox.click();

        // Assert — the detail view's own caption updates optimistically.
        await expect(page.getByRole("dialog").getByText("Subtasks (1 of 2)")).toBeVisible();

        // Act — let the write reach the server, close the modal, then reload.
        await settled;
        await page.keyboard.press("Escape");
        await page.reload();

        // Assert — the toggle persisted, on both the card's caption and the checkbox's own state.
        await expect(page.getByText("1 of 2 subtasks")).toBeVisible();
        await page.getByRole("button", { name: new RegExp(`^${title}`) }).click();
        await expect(page.getByRole("dialog").getByRole("checkbox", { name: "Subtask Alpha" })).toBeChecked();
    });
});

test.describe("SUBTASK-01/03/04: add, rename and delete a subtask without pressing Save Changes", () => {
    test("subtask editor: an add, a rename and a delete each persist across a reload with the edit modal's submit never pressed", async ({
        page,
    }) => {
        // Arrange — two existing subtasks; the edit modal's own rows are what this test drives.
        const account = seedAccount();
        const board = seedBoard({ account, name: `E2E Subtask Editor ${randomUUID().slice(0, 8)}` });
        const column = seedColumn({ account, boardId: board.id, name: "Backlog" });
        const title = `Fixture Editor Task ${randomUUID().slice(0, 8)}`;
        const task = seedTask({ account, boardId: board.id, columnId: column.id, title });
        seedSubtask({ account, boardId: board.id, columnId: column.id, taskId: task.id, title: "Subtask Alpha" });
        seedSubtask({ account, boardId: board.id, columnId: column.id, taskId: task.id, title: "Subtask Beta" });
        await signIn({ page, account, board });

        // Act — open the detail view, then the kebab's Edit Task entry (S-03: add/rename/delete live here).
        await page.getByRole("button", { name: new RegExp(`^${title}`) }).click();
        await page.getByRole("button", { name: `Task actions for ${title}` }).click();
        await page.getByRole("menuitem", { name: "Edit Task" }).click();
        const dialog = page.getByRole("dialog");

        // Act — ADD: a new row commits on blur, becoming subtask 3 (appended, per withSubtaskInsert).
        let settled = createServerActionSettled(page);
        await dialog.getByRole("button", { name: "+ Add New Subtask" }).click();
        await dialog.getByRole("textbox", { name: "Subtask 3", exact: true }).fill("Subtask Gamma");
        await dialog.getByRole("textbox", { name: "Subtask 3", exact: true }).press("Tab");
        await settled;

        // Act — RENAME: subtask 2 (Beta) renames inline on blur (S-03).
        settled = createServerActionSettled(page);
        const renameRow = dialog.getByRole("textbox", { name: "Subtask 2", exact: true });
        await renameRow.fill("Subtask Beta Renamed");
        await renameRow.press("Tab");
        await settled;

        // Act — DELETE: subtask 1 (Alpha) removes immediately, no confirm (D-09/S-05).
        settled = createServerActionSettled(page);
        await dialog.getByRole("button", { name: "Remove subtask 'Subtask Alpha'" }).click();
        await settled;

        // Act — leave the modal WITHOUT ever pressing Save Changes; that button only saves title/description.
        await page.keyboard.press("Escape");
        await page.reload();

        // Assert — every row committed even though the modal's own submit was never pressed.
        await page.getByRole("button", { name: new RegExp(`^${title}`) }).click();
        const reopened = page.getByRole("dialog");
        await expect(reopened.getByRole("checkbox", { name: "Subtask Gamma" })).toBeVisible();
        await expect(reopened.getByRole("checkbox", { name: "Subtask Beta Renamed" })).toBeVisible();
        await expect(reopened.getByRole("checkbox", { name: "Subtask Alpha" })).toHaveCount(0);
        await expect(reopened.getByText("Subtasks (0 of 2)")).toBeVisible();
    });
});
