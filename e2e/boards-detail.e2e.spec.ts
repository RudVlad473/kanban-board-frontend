import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { seedAccount, seedBoard, seedColumn, seedTask } from "./seed";
import { createServerActionSettled } from "./server-action";
import { buildBoardDetailPath, ROUTE } from "../src/lib/core/routing/routes";

/*
 * BOARD-03 plus D-10 and D-11 against the real deployed nonprod backend — happy paths only, no
 * validation copy or microcopy (docs/adr/tech/0022). Column captions are matched
 * case-insensitively because the ALL-CAPS treatment is CSS, not the DOM's own text.
 */
test.describe("BOARD-03: open a board and see its contents", () => {
    test("auto-selects the first board, renders its columns, and shows the zero-boards screen to an account with none", async ({
        page,
    }) => {
        // Arrange — one account with a two-column board; columns are seeded in order (P5).
        const account = seedAccount();
        const suffix = randomUUID().slice(0, 8);
        const board = seedBoard({ account, name: `E2E Detail ${suffix}` });
        seedColumn({ account, boardId: board.id, name: "Todo" });
        seedColumn({ account, boardId: board.id, name: "Doing" });

        // Act — sign in through the real form.
        await page.goto(ROUTE.SIGN_IN);
        await page.getByLabel("Email", { exact: true }).fill(account.email);
        await page.getByLabel("Password", { exact: true }).fill(account.password);
        await page.getByRole("button", { name: "Sign In" }).click();
        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}/[^/]+$`));

        // Act — navigate to the bare board-list route.
        await page.goto(ROUTE.BOARDS);

        // comment-length-exempt: records a measured framework constraint and the assertion it rules out, so a future reader does not re-add a redirect-chain check that cannot pass
        /*
         * Assert — the auto-select lands the user on the board, and the zero-boards screen never
         * paints on the way. This deliberately asserts the outcome, not the transport: the redirect
         * is delivered client-side, because `BoardsPage` awaits `fetchBoards()` before calling
         * `redirect()`, by which point the 200 has begun streaming and Next can no longer send a
         * Location header. Measured 2026-08-27 — `page.goto(ROUTE.BOARDS)` returns 200 at /boards
         * with a null `redirectedFrom()`, while the browser then settles on the detail path. An
         * earlier version asserted the redirect chain instead and could never pass. Restoring that
         * guarantee means resolving the first board in `proxy.ts`, which costs an extra upstream
         * call on every /boards request.
         */
        await expect(page).toHaveURL(new RegExp(`${buildBoardDetailPath(board.id)}$`));
        await expect(page.getByText("Create your first board")).toHaveCount(0);

        // Assert — the seeded board's columns and their task-count captions are on the page.
        await expect(page.getByRole("heading", { name: /^todo \(0\)$/i })).toBeVisible();
        await expect(page.getByRole("heading", { name: /^doing \(0\)$/i })).toBeVisible();

        // Assert — the header names the open board (BOARD-03's title).
        await expect(page.getByRole("heading", { level: 1, name: `E2E Detail ${suffix}` })).toBeVisible();

        // Act — a board id that is not in this account's list.
        await page.goto(buildBoardDetailPath(`absent-${suffix}`));

        // Assert — D-11 landed on the first board rather than an error page, and the URL says so.
        await expect(page).toHaveURL(new RegExp(`${buildBoardDetailPath(board.id)}$`));

        // Arrange — a second account with no boards; a separate account carries its own session budget.
        const emptyAccount = seedAccount();

        // Act — sign out, then sign in as the account with nothing to select.
        await page.getByRole("button", { name: "Sign Out" }).click();
        await expect(page).toHaveURL(new RegExp(`${ROUTE.SIGN_IN}$`));
        await page.getByLabel("Email", { exact: true }).fill(emptyAccount.email);
        await page.getByLabel("Password", { exact: true }).fill(emptyAccount.password);
        await page.getByRole("button", { name: "Sign In" }).click();

        // Assert — the empty state at the board-list route, with no redirect away from it.
        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}$`));
        await expect(page.getByText("Create a new board to get started.")).toBeVisible();
        await expect(page.getByRole("button", { name: "Create your first board" })).toBeVisible();
    });

    // comment-length-exempt: records the observable this asserts against and why a request count cannot replace it, which is the whole reason the test is shaped this way
    /*
     * `board-card.tsx` ships `prefetch` again, so a board switch can now serve cached markup.
     *
     * Asserted against a DELETION, never a request count: a cache serving a slightly old board is
     * indistinguishable from a correct one, but a task the server has dropped is either on screen
     * or it is not. This is the failure a resurrected cache entry produces, and the one the two
     * previous attempts at this prop shipped.
     */
    test("board switch: a task deleted before leaving a board is still gone on returning to it", async ({ page }) => {
        // Arrange — two boards, the first holding one task.
        const account = seedAccount();
        const suffix = randomUUID().slice(0, 8);
        const first = seedBoard({ account, name: `E2E Prefetch A ${suffix}` });
        const firstColumn = seedColumn({ account, boardId: first.id, name: "Alpha" });
        seedTask({ account, boardId: first.id, columnId: firstColumn.id, title: "Prefetch Doomed Task" });
        const second = seedBoard({ account, name: `E2E Prefetch B ${suffix}` });
        seedColumn({ account, boardId: second.id, name: "Bravo" });

        // Act — sign in and open the first board.
        await page.goto(ROUTE.SIGN_IN);
        await page.getByLabel("Email", { exact: true }).fill(account.email);
        await page.getByLabel("Password", { exact: true }).fill(account.password);
        await page.getByRole("button", { name: "Sign In" }).click();
        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}/[^/]+$`));
        await page.goto(buildBoardDetailPath(first.id));
        await expect(page.getByRole("button", { name: "Prefetch Doomed Task", exact: true })).toBeVisible();

        // Act — delete the task, then wait for the write to reach the server.
        const settled = createServerActionSettled(page);
        await page.getByRole("button", { name: "Prefetch Doomed Task", exact: true }).click();
        await page.getByRole("button", { name: "Task actions for Prefetch Doomed Task" }).click();
        await page.getByRole("menuitem", { name: "Delete Task" }).click();
        await page
            .getByRole("dialog", { name: "Delete this task?" })
            .getByRole("button", { name: "Delete Task" })
            .click();
        await settled;
        await expect(page.getByRole("button", { name: "Prefetch Doomed Task", exact: true })).toHaveCount(0);

        // Act — leave for the second board, then block every further read of the first and go back.
        await page.getByRole("link", { name: `E2E Prefetch B ${suffix}` }).click();
        await expect(page.getByRole("heading", { name: /^bravo \(0\)$/i })).toBeVisible();
        await page.route(
            (url) => url.pathname === buildBoardDetailPath(first.id) && url.searchParams.has("_rsc"),
            (route) => route.abort(),
        );
        await page.getByRole("link", { name: `E2E Prefetch A ${suffix}` }).click();

        // Assert — the board painted from the prefetched payload, with no read of its own allowed.
        await expect(page.getByRole("heading", { name: /^alpha \(0\)$/i })).toBeVisible();

        // Assert — and it did NOT resurrect the deleted task, which is the failure a cache hides.
        await expect(page.getByRole("button", { name: "Prefetch Doomed Task", exact: true })).toHaveCount(0);
    });

    // comment-length-exempt: records the measurement that separates this from a test passing either way, and the one flow it deliberately excludes
    /*
     * Reported 2026-09-04: switching between Boards showed the loading skeleton every time, over
     * data the browser had already fetched. `board-card.tsx` now ships `prefetch`.
     *
     * The destination's own RSC read is HELD for the assertion, which is what makes this
     * discriminating: measured 2026-09-04, the heading is visible with the prop and is NOT visible
     * without it. No mutation appears anywhere in this flow on purpose — a `refresh()` drops the
     * prefetched entry, so a delete before the switch puts the read back on the critical path.
     */
    test("board switch: paints a previously visited board while that board's own read is held", async ({ page }) => {
        // Arrange — two boards with distinguishable columns, and nothing that writes to either.
        const account = seedAccount();
        const suffix = randomUUID().slice(0, 8);
        const first = seedBoard({ account, name: `E2E Switch A ${suffix}` });
        seedColumn({ account, boardId: first.id, name: "Alpha" });
        const second = seedBoard({ account, name: `E2E Switch B ${suffix}` });
        seedColumn({ account, boardId: second.id, name: "Bravo" });

        // Act — sign in, open the first board, then switch to the second through the sidebar.
        await page.goto(ROUTE.SIGN_IN);
        await page.getByLabel("Email", { exact: true }).fill(account.email);
        await page.getByLabel("Password", { exact: true }).fill(account.password);
        await page.getByRole("button", { name: "Sign In" }).click();
        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}/[^/]+$`));
        await page.goto(buildBoardDetailPath(first.id));
        await expect(page.getByRole("heading", { name: /^alpha \(0\)$/i })).toBeVisible();
        await page.getByRole("link", { name: `E2E Switch B ${suffix}` }).click();
        await expect(page.getByRole("heading", { name: /^bravo \(0\)$/i })).toBeVisible();

        // Arrange — hold the first board's next read open.
        let releaseRscRead: (() => void) | undefined;
        const rscReadHeld = new Promise<void>((resolve) => {
            releaseRscRead = resolve;
        });
        await page.route(
            (url) => url.pathname === buildBoardDetailPath(first.id) && url.searchParams.has("_rsc"),
            async (route) => {
                await rscReadHeld;
                await route.continue();
            },
        );

        // Act — switch back, the reported path.
        await page.getByRole("link", { name: `E2E Switch A ${suffix}` }).click();

        // Assert — the board is on screen with its own read still in flight, so no skeleton stood in.
        await expect(page.getByRole("heading", { name: /^alpha \(0\)$/i })).toBeVisible();

        // Act — let the held read land.
        releaseRscRead?.();

        // Assert — the server's own render agrees with what the prefetched payload already painted.
        await expect(page).toHaveURL(new RegExp(`${buildBoardDetailPath(first.id)}$`));
        await expect(page.getByRole("heading", { name: /^alpha \(0\)$/i })).toBeVisible();
    });
});
