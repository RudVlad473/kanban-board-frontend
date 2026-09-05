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

/** One column's rendered task order, title-only — the handle's icon span matches the selector too. */
const readTaskTitlesInColumn = async ({ page, name }: { page: Page; name: string }): Promise<string[]> => {
    const section = page
        .locator("section")
        .filter({ has: page.getByRole("heading", { name: new RegExp(`^${name}`) }) });
    const texts = await section.locator("li button span:first-child").allInnerTexts();

    return texts.filter((text) => text.length > 0);
};

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

    // comment-length-exempt: records the ordering the server can end up with and why a request-level assertion cannot see it
    /*
     * A move made BESIDE an unconfirmed sibling must land where the user saw it.
     *
     * The moved task's own id is real, so nothing 404s and no request names a placeholder — the
     * exposure is the INDEX. `toTaskMoveTargetPosition` counts the rendered list, which includes a
     * card the server does not have yet, so the position sent can mean a different slot upstream
     * than the one on screen. Asserted against the order after a reload, which is the only thing
     * that can tell the two apart.
     */
    test("task: a move made beside an unconfirmed sibling lands where the user saw it", async ({ page }) => {
        // Arrange — one task in each column; Bravo is where both the create and the move land.
        const account = seedAccount();
        const board = seedBoard({ account, name: `E2E Skew ${randomUUID().slice(0, 8)}` });
        const alpha = seedColumn({ account, boardId: board.id, name: "Alpha" });
        seedColumn({ account, boardId: board.id, name: "Bravo" });
        const movable = `Movable ${randomUUID().slice(0, 8)}`;
        seedTask({ account, boardId: board.id, columnId: alpha.id, title: movable });
        await signIn({ page, account, board });

        const release = await holdWrites(page);

        // Act — a create into Bravo that stays unacknowledged for the whole drag.
        const pending = `Pending ${randomUUID().slice(0, 8)}`;
        await page.getByRole("button", { name: "+ Add New Task" }).click();
        await page.getByRole("dialog").getByLabel("Title", { exact: true }).fill(pending);
        await page.getByRole("dialog").getByRole("combobox").click();
        await page.getByRole("option", { name: "Bravo" }).click();
        await page.getByRole("dialog").getByRole("button", { name: "Create Task" }).click();
        await expect(page.getByRole("button", { name: new RegExp(`^${pending}`) })).toBeVisible();

        // Act — move the confirmed task into Bravo by keyboard, past the unconfirmed card.
        const handle = page.getByRole("button", { name: `Reorder ${movable}` });
        await handle.focus();
        await page.keyboard.press("Space");
        await expect(handle).toHaveAttribute("aria-pressed", "true");
        await page.keyboard.press("ArrowRight");
        await page.keyboard.press("Space");

        // Assert — capture what the user was shown, which is the contract the reload must match.
        const shown = await readTaskTitlesInColumn({ page, name: "Bravo" });
        expect(shown).toContain(movable);

        // Act — let both writes through, let them settle, then ask the server.
        release();
        await expect(page.getByRole("button", { name: `Reorder ${pending}` })).toBeEnabled({ timeout: 20_000 });
        await page.reload();

        // Assert — the server agrees with what was on screen.
        await expect.poll(() => readTaskTitlesInColumn({ page, name: "Bravo" }), { timeout: 15_000 }).toEqual(shown);
    });
});
