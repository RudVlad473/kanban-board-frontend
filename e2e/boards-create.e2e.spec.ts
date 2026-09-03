import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { readBoardFull, seedAccount } from "./seed";
import { ROUTE } from "../src/lib/core/routing/routes";

/*
 * BOARD-02 against the real deployed nonprod backend: a board created from the sidebar, with the
 * columns typed, appears immediately without a reload — structural, business-level assertions only,
 * no validation copy or microcopy (docs/adr/tech/0022).
 */
test.describe("BOARD-02: create a board", () => {
    test("creates a board with its named columns in order and lists each new board in the sidebar", async ({
        page,
    }) => {
        // Arrange — one curl-seeded account; a second would exceed the backend's 2-session cap.
        const account = seedAccount();
        const suffix = randomUUID().slice(0, 8);
        const boardName = `E2E Create ${suffix}`;

        await page.goto(ROUTE.SIGN_IN);
        await page.getByLabel("Email", { exact: true }).fill(account.email);
        await page.getByLabel("Password", { exact: true }).fill(account.password);
        await page.getByRole("button", { name: "Sign In" }).click();
        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}$`));

        // Act — the form opens with no rows; add two and name both.
        await page.getByRole("button", { name: "+ Create New Board" }).click();
        await page.getByLabel("Board Name", { exact: true }).fill(boardName);
        await page.getByRole("button", { name: "+ Add New Column" }).click();
        await page.getByLabel("Column 1", { exact: true }).fill("Todo");
        await page.getByRole("button", { name: "+ Add New Column" }).click();
        await page.getByLabel("Column 2", { exact: true }).fill("Doing");
        await page.getByRole("button", { name: "Create New Board", exact: true }).click();

        // Assert — navigated to the new board, which is in the sidebar with no reload.
        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}/[^/]+$`));
        const sidebar = page.getByRole("navigation", { name: "Boards" });
        await expect(sidebar.getByRole("link", { name: boardName })).toBeVisible();

        /*
         * Assert — exactly the two named rows became columns, in the order typed. Read back through
         * the backend, since the board-detail view is Phase 3 scope (02-BACKEND-FACTS.md P5).
         */
        const boardId = new URL(page.url()).pathname.split("/").pop() ?? "";
        const created = readBoardFull({ account, boardId });
        expect(created.columns.map((column) => column.name)).toEqual(["Todo", "Doing"]);
        expect(created.columns.map((column) => column.position)).toEqual([0, 1]);

        /*
         * Act — a second board with no columns, which now needs no cleanup: the form seeds no rows,
         * because a blank one blocks the submit. The name must differ: the backend refuses a
         * duplicate with 409 DUPLICATE_RESOURCE — see 02-10-SUMMARY.md.
         */
        const secondBoardName = `E2E Create Later ${suffix}`;
        await page.getByRole("button", { name: "+ Create New Board" }).click();
        await page.getByLabel("Board Name", { exact: true }).fill(secondBoardName);
        await page.getByRole("button", { name: "Create New Board", exact: true }).click();

        /*
         * Assert — both boards are listed, in no asserted order: `GET /boards` exposes no
         * createdAt and takes no sort parameter, so the newest-first is unguaranteed
         * (deferred-items.md, 02-10). Asserting it produced a real order-dependent flake.
         */
        await expect(sidebar.getByRole("link")).toHaveCount(2);
        await expect(sidebar.getByRole("link", { name: secondBoardName })).toBeVisible();
        await expect(sidebar.getByRole("link", { name: boardName })).toBeVisible();

        /*
         * The sidebar now settles off the optimistic cache write, which lands BEFORE the client
         * navigation (tech/0030) — so the new board's URL has to be waited on, not assumed from the
         * assertions above. Without this the id read below is still the first board's.
         */
        await expect(page).not.toHaveURL(new RegExp(`${ROUTE.BOARDS}/${boardId}$`));
        const secondBoardId = new URL(page.url()).pathname.split("/").pop() ?? "";
        expect(readBoardFull({ account, boardId: secondBoardId }).columns).toEqual([]);
    });
});
