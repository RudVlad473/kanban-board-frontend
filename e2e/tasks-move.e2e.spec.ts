import { randomUUID } from "node:crypto";

import { expect, test, type Locator, type Page } from "@playwright/test";

import { seedAccount, seedBoard, seedColumn, seedTask, type SeededAccount, type SeededBoard } from "./seed";
import { createServerActionSettled } from "./server-action";
import { buildBoardDetailPath, ROUTE } from "../src/lib/core/routing/routes";

// comment-length-exempt: records both the drag mechanism this spec must use and why an empty destination is deliberate, two facts a future reader would otherwise "simplify" back to something that proves nothing (docs/adr/tech/0023)
/*
 * TASK-04 against the real deployed nonprod backend — structural, business-level assertions only,
 * no validation copy (docs/adr/tech/0022). The pointer path uses the same low-level multi-step
 * mouse API `columns-reorder.e2e.spec.ts` established, for the same reason: a single-call drag
 * helper raises one intermediate move, which this library does not register as a drag at all
 * (03-RESEARCH Pitfall 4). The destination column starts EMPTY, so this is also the empty-column
 * drop target UI-SPEC flags as the phase's likeliest regression.
 */

const SIGN_IN_TIMEOUT_MS = 20_000;
const DRAG_MOVE_STEPS = 10;
const TASK_TITLE = "Fixture Movable Task";

/** A task's own drag handle, matched by its accessible name — never the content button beside it. */
const taskDragHandle = ({ page, title }: { page: Page; title: string }): Locator =>
    page.getByRole("button", { name: `Reorder ${title}` });

/** One column's own `<section>`, matched by its heading — the scope every task-placement check reads from. */
const columnSection = ({ page, name }: { page: Page; name: string }): Locator =>
    page.locator("section").filter({ has: page.getByRole("heading", { name: new RegExp(`^${name}`) }) });

const centerOf = async (locator: Locator): Promise<{ x: number; y: number }> => {
    const box = await locator.boundingBox();

    if (box === null) {
        throw new Error("a drag target reported no bounding box, so it is not rendered");
    }

    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

const seedTwoColumnBoardWithOneTask = (): { account: SeededAccount; board: SeededBoard } => {
    const account = seedAccount();
    const board = seedBoard({ account, name: `E2E Task Move ${randomUUID().slice(0, 8)}` });
    const source = seedColumn({ account, boardId: board.id, name: "Alpha" });
    seedColumn({ account, boardId: board.id, name: "Bravo" });
    seedTask({ account, boardId: board.id, columnId: source.id, title: TASK_TITLE });

    return { account, board };
};

const signIn = async ({ page, account, board }: { page: Page; account: SeededAccount; board: SeededBoard }) => {
    await page.goto(ROUTE.SIGN_IN);
    await page.getByLabel("Email", { exact: true }).fill(account.email);
    await page.getByLabel("Password", { exact: true }).fill(account.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(new RegExp(`${buildBoardDetailPath(board.id)}$`), { timeout: SIGN_IN_TIMEOUT_MS });
};

test.describe("TASK-04: move a task between columns", () => {
    test("task move: drags a task into another, empty column and keeps it there across a reload", async ({ page }) => {
        // Arrange — one task in Alpha, Bravo seeded empty, so the drop lands on the empty-column body.
        const { account, board } = seedTwoColumnBoardWithOneTask();
        await signIn({ page, account, board });
        await expect(
            columnSection({ page, name: "Alpha" }).getByRole("button", { name: TASK_TITLE, exact: true }),
        ).toBeVisible();

        // Arrange — the handle's centre and a point inside Bravo's own (empty) card list.
        const source = await centerOf(taskDragHandle({ page, title: TASK_TITLE }));
        const target = await centerOf(columnSection({ page, name: "Bravo" }).locator("ul"));

        // Act — a real press, several intermediate moves, then a release once the request is created.
        await page.mouse.move(source.x, source.y);
        await page.mouse.down();
        /* A first move past MouseSensor's 8px activation distance, so the lift is already under way. */
        await page.mouse.move(source.x + 16, source.y, { steps: 4 });
        await page.mouse.move(target.x, target.y, { steps: DRAG_MOVE_STEPS });
        /* Created before the release that issues the write, per createServerActionSettled's contract. */
        const settled = createServerActionSettled(page);
        await page.mouse.up();

        // Assert — the card rendered in Bravo before the request settled, and left Alpha empty.
        await expect(
            columnSection({ page, name: "Bravo" }).getByRole("button", { name: TASK_TITLE, exact: true }),
        ).toBeVisible();
        await expect(
            columnSection({ page, name: "Alpha" }).getByRole("button", { name: TASK_TITLE, exact: true }),
        ).toHaveCount(0);

        // Act — let the write reach the server, then reload; the optimistic placement cannot answer for it.
        await settled;
        await page.reload();

        // Assert — the move reached the server.
        await expect(
            columnSection({ page, name: "Bravo" }).getByRole("button", { name: TASK_TITLE, exact: true }),
        ).toBeVisible();
        await expect(
            columnSection({ page, name: "Alpha" }).getByRole("button", { name: TASK_TITLE, exact: true }),
        ).toHaveCount(0);
    });
});
