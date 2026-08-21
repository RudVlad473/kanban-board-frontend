import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { seedAccount, seedBoard } from "./seed";
import { ROUTE } from "../src/lib/core/routing/routes";

/*
 * BOARD-01, this phase's tracer slice: a signed-in user's own real boards, seeded through the
 * curl CLI (D-07), appear in the sidebar — proving the whole spine end to end against the real
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
        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}$`));

        // Assert
        /*
         * Structural: the sidebar lists exactly the two seeded boards, by link count, not by the
         * caption's exact wording (that copy is covered by sidebar.test.tsx, D-05).
         */
        const sidebar = page.getByRole("navigation", { name: "Boards" });
        await expect(sidebar.getByRole("link", { name: firstBoardName })).toBeVisible();
        await expect(sidebar.getByRole("link", { name: secondBoardName })).toBeVisible();
        await expect(sidebar.getByRole("link")).toHaveCount(2);
    });
});
