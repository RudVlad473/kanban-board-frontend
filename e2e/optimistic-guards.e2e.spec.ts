import { randomUUID } from "node:crypto";

import { expect, test, type Page, type Request } from "@playwright/test";

import { seedAccount, seedBoard, seedColumn, type SeededAccount, type SeededBoard } from "./seed";
import { buildBoardDetailPath, ROUTE } from "../src/lib/core/routing/routes";

// comment-length-exempt: records the invariant every test here asserts and why a placeholder id is not merely cosmetic, which is what makes these disabled states correctness rather than polish
/*
 * An entity the server has not acknowledged yet cannot be acted on.
 *
 * Every optimistic create stages its row under a client-generated id and swaps in the server's on
 * success (docs/adr/tech/0030). Until that swap the id names nothing upstream, so any request built
 * from it — a move, a rename, a delete, a child create — is addressed to a resource that does not
 * exist. The control that would send one must therefore be disabled, not merely likely-to-succeed.
 *
 * Held open with a route delay rather than a stub: the point is what the REAL app does while a
 * real create is in flight, which is exactly the window the user reported.
 */

const SIGN_IN_TIMEOUT_MS = 20_000;

/** Long enough to interact inside the in-flight window, short enough not to dominate the run. */
const CREATE_HOLD_MS = 6000;

const isServerActionPost = (request: Request): boolean =>
    request.method() === "POST" && "next-action" in request.headers();

const seedTwoColumnBoard = (): { account: SeededAccount; board: SeededBoard } => {
    const account = seedAccount();
    const board = seedBoard({ account, name: `E2E Guards ${randomUUID().slice(0, 8)}` });
    seedColumn({ account, boardId: board.id, name: "Alpha" });
    seedColumn({ account, boardId: board.id, name: "Beta" });

    return { account, board };
};

const signIn = async ({ page, account, board }: { page: Page; account: SeededAccount; board: SeededBoard }) => {
    await page.goto(ROUTE.SIGN_IN);
    await page.getByLabel("Email", { exact: true }).fill(account.email);
    await page.getByLabel("Password", { exact: true }).fill(account.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(new RegExp(`${buildBoardDetailPath(board.id)}$`), { timeout: SIGN_IN_TIMEOUT_MS });
};

/** Holds every write the app issues from here on, so the in-flight window is wide enough to act in. */
const holdWrites = async (page: Page): Promise<void> => {
    await page.route("**/*", async (route, request) => {
        if (isServerActionPost(request)) {
            await new Promise((resolve) => setTimeout(resolve, CREATE_HOLD_MS));
        }

        await route.continue();
    });
};

test.describe("OPT-01: an unconfirmed entity cannot be acted on", () => {
    test("task: the card's drag handle is disabled until the create is confirmed, then enabled", async ({ page }) => {
        // Arrange
        const { account, board } = seedTwoColumnBoard();
        await signIn({ page, account, board });
        const title = `Guarded Task ${randomUUID().slice(0, 8)}`;
        await holdWrites(page);

        // Act — create a task; the modal closes at submit, so the optimistic card is what is on screen.
        await page.getByRole("button", { name: "+ Add New Task" }).click();
        await page.getByRole("dialog").getByLabel("Title", { exact: true }).fill(title);
        await page.getByRole("dialog").getByRole("button", { name: "Create Task" }).click();

        // Assert — the card is already there, and its one drag control refuses to start a move.
        const card = page.getByRole("button", { name: new RegExp(`^${title}`) });
        await expect(card).toBeVisible();
        await expect(page.getByRole("button", { name: `Reorder ${title}` })).toBeDisabled();

        /*
         * Assert — and it becomes draggable once the server has acknowledged it, so this is a
         * WINDOW and not a permanently dead control.
         */
        await expect(page.getByRole("button", { name: `Reorder ${title}` })).toBeEnabled({ timeout: 20_000 });
    });

    test("column: its own controls are disabled until the create is confirmed, then enabled", async ({ page }) => {
        // Arrange
        const { account, board } = seedTwoColumnBoard();
        await signIn({ page, account, board });
        const name = `Gamma${randomUUID().slice(0, 4)}`;
        await holdWrites(page);

        // Act — create a column; this modal also closes at submit behind an optimistic column.
        await page.getByRole("button", { name: "+ New Column" }).click();
        await page.getByLabel("Column Name", { exact: true }).fill(name);
        await page.getByRole("button", { name: "Create New Column" }).click();

        // Assert — the column is on screen but owns nothing the server could act on yet.
        await expect(page.getByRole("heading", { name: new RegExp(`^${name}`, "i") })).toBeVisible();
        await expect(page.getByRole("button", { name: `Column actions for ${name}` })).toBeDisabled();

        // Assert — a task cannot be created into a column that does not exist upstream.
        await page.getByRole("button", { name: "+ Add New Task" }).click();
        await page.getByRole("dialog").getByRole("combobox").click();
        await expect(page.getByRole("option", { name })).toHaveCount(0);
        await page.keyboard.press("Escape");
        await page.keyboard.press("Escape");

        // Assert — the window closes when the server acknowledges it.
        await expect(page.getByRole("button", { name: `Column actions for ${name}` })).toBeEnabled({ timeout: 20_000 });
    });

    test("board: the sidebar row does not navigate until the create is confirmed, then it does", async ({ page }) => {
        // Arrange
        const { account, board } = seedTwoColumnBoard();
        await signIn({ page, account, board });
        const name = `E2E Guarded Board ${randomUUID().slice(0, 8)}`;
        const openUrl = page.url();
        await holdWrites(page);

        // Act — create a board; the sidebar shows it optimistically before the server replies.
        await page.getByRole("button", { name: "+ Create New Board" }).click();
        await page.getByLabel("Board Name", { exact: true }).fill(name);
        await page.getByRole("button", { name: "Create New Board", exact: true }).click();

        // Assert — the row is there, and activating it goes nowhere: its id names no board upstream.
        const row = page.getByRole("link", { name });
        await expect(row).toBeVisible();
        await expect(row).toHaveAttribute("aria-disabled", "true");
        await row.click({ force: true });
        await expect(page).toHaveURL(openUrl);

        // Assert — once acknowledged it is an ordinary row again.
        await expect(row).not.toHaveAttribute("aria-disabled", "true", { timeout: 20_000 });
    });
});
