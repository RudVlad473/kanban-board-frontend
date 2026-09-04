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
const DESTINATION_TASK_TITLE = "Fixture Destination Task";
/** Three, so "last" is a slot no other reading of the drop resolves to by accident. */
const DESTINATION_TASK_TITLES = ["Fixture Bravo One", "Fixture Bravo Two", "Fixture Bravo Three"];

/** A task's own drag handle, matched by its accessible name — never the content button beside it. */
const taskDragHandle = ({ page, title }: { page: Page; title: string }): Locator =>
    page.getByRole("button", { name: `Reorder ${title}` });

// comment-length-exempt: records the readiness signal each keyboard step waits on and the reason a timer would prove nothing, mirroring columns-reorder's own established pattern
/*
 * The library's own live region — waited on before every subsequent step, since a step or drop
 * keyed straight onto the preceding one outruns the state update behind it (03-10's established
 * pattern, `columns-reorder.e2e.spec.ts`'s own comment). Never a fixed-duration sleep.
 */
const expectAnnounced = async ({ page, text }: { page: Page; text: string }) => {
    await expect(page.getByText(text)).toBeAttached();
};

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

/*
 * Both columns populated — the keyboard path's own fixture, distinct from the pointer test's
 * empty-Bravo one above. An empty destination resolves keyboard steps to a COLUMN/COLUMN_BODY
 * id `resolveTask` cannot name, so no "moved to" text exists there to gate a step on.
 */
const seedTwoColumnBoardWithOneTaskEach = (): { account: SeededAccount; board: SeededBoard } => {
    const account = seedAccount();
    const board = seedBoard({ account, name: `E2E Task Keyboard Move ${randomUUID().slice(0, 8)}` });
    const source = seedColumn({ account, boardId: board.id, name: "Alpha" });
    const destination = seedColumn({ account, boardId: board.id, name: "Bravo" });
    seedTask({ account, boardId: board.id, columnId: source.id, title: TASK_TITLE });
    seedTask({ account, boardId: board.id, columnId: destination.id, title: DESTINATION_TASK_TITLE });

    return { account, board };
};

/*
 * A populated destination, which is the only fixture the LAST slot exists in: with one card there,
 * "before it" and "after it" are the same two positions an empty column cannot distinguish.
 */
const seedTwoColumnBoardWithThreeDestinationTasks = (): { account: SeededAccount; board: SeededBoard } => {
    const account = seedAccount();
    const board = seedBoard({ account, name: `E2E Task Move Last ${randomUUID().slice(0, 8)}` });
    const source = seedColumn({ account, boardId: board.id, name: "Alpha" });
    const destination = seedColumn({ account, boardId: board.id, name: "Bravo" });
    seedTask({ account, boardId: board.id, columnId: source.id, title: TASK_TITLE });

    for (const title of DESTINATION_TASK_TITLES) {
        seedTask({ account, boardId: board.id, columnId: destination.id, title });
    }

    return { account, board };
};

/* One column holding all three, which is the only arrangement a WITHIN-column reorder exists in. */
const seedOneColumnBoardWithThreeTasks = (): { account: SeededAccount; board: SeededBoard } => {
    const account = seedAccount();
    const board = seedBoard({ account, name: `E2E Task Reorder ${randomUUID().slice(0, 8)}` });
    const column = seedColumn({ account, boardId: board.id, name: "Alpha" });

    for (const title of DESTINATION_TASK_TITLES) {
        seedTask({ account, boardId: board.id, columnId: column.id, title });
    }

    return { account, board };
};

/**
 * One column's card titles in rendered ORDER — the content button's own first span, which is what
 * distinguishes it from the drag handle `<button>` beside it.
 */
const readTaskTitlesInColumn = async ({ page, name }: { page: Page; name: string }): Promise<string[]> => {
    const texts = await columnSection({ page, name }).locator("li button span:first-child").allInnerTexts();

    /* The handle's own icon span matches the selector too and reads empty; only titles are the order. */
    return texts.filter((text) => text.length > 0);
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

    // comment-length-exempt: records both measured artifacts and the frame they have to be absent on, which is the whole difference between this test and one that always passes
    /*
     * Reported 2026-09-04: reordering within one column made the cards flicker on drop. Two
     * artifacts, both from the library settling a list the optimistic write had ALREADY reordered:
     * the shifted neighbour FLIP-animated back from a position it no longer occupied (measured
     * -104px -> -22px -> 0 over ~180ms), and the settle's own side effect held the dropped card at
     * `opacity: 0` for ~120ms. Asserted on the drop frame itself with no polling — one tick later
     * both animations have finished and every reading is clean whether or not the fix is present.
     */
    test("task reorder: settles with no leftover transform or hidden card on the drop frame", async ({ page }) => {
        // Arrange — three cards in ONE column, which is the only arrangement the report reproduces on.
        const { account, board } = seedOneColumnBoardWithThreeTasks();
        await signIn({ page, account, board });
        await expect.poll(() => readTaskTitlesInColumn({ page, name: "Alpha" })).toEqual(DESTINATION_TASK_TITLES);
        const [firstTitle, secondTitle] = DESTINATION_TASK_TITLES;
        const source = await centerOf(taskDragHandle({ page, title: firstTitle }));

        // Act — lift the first card and drop it below the second's centre.
        await page.mouse.move(source.x, source.y);
        await page.mouse.down();
        /* A first move past MouseSensor's 8px activation distance, so the lift is already under way. */
        await page.mouse.move(source.x + 16, source.y, { steps: 4 });
        await page.mouse.move(source.x, source.y + 150, { steps: DRAG_MOVE_STEPS });
        await page.mouse.up();

        // Assert — every card is settled on this very frame: nothing translated, nothing hidden.
        const settledStyles = await page.evaluate(() =>
            Array.from(document.querySelectorAll("section li")).map((item) => {
                const computed = getComputedStyle(item);

                return { transform: computed.transform, opacity: computed.opacity };
            }),
        );

        expect(settledStyles).toEqual(settledStyles.map(() => ({ transform: "none", opacity: "1" })));
        expect(settledStyles).toHaveLength(DESTINATION_TASK_TITLES.length);

        // Assert — and the reorder itself still happened.
        await expect
            .poll(() => readTaskTitlesInColumn({ page, name: "Alpha" }))
            .toEqual([secondTitle, firstTitle, DESTINATION_TASK_TITLES[2]]);
    });

    /* The mirror of the drop-below case: the FIRST slot of a populated column, reached from above. */
    test("task move: drags a task above the destination's first card and lands it there", async ({ page }) => {
        // Arrange — Alpha holds the mover, Bravo holds three cards, so "first" is its own slot.
        const { account, board } = seedTwoColumnBoardWithThreeDestinationTasks();
        await signIn({ page, account, board });
        await expect.poll(() => readTaskTitlesInColumn({ page, name: "Bravo" })).toEqual(DESTINATION_TASK_TITLES);
        /* The handle's centre, and a point above the first card's centre but still inside Bravo. */
        const source = await centerOf(taskDragHandle({ page, title: TASK_TITLE }));
        const firstCard = columnSection({ page, name: "Bravo" }).locator("li").first();
        const firstCardBox = await firstCard.boundingBox();

        if (firstCardBox === null) {
            throw new Error("the destination column's first card reported no bounding box");
        }

        const target = { x: firstCardBox.x + firstCardBox.width / 2, y: firstCardBox.y - 12 };

        // Act — a real press, several intermediate moves, then a release once the request is created.
        await page.mouse.move(source.x, source.y);
        await page.mouse.down();
        /* A first move past MouseSensor's 8px activation distance, so the lift is already under way. */
        await page.mouse.move(source.x + 16, source.y, { steps: 4 });
        await page.mouse.move(target.x, target.y, { steps: DRAG_MOVE_STEPS });
        /* Created before the release that issues the write, per createServerActionSettled's contract. */
        const settled = createServerActionSettled(page);
        await page.mouse.up();

        // Assert — FIRST, ahead of every seeded card.
        await expect
            .poll(() => readTaskTitlesInColumn({ page, name: "Bravo" }))
            .toEqual([TASK_TITLE, ...DESTINATION_TASK_TITLES]);

        // Act — let the write reach the server, then reload; the optimistic placement cannot answer for it.
        await settled;
        await page.reload();

        // Assert — the position the server stored is the one the drop showed.
        await expect
            .poll(() => readTaskTitlesInColumn({ page, name: "Bravo" }))
            .toEqual([TASK_TITLE, ...DESTINATION_TASK_TITLES]);
    });

    // comment-length-exempt: records the exact geometry the drop depends on and the reading it rules out, which a future reader would otherwise simplify into a centre-of-card drag that proves nothing
    /*
     * Reported 2026-09-04: with three cards in the destination, a card dragged below the LAST one
     * still landed above it, so the final slot was unreachable by pointer. The drop point is
     * deliberately BELOW the last card's own centre and inside the column — the collision still
     * resolves to that card (nothing else is a task droppable down there), so only the geometry
     * read tells "after" from "before".
     */
    test("task move: drags a task below the destination's last card and lands it there", async ({ page }) => {
        // Arrange — Alpha holds the mover, Bravo holds three cards, so "last" is its own slot.
        const { account, board } = seedTwoColumnBoardWithThreeDestinationTasks();
        await signIn({ page, account, board });
        await expect.poll(() => readTaskTitlesInColumn({ page, name: "Bravo" })).toEqual(DESTINATION_TASK_TITLES);
        /* The handle's centre, and a point below the last card but still inside Bravo. */
        const source = await centerOf(taskDragHandle({ page, title: TASK_TITLE }));
        const lastCard = columnSection({ page, name: "Bravo" }).locator("li").last();
        const lastCardBox = await lastCard.boundingBox();

        if (lastCardBox === null) {
            throw new Error("the destination column's last card reported no bounding box");
        }

        const target = { x: lastCardBox.x + lastCardBox.width / 2, y: lastCardBox.y + lastCardBox.height + 20 };

        // Act — a real press, several intermediate moves, then a release once the request is created.
        await page.mouse.move(source.x, source.y);
        await page.mouse.down();
        /* A first move past MouseSensor's 8px activation distance, so the lift is already under way. */
        await page.mouse.move(source.x + 16, source.y, { steps: 4 });
        await page.mouse.move(target.x, target.y, { steps: DRAG_MOVE_STEPS });
        /* Created before the release that issues the write, per createServerActionSettled's contract. */
        const settled = createServerActionSettled(page);
        await page.mouse.up();

        // Assert — LAST, not third: the whole point of the report.
        await expect
            .poll(() => readTaskTitlesInColumn({ page, name: "Bravo" }))
            .toEqual([...DESTINATION_TASK_TITLES, TASK_TITLE]);

        // Act — let the write reach the server, then reload; the optimistic placement cannot answer for it.
        await settled;
        await page.reload();

        // Assert — the position the server stored is the one the drop showed.
        await expect
            .poll(() => readTaskTitlesInColumn({ page, name: "Bravo" }))
            .toEqual([...DESTINATION_TASK_TITLES, TASK_TITLE]);
    });

    test("task move: moves a task into another column by keyboard and keeps it there across a reload", async ({
        page,
    }) => {
        // Arrange — one task in each of Alpha and Bravo, signed in through the real form.
        const { account, board } = seedTwoColumnBoardWithOneTaskEach();
        await signIn({ page, account, board });
        const handle = taskDragHandle({ page, title: TASK_TITLE });
        await expect(handle).toBeVisible();

        // Act — focus the handle, lift it, step it right into Bravo, and drop it.
        await handle.focus();
        await page.keyboard.press("Space");
        await expect(handle).toHaveAttribute("aria-pressed", "true");
        await expectAnnounced({
            page,
            text: `Picked up ${TASK_TITLE} from Alpha, position 1 of 1. Use arrow keys to move, space to drop, escape to cancel.`,
        });
        await page.keyboard.press("ArrowRight");
        await expectAnnounced({ page, text: `${TASK_TITLE} moved to Bravo, position 1 of 1.` });
        /* Created before the drop that issues the write, per createServerActionSettled's contract. */
        const settled = createServerActionSettled(page);
        await page.keyboard.press("Space");

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

    test("task move: writes nothing when a lifted task is moved and then cancelled", async ({ page }) => {
        // Arrange — one task in each of Alpha and Bravo, signed in through the real form.
        const { account, board } = seedTwoColumnBoardWithOneTaskEach();
        await signIn({ page, account, board });
        const handle = taskDragHandle({ page, title: TASK_TITLE });
        await expect(handle).toBeVisible();

        // Act — lift, step right into Bravo, then abandon the move with escape.
        await handle.focus();
        await page.keyboard.press("Space");
        await expect(handle).toHaveAttribute("aria-pressed", "true");
        await expectAnnounced({
            page,
            text: `Picked up ${TASK_TITLE} from Alpha, position 1 of 1. Use arrow keys to move, space to drop, escape to cancel.`,
        });
        await page.keyboard.press("ArrowRight");
        /* Waited on here for a second reason: an escape that outran the step would cancel nothing. */
        await expectAnnounced({ page, text: `${TASK_TITLE} moved to Bravo, position 1 of 1.` });
        await page.keyboard.press("Escape");

        // Assert — the lift is over and the card is still in Alpha, where it started.
        await expect(handle).not.toHaveAttribute("aria-pressed", "true");
        await expect(
            columnSection({ page, name: "Alpha" }).getByRole("button", { name: TASK_TITLE, exact: true }),
        ).toBeVisible();
        await expect(
            columnSection({ page, name: "Bravo" }).getByRole("button", { name: TASK_TITLE, exact: true }),
        ).toHaveCount(0);

        /*
         * Deliberately no settle-wait before this reload: a cancelled lift issues no Server Action,
         * so there is no response to wait for and waiting would hang until the test timed out.
         */
        // Act — reload, the only way to tell a local revert from a write that was never issued.
        await page.reload();

        // Assert — an intermediate step is local: nothing was persisted, so the seeded placement stands.
        await expect(
            columnSection({ page, name: "Alpha" }).getByRole("button", { name: TASK_TITLE, exact: true }),
        ).toBeVisible();
        await expect(
            columnSection({ page, name: "Bravo" }).getByRole("button", { name: TASK_TITLE, exact: true }),
        ).toHaveCount(0);
    });
});
