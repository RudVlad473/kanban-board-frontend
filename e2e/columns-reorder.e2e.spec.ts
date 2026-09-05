import { randomUUID } from "node:crypto";

import { expect, test, type Locator, type Page } from "@playwright/test";
import { isNil } from "es-toolkit";

import { seedAccount, seedBoard, seedColumn, type SeededAccount, type SeededBoard } from "./seed";
import { createServerActionSettled } from "./server-action";
import { buildBoardDetailPath, ROUTE } from "../src/lib/core/routing/routes";

// comment-length-exempt: records the drag mechanism this spec is required to use and the reason a simpler one would pass while proving nothing, which is the whole hazard the spec exists to avoid
/*
 * COLUMN-03 against the real deployed nonprod backend, by both input methods — structural,
 * business-level assertions only, no validation copy or microcopy (docs/adr/tech/0022). The pointer
 * path is driven through the low-level mouse API with a multi-step move: a single-call drag helper
 * raises one intermediate move, which this library does not register as a drag, so a spec built on
 * one would report green while exercising nothing (03-RESEARCH Pitfall 4, confirmed live in
 * 03-SPIKE-DNDKIT.md § 3). Every outcome is asserted after a reload, because U-05 renders the new
 * order optimistically and COLUMN-03's success criterion is specifically that it persisted.
 */

/* The real backend's sign-in round trip outruns the 5s default often enough to flake on its own. */
const SIGN_IN_TIMEOUT_MS = 20_000;

/* 03-VALIDATION § Manual-Only Verifications pins the count; the spike could not measure a minimum. */
const DRAG_MOVE_STEPS = 10;

const SEEDED_COLUMN_NAMES = ["Alpha", "Bravo", "Charlie", "Delta"] as const;

const toCaptions = (names: readonly string[]): string[] => names.map((name) => `${name} (0)`);

/** Every column's own `h2` in document order — read as TEXT, since CSS upper-cases the caption. */
const columnHeadings = (page: Page): Locator => page.getByRole("region").getByRole("heading", { level: 2 });

/** One column's drag handle, matched case-insensitively: the accessible name carries the CSS casing. */
const dragHandle = ({ page, name }: { page: Page; name: string }): Locator =>
    page.getByRole("button", { name: new RegExp(`^${name} \\(0\\)$`, "i") });

// comment-length-exempt: records the race this waits out and why a drop issued without it silently proves nothing, which is the defect this spec was written and then corrected against
/*
 * The library's own live region, which announces a candidate destination once it has actually been
 * registered. Waited on before every drop: a drop keyed straight onto the preceding key press or
 * mouse move outruns the state update behind it, so the move ends over the column's own slot, the
 * drop is a no-op by design, and the spec passes on an order that never changed. Measured
 * 2026-08-27 — that is exactly how this spec first failed. It is also 03-10's established pattern
 * for the same reason: wait on the announcement, never on a timer.
 */
const expectMoveAnnounced = async ({ page, name, position }: { page: Page; name: string; position: number }) => {
    await expect(page.getByText(`${name} moved to position ${String(position)} of 4.`)).toBeAttached();
};

// comment-length-exempt: records which readiness signal is insufficient and the CI-only failure that proved it, so the weaker one is not restored as an equivalent
/*
 * The lift, waited on before the first arrow step. `aria-pressed="true"` says the sensor activated;
 * it does NOT say the library has measured its droppables and opened a drag context. An arrow key
 * pressed in that gap resolves its destination to the dragged column's own slot, and the move
 * announcement is suppressed by design when the target is the column itself (`model.ts`
 * `onDragOver`) — so nothing is announced, ever, and the wait below times out rather than failing
 * fast. Invisible locally and on the first CI run it looked like geometry, because both keyboard
 * cases failed together; the second run failed only one of them, which is what a race looks like.
 * `onDragStart` fires after the context is open, so its announcement is the honest gate.
 */
const expectLiftAnnounced = async ({ page, name, position }: { page: Page; name: string; position: number }) => {
    await expect(page.getByText(`Picked up ${name}, position ${String(position)} of 4.`)).toBeAttached();
};

const centerOf = async (locator: Locator): Promise<{ x: number; y: number }> => {
    const box = await locator.boundingBox();

    if (isNil(box)) {
        throw new Error("a drag handle reported no bounding box, so it is not rendered");
    }

    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

/*
 * One account per test: seeding spends the sign-up session and the form spends the second, which
 * is the backend's whole per-account budget. Columns are seeded one call at a time (P5).
 */
const seedFourColumnBoard = (): { account: SeededAccount; board: SeededBoard } => {
    const account = seedAccount();
    const board = seedBoard({ account, name: `E2E Reorder ${randomUUID().slice(0, 8)}` });

    SEEDED_COLUMN_NAMES.forEach((name) => {
        seedColumn({ account, boardId: board.id, name });
    });

    return { account, board };
};

const signIn = async ({ page, account, board }: { page: Page; account: SeededAccount; board: SeededBoard }) => {
    await page.goto(ROUTE.SIGN_IN);
    await page.getByLabel("Email", { exact: true }).fill(account.email);
    await page.getByLabel("Password", { exact: true }).fill(account.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    /* The account's only board, so D-11 auto-selects it — waited on rather than navigated to. */
    await expect(page).toHaveURL(new RegExp(`${buildBoardDetailPath(board.id)}$`), { timeout: SIGN_IN_TIMEOUT_MS });
};

test.describe("COLUMN-03: reorder columns", () => {
    test("moves a column two positions with a multi-step pointer drag and keeps that order across a reload", async ({
        page,
    }) => {
        // Arrange — a four-column board, signed in to through the real form.
        const { account, board } = seedFourColumnBoard();
        await signIn({ page, account, board });
        await expect(columnHeadings(page)).toHaveText(toCaptions(SEEDED_COLUMN_NAMES));

        // Arrange — both handle centres, measured before the lift moves anything.
        const source = await centerOf(dragHandle({ page, name: "Alpha" }));
        const target = await centerOf(dragHandle({ page, name: "Charlie" }));

        // Act — a real press, several intermediate moves, then a release once the move has registered.
        await page.mouse.move(source.x, source.y);
        await page.mouse.down();
        /* A first move past MouseSensor's 8px activation distance, so the lift is already under way. */
        await page.mouse.move(source.x + 16, source.y, { steps: 4 });
        await page.mouse.move(target.x, target.y, { steps: DRAG_MOVE_STEPS });
        await expectMoveAnnounced({ page, name: "Alpha", position: 3 });
        /* Created before the release that issues the write, per createServerActionSettled's contract. */
        const settled = createServerActionSettled(page);
        await page.mouse.up();

        // Assert — the drag really moved the column across two neighbours, not merely wobbled it.
        await expect(columnHeadings(page)).toHaveText(toCaptions(["Bravo", "Charlie", "Alpha", "Delta"]));

        // Act — let the write reach the server, then reload; the optimistic order cannot answer for it.
        await settled;
        await page.reload();

        // Assert — the move reached the server.
        await expect(columnHeadings(page)).toHaveText(toCaptions(["Bravo", "Charlie", "Alpha", "Delta"]));
    });

    test("moves a column one position by keyboard and keeps that order across a reload", async ({ page }) => {
        // Arrange — a four-column board, signed in to through the real form.
        const { account, board } = seedFourColumnBoard();
        await signIn({ page, account, board });
        await expect(columnHeadings(page)).toHaveText(toCaptions(SEEDED_COLUMN_NAMES));

        // Act — focus the handle, lift it, step it one position right, and drop it.
        const handle = dragHandle({ page, name: "Alpha" });
        await handle.focus();
        await page.keyboard.press("Space");
        /* The lift, waited on structurally rather than by a timer — the library presses the handle. */
        await expect(handle).toHaveAttribute("aria-pressed", "true");
        await expectLiftAnnounced({ page, name: "Alpha", position: 1 });
        await page.keyboard.press("ArrowRight");
        await expectMoveAnnounced({ page, name: "Alpha", position: 2 });
        /* Created before the drop that issues the write, per createServerActionSettled's contract. */
        const settled = createServerActionSettled(page);
        await page.keyboard.press("Space");

        // Assert — the keyboard path produced the same kind of move the pointer path does.
        await expect(columnHeadings(page)).toHaveText(toCaptions(["Bravo", "Alpha", "Charlie", "Delta"]));

        // Act — let the write reach the server, then reload; the optimistic order cannot answer for it.
        await settled;
        await page.reload();

        // Assert — the move reached the server.
        await expect(columnHeadings(page)).toHaveText(toCaptions(["Bravo", "Alpha", "Charlie", "Delta"]));
    });

    test("writes nothing when a lifted column is moved and then cancelled", async ({ page }) => {
        // Arrange — a four-column board, signed in to through the real form.
        const { account, board } = seedFourColumnBoard();
        await signIn({ page, account, board });
        await expect(columnHeadings(page)).toHaveText(toCaptions(SEEDED_COLUMN_NAMES));

        // Act — lift, step right, then abandon the move with escape.
        const handle = dragHandle({ page, name: "Alpha" });
        await handle.focus();
        await page.keyboard.press("Space");
        await expect(handle).toHaveAttribute("aria-pressed", "true");
        await expectLiftAnnounced({ page, name: "Alpha", position: 1 });
        await page.keyboard.press("ArrowRight");
        /* Waited on here for a second reason: an escape that outran the step would cancel nothing. */
        await expectMoveAnnounced({ page, name: "Alpha", position: 2 });
        await page.keyboard.press("Escape");

        // Assert — the lift is over and the row reads exactly as it did before it began.
        await expect(handle).not.toHaveAttribute("aria-pressed", "true");
        await expect(columnHeadings(page)).toHaveText(toCaptions(SEEDED_COLUMN_NAMES));

        /*
         * Deliberately no settle-wait before this reload: a cancelled lift issues no Server Action,
         * so there is no response to wait for and waiting would hang until the test timed out.
         */
        // Act — reload, the only way to tell a local revert from a write that was never issued.
        await page.reload();

        // Assert — an intermediate step is local: nothing was persisted, so the seeded order stands.
        await expect(columnHeadings(page)).toHaveText(toCaptions(SEEDED_COLUMN_NAMES));
    });
});
