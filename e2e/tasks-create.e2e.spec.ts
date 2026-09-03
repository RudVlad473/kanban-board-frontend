import { randomUUID } from "node:crypto";

import { expect, test, type Locator, type Page } from "@playwright/test";

import { seedAccount, seedBoard, seedColumn, type SeededAccount, type SeededBoard } from "./seed";
import { buildBoardDetailPath, ROUTE } from "../src/lib/core/routing/routes";

/*
 * TASK-01 against the real deployed nonprod backend — structural, business-level assertions only,
 * no validation copy (docs/adr/tech/0022). Creation IS optimistic and the modal closes at submit
 * (04-UI-SPEC.md's D-05 amendment), so a card on screen proves only that the write was issued.
 */

const SIGN_IN_TIMEOUT_MS = 20_000;

const seedTwoColumnBoard = (): { account: SeededAccount; board: SeededBoard } => {
    const account = seedAccount();
    const board = seedBoard({ account, name: `E2E Task Create ${randomUUID().slice(0, 8)}` });
    seedColumn({ account, boardId: board.id, name: "Todo" });
    seedColumn({ account, boardId: board.id, name: "Doing" });

    return { account, board };
};

const signIn = async ({ page, account, board }: { page: Page; account: SeededAccount; board: SeededBoard }) => {
    await page.goto(ROUTE.SIGN_IN);
    await page.getByLabel("Email", { exact: true }).fill(account.email);
    await page.getByLabel("Password", { exact: true }).fill(account.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(new RegExp(`${buildBoardDetailPath(board.id)}$`), { timeout: SIGN_IN_TIMEOUT_MS });
};

/** One column's own `<section>`, matched by its heading — mirrors `tasks-move.e2e.spec.ts`. */
const columnSection = ({ page, name }: { page: Page; name: string }): Locator =>
    page.locator("section").filter({ has: page.getByRole("heading", { name: new RegExp(`^${name}`) }) });

test.describe("TASK-01: create a task", () => {
    test("task create: fills the create form, chooses a column, and the card survives a reload", async ({ page }) => {
        // Arrange
        const { account, board } = seedTwoColumnBoard();
        await signIn({ page, account, board });
        const title = `Fixture Created Task ${randomUUID().slice(0, 8)}`;

        // Act — open the header's one create entry point and fill every field.
        await page.getByRole("button", { name: "+ Add New Task" }).click();
        const dialog = page.getByRole("dialog");
        await dialog.getByLabel("Title", { exact: true }).fill(title);
        await dialog.getByLabel("Description", { exact: true }).fill("Fixture task description.");
        await dialog.getByRole("textbox", { name: "Subtask 1", exact: true }).fill("Subtask One");
        await dialog.getByRole("textbox", { name: "Subtask 2", exact: true }).fill("Subtask Two");

        // Act — Status defaults to the first column; choose the SECOND to prove the field is real.
        await dialog.getByRole("combobox").click();
        await page.getByRole("option", { name: "Doing" }).click();
        await dialog.getByRole("button", { name: "Create Task" }).click();

        /*
         * Assert — the card lands in the CHOSEN column; its appearance is itself the settle-wait
         * (create is not optimistic), and the subtask fan-out's caption is polled for.
         */
        const card = columnSection({ page, name: "Doing" }).getByRole("button", { name: new RegExp(`^${title}`) });
        await expect(card).toBeVisible();
        await expect(columnSection({ page, name: "Doing" }).getByText("0 of 2 subtasks")).toBeVisible();
        await expect(
            columnSection({ page, name: "Todo" }).getByRole("button", { name: new RegExp(`^${title}`) }),
        ).toHaveCount(0);

        // Act — reload, the only way to tell an applied create from a modal-only artifact.
        await page.reload();

        // Assert — the task and its subtask fan-out both persisted.
        await expect(
            columnSection({ page, name: "Doing" }).getByRole("button", { name: new RegExp(`^${title}`) }),
        ).toBeVisible();
        await expect(columnSection({ page, name: "Doing" }).getByText("0 of 2 subtasks")).toBeVisible();
    });

    test("task create: a task created with no subtasks renders with no caption at all", async ({ page }) => {
        // Arrange
        const { account, board } = seedTwoColumnBoard();
        await signIn({ page, account, board });
        const title = `Fixture Bare Task ${randomUUID().slice(0, 8)}`;

        // Act — drop both seeded subtask rows before submitting; removing both is legal.
        await page.getByRole("button", { name: "+ Add New Task" }).click();
        const dialog = page.getByRole("dialog");
        await dialog.getByLabel("Title", { exact: true }).fill(title);
        await dialog.getByRole("button", { name: "Remove Subtask 1", exact: true }).click();
        await dialog.getByRole("button", { name: "Remove Subtask 1", exact: true }).click();
        await dialog.getByRole("button", { name: "Create Task" }).click();

        /*
         * Assert — the card's accessible name is the title ALONE: no caption element renders at
         * zero subtasks (UI-SPEC empty/task-card), so an exact match is the proof rather than a prefix.
         */
        await expect(page.getByRole("button", { name: title, exact: true })).toBeVisible();
    });
});
