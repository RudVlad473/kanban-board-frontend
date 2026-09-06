import { randomUUID } from "node:crypto";

import type { Page } from "@playwright/test";

import { expect, test } from "./quality-fixtures";
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
});
