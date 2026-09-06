import { randomUUID } from "node:crypto";

import type { Page } from "@playwright/test";

import { expect, isServerActionPost, test } from "./quality-fixtures";
import { seedAccount, seedBoard, seedColumn, seedTask, type SeededAccount, type SeededBoard } from "./seed";
import { buildBoardDetailPath, ROUTE } from "../src/lib/core/routing/routes";

/*
 * D-A: a PERMANENT member of the `e2e` project, not a `zz-` probe — the standing wiring proof for
 * `e2e/quality-fixtures.ts`. Importing `test`/`expect` from `./quality-fixtures` is what makes the
 * passive `qualityGates` auto fixture run at teardown, with no call in any test body below.
 */

const SIGN_IN_TIMEOUT_MS = 20_000;

/*
 * Measured on this signed-in board-detail route: the four-bucket total is 90 (dominated by
 * `inapplicable`). 30 leaves wide headroom while still catching a crashed instrument, whose total
 * would be near zero rather than merely lower.
 */
const EVALUATED_RULE_FLOOR = 30;

const seedOneTaskBoard = (): { account: SeededAccount; board: SeededBoard } => {
    const account = seedAccount();
    const board = seedBoard({ account, name: `E2E Quality Fixtures ${randomUUID().slice(0, 8)}` });
    const column = seedColumn({ account, boardId: board.id, name: "Alpha" });
    seedTask({ account, boardId: board.id, columnId: column.id, title: `Quality Task ${randomUUID().slice(0, 8)}` });

    return { account, board };
};

const signIn = async ({ page, account, board }: { page: Page; account: SeededAccount; board: SeededBoard }) => {
    await page.goto(ROUTE.SIGN_IN);
    await page.getByLabel("Email", { exact: true }).fill(account.email);
    await page.getByLabel("Password", { exact: true }).fill(account.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(new RegExp(`${buildBoardDetailPath(board.id)}$`), { timeout: SIGN_IN_TIMEOUT_MS });
};

/** Sign-in makes no promise about which board it lands on with more than one seeded — navigate explicitly. */
const signInThenOpenBoard = async ({
    page,
    account,
    board,
}: {
    page: Page;
    account: SeededAccount;
    board: SeededBoard;
}) => {
    await page.goto(ROUTE.SIGN_IN);
    await page.getByLabel("Email", { exact: true }).fill(account.email);
    await page.getByLabel("Password", { exact: true }).fill(account.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}/[^/]+$`), { timeout: SIGN_IN_TIMEOUT_MS });
    await page.goto(buildBoardDetailPath(board.id));
};

// comment-length-exempt: records the measured mutation count this threshold is derived from and why `main`, not the scroll container, is the scoped subject
/*
 * Measured across a real board switch, scoped to `main` (the element both board areas are
 * children of — `BoardView` is keyed on `board.id`, so the scroll container itself is destroyed
 * and recreated on every switch and cannot be the subject): 12 mutations on `main.flex.min-h-0`.
 * 25 leaves roughly double headroom over that measurement.
 */
const MAIN_MUTATION_BUDGET = 25;

/*
 * Bounded per the fixture's own decision record: a long fixed delay on a write re-opens the
 * 2026-09-05 hazard. 1500ms is well under the CI-observed backend response window and short
 * enough that the release-gate shape (`optimistic-guards.e2e.spec.ts`) is not needed here.
 */
const OPTIMISTIC_DELAY_MS = 1500;

/** Comfortably under `OPTIMISTIC_DELAY_MS` — the paint must land well before the write settles. */
const OPTIMISTIC_PAINT_BUDGET_MS = 800;

/** Measured across the task-create interaction below: ~0.0000184 (input-inclusive). 0.05 leaves wide headroom. */
const LAYOUT_SHIFT_BUDGET = 0.05;

declare global {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- augmenting the global Window interface via declaration merging requires `interface`; `type` cannot merge
    interface Window {
        __qualityExcludingShiftScore?: number;
    }
}

/*
 * D-K's own falsification: an independent, input-EXCLUDING accumulator, self-contained (never
 * referencing an outer Node-scope binding — this closure is serialized by `page.evaluate`) so it
 * can run ALONGSIDE `layoutShiftTracker`'s input-including one over the exact same interaction.
 */
// comment-length-exempt: records why this probe is self-contained rather than reusing e2e/quality-fixtures.ts's own installer, which is not exported for direct test use
const INSTALL_EXCLUDING_SHIFT_PROBE = () => {
    const isLayoutShiftEntry = (
        entry: PerformanceEntry,
    ): entry is PerformanceEntry & { value: number; hadRecentInput: boolean } =>
        "value" in entry && "hadRecentInput" in entry;

    window.__qualityExcludingShiftScore = 0;
    const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
            if (!isLayoutShiftEntry(entry) || entry.hadRecentInput) continue;
            window.__qualityExcludingShiftScore = (window.__qualityExcludingShiftScore ?? 0) + entry.value;
        }
    });
    observer.observe({ type: "layout-shift", buffered: true });
};

test.describe("quality-fixtures: the harness's own standing self-test", () => {
    test("qualityGates runs passively at teardown, and the axe factory scans the settled board", async ({
        page,
        axe,
    }) => {
        // Arrange — a real signed-in board, settled: a column heading visible, not merely a URL match.
        const { account, board } = seedOneTaskBoard();
        await signIn({ page, account, board });
        await expect(page.getByRole("heading", { name: /^alpha \(1\)$/i })).toBeVisible();

        /*
         * Assert — the vacuity guard, proved on a path a reader can see: a real route's four-bucket
         * total is far above a crashed-instrument floor. The test body asserts NOTHING about
         * accessibility beyond this — the point of the case is that `qualityGates` runs anyway.
         */
        const results = await axe().analyze();
        const evaluatedRuleTotal =
            results.passes.length + results.violations.length + results.incomplete.length + results.inapplicable.length;
        expect(evaluatedRuleTotal).toBeGreaterThan(EVALUATED_RULE_FLOOR);
    });

    test("flickerTracker records a real board switch, rejects a zero budget, and cdp reports live metrics", async ({
        page,
        flickerTracker,
        cdp,
    }) => {
        // Arrange — two boards, so the switch is a real cross-board transition.
        const account = seedAccount();
        const suffix = randomUUID().slice(0, 8);
        const boardA = seedBoard({ account, name: `E2E Quality Switch A ${suffix}` });
        seedColumn({ account, boardId: boardA.id, name: "Alpha" });
        const boardB = seedBoard({ account, name: `E2E Quality Switch B ${suffix}` });
        seedColumn({ account, boardId: boardB.id, name: "Beta" });

        await signInThenOpenBoard({ page, account, board: boardA });
        await expect(page.getByRole("heading", { name: /^alpha \(0\)$/i })).toBeVisible();

        // Assert — asserting before start() fails by name, not by silently passing an empty log.
        await expect(flickerTracker.assertNoFlicker({ maxMutations: 0 })).rejects.toThrow(
            "tracker was never installed",
        );

        // Act — start recording after the last full navigation, then switch boards.
        await flickerTracker.start();
        await page.getByRole("link", { name: `E2E Quality Switch B ${suffix}` }).click();
        await expect(page.getByRole("heading", { name: /^beta \(0\)$/i })).toBeVisible();

        // Assert — the real measured count, with headroom, scoped to `main` (see MAIN_MUTATION_BUDGET).
        await flickerTracker.assertNoFlicker({ selector: "main", maxMutations: MAIN_MUTATION_BUDGET });

        // Assert — both-directions falsification: the same recording rejects at a zero budget.
        await expect(flickerTracker.assertNoFlicker({ selector: "main", maxMutations: 0 })).rejects.toThrow();

        // Assert — the same vacuity discipline, applied to CDP: a real session reports a non-empty array.
        const metrics = await cdp.send("Performance.getMetrics");
        expect(metrics.metrics.length).toBeGreaterThan(0);
    });

    // comment-length-exempt: records why this case is not a duplicate of optimistic-guards.e2e.spec.ts's own create-task case, which the next reader will otherwise conclude
    /*
     * The window this asserts is real and distinct from `optimistic-guards.e2e.spec.ts`'s own
     * create-task case: that spec asserts WHICH CONTROLS are inert while a write is held; this one
     * asserts the paint precedes the network for a write that is merely delayed, not held open.
     * A future reader should not delete either as a duplicate of the other.
     */
    test("optimisticRoute delays the write while the optimistic card paints first", async ({
        page,
        optimisticRoute,
    }) => {
        // Arrange
        const account = seedAccount();
        const board = seedBoard({ account, name: `E2E Quality Optimistic ${randomUUID().slice(0, 8)}` });
        seedColumn({ account, boardId: board.id, name: "Alpha" });
        await signIn({ page, account, board });
        /*
         * Waits out the sign-in redirect's own trailing next-action POST to this same board URL —
         * otherwise a listener attached here catches THAT response, not the create's, and reports
         * the write as already observed before the create was even clicked.
         */
        await page.waitForLoadState("networkidle");

        const title = `Quality Optimistic Task ${randomUUID().slice(0, 8)}`;
        let delayedResponseObserved = false;
        page.on("response", (response) => {
            if (isServerActionPost(response.request())) delayedResponseObserved = true;
        });
        await optimisticRoute({ urlPattern: new RegExp(buildBoardDetailPath(board.id)), delayMs: OPTIMISTIC_DELAY_MS });

        // Act — create a task through the real modal; the create is delayed, never held open.
        await page.getByRole("button", { name: "+ Add New Task" }).click();
        await page.getByRole("dialog").getByLabel("Title", { exact: true }).fill(title);
        await page.getByRole("dialog").getByRole("button", { name: "Create Task" }).click();

        // Assert — the optimistic card paints comfortably inside the budget.
        const card = page.getByRole("button", { name: new RegExp(`^${title}`) });
        await expect(card).toBeVisible({ timeout: OPTIMISTIC_PAINT_BUDGET_MS });

        // Assert — and the delayed write has provably not been observed at that same instant.
        expect(delayedResponseObserved).toBe(false);

        // Let the delayed write settle before the case ends, so teardown never scans a page mid-write.
        await expect.poll(() => delayedResponseObserved, { timeout: OPTIMISTIC_DELAY_MS + 5_000 }).toBe(true);
    });

    test("layoutShiftTracker measures a real interaction, including input-initiated shifts (D-K)", async ({
        page,
        layoutShiftTracker,
    }) => {
        // Arrange — a board with several existing tasks, so a new card reflows real content below it.
        const account = seedAccount();
        const board = seedBoard({ account, name: `E2E Quality Shift ${randomUUID().slice(0, 8)}` });
        const column = seedColumn({ account, boardId: board.id, name: "Alpha" });
        for (let index = 0; index < 5; index += 1) {
            seedTask({ account, boardId: board.id, columnId: column.id, title: `Shift Task ${String(index)}` });
        }
        await signIn({ page, account, board });
        await expect(page.getByRole("heading", { name: /^alpha \(5\)$/i })).toBeVisible();

        // Assert — reading before start() rejects by name, not a trivially-satisfied zero.
        await expect(layoutShiftTracker.getScore()).rejects.toThrow("observer was never attached");

        // Act — both readings installed over the SAME interaction: the tracker's own, and D-K's probe.
        await layoutShiftTracker.start();
        await page.evaluate(INSTALL_EXCLUDING_SHIFT_PROBE);

        const title = `Shift New Task ${randomUUID().slice(0, 8)}`;
        await page.getByRole("button", { name: "+ Add New Task" }).click();
        await page.getByRole("dialog").getByLabel("Title", { exact: true }).fill(title);
        await page.getByRole("dialog").getByRole("button", { name: "Create Task" }).click();
        await expect(page.getByRole("button", { name: new RegExp(`^${title}`) })).toBeVisible();

        // Assert — the measured count, with headroom (see LAYOUT_SHIFT_BUDGET).
        await layoutShiftTracker.assertMaxLayoutShift(LAYOUT_SHIFT_BUDGET);

        // Assert — D-K's falsification: the input-including reading is not smaller than the excluding one.
        const includingScore = await layoutShiftTracker.getScore();
        const excludingScore = await page.evaluate(() => window.__qualityExcludingShiftScore ?? 0);

        if (includingScore === excludingScore) {
            console.log(
                `[D-K] excluding (${String(excludingScore)}) and including (${String(includingScore)}) scores were EQUAL — see the SUMMARY for which of D-K's two explanations applies.`,
            );
        } else {
            expect(includingScore).toBeGreaterThan(excludingScore);
        }
    });
});
