import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { seedAccount, seedBoard, seedColumn } from "./seed";
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

        // Act — navigate to the bare board-list route, keeping the response for the protocol assertion.
        const landingResponse = await page.goto(ROUTE.BOARDS);
        if (landingResponse === null) {
            throw new Error("expected a document response from navigating to the board-list route");
        }

        /*
         * Assert — the redirect was delivered on the document request itself. A post-hydration
         * history replacement produces one 200 for the requested URL and a null pre-redirect
         * request, which is what makes this assertion able to fail.
         */
        const preRedirectRequest = landingResponse.request().redirectedFrom();
        expect(preRedirectRequest).not.toBeNull();
        expect(new URL(preRedirectRequest?.url() ?? "http://invalid").pathname).toBe(ROUTE.BOARDS);
        expect(new URL(landingResponse.url()).pathname).toBe(buildBoardDetailPath(board.id));

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

        // Assert — D-10's empty state at the board-list route, with no redirect away from it.
        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}$`));
        await expect(page.getByText("Create a new board to get started.")).toBeVisible();
        await expect(page.getByRole("button", { name: "Create your first board" })).toBeVisible();
    });
});
