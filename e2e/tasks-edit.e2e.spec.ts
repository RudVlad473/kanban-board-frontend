import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

import { seedAccount, seedBoard, seedColumn, seedTask, type SeededAccount, type SeededBoard } from "./seed";
import { createServerActionSettled } from "./server-action";
import { buildBoardDetailPath, ROUTE } from "../src/lib/core/routing/routes";

/*
 * TASK-03 against the real deployed nonprod backend — structural, business-level assertions only,
 * no validation copy (docs/adr/tech/0022). One of the two criteria only a reload can demonstrate:
 * the save is optimistic (S-01 closes the modal on submit), so only a reload proves persistence.
 */

const SIGN_IN_TIMEOUT_MS = 20_000;

const signIn = async ({ page, account, board }: { page: Page; account: SeededAccount; board: SeededBoard }) => {
    await page.goto(ROUTE.SIGN_IN);
    await page.getByLabel("Email", { exact: true }).fill(account.email);
    await page.getByLabel("Password", { exact: true }).fill(account.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(new RegExp(`${buildBoardDetailPath(board.id)}$`), { timeout: SIGN_IN_TIMEOUT_MS });
};

test.describe("TASK-03: edit a task", () => {
    test("task edit: changes the title and description, and both persist across a reload", async ({ page }) => {
        // Arrange
        const account = seedAccount();
        const board = seedBoard({ account, name: `E2E Task Edit ${randomUUID().slice(0, 8)}` });
        const column = seedColumn({ account, boardId: board.id, name: "Backlog" });
        const originalTitle = `Fixture Edit Task ${randomUUID().slice(0, 8)}`;
        seedTask({
            account,
            boardId: board.id,
            columnId: column.id,
            title: originalTitle,
            description: "Fixture description before the edit.",
        });
        await signIn({ page, account, board });
        const newTitle = `Fixture Edited Task ${randomUUID().slice(0, 8)}`;
        const newDescription = "Fixture description after the edit.";

        // Act — open the detail view, then the kebab's Edit Task entry.
        await page.getByRole("button", { name: new RegExp(`^${originalTitle}`) }).click();
        await page.getByRole("button", { name: `Task actions for ${originalTitle}` }).click();
        await page.getByRole("menuitem", { name: "Edit Task" }).click();

        // Act — change both fields and submit.
        const dialog = page.getByRole("dialog");
        await dialog.getByLabel("Title", { exact: true }).fill(newTitle);
        await dialog.getByLabel("Description", { exact: true }).fill(newDescription);
        /* Created before the click that issues the write, per createServerActionSettled's contract. */
        const settled = createServerActionSettled(page);
        await dialog.getByRole("button", { name: "Save Changes" }).click();

        // Assert — the save is optimistic: the detail view returns showing the NEW title at once.
        await expect(page.getByRole("dialog").getByRole("heading", { name: newTitle })).toBeVisible();

        /*
         * Act — let the write reach the server, close the modal, then reload; the optimistic
         * apply cannot answer for whether it persisted (CONVENTIONS' settle-wait rule).
         */
        await settled;
        await page.keyboard.press("Escape");
        await page.reload();

        // Assert — both changes reached the server.
        await page.getByRole("button", { name: new RegExp(`^${newTitle}`) }).click();
        await expect(page.getByRole("dialog").getByRole("heading", { name: newTitle })).toBeVisible();
        await expect(page.getByRole("dialog").getByText(newDescription)).toBeVisible();
    });
});
