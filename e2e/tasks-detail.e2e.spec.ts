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
import { buildBoardDetailPath, ROUTE } from "../src/lib/core/routing/routes";

/*
 * TASK-02 against the real deployed nonprod backend — structural, business-level assertions only,
 * no validation copy (docs/adr/tech/0022). A seeded fixture proves the detail view is a pure read
 * off the board, never a mutation of its own.
 */

const SIGN_IN_TIMEOUT_MS = 20_000;

const signIn = async ({ page, account, board }: { page: Page; account: SeededAccount; board: SeededBoard }) => {
    await page.goto(ROUTE.SIGN_IN);
    await page.getByLabel("Email", { exact: true }).fill(account.email);
    await page.getByLabel("Password", { exact: true }).fill(account.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(new RegExp(`${buildBoardDetailPath(board.id)}$`), { timeout: SIGN_IN_TIMEOUT_MS });
};

test.describe("TASK-02: view task detail", () => {
    test("task detail: shows a seeded task's title, description, checklist and current column", async ({ page }) => {
        // Arrange — a task carrying a real description and two subtasks, in a NAMED column.
        const account = seedAccount();
        const board = seedBoard({ account, name: `E2E Task Detail ${randomUUID().slice(0, 8)}` });
        const column = seedColumn({ account, boardId: board.id, name: "Backlog" });
        const title = `Fixture Detail Task ${randomUUID().slice(0, 8)}`;
        const description = "Fixture task description for the detail view.";
        const task = seedTask({ account, boardId: board.id, columnId: column.id, title, description });
        seedSubtask({ account, boardId: board.id, columnId: column.id, taskId: task.id, title: "Subtask Alpha" });
        seedSubtask({ account, boardId: board.id, columnId: column.id, taskId: task.id, title: "Subtask Beta" });
        await signIn({ page, account, board });

        // Act — open the detail view from the card.
        await page.getByRole("button", { name: new RegExp(`^${title}`) }).click();

        // Assert — title, description, checklist rows and the current-column control all read off the board.
        const dialog = page.getByRole("dialog");
        await expect(dialog.getByRole("heading", { name: title })).toBeVisible();
        await expect(dialog.getByText(description)).toBeVisible();
        await expect(dialog.getByRole("checkbox", { name: "Subtask Alpha" })).toBeVisible();
        await expect(dialog.getByRole("checkbox", { name: "Subtask Beta" })).toBeVisible();
        await expect(dialog.getByRole("combobox", { name: "Backlog" })).toBeVisible();
    });

    test("task detail: renders no description block at all for a task created without one", async ({ page }) => {
        /*
         * Arrange — no `description` argument at all (never a blank one — T9 refuses `""`), and one
         * subtask so the checklist branch renders instead of the empty-state pair of paragraphs.
         */
        const account = seedAccount();
        const board = seedBoard({ account, name: `E2E Task Detail Empty ${randomUUID().slice(0, 8)}` });
        const column = seedColumn({ account, boardId: board.id, name: "Backlog" });
        const title = `No description ${randomUUID().slice(0, 8)}`;
        const task = seedTask({ account, boardId: board.id, columnId: column.id, title });
        seedSubtask({ account, boardId: board.id, columnId: column.id, taskId: task.id, title: "Subtask Solo" });
        await signIn({ page, account, board });

        // Act
        await page.getByRole("button", { name: new RegExp(`^${title}`) }).click();

        /*
         * Assert — the checklist and status render normally, and the description is omitted
         * entirely (no placeholder line): exactly two <p> elements exist, the subtasks caption and
         * the Current Status label — a description paragraph would make this three.
         */
        const dialog = page.getByRole("dialog");
        await expect(dialog.getByRole("checkbox", { name: "Subtask Solo" })).toBeVisible();
        await expect(dialog.getByText("Current Status")).toBeVisible();
        await expect(dialog.locator("p")).toHaveCount(2);
    });
});
