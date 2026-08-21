import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { createFixtureAccount, createFixtureBoard } from "./fixtures";
import { ROUTE } from "../src/lib/core/routing/routes";

/*
 * BOARD-01, this phase's tracer slice: a signed-in user's real boards, seeded against the real
 * backend, appear in the sidebar — proving the whole spine (Route Handler BFF → typed client
 * wrapper → useBoards() → sidebar) end to end, against the real deployed nonprod backend, no fake
 * HTTP layer anywhere (ADR tech/0018).
 */
test.describe("BOARD-01: sidebar board list", () => {
    test("shows the signed-in user's own seeded boards and a matching count", async ({ page, request }) => {
        const account = await createFixtureAccount(request);
        const suffix = randomUUID().slice(0, 8);
        const firstBoardName = `E2E Alpha ${suffix}`;
        const secondBoardName = `E2E Bravo ${suffix}`;

        await createFixtureBoard({ request, account, name: firstBoardName });
        await createFixtureBoard({ request, account, name: secondBoardName });

        await page.goto(ROUTE.SIGN_IN);
        await page.getByLabel("Email", { exact: true }).fill(account.email);
        await page.getByLabel("Password", { exact: true }).fill(account.password);
        await page.getByRole("button", { name: "Sign In" }).click();
        await expect(page).toHaveURL(new RegExp(`${ROUTE.BOARDS}$`));

        const sidebar = page.getByRole("navigation", { name: "Boards" });

        await expect(sidebar.getByText("ALL BOARDS (2)")).toBeVisible();
        await expect(sidebar.getByRole("link", { name: firstBoardName })).toBeVisible();
        await expect(sidebar.getByRole("link", { name: secondBoardName })).toBeVisible();
    });
});
