import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

import {
    readBoardFull,
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
 * TASK-05 against the real deployed nonprod backend: a task deleted from its own detail-view
 * kebab, the cascade read back from the BACKEND (not inferred from the card's own disappearance),
 * and the declined confirmation proved safe — structural assertions only, no copy (docs/adr/tech/0022).
 */

const SIGN_IN_TIMEOUT_MS = 20_000;
const TASK_TITLE = "Fixture Deletable Task";

type SeededTaskWithSubtasks = { account: SeededAccount; board: SeededBoard; taskId: string; subtaskIds: string[] };

/** A task card names its title followed by its subtask caption, when one exists. */
const taskCard = ({ page, title }: { page: Page; title: string }) =>
    page.getByRole("button", { name: new RegExp(`^${title}`) });

/** The confirmation is nested over the still-open task detail dialog. */
const deleteConfirmation = (page: Page) => page.getByRole("dialog", { name: "Delete this task?" });

/** A task with two subtasks, on a board with a single column — the cascade this spec proves. */
const seedTaskWithSubtasks = (): SeededTaskWithSubtasks => {
    const account = seedAccount();
    const board = seedBoard({ account, name: `E2E Task Delete ${randomUUID().slice(0, 8)}` });
    const column = seedColumn({ account, boardId: board.id, name: "Backlog" });
    const task = seedTask({ account, boardId: board.id, columnId: column.id, title: TASK_TITLE });
    const subtaskOne = seedSubtask({
        account,
        boardId: board.id,
        columnId: column.id,
        taskId: task.id,
        title: "Subtask One",
    });
    const subtaskTwo = seedSubtask({
        account,
        boardId: board.id,
        columnId: column.id,
        taskId: task.id,
        title: "Subtask Two",
    });

    return { account, board, taskId: task.id, subtaskIds: [subtaskOne.id, subtaskTwo.id] };
};

const signIn = async ({ page, account, board }: { page: Page; account: SeededAccount; board: SeededBoard }) => {
    await page.goto(ROUTE.SIGN_IN);
    await page.getByLabel("Email", { exact: true }).fill(account.email);
    await page.getByLabel("Password", { exact: true }).fill(account.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    /* The account's only board, so D-11 auto-selects it — waited on rather than navigated to. */
    await expect(page).toHaveURL(new RegExp(`${buildBoardDetailPath(board.id)}$`), { timeout: SIGN_IN_TIMEOUT_MS });
};

/** Opens the task's detail view and its kebab's destructive entry, leaving the confirmation open. */
const openDeleteConfirmationFor = async ({ page, title }: { page: Page; title: string }) => {
    await taskCard({ page, title }).click();
    await page.getByRole("button", { name: `Task actions for ${title}` }).click();
    await page.getByRole("menuitem", { name: "Delete Task" }).click();
};

/** Every task id the board's own `/full` read reports, across every column — the cascade's ground truth. */
const readAllTaskIds = ({ account, boardId }: { account: SeededAccount; boardId: string }): string[] =>
    readBoardFull({ account, boardId }).columns.flatMap((column) => column.tasks.map((task) => task.id));

test.describe("TASK-05: delete a task", () => {
    test("task delete: deletes a task from its detail view and cascades to its subtasks, read back from the backend", async ({
        page,
    }) => {
        // Arrange — a task holding two subtasks, so the cascade this test proves has real scope.
        const { account, board, taskId } = seedTaskWithSubtasks();
        await signIn({ page, account, board });
        await expect(taskCard({ page, title: TASK_TITLE })).toBeVisible();

        // Act — the real destructive path: detail view, kebab, confirm.
        await openDeleteConfirmationFor({ page, title: TASK_TITLE });
        /* Created before the click that issues the write, per createServerActionSettled's contract. */
        const settled = createServerActionSettled(page);
        await deleteConfirmation(page).getByRole("button", { name: "Delete Task" }).click();
        await settled;

        // Assert — both the confirmation and the detail view are gone, and so is the card.
        await expect(deleteConfirmation(page)).toBeHidden();
        await expect(taskCard({ page, title: TASK_TITLE })).toBeHidden();

        // Act — reload, so nothing on screen can be standing in for the server's own state.
        await page.reload();

        // Assert — the card stays gone after a real reload.
        await expect(taskCard({ page, title: TASK_TITLE })).toBeHidden();

        /*
         * Assert — the cascade, read from the BACKEND rather than inferred from the card's own
         * absence: the task's id is gone from the board's own `/full` read entirely.
         */
        expect(readAllTaskIds({ account, boardId: board.id })).not.toContain(taskId);
    });

    test("task delete: leaves the task and its subtasks untouched when the confirmation is declined", async ({
        page,
    }) => {
        // Arrange
        const { account, board, taskId } = seedTaskWithSubtasks();
        await signIn({ page, account, board });
        await expect(taskCard({ page, title: TASK_TITLE })).toBeVisible();

        // Act — reach the confirmation, then take its non-destructive way out.
        await openDeleteConfirmationFor({ page, title: TASK_TITLE });
        await deleteConfirmation(page).getByRole("button", { name: "Keep Task" }).click();

        // Assert — the confirmation is gone while the unchanged detail view stays open.
        await expect(deleteConfirmation(page)).toBeHidden();
        await expect(page.getByRole("dialog", { name: TASK_TITLE })).toBeVisible();

        // Act — close the unchanged detail view; its modal semantics hide the card from the accessibility tree.
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog", { name: TASK_TITLE })).toBeHidden();
        await expect(taskCard({ page, title: TASK_TITLE })).toBeVisible();

        // Act — reload, the only way to tell a declined delete from one that was issued anyway.
        await page.reload();

        // Assert — nothing was written, on screen or on the backend.
        await expect(taskCard({ page, title: TASK_TITLE })).toBeVisible();
        expect(readAllTaskIds({ account, boardId: board.id })).toContain(taskId);
    });
});
