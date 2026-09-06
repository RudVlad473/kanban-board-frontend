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
});
