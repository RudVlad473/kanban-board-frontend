import { randomUUID } from "node:crypto";

import { expect, test, type Page, type Request } from "@playwright/test";

import { seedAccount, seedBoard, seedColumn, seedTask, type SeededAccount, type SeededBoard } from "./seed";
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

// comment-length-exempt: records why the hold is gated rather than timed, and the CI-only failure the timed version produced
/**
 * Park the writes the app issues until the test releases them, and give back the release.
 *
 * A GATE, not a sleep. A fixed delay has to be long enough for the slowest assertion, so it holds
 * the write open far longer than the test actually needs and widens the window for the shared
 * backend to refuse it — the create was rolled back and the control under assertion then did not
 * exist at all rather than being enabled. Green locally at any worker count, red on CI
 * (2026-09-05). Gated, the write is parked for exactly as long as the assertions take.
 */
const holdWrites = async (page: Page): Promise<() => void> => {
    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => {
        release = resolve;
    });

    await page.route("**/*", async (route, request) => {
        if (isServerActionPost(request)) {
            await gate;
        }

        await route.continue();
    });

    return () => {
        release();
    };
};

test.describe("OPT-01: an unconfirmed entity cannot be acted on", () => {
    test("task: the card's drag handle is disabled until the create is confirmed, then enabled", async ({ page }) => {
        // Arrange
        const { account, board } = seedTwoColumnBoard();
        await signIn({ page, account, board });
        const title = `Guarded Task ${randomUUID().slice(0, 8)}`;
        const release = await holdWrites(page);

        // Act — create a task; the modal closes at submit, so the optimistic card is what is on screen.
        await page.getByRole("button", { name: "+ Add New Task" }).click();
        await page.getByRole("dialog").getByLabel("Title", { exact: true }).fill(title);
        await page.getByRole("dialog").getByRole("button", { name: "Create Task" }).click();

        // Assert — the card is already there, and its one drag control refuses to start a move.
        const card = page.getByRole("button", { name: new RegExp(`^${title}`) });
        await expect(card).toBeVisible();
        await expect(page.getByRole("button", { name: `Reorder ${title}` })).toBeDisabled();

        /* Released here: the guard assertions above are done, so the write may go through. */
        release();

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
        const release = await holdWrites(page);

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

        /* Released here: the guard assertions above are done, so the write may go through. */
        release();

        // Assert — the window closes when the server acknowledges it.
        await expect(page.getByRole("button", { name: `Column actions for ${name}` })).toBeEnabled({ timeout: 20_000 });
    });

    test("board: the sidebar row does not navigate until the create is confirmed, then it does", async ({ page }) => {
        // Arrange
        const { account, board } = seedTwoColumnBoard();
        await signIn({ page, account, board });
        const name = `E2E Guarded Board ${randomUUID().slice(0, 8)}`;
        const openUrl = page.url();
        const release = await holdWrites(page);

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

        /* Released here: the guard assertions above are done, so the write may go through. */
        release();

        // Assert — once acknowledged it is an ordinary row again.
        await expect(row).not.toHaveAttribute("aria-disabled", "true", { timeout: 20_000 });
    });

    /*
     * The row is reachable by AUXILIARY click, which React's `onClick` never sees — a guard built
     * only on `onClick` leaves the raw `href` (a client-generated placeholder id) followable.
     */
    test("board: a middle click on the unconfirmed row opens nothing either", async ({ page }) => {
        // Arrange
        const { account, board } = seedTwoColumnBoard();
        await signIn({ page, account, board });
        const name = `E2E Aux Board ${randomUUID().slice(0, 8)}`;
        const release = await holdWrites(page);

        // Act — create a board, then middle-click its still-unconfirmed row.
        await page.getByRole("button", { name: "+ Create New Board" }).click();
        await page.getByLabel("Board Name", { exact: true }).fill(name);
        await page.getByRole("button", { name: "Create New Board", exact: true }).click();
        const row = page.getByRole("link", { name });
        await expect(row).toHaveAttribute("aria-disabled", "true");
        await row.click({ button: "middle", force: true });

        // Assert — no second tab: the placeholder id was never navigated to.
        await expect.poll(() => page.context().pages().length, { timeout: 2000 }).toBe(1);

        /* Released so the create can settle before teardown rather than being abandoned mid-flight. */
        release();
    });

    /*
     * The edit modal renders subtasks straight from the board entry, so an optimistic row appears
     * there as an ordinary one — with a rename and a delete that would both name a placeholder id.
     */
    test("subtask: the edit modal's row for an unconfirmed subtask has no live controls", async ({ page }) => {
        // Arrange — one task to open the editor on.
        const account = seedAccount();
        const board = seedBoard({ account, name: `E2E Subtask Guard ${randomUUID().slice(0, 8)}` });
        const column = seedColumn({ account, boardId: board.id, name: "Alpha" });
        const title = `Guarded Parent ${randomUUID().slice(0, 8)}`;
        seedTask({ account, boardId: board.id, columnId: column.id, title });
        await signIn({ page, account, board });

        await page.getByRole("button", { name: new RegExp(`^${title}`) }).click();
        await page.getByRole("button", { name: `Task actions for ${title}` }).click();
        await page.getByRole("menuitem", { name: "Edit Task" }).click();

        const subtaskTitle = `Held Subtask ${randomUUID().slice(0, 4)}`;
        const release = await holdWrites(page);

        // Act — commit a new subtask row; its create is held open from here.
        await page.getByRole("button", { name: "+ Add New Subtask" }).click();
        /* The seeded task has no subtasks, so the first draft row is row 1. */
        const draft = page.getByRole("dialog").getByRole("textbox", { name: "Subtask 1", exact: true });
        await draft.fill(subtaskTitle);
        await draft.press("Tab");

        /*
         * Assert — EVERY control naming that subtask is inert, not just the draft row's own. The
         * optimistic insert puts a second row on screen carrying the same placeholder id.
         */
        const removeButtons = page.getByRole("button", { name: `Remove subtask '${subtaskTitle}'` });
        await expect(removeButtons).not.toHaveCount(0);
        const removeCount = await removeButtons.count();

        for (let index = 0; index < removeCount; index += 1) {
            await expect(removeButtons.nth(index)).toBeDisabled();
        }

        /* Released here: the guard assertions above are done, so the write may go through. */
        release();

        // Assert — and they come back once the server owns the subtask.
        await expect(removeButtons.first()).toBeEnabled({ timeout: 20_000 });
    });
});
