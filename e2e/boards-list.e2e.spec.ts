import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { seedAccount, seedBoard } from "./seed";
import { ROUTE } from "../src/lib/core/routing/routes";

/*
 * BOARD-01, this phase's tracer slice: a signed-in user's own real boards, seeded through the
 * curl CLI, appear in the sidebar — proving the whole spine end to end against the real
 * deployed nonprod backend, no fake HTTP layer anywhere (ADR tech/0018).
 */
test.describe("BOARD-01: sidebar board list", () => {
    test("shows the signed-in user's own seeded boards and a matching count", async ({ page }) => {
        // Arrange
        const account = seedAccount();
        const suffix = randomUUID().slice(0, 8);
        const firstBoardName = `E2E Alpha ${suffix}`;
        const secondBoardName = `E2E Bravo ${suffix}`;
        seedBoard({ account, name: firstBoardName });
        seedBoard({ account, name: secondBoardName });

        // Act
        await page.goto(ROUTE.SIGN_IN);
        await page.getByLabel("Email", { exact: true }).fill(account.email);
        await page.getByLabel("Password", { exact: true }).fill(account.password);
        await page.getByRole("button", { name: "Sign In" }).click();
        // D-11 auto-selects the first board, so an account WITH boards never rests on bare /boards.
        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}/[^/]+$`));

        // Assert
        /*
         * Structural: the sidebar lists exactly the two seeded boards, by link count, not by the
         * caption's exact wording (that copy is covered by sidebar.test.tsx).
         */
        const sidebar = page.getByRole("navigation", { name: "Boards" });
        await expect(sidebar.getByRole("link", { name: firstBoardName })).toBeVisible();
        await expect(sidebar.getByRole("link", { name: secondBoardName })).toBeVisible();
        await expect(sidebar.getByRole("link")).toHaveCount(2);

        // Act (BOARD-06: hide the sidebar)
        await page.getByRole("button", { name: "Hide Sidebar" }).click();

        // Assert
        await expect(page.getByRole("navigation", { name: "Boards" })).toHaveCount(0);
        await expect(page.getByRole("button", { name: "Show Sidebar" })).toBeVisible();

        // Act (show it again)
        await page.getByRole("button", { name: "Show Sidebar" }).click();

        // Assert
        await expect(page.getByRole("navigation", { name: "Boards" })).toBeVisible();
        await expect(page.getByRole("link", { name: firstBoardName })).toBeVisible();
    });
});

/*
 * BOARD-02: cross-account isolation — the userId behind loadBoards() comes from the verified
 * session, never a client-supplied value, so a board seeded under a second account must never
 * leak into the first account's sidebar (ledger row 6, 02.2-08).
 */
test.describe("BOARD-02: cross-account board isolation", () => {
    test("never shows a board seeded under a different account", async ({ page }) => {
        // Arrange
        const ownAccount = seedAccount();
        const otherAccount = seedAccount();
        const suffix = randomUUID().slice(0, 8);
        const ownBoardName = `E2E Own ${suffix}`;
        const otherBoardName = `E2E Other ${suffix}`;
        seedBoard({ account: ownAccount, name: ownBoardName });
        seedBoard({ account: otherAccount, name: otherBoardName });

        // Act
        await page.goto(ROUTE.SIGN_IN);
        await page.getByLabel("Email", { exact: true }).fill(ownAccount.email);
        await page.getByLabel("Password", { exact: true }).fill(ownAccount.password);
        await page.getByRole("button", { name: "Sign In" }).click();
        // D-11 auto-selects this account's own only board, so the landing URL is a detail path.
        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}/[^/]+$`));

        // Assert
        const sidebar = page.getByRole("navigation", { name: "Boards" });
        await expect(sidebar.getByRole("link", { name: ownBoardName })).toBeVisible();
        await expect(sidebar.getByRole("link", { name: otherBoardName })).toHaveCount(0);
    });
});
